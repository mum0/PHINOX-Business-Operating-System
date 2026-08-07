/**
 * Task Service
 * Business logic layer for Tasks.
 * Replaces: Tasks.js logic (gradually, with backward compatibility wrappers).
 * NO SpreadsheetApp. NO direct sheet access.
 */

const TaskService = (function() {
    'use strict';
    
    const S = TaskSchema.STATUS;
    const W = TaskSchema.WEIGHT;
    
    // ============ INTERNAL HELPERS ============
    
    function _now() {
      return new Date();
    }
    
    function _clamp(num, min, max) {
      return Math.min(Math.max(num, min), max);
    }
    
    function _toNumber(value, defaultValue) {
      const n = Number(value);
      return isNaN(n) ? (defaultValue !== undefined ? defaultValue : 0) : n;
    }
    
    function _round(num, decimals) {
      const d = decimals || 2;
      return Math.round(num * Math.pow(10, d)) / Math.pow(10, d);
    }
    
    function _isValidDate(date) {
      return date instanceof Date && !isNaN(date.getTime());
    }
    
    function _daysBetween(d1, d2) {
      const msPerDay = 1000 * 60 * 60 * 24;
      return Math.floor((d2 - d1) / msPerDay);
    }
    
    // ============ VALIDATION ============
    
    function _validateTaskInput(data, isUpdate) {
      const schema = {};
      const fields = isUpdate ? Object.keys(data) : Object.keys(TaskSchema.VALIDATION);
      
      fields.forEach(function(field) {
        if (TaskSchema.VALIDATION[field]) {
          schema[field] = TaskSchema.VALIDATION[field];
        }
      });
      
      if (!isUpdate) {
        // For create, apply defaults first
        const defaults = TaskSchema.getDefaultTask();
        Object.keys(defaults).forEach(function(key) {
          if (data[key] === undefined || data[key] === null || data[key] === '') {
            data[key] = defaults[key];
          }
        });
      }
      
      return Validator.validate(data, schema, 'TaskService');
    }
    
    // ============ SCORING ============
    
    function calculateTaskWeight(task) {
      const priorityWeight = W.PRIORITY[task.priority] || 1;
      const difficultyWeight = W.DIFFICULTY[task.difficulty] || 1;
      return _round(priorityWeight * difficultyWeight, 2);
    }
    
    function calculateTaskScore(task) {
      const completion = _toNumber(task.completion, 0);
      const quality = _toNumber(task.quality, 0);
      const impact = _toNumber(task.impact, 0);
      const evidence = _toNumber(task.evidence, 0);
      return _round((completion * 0.40) + (quality * 0.30) + (impact * 0.20) + (evidence * 0.10), 2);
    }
    
    function calculateWeightedScore(task) {
      const score = calculateTaskScore(task);
      const weight = calculateTaskWeight(task);
      return _round(score * weight, 2);
    }
    
    function calculateLateDays(task) {
      if ([S.APPROVED, S.REJECTED, S.CANCELLED].includes(task.status)) {
        return 0;
      }
      const due = Utils.safeDate(task.dueDate);
      if (!due) return 0;
      const today = _now();
      if (today <= due) return 0;
      return Math.max(0, _daysBetween(due, today));
    }
    
    function _applyCalculations(task) {
      task.weight = calculateTaskWeight(task);
      task.score = calculateTaskScore(task);
      task.weightedScore = calculateWeightedScore(task);
      task.daysLate = calculateLateDays(task);
      return task;
    }
    
    // ============ STATUS TRANSITIONS ============
    
    function _validateStatusTransition(currentStatus, newStatus) {
      if (!TaskSchema.isValidStatusTransition(currentStatus, newStatus)) {
        throw ErrorHandler.validation(
          'Invalid status transition from ' + currentStatus + ' to ' + newStatus,
          { current: currentStatus, requested: newStatus },
          'TaskService'
        );
      }
    }
    
    // ============ CRUD WRAPPERS ============
    
    function createTask(taskData) {
      const data = Utils.clone(taskData);
      
      // Generate ID if not provided
      if (!data.id) {
        data.id = Utils.generateId();
      }
      
      // Apply defaults
      const defaults = TaskSchema.getDefaultTask();
      Object.keys(defaults).forEach(function(key) {
        if (data[key] === undefined || data[key] === null || data[key] === '') {
          data[key] = defaults[key];
        }
      });
      
      // Validate
      _validateTaskInput(data, false);
      
      // Sanitize strings
      if (data.title) data.title = Utils.safeStr(data.title);
      if (data.category) data.category = Utils.safeStr(data.category);
      if (data.assignedTo) data.assignedTo = Utils.safeStr(data.assignedTo);
      if (data.notes) data.notes = Utils.safeStr(data.notes);
      if (data.reviewer) data.reviewer = Utils.safeStr(data.reviewer);
      
      // Apply calculations
      _applyCalculations(data);
      
      const created = TaskRepository.create(data);
      Logger.info('TaskService', 'Task created', { id: created.id, title: created.title });
      return created.id;
    }
    
    function getTask(taskId) {
      if (!taskId) return null;
      return TaskRepository.findById(taskId);
    }
    
    function getTasks(options) {
      return TaskRepository.findAll(options);
    }
    
    function updateTask(taskId, updates) {
      if (!taskId) {
        throw ErrorHandler.validation('Task ID is required for update', {}, 'TaskService');
      }
      
      const existing = TaskRepository.findById(taskId);
      if (!existing) {
        throw ErrorHandler.notFound('Task', taskId, 'TaskService');
      }
      
      const data = Utils.clone(updates);
      delete data.id; // Prevent ID change
      delete data.createdAt;
      delete data.createdBy;
      
      // Validate provided fields
      if (Object.keys(data).length > 0) {
        _validateTaskInput(data, true);
      }
      
      // Sanitize strings
      if (data.title !== undefined) data.title = Utils.safeStr(data.title);
      if (data.category !== undefined) data.category = Utils.safeStr(data.category);
      if (data.assignedTo !== undefined) data.assignedTo = Utils.safeStr(data.assignedTo);
      if (data.notes !== undefined) data.notes = Utils.safeStr(data.notes);
      if (data.reviewer !== undefined) data.reviewer = Utils.safeStr(data.reviewer);
      
      // Clamp completion
      if (data.completion !== undefined) {
        data.completion = _clamp(_toNumber(data.completion, 0), 0, 100);
      }
      
      // Merge with existing for calculations
      const merged = Object.assign({}, existing, data);
      _applyCalculations(merged);
      
      // Copy calculated fields back to updates
      data.score = merged.score;
      data.weight = merged.weight;
      data.weightedScore = merged.weightedScore;
      data.daysLate = merged.daysLate;
      
      const updated = TaskRepository.update(taskId, data);
      Logger.info('TaskService', 'Task updated', { id: taskId });
      return updated;
    }
    
    function deleteTask(taskId) {
      if (!taskId) {
        throw ErrorHandler.validation('Task ID is required for delete', {}, 'TaskService');
      }
      TaskRepository.delete(taskId);
      Logger.info('TaskService', 'Task deleted', { id: taskId });
      return true;
    }
    
    // ============ STATUS OPERATIONS ============
    
    function changeTaskStatus(taskId, newStatus) {
      const task = getTask(taskId);
      if (!task) {
        throw ErrorHandler.notFound('Task', taskId, 'TaskService');
      }
      
      if (task.status === newStatus) return task;
      
      _validateStatusTransition(task.status, newStatus);
      
      const updates = { status: newStatus };
      
      // Business rule: APPROVED → completion = 100
      if (newStatus === S.APPROVED) {
        updates.completion = 100;
      }
      
      return updateTask(taskId, updates);
    }
    
    function startTask(taskId) {
      return changeTaskStatus(taskId, S.IN_PROGRESS);
    }
    
    function submitTask(taskId) {
      return changeTaskStatus(taskId, S.WAITING_REVIEW);
    }
    
    function approveTask(taskId) {
      return changeTaskStatus(taskId, S.APPROVED);
    }
    
    function rejectTask(taskId) {
      return changeTaskStatus(taskId, S.REJECTED);
    }
    
    function cancelTask(taskId) {
      return changeTaskStatus(taskId, S.CANCELLED);
    }
    
    // ============ ASSIGNMENT & COMPLETION ============
    
    function assignTask(taskId, member) {
      if (!member || String(member).trim() === '') {
        throw ErrorHandler.validation('Member email is required', {}, 'TaskService');
      }
      return updateTask(taskId, { assignedTo: String(member).trim() });
    }
    
    function updateCompletion(taskId, percent) {
      const pct = _clamp(_toNumber(percent, 0), 0, 100);
      return updateTask(taskId, { completion: pct });
    }
    
    // ============ QUERY HELPERS ============
    
    function getTasksByStatus(status) {
      return TaskRepository.findAll({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(task) { return task.status === status; }
      });
    }
    
    function getTasksByMember(member) {
      return TaskRepository.findAll({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(task) { return task.assignedTo === member; }
      });
    }
    
    function getTasksByPriority(priority) {
      return TaskRepository.findAll({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(task) { return task.priority === priority; }
      });
    }
    
    function getTasksByCategory(category) {
      return TaskRepository.findAll({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(task) { return task.category === category; }
      });
    }
    
    function getLateTasks() {
      return TaskRepository.findAll({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(task) {
          return calculateLateDays(task) > 0;
        }
      });
    }
    
    // ============ BULK OPERATIONS ============
    
    function updateLateDays() {
      const result = TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
      let updated = 0;
      result.data.forEach(function(task) {
        const late = calculateLateDays(task);
        if (_toNumber(task.daysLate, 0) !== late) {
          try {
            TaskRepository.update(task.id, { daysLate: late });
            updated++;
          } catch (e) {
            Logger.warn('TaskService', 'Failed to update late days', { id: task.id, error: e.message });
          }
        }
      });
      Logger.info('TaskService', 'Late days updated', { updated: updated, total: result.data.length });
      return updated;
    }
    
    function recalculateAllTasks() {
      const result = TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
      let updated = 0;
      result.data.forEach(function(task) {
        const weight = calculateTaskWeight(task);
        const score = calculateTaskScore(task);
        const weightedScore = calculateWeightedScore(task);
        const daysLate = calculateLateDays(task);
        
        if (_toNumber(task.weight, 0) !== weight ||
            _toNumber(task.score, 0) !== score ||
            _toNumber(task.weightedScore, 0) !== weightedScore ||
            _toNumber(task.daysLate, 0) !== daysLate) {
          try {
            TaskRepository.update(task.id, {
              weight: weight,
              score: score,
              weightedScore: weightedScore,
              daysLate: daysLate
            });
            updated++;
          } catch (e) {
            Logger.warn('TaskService', 'Failed to recalculate task', { id: task.id, error: e.message });
          }
        }
      });
      Logger.info('TaskService', 'Tasks recalculated', { updated: updated, total: result.data.length });
      return updated;
    }
    
    // ============ STATISTICS ============
    
    function totalTasks() {
      return TaskRepository.count();
    }
    
    function completedTasks() {
      return getTasksByStatus(S.APPROVED).data.length;
    }
    
    function activeTasks() {
      return getTasksByStatus(S.IN_PROGRESS).data.length;
    }
    
    function pendingTasks() {
      return getTasksByStatus(S.NOT_STARTED).data.length;
    }
    
    function averageTaskScore() {
      const result = TaskRepository.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT });
      if (result.data.length === 0) return 0;
      const sum = result.data.reduce(function(acc, task) {
        return acc + _toNumber(task.score, 0);
      }, 0);
      return _round(sum / result.data.length, 2);
    }
    
    // ============ LEGACY / SIDE EFFECTS ============
    
    function updateDashboard() {
      // TODO: Delegate to Dashboard module when available
      // For now, this is a no-op to preserve API compatibility
      Logger.warn('TaskService', 'updateDashboard is deprecated. Delegate to Dashboard module.', {});
    }
    
    function refreshSystem() {
      Logger.info('TaskService', 'System refresh started', {});
      updateLateDays();
      recalculateAllTasks();
      updateDashboard();
      Logger.info('TaskService', 'System refresh completed', {});
    }
    
    // ============ BACKWARD COMPATIBILITY WRAPPERS ============
    // These match the exact signatures of Tasks.js legacy functions
    
    function createTaskLegacy(task) {
      return createTask(task);
    }
    
    function getTaskLegacy(taskId) {
      return getTask(taskId);
    }
    
    function getTasksLegacy() {
      return getTasks().data;
    }
    
    function updateTaskLegacy(taskId, updates) {
      updateTask(taskId, updates);
    }
    
    function deleteTaskLegacy(taskId) {
      deleteTask(taskId);
    }
    
    function getTasksByStatusLegacy(status) {
      return getTasksByStatus(status).data;
    }
    
    function getTasksByMemberLegacy(member) {
      return getTasksByMember(member).data;
    }
    
    function getTasksByPriorityLegacy(priority) {
      return getTasksByPriority(priority).data;
    }
    
    function getTasksByCategoryLegacy(category) {
      return getTasksByCategory(category).data;
    }
    
    function getLateTasksLegacy() {
      return getLateTasks().data;
    }
    
    return {
      // Core CRUD
      createTask: createTask,
      getTask: getTask,
      getTasks: getTasks,
      updateTask: updateTask,
      deleteTask: deleteTask,
      
      // Status workflows
      changeTaskStatus: changeTaskStatus,
      startTask: startTask,
      submitTask: submitTask,
      approveTask: approveTask,
      rejectTask: rejectTask,
      cancelTask: cancelTask,
      
      // Assignment & completion
      assignTask: assignTask,
      updateCompletion: updateCompletion,
      
      // Queries
      getTasksByStatus: getTasksByStatus,
      getTasksByMember: getTasksByMember,
      getTasksByPriority: getTasksByPriority,
      getTasksByCategory: getTasksByCategory,
      getLateTasks: getLateTasks,
      
      // Calculations (exposed for external use)
      calculateLateDays: calculateLateDays,
      calculateTaskWeight: calculateTaskWeight,
      calculateTaskScore: calculateTaskScore,
      calculateWeightedScore: calculateWeightedScore,
      
      // Bulk operations
      updateLateDays: updateLateDays,
      recalculateAllTasks: recalculateAllTasks,
      
      // Stats
      totalTasks: totalTasks,
      completedTasks: completedTasks,
      activeTasks: activeTasks,
      pendingTasks: pendingTasks,
      averageTaskScore: averageTaskScore,
      
      // Legacy
      updateDashboard: updateDashboard,
      refreshSystem: refreshSystem,
      
      // Backward compatibility aliases (exact legacy signatures)
      createTaskLegacy: createTaskLegacy,
      getTaskLegacy: getTaskLegacy,
      getTasksLegacy: getTasksLegacy,
      updateTaskLegacy: updateTaskLegacy,
      deleteTaskLegacy: deleteTaskLegacy,
      getTasksByStatusLegacy: getTasksByStatusLegacy,
      getTasksByMemberLegacy: getTasksByMemberLegacy,
      getTasksByPriorityLegacy: getTasksByPriorityLegacy,
      getTasksByCategoryLegacy: getTasksByCategoryLegacy,
      getLateTasksLegacy: getLateTasksLegacy
    };
  })();