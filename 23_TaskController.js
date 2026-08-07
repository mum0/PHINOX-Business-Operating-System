/**
 * Task Controller
 * Presentation / routing layer. NO business logic.
 */

const TaskController = (function() {
  'use strict';

  function _alert(title, msg) {
    try { SpreadsheetApp.getUi().alert(title, msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
  }

  function onEdit(payload) {
    if (!payload || payload.sheet !== CONFIG.SHEETS.TASKS) return;
    Logger.debug('TaskController', 'Tasks sheet edited', { row: payload.range ? payload.range.getRow() : null, user: payload.user });
  }

  function showTaskStats() {
    const stats = {
      total: TaskService.totalTasks(), completed: TaskService.completedTasks(),
      active: TaskService.activeTasks(), pending: TaskService.pendingTasks(),
      waitingReview: TaskService.getTasksByStatus(TaskSchema.STATUS.WAITING_REVIEW).data.length,
      late: TaskService.getLateTasks().data.length, averageScore: TaskService.averageTaskScore()
    };
    const html = HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:12px;"><h2 style="color:#1a237e;margin-top:0;">📊 Task Statistics</h2>' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Total Tasks</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.total + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Completed</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.completed + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Active</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.active + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Waiting Review</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.waitingReview + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;"><b>Pending</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;">' + stats.pending + '</td></tr>' +
      '<tr><td style="padding:6px;border-bottom:1px solid #ddd;color:#c62828;"><b>Late Tasks</b></td><td style="padding:6px;border-bottom:1px solid #ddd;text-align:right;color:#c62828;">' + stats.late + '</td></tr>' +
      '<tr><td style="padding:6px;"><b>Average Score</b></td><td style="padding:6px;text-align:right;">' + stats.averageScore + '</td></tr>' +
      '</table></div>'
    ).setWidth(360).setHeight(340);
    SpreadsheetApp.getUi().showModalDialog(html, 'Task Statistics');
    return stats;
  }

  function handleApiAction(action, params) {
    params = params || {};
    if (!action || typeof action !== 'string') throw ErrorHandler.validation('Action required', {}, 'TaskController');
    Logger.info('TaskController', 'API action: ' + action, { params: Object.keys(params) });
    switch (action) {
      case 'task.stats': return showTaskStats();
      case 'task.list': return TaskService.getTasks(params);
      case 'task.get': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.getTask(params.id);
      case 'task.create': return TaskService.createTask(params);
      case 'task.update': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.updateTask(params.id, params.updates || Utils.omit(params, ['id', 'action']));
      case 'task.delete': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.deleteTask(params.id);
      case 'task.start': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.startTask(params.id);
      case 'task.submit': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.submitTask(params.id);
      case 'task.approve': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.approveTask(params.id);
      case 'task.reject': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.rejectTask(params.id);
      case 'task.cancel': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.cancelTask(params.id);
      case 'task.assign': if (!params.id || !params.member) throw ErrorHandler.validation('ID and member required', {}, 'TaskController'); return TaskService.assignTask(params.id, params.member);
      case 'task.completion': if (!params.id) throw ErrorHandler.validation('ID required', {}, 'TaskController'); return TaskService.updateCompletion(params.id, params.percent);
      case 'task.refresh': return TaskService.refreshSystem();
      case 'task.recalculate': return TaskService.recalculateAllTasks();
      case 'task.updateLateDays': return TaskService.updateLateDays();
      default: throw ErrorHandler.validation('Unknown action: ' + action, {}, 'TaskController');
    }
  }

  function menuShowStats() { try { showTaskStats(); } catch (e) { _alert('Error', e.message); throw e; } }
  function menuRefreshTasks() { try { TaskService.refreshSystem(); _alert('Success', 'System refreshed.'); } catch (e) { _alert('Error', e.message); throw e; } }
  function menuCreateTask() {
    const ui = SpreadsheetApp.getUi();
    const r = ui.prompt('Create Task', 'Enter task title:', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() === ui.Button.OK) {
      const title = r.getResponseText().trim();
      if (!title) { _alert('Error', 'Title is required'); return; }
      try { const id = TaskService.createTask({ title: title, assignedTo: Security.currentUser(), priority: TaskSchema.PRIORITY.MEDIUM, difficulty: TaskSchema.DIFFICULTY.MEDIUM }); _alert('Success', 'Task created: ' + id); } catch (e) { _alert('Error', e.message); }
    }
  }

  EventBus.on('sheet:edited', onEdit);

  return {
    onEdit: onEdit, handleApiAction: handleApiAction, showTaskStats: showTaskStats,
    menuShowStats: menuShowStats, menuRefreshTasks: menuRefreshTasks, menuCreateTask: menuCreateTask
  };
})();