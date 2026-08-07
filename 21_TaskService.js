/**
 * Task Service
 * Business logic layer. NO SpreadsheetApp.
 */

const TaskService = (function() {
  'use strict';

  const S = TaskSchema.STATUS;
  const W = TaskSchema.WEIGHT;

  function _now() { return new Date(); }
  function _clamp(num, min, max) { return Math.min(Math.max(num, min), max); }
  function _toNumber(value, def) { const n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
  function _daysBetween(d1, d2) { return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)); }
  function _generateTaskId() { return 'TASK-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

  function _validateTaskInput(data, isUpdate) {
    const schema = {};
    const fields = isUpdate ? Object.keys(data) : Object.keys(TaskSchema.VALIDATION);
    fields.forEach(function(f) { if (TaskSchema.VALIDATION[f]) schema[f] = TaskSchema.VALIDATION[f]; });
    if (!isUpdate) {
      const defaults = TaskSchema.getDefaultTask();
      Object.keys(defaults).forEach(function(k) {
        if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
      });
    }
    return Validator.validate(data, schema, 'TaskService');
  }

  function calculateTaskWeight(task) {
    return _round((W.PRIORITY[task.priority] || 1) * (W.DIFFICULTY[task.difficulty] || 1), 2);
  }
  function calculateTaskScore(task) {
    return _round((_toNumber(task.completion) * 0.40) + (_toNumber(task.quality) * 0.30) + (_toNumber(task.impact) * 0.20) + (_toNumber(task.evidence) * 0.10), 2);
  }
  function calculateWeightedScore(task) { return _round(calculateTaskScore(task) * calculateTaskWeight(task), 2); }
  function calculateLateDays(task) {
    if ([S.APPROVED, S.REJECTED, S.CANCELLED].indexOf(task.status) > -1) return 0;
    const due = Utils.safeDate(task.dueDate); if (!due) return 0;
    const today = _now(); if (today <= due) return 0;
    return Math.max(0, _daysBetween(due, today));
  }
  function _applyCalculations(task) {
    task.taskWeight = calculateTaskWeight(task);
    task.taskScore = calculateTaskScore(task);
    task.weightedScore = calculateWeightedScore(task);
    task.daysLate = calculateLateDays(task);
    return task;
  }
  function _validateStatusTransition(cur, nxt) {
    if (!TaskSchema.isValidStatusTransition(cur, nxt)) throw ErrorHandler.validation('Invalid transition ' + cur + ' → ' + nxt, { current: cur, requested: nxt }, 'TaskService');
  }

  function createTask(taskData) {
    const data = Utils.clone(taskData);
    if (!data.id) data.id = _generateTaskId();
    const defaults = TaskSchema.getDefaultTask();
    Object.keys(defaults).forEach(function(k) { if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k]; });
    _validateTaskInput(data, false);
    if (data.title) data.title = Utils.safeStr(data.title);
    if (data.category) data.category = Utils.safeStr(data.category);
    if (data.assignedTo) data.assignedTo = Utils.safeStr(data.assignedTo);
    if (data.notes) data.notes = Utils.safeStr(data.notes);
    if (data.reviewer) data.reviewer = Utils.safeStr(data.reviewer);
    _applyCalculations(data);
    const created = TaskRepository.create(data);
    Logger.info('TaskService', 'Task created', { id: created.id, title: created.title });
    return created.id;
  }
  function getTask(id) { return id ? TaskRepository.findById(id) : null; }
  function getTasks(opts) { return TaskRepository.findAll(opts); }
  function updateTask(taskId, updates) {
    if (!taskId) throw ErrorHandler.validation('Task ID required', {}, 'TaskService');
    const existing = TaskRepository.findById(taskId);
    if (!existing) throw ErrorHandler.notFound('Task', taskId, 'TaskService');
    const data = Utils.clone(updates);
    delete data.id; delete data.createdAt; delete data.createdBy;
    if (Object.keys(data).length > 0) _validateTaskInput(data, true);
    if (data.title !== undefined) data.title = Utils.safeStr(data.title);
    if (data.category !== undefined) data.category = Utils.safeStr(data.category);
    if (data.assignedTo !== undefined) data.assignedTo = Utils.safeStr(data.assignedTo);
    if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes);
    if (data.reviewer !== undefined) data.reviewer = Utils.safeStr(data.reviewer);
    if (data.completion !== undefined) data.completion = _clamp(_toNumber(data.completion), 0, 100);
    const merged = Object.assign({}, existing, data);
    _applyCalculations(merged);
    data.taskScore = merged.taskScore; data.taskWeight = merged.taskWeight; data.weightedScore = merged.weightedScore; data.daysLate = merged.daysLate;
    const updated = TaskRepository.update(taskId, data);
    Logger.info('TaskService', 'Task updated', { id: taskId });
    return updated;
  }
  function deleteTask(taskId) {
    if (!taskId) throw ErrorHandler.validation('Task ID required', {}, 'TaskService');
    TaskRepository.delete(taskId);
    Logger.info('TaskService', 'Task deleted', { id: taskId });
    return true;
  }

  function changeTaskStatus(taskId, newStatus) {
    const task = getTask(taskId);
    if (!task) throw ErrorHandler.notFound('Task', taskId, 'TaskService');
    if (task.status === newStatus) return task;
    _validateStatusTransition(task.status, newStatus);
    const updates = { status: newStatus };
    if (newStatus === S.APPROVED) updates.completion = 100;
    return updateTask(taskId, updates);
  }
  function startTask(id) { return changeTaskStatus(id, S.IN_PROGRESS); }
  function submitTask(id) { return changeTaskStatus(id, S.WAITING_REVIEW); }
  function approveTask(id) { return changeTaskStatus(id, S.APPROVED); }
  function rejectTask(id) { return changeTaskStatus(id, S.REJECTED); }
  function cancelTask(id) { return changeTaskStatus(id, S.CANCELLED); }
  function assignTask(id, member) {
    if (!member || String(member).trim() === '') throw ErrorHandler.validation('Member required', {}, 'TaskService');
    return updateTask(id, { assignedTo: String(member).trim() });
  }
  function updateCompletion(id, pct) { return updateTask(id, { completion: _clamp(_toNumber(pct), 0, 100) }); }

  function getTasksByStatus(status) { return TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(t) { return t.status === status; } }); }
  function getTasksByMember(member) { return TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(t) { return t.assignedTo === member; } }); }
  function getTasksByPriority(priority) { return TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(t) { return t.priority === priority; } }); }
  function getTasksByCategory(category) { return TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(t) { return t.category === category; } }); }
  function getLateTasks() { return TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT, where: function(t) { return calculateLateDays(t) > 0; } }); }

  function updateLateDays() {
    const result = TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    let updated = 0;
    result.data.forEach(function(task) {
      const late = calculateLateDays(task);
      if (_toNumber(task.daysLate) !== late) { try { TaskRepository.update(task.id, { daysLate: late }); updated++; } catch (e) {} }
    });
    Logger.info('TaskService', 'Late days updated', { updated: updated, total: result.data.length });
    return updated;
  }
  function recalculateAllTasks() {
    const result = TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    let updated = 0;
    result.data.forEach(function(task) {
      const w = calculateTaskWeight(task), s = calculateTaskScore(task), ws = calculateWeightedScore(task), dl = calculateLateDays(task);
      if (_toNumber(task.taskWeight) !== w || _toNumber(task.taskScore) !== s || _toNumber(task.weightedScore) !== ws || _toNumber(task.daysLate) !== dl) {
        try { TaskRepository.update(task.id, { taskWeight: w, taskScore: s, weightedScore: ws, daysLate: dl }); updated++; } catch (e) {}
      }
    });
    Logger.info('TaskService', 'Recalculated', { updated: updated, total: result.data.length });
    return updated;
  }

  function totalTasks() { return TaskRepository.count(); }
  function completedTasks() { return getTasksByStatus(S.APPROVED).data.length; }
  function activeTasks() { return getTasksByStatus(S.IN_PROGRESS).data.length; }
  function pendingTasks() { return getTasksByStatus(S.NOT_STARTED).data.length; }
  function averageTaskScore() {
    const result = TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
    if (result.data.length === 0) return 0;
    return _round(result.data.reduce(function(a, t) { return a + _toNumber(t.taskScore); }, 0) / result.data.length, 2);
  }
  function updateDashboard() { Logger.warn('TaskService', 'updateDashboard deprecated', {}); }
  function refreshSystem() { updateLateDays(); recalculateAllTasks(); updateDashboard(); }

  // Legacy wrappers
  function createTaskLegacy(t) { return createTask(t); }
  function getTaskLegacy(id) { return getTask(id); }
  function getTasksLegacy() { return getTasks().data; }
  function updateTaskLegacy(id, u) { updateTask(id, u); }
  function deleteTaskLegacy(id) { deleteTask(id); }
  function getTasksByStatusLegacy(s) { return getTasksByStatus(s).data; }
  function getTasksByMemberLegacy(m) { return getTasksByMember(m).data; }
  function getTasksByPriorityLegacy(p) { return getTasksByPriority(p).data; }
  function getTasksByCategoryLegacy(c) { return getTasksByCategory(c).data; }
  function getLateTasksLegacy() { return getLateTasks().data; }

  return {
    createTask: createTask, getTask: getTask, getTasks: getTasks, updateTask: updateTask, deleteTask: deleteTask,
    changeTaskStatus: changeTaskStatus, startTask: startTask, submitTask: submitTask, approveTask: approveTask, rejectTask: rejectTask, cancelTask: cancelTask,
    assignTask: assignTask, updateCompletion: updateCompletion,
    getTasksByStatus: getTasksByStatus, getTasksByMember: getTasksByMember, getTasksByPriority: getTasksByPriority, getTasksByCategory: getTasksByCategory, getLateTasks: getLateTasks,
    calculateLateDays: calculateLateDays, calculateTaskWeight: calculateTaskWeight, calculateTaskScore: calculateTaskScore, calculateWeightedScore: calculateWeightedScore,
    updateLateDays: updateLateDays, recalculateAllTasks: recalculateAllTasks,
    totalTasks: totalTasks, completedTasks: completedTasks, activeTasks: activeTasks, pendingTasks: pendingTasks, averageTaskScore: averageTaskScore,
    updateDashboard: updateDashboard, refreshSystem: refreshSystem,
    createTaskLegacy: createTaskLegacy, getTaskLegacy: getTaskLegacy, getTasksLegacy: getTasksLegacy, updateTaskLegacy: updateTaskLegacy, deleteTaskLegacy: deleteTaskLegacy,
    getTasksByStatusLegacy: getTasksByStatusLegacy, getTasksByMemberLegacy: getTasksByMemberLegacy, getTasksByPriorityLegacy: getTasksByPriorityLegacy,
    getTasksByCategoryLegacy: getTasksByCategoryLegacy, getLateTasksLegacy: getLateTasksLegacy
  };
})();