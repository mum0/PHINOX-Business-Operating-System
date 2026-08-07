/**
 * ============================================================
 * PHINOX BOS — Tasks Module Tests
 * Run: Select testTasksModule → Run in GAS editor
 * ============================================================
 */

function testTasksModule() {
    console.log('=== Tasks Module Tests ===');
    var passed = 0;
    var failed = 0;
    
    function assert(cond, msg) {
      if (cond) { passed++; console.log('✓ ' + msg); }
      else { failed++; console.error('✗ ' + msg); }
    }
    
    // 1. createTask
    var taskId = createTask({
      title: 'Test Task Alpha',
      category: 'Development',
      assignedTo: 'TestMember',
      priority: 'High',
      difficulty: 'Hard',
      dueDate: new Date().toISOString()
    });
    assert(typeof taskId === 'string' && taskId.indexOf('TASK-') === 0, 'createTask returns TASK ID');
    
    // 2. getTask
    var task = getTask(taskId);
    assert(task !== null && task[1] === 'Test Task Alpha', 'getTask finds by ID');
    assert(task[4] === 'High', 'getTask priority correct');
    assert(task[6] === 'Not Started', 'getTask default status');
    
    // 3. getTasks
    var all = getTasks();
    assert(Array.isArray(all), 'getTasks returns array');
    assert(all.some(function(t) { return t[0] === taskId; }), 'getTasks includes created task');
    
    // 4. updateTask
    var upd = updateTask(taskId, { status: 'In Progress', completion: 50 });
    assert(upd === true, 'updateTask returns true');
    var updated = getTask(taskId);
    assert(updated[6] === 'In Progress', 'updateTask status changed');
    assert(updated[9] === 50, 'updateTask completion changed');
    
    // 5. Status transitions
    startTask(taskId);
    assert(getTask(taskId)[6] === 'In Progress', 'startTask sets In Progress');
    
    submitTask(taskId);
    assert(getTask(taskId)[6] === 'Waiting Review', 'submitTask sets Waiting Review');
    
    approveTask(taskId);
    var approved = getTask(taskId);
    assert(approved[6] === 'Approved', 'approveTask sets Approved');
    assert(approved[9] === 100, 'approveTask sets completion 100');
    
    // Create another for reject/cancel tests
    var taskId2 = createTask({ title: 'Test Beta', assignedTo: 'TestMember', priority: 'Low', difficulty: 'Easy' });
    rejectTask(taskId2);
    assert(getTask(taskId2)[6] === 'Rejected', 'rejectTask sets Rejected');
    
    var taskId3 = createTask({ title: 'Test Gamma', assignedTo: 'TestMember', priority: 'Medium', difficulty: 'Medium' });
    cancelTask(taskId3);
    assert(getTask(taskId3)[6] === 'Cancelled', 'cancelTask sets Cancelled');
    
    // 6. assignTask
    assignTask(taskId, 'AnotherMember');
    assert(getTask(taskId)[3] === 'AnotherMember', 'assignTask changes assignee');
    
    // 7. updateCompletion
    var taskId4 = createTask({ title: 'Test Delta', assignedTo: 'TestMember', priority: 'Low', difficulty: 'Easy' });
    updateCompletion(taskId4, 75);
    assert(getTask(taskId4)[9] === 75, 'updateCompletion sets percent');
    updateCompletion(taskId4, 150);
    assert(getTask(taskId4)[9] === 100, 'updateCompletion clamps to 100');
    updateCompletion(taskId4, -10);
    assert(getTask(taskId4)[9] === 0, 'updateCompletion clamps to 0');
    
    // 8. getTasksByStatus
    var inProgress = getTasksByStatus('In Progress');
    assert(inProgress.every(function(t) { return t[6] === 'In Progress'; }), 'getTasksByStatus filters correctly');
    
    // 9. getTasksByMember
    var byMember = getTasksByMember('AnotherMember');
    assert(byMember.some(function(t) { return t[0] === taskId; }), 'getTasksByMember finds task');
    
    // 10. getTasksByPriority
    var byPriority = getTasksByPriority('High');
    assert(byPriority.some(function(t) { return t[0] === taskId; }), 'getTasksByPriority finds task');
    
    // 11. Late tasks
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var lateTaskId = createTask({
      title: 'Late Task',
      assignedTo: 'TestMember',
      priority: 'Low',
      difficulty: 'Easy',
      dueDate: yesterday.toISOString()
    });
    var late = getLateTasks();
    assert(late.some(function(t) { return t[0] === lateTaskId; }), 'getLateTasks finds overdue task');
    
    var lateDays = calculateLateDays(getTask(lateTaskId));
    assert(lateDays >= 1, 'calculateLateDays returns >= 1 for yesterday');
    
    // Approve late task — should no longer be late
    approveTask(lateTaskId);
    assert(getLateTasks().every(function(t) { return t[0] !== lateTaskId; }), 'Approved task not in late tasks');
    
    // 12. Scoring
    var scoreTaskId = createTask({
      title: 'Score Task',
      assignedTo: 'TestMember',
      priority: 'High',
      difficulty: 'Hard'
    });
    updateTask(scoreTaskId, { completion: 100, quality: 90, impact: 80, evidence: 70 });
    recalculateAllTasks();
    var scored = getTask(scoreTaskId);
    assert(scored[15] > 0, 'recalculateAllTasks sets taskScore');
    assert(scored[16] > 0, 'recalculateAllTasks sets taskWeight');
    assert(scored[17] > 0, 'recalculateAllTasks sets weightedScore');
    
    var weight = calculateTaskWeight(scored);
    assert(weight === 1.95, 'calculateTaskWeight High*Hard = 1.3*1.5 = 1.95');
    
    // 13. Statistics
    var total = totalTasks();
    assert(total >= 6, 'totalTasks counts all created tasks');
    assert(completedTasks() >= 2, 'completedTasks counts approved');
    assert(activeTasks() >= 0, 'activeTasks returns number');
    assert(pendingTasks() >= 0, 'pendingTasks returns number');
    
    // 14. averageTaskScore
    var avg = averageTaskScore();
    assert(typeof avg === 'number', 'averageTaskScore returns number');
    
    // 15. updateDashboard
    updateDashboard();
    var dash = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dashboard');
    assert(dash !== null, 'updateDashboard creates Dashboard sheet');
    var dashData = dash.getDataRange().getValues();
    assert(dashData.length >= 7, 'Dashboard has metric rows');
    
    // 16. deleteTask
    deleteTask(taskId);
    assert(getTask(taskId) === null, 'deleteTask removes task');
    deleteTask(taskId2);
    deleteTask(taskId3);
    deleteTask(taskId4);
    deleteTask(lateTaskId);
    deleteTask(scoreTaskId);
    
    // Cleanup any remaining test tasks
    getTasks().forEach(function(t) {
      if (String(t[1]).indexOf('Test') === 0 || String(t[1]).indexOf('Late') === 0 || String(t[1]).indexOf('Score') === 0) {
        deleteTask(t[0]);
      }
    });
    
    console.log('=== Tasks Tests: ' + passed + ' passed, ' + failed + ' failed ===');
    if (failed > 0) throw new Error(failed + ' tests failed');
    return 'Tasks module: ' + passed + ' tests passed';
  }