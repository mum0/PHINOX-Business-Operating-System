/**
 * Task Controller
 * Presentation / routing layer for Tasks.
 * NO business logic. NO direct sheet access.
 * Routes: Menu clicks, onEdit events, API actions.
 */

const TaskController = (function() {
    'use strict';
  
    // ─── INTERNAL HELPERS ───
  
    function _showAlert(title, message) {
      try {
        SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (e) {
        Logger.warn('TaskController', 'Cannot show alert', { error: e.message });
      }
    }
  
    // ─── onEdit HANDLER ───
    // Called via EventBus from 12_GlobalTriggers.gs — do NOT create a separate trigger.
  
    function onEdit(payload) {
      if (!payload || payload.sheet !== CONFIG.SHEETS.TASKS) return;
  
      Logger.debug('TaskController', 'Tasks sheet edited', {
        row: payload.range ? payload.range.getRow() : null,
        col: payload.range ? payload.range.getColumn() : null,
        user: payload.user
      });
  
      // Optional: debounced recalculation could go here
      // For now, we log and leave heavy ops to manual refresh or scheduled triggers
    }
  
    // ─── STATS DIALOG ───
  
    function showTaskStats() {
      const stats = {
        total: TaskService.totalTasks(),
        completed: TaskService.completedTasks(),
        active: TaskService.activeTasks(),
        pending: TaskService.pendingTasks(),
        waitingReview: TaskService.getTasksByStatus(TaskSchema.STATUS.WAITING_REVIEW).data.length,
        late: TaskService.getLateTasks().data.length,
        averageScore: TaskService.averageTaskScore()
      };
  
      const htmlContent =
        '<div style="font-family: Arial, sans-serif; padding: 12px;">' +
        '<h2 style="color:#1a237e;margin-top:0;">📊 Task Statistics</h2>' +
        '<table style="width:100%;border-collapse:collapse;">' +
        '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total Tasks</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.total + '</td></tr>' +
        '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Completed</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.completed + '</td></tr>' +
        '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Active (In Progress)</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.active + '</td></tr>' +
        '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Waiting Review</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.waitingReview + '</td></tr>' +
        '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Pending (Not Started)</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.pending + '</td></tr>' +
        '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#c62828;"><b>Late Tasks</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#c62828;">' + stats.late + '</td></tr>' +
        '<tr><td style="padding:6px;"><b>Average Score</b></td><td style="padding:6px;text-align:right;">' + stats.averageScore + '</td></tr>' +
        '</table>' +
        '<p style="margin-top:12px;font-size:12px;color:#666;text-align:center;">PHINOX BOS v5.0</p>' +
        '</div>';
  
      const html = HtmlService.createHtmlOutput(htmlContent)
        .setWidth(360)
        .setHeight(340);
  
      SpreadsheetApp.getUi().showModalDialog(html, 'Task Statistics');
      return stats;
    }
  
    // ─── API ROUTER ───
    // Used by web app entry points or menu handlers
  
    function handleApiAction(action, params) {
      params = params || {};
  
      if (!action || typeof action !== 'string') {
        throw ErrorHandler.validation('Action is required', {}, 'TaskController');
      }
  
      Logger.info('TaskController', 'API action: ' + action, { params: Object.keys(params) });
  
      switch (action) {
        // Stats & UI
        case 'task.stats':
          return showTaskStats();
  
        // CRUD
        case 'task.list':
          return TaskService.getTasks(params);
        case 'task.get':
          if (!params.id) throw ErrorHandler.validation('ID required for task.get', {}, 'TaskController');
          return TaskService.getTask(params.id);
        case 'task.create':
          return TaskService.createTask(params);
        case 'task.update':
          if (!params.id) throw ErrorHandler.validation('ID required for task.update', {}, 'TaskController');
          return TaskService.updateTask(params.id, params.updates || Utils.omit(params, ['id', 'action']));
        case 'task.delete':
          if (!params.id) throw ErrorHandler.validation('ID required for task.delete', {}, 'TaskController');
          return TaskService.deleteTask(params.id);
  
        // Status workflows
        case 'task.start':
          if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController');
          return TaskService.startTask(params.id);
        case 'task.submit':
          if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController');
          return TaskService.submitTask(params.id);
        case 'task.approve':
          if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController');
          return TaskService.approveTask(params.id);
        case 'task.reject':
          if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController');
          return TaskService.rejectTask(params.id);
        case 'task.cancel':
          if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController');
          return TaskService.cancelTask(params.id);
  
        // Assignment & completion
        case 'task.assign':
          if (!params.id || !params.member) throw ErrorHandler.validation('ID and member required', {}, 'TaskController');
          return TaskService.assignTask(params.id, params.member);
        case 'task.completion':
          if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController');
          return TaskService.updateCompletion(params.id, params.percent);
  
        // Bulk ops
        case 'task.refresh':
          return TaskService.refreshSystem();
        case 'task.recalculate':
          return TaskService.recalculateAllTasks();
        case 'task.updateLateDays':
          return TaskService.updateLateDays();
  
        default:
          throw ErrorHandler.validation('Unknown action: ' + action, {}, 'TaskController');
      }
    }
  
    // ─── MENU HANDLERS (callable from 11_Menu.js) ───
  
    function menuShowStats() {
      try {
        showTaskStats();
      } catch (e) {
        _showAlert('Error', e.message);
        throw e;
      }
    }
  
    function menuRefreshTasks() {
      try {
        const result = TaskService.refreshSystem();
        _showAlert('Success', 'System refreshed. Check logs for details.');
        return result;
      } catch (e) {
        _showAlert('Error', e.message);
        throw e;
      }
    }
  
    function menuCreateTask() {
      const ui = SpreadsheetApp.getUi();
      const response = ui.prompt('Create Task', 'Enter task title:', ui.ButtonSet.OK_CANCEL);
      if (response.getSelectedButton() === ui.Button.OK) {
        const title = response.getResponseText().trim();
        if (!title) {
          _showAlert('Error', 'Title is required');
          return;
        }
        try {
          const id = TaskService.createTask({
            title: title,
            assignedTo: Security.currentUser(),
            priority: TaskSchema.PRIORITY.MEDIUM,
            difficulty: TaskSchema.DIFFICULTY.MEDIUM
          });
          _showAlert('Success', 'Task created: ' + id);
        } catch (e) {
          _showAlert('Error', e.message);
        }
      }
    }
  
    // ─── EVENT BUS REGISTRATION ───
    // Listen to global sheet edits from 12_GlobalTriggers.gs
  
    EventBus.on('sheet:edited', onEdit);
  
    return {
      onEdit: onEdit,
      handleApiAction: handleApiAction,
      showTaskStats: showTaskStats,
      menuShowStats: menuShowStats,
      menuRefreshTasks: menuRefreshTasks,
      menuCreateTask: menuCreateTask
    };
  })();