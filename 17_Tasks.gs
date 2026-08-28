/**
 * ============================================================
 * PHINOX BOS — Tasks Module (Migrated v5.0)
 * Old File: Tasks.js (3 parts)
 * Replaces: Direct sheet access → BaseRepository
 * Benefits: O(1) lookup, batch ops, preserved business logic
 * Breaking: onEdit removed (use 12_GlobalTriggers.gs instead)
 * Depends: Core Layer, Permissions, Members
 * ============================================================
 */

/* ───────────────────────────────────────────
   0. FALLBACKS & CONSTANTS
   ─────────────────────────────────────────── */

   function _ensureTaskConstants() {
    if (typeof APP === 'undefined') APP = {};
    if (!APP.SHEETS) APP.SHEETS = { TASKS: 'Tasks', DASHBOARD: 'Dashboard', MEMBERS: 'Members' };
    if (!APP.TASK_STATUS) {
      APP.TASK_STATUS = {
        NOT_STARTED: 'Not Started',
        IN_PROGRESS: 'In Progress',
        WAITING_REVIEW: 'Waiting Review',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CANCELLED: 'Cancelled'
      };
    }
    if (!APP.PRIORITY) APP.PRIORITY = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
    if (!APP.DIFFICULTY) APP.DIFFICULTY = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard', EXPERT: 'Expert' };
    if (!APP.TASK_WEIGHT) {
      APP.TASK_WEIGHT = {
        PRIORITY: { Low: 0.8, Medium: 1.0, High: 1.3, Critical: 1.8 },
        DIFFICULTY: { Easy: 0.8, Medium: 1.0, Hard: 1.5, Expert: 2.0 }
      };
    }
  }
  
  if (typeof isEmpty !== 'function') {
    function isEmpty(v) { return v === null || v === undefined || v === ''; }
  }
  if (typeof isValidDate !== 'function') {
    function isValidDate(d) { return d instanceof Date && !isNaN(d.getTime()); }
  }
  if (typeof clamp !== 'function') {
    function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
  }
  if (typeof round !== 'function') {
    function round(v, d) { d = d || 0; return Math.round(v * Math.pow(10, d)) / Math.pow(10, d); }
  }
  if (typeof toNumber !== 'function') {
    function toNumber(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  }
  if (typeof now !== 'function') {
    function now() { return new Date().toISOString(); }
  }
  if (typeof generateId !== 'function') {
    function generateId(prefix) {
      return (prefix || 'ID') + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  }
  if (typeof t !== 'function') {
    function t(k) { return k; }
  }
  
  /* ───────────────────────────────────────────
     1. SCHEMA & REPOSITORY
     ─────────────────────────────────────────── */
  
  var TASK_SCHEMA = {
    id: 1, title: 2, category: 3, assignedTo: 4, priority: 5, difficulty: 6,
    status: 7, startDate: 8, dueDate: 9, completion: 10, quality: 11, impact: 12,
    evidence: 13, reviewer: 14, notes: 15, taskScore: 16, taskWeight: 17,
    weightedScore: 18, daysLate: 19, createdAt: 20, updatedAt: 21
  };
  
  var _taskRepo = null;
  
  function _ensureTaskSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Tasks');
    if (!sheet) {
      sheet = ss.insertSheet('Tasks');
      var headers = ['id','title','category','assignedTo','priority','difficulty','status',
        'startDate','dueDate','completion','quality','impact','evidence','reviewer','notes',
        'taskScore','taskWeight','weightedScore','daysLate','createdAt','updatedAt'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
      for (var i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 15);
      Logger.info('Tasks', 'Tasks sheet created with 21 columns');
    }
    return sheet;
  }
  
  function _getTaskRepo() {
    if (!_taskRepo) {
      _ensureTaskSheet();
      _taskRepo = BaseRepository.create('Tasks', TASK_SCHEMA, { eventName: 'task' });
    }
    return _taskRepo;
  }
  
  function _taskObjectToArray(obj) {
    var arr = new Array(21).fill('');
    arr[0] = obj.id || '';
    arr[1] = obj.title || '';
    arr[2] = obj.category || '';
    arr[3] = obj.assignedTo || '';
    arr[4] = obj.priority || '';
    arr[5] = obj.difficulty || '';
    arr[6] = obj.status || '';
    arr[7] = obj.startDate || '';
    arr[8] = obj.dueDate || '';
    arr[9] = obj.completion !== undefined ? obj.completion : 0;
    arr[10] = obj.quality !== undefined ? obj.quality : '';
    arr[11] = obj.impact !== undefined ? obj.impact : '';
    arr[12] = obj.evidence !== undefined ? obj.evidence : '';
    arr[13] = obj.reviewer !== undefined ? obj.reviewer : '';
    arr[14] = obj.notes !== undefined ? obj.notes : '';
    arr[15] = obj.taskScore !== undefined ? obj.taskScore : 0;
    arr[16] = obj.taskWeight !== undefined ? obj.taskWeight : 0;
    arr[17] = obj.weightedScore !== undefined ? obj.weightedScore : 0;
    arr[18] = obj.daysLate !== undefined ? obj.daysLate : 0;
    arr[19] = obj.createdAt || '';
    arr[20] = obj.updatedAt || '';
    return arr;
  }
  
  /* ───────────────────────────────────────────
     2. CRUD OPERATIONS
     ─────────────────────────────────────────── */
  
  function createTask(task) {
    _ensureTaskConstants();
    
    if (isEmpty(task.title)) throw ErrorHandler.validation('Task title is required', {}, 'Tasks');
    if (isEmpty(task.assignedTo)) throw ErrorHandler.validation('Task assignee is required', {}, 'Tasks');
    
    var validPriorities = Object.values(APP.PRIORITY);
    if (validPriorities.indexOf(task.priority) === -1) {
      throw ErrorHandler.validation('Invalid priority', { allowed: validPriorities }, 'Tasks');
    }
    
    var validDifficulties = Object.values(APP.DIFFICULTY);
    if (validDifficulties.indexOf(task.difficulty) === -1) {
      throw ErrorHandler.validation('Invalid difficulty', { allowed: validDifficulties }, 'Tasks');
    }
    
    var data = {
      title: task.title,
      category: task.category || '',
      assignedTo: task.assignedTo,
      priority: task.priority,
      difficulty: task.difficulty,
      status: APP.TASK_STATUS.NOT_STARTED,
      startDate: task.startDate || '',
      dueDate: task.dueDate || '',
      completion: 0,
      quality: '',
      impact: '',
      evidence: '',
      reviewer: '',
      notes: '',
      taskScore: 0,
      taskWeight: 0,
      weightedScore: 0,
      daysLate: 0
    };
    
    var created = _getTaskRepo().create(data);
    Logger.info('Tasks', 'Task created', { id: created.id, title: created.title });
    return created.id;
  }
  
  function getTasks() {
    var all = [];
    var offset = 0;
    var page;
    do {
      page = _getTaskRepo().findAll({ limit: 1000, offset: offset });
      all = all.concat(page.data.map(_taskObjectToArray));
      offset += 1000;
    } while (page.hasMore);
    return all;
  }
  
  function getTask(taskId) {
    var found = _getTaskRepo().findById(taskId);
    return found ? _taskObjectToArray(found) : null;
  }
  
  function updateTask(taskId, updates) {
    try {
      var mapped = {};
      var keyMap = {
        title: 'title', category: 'category', assignedTo: 'assignedTo',
        priority: 'priority', difficulty: 'difficulty', status: 'status',
        startDate: 'startDate', dueDate: 'dueDate', completion: 'completion',
        quality: 'quality', impact: 'impact', evidence: 'evidence',
        reviewer: 'reviewer', notes: 'notes', daysLate: 'daysLate'
      };
      Object.keys(updates).forEach(function(key) {
        if (keyMap[key]) mapped[keyMap[key]] = updates[key];
      });
      
      if (Object.keys(mapped).length === 0) return false;
      
      _getTaskRepo().update(taskId, mapped);
      Logger.info('Tasks', 'Task updated', { id: taskId, fields: Object.keys(mapped) });
      return true;
    } catch (e) {
      if (e.category === 'NOT_FOUND') return false;
      throw e;
    }
  }
  
  function deleteTask(taskId) {
    try {
      _getTaskRepo().delete(taskId);
      Logger.info('Tasks', 'Task deleted', { id: taskId });
      return true;
    } catch (e) {
      if (e.category === 'NOT_FOUND') return false;
      throw e;
    }
  }
  
  /* ───────────────────────────────────────────
     3. SEARCH & FILTER (preserved logic)
     ─────────────────────────────────────────── */
  
  function getTasksByStatus(status) {
    return getTasks().filter(function(task) { return task[6] === status; });
  }
  
  function getTasksByMember(member) {
    return getTasks().filter(function(task) { return task[3] === member; });
  }
  
  function getTasksByPriority(priority) {
    return getTasks().filter(function(task) { return task[4] === priority; });
  }
  
  function getTasksByCategory(category) {
    return getTasks().filter(function(task) { return task[2] === category; });
  }
  
  function getLateTasks() {
    var today = new Date();
    return getTasks().filter(function(task) {
      if (!isValidDate(task[8])) return false;
      var due = new Date(task[8]);
      var status = task[6];
      return (
        due < today &&
        status !== APP.TASK_STATUS.APPROVED &&
        status !== APP.TASK_STATUS.CANCELLED &&
        status !== APP.TASK_STATUS.REJECTED
      );
    });
  }
  
  function calculateLateDays(task) {
    var status = task[6];
    if (status === APP.TASK_STATUS.APPROVED ||
        status === APP.TASK_STATUS.CANCELLED ||
        status === APP.TASK_STATUS.REJECTED)
      return 0;
    if (!isValidDate(task[8])) return 0;
    var today = new Date();
    var due = new Date(task[8]);
    if (today <= due) return 0;
    return Math.floor((today - due) / (1000 * 60 * 60 * 24));
  }
  
  function updateLateDays() {
    var tasks = getTasks();
    tasks.forEach(function(task) {
      var late = calculateLateDays(task);
      updateTask(task[0], { daysLate: late });
    });
  }
  
  /* ───────────────────────────────────────────
     4. STATUS TRANSITIONS (preserved logic)
     ─────────────────────────────────────────── */
  
  function changeTaskStatus(taskId, status) {
    return updateTask(taskId, { status: status });
  }
  
  function startTask(taskId) {
    return changeTaskStatus(taskId, APP.TASK_STATUS.IN_PROGRESS);
  }
  
  function submitTask(taskId) {
    return changeTaskStatus(taskId, APP.TASK_STATUS.WAITING_REVIEW);
  }
  
  function approveTask(taskId) {
    return updateTask(taskId, {
      status: APP.TASK_STATUS.APPROVED,
      completion: 100
    });
  }
  
  function rejectTask(taskId) {
    return changeTaskStatus(taskId, APP.TASK_STATUS.REJECTED);
  }
  
  function cancelTask(taskId) {
    return changeTaskStatus(taskId, APP.TASK_STATUS.CANCELLED);
  }
  
  function assignTask(taskId, member) {
    return updateTask(taskId, { assignedTo: member });
  }
  
  function updateCompletion(taskId, percent) {
    percent = clamp(percent, 0, 100);
    return updateTask(taskId, { completion: percent });
  }
  
  /* ───────────────────────────────────────────
     5. SCORING ENGINE (preserved formulas)
     ─────────────────────────────────────────── */
  
  function calculateTaskWeight(task) {
    var priorityWeight = (APP.TASK_WEIGHT.PRIORITY[task[4]] || 1);
    var difficultyWeight = (APP.TASK_WEIGHT.DIFFICULTY[task[5]] || 1);
    return round(priorityWeight * difficultyWeight, 2);
  }
  
  function calculateTaskScore(task) {
    var completion = toNumber(task[9]);
    var quality = toNumber(task[10]);
    var impact = toNumber(task[11]);
    var evidence = toNumber(task[12]);
    var score = (completion * 0.40) + (quality * 0.30) + (impact * 0.20) + (evidence * 0.10);
    return round(score);
  }
  
  function calculateWeightedScore(task) {
    var score = calculateTaskScore(task);
    var weight = calculateTaskWeight(task);
    return round(score * weight);
  }
  
  function recalculateAllTasks() {
    var repo = _getTaskRepo();
    var all = [];
    var offset = 0;
    var page;
    do {
      page = repo.findAll({ limit: 1000, offset: offset });
      all = all.concat(page.data);
      offset += 1000;
    } while (page.hasMore);
    
    all.forEach(function(task) {
      var arr = _taskObjectToArray(task);
      repo.update(task.id, {
        taskScore: calculateTaskScore(arr),
        taskWeight: calculateTaskWeight(arr),
        weightedScore: calculateWeightedScore(arr),
        daysLate: calculateLateDays(arr)
      });
    });
    
    Logger.info('Tasks', 'Recalculated ' + all.length + ' tasks');
  }
  
  /* ───────────────────────────────────────────
     6. STATISTICS (preserved logic)
     ─────────────────────────────────────────── */
  
  function totalTasks() {
    return _getTaskRepo().count();
  }
  
  function completedTasks() {
    return getTasksByStatus(APP.TASK_STATUS.APPROVED).length;
  }
  
  function activeTasks() {
    return getTasksByStatus(APP.TASK_STATUS.IN_PROGRESS).length;
  }
  
  function pendingTasks() {
    return getTasksByStatus(APP.TASK_STATUS.WAITING_REVIEW).length;
  }
  
  function averageTaskScore() {
    var tasks = getTasks();
    if (tasks.length === 0) return 0;
    var total = 0;
    tasks.forEach(function(t) { total += toNumber(t[17]); });
    return round(total / tasks.length);
  }
  
  /* ───────────────────────────────────────────
     7. DASHBOARD & REFRESH (preserved logic)
     ─────────────────────────────────────────── */
  
  function updateDashboard() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dashboard = ss.getSheetByName('Dashboard');
    if (!dashboard) {
      dashboard = ss.insertSheet('Dashboard');
    }
    dashboard.clear();
    dashboard.appendRow(["Metric", "Value"]);
    dashboard.appendRow(["Total Tasks", totalTasks()]);
    dashboard.appendRow(["Completed", completedTasks()]);
    dashboard.appendRow(["In Progress", activeTasks()]);
    dashboard.appendRow(["Waiting Review", pendingTasks()]);
    dashboard.appendRow(["Late Tasks", getLateTasks().length]);
    dashboard.appendRow(["Average Score", averageTaskScore()]);
  }
  
  function refreshSystem() {
    recalculateAllTasks();
    updateDashboard();
  }
  
  /* ───────────────────────────────────────────
     8. LEGACY onEdit (MOVED to 12_GlobalTriggers.gs)
     ───────────────────────────────────────────
     NOTE: The old onEdit(e) that called refreshSystem() on every edit
     has been removed to avoid conflict with 12_GlobalTriggers.gs.
     If you had a trigger pointing to Tasks.onEdit, reconfigure it
     to use the global onEdit in 12_GlobalTriggers.gs instead.
     ─────────────────────────────────────────── */