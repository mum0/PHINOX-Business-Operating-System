/**
 * Tasks Module Test
 * Independent test suite for Phase 2.
 * Run: testTasksModule() for unit tests
 * Run: testTasksE2E() for end-to-end tests
 */

function testTasksModule() {
  console.log('=== Tasks Module Test Suite ===');
  let pass = 0, fail = 0;
  function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

  console.log('\n--- TaskSchema ---');
  assert(TaskSchema.SCHEMA.id === 1, 'Schema id column is 1');
  assert(TaskSchema.SCHEMA.title === 2, 'Schema title column is 2');
  assert(TaskSchema.SCHEMA.taskScore === 16, 'Schema taskScore column is 16');
  assert(TaskSchema.SCHEMA.taskWeight === 17, 'Schema taskWeight column is 17');
  assert(Object.keys(TaskSchema.SCHEMA).length >= 21, 'Schema has at least 21 fields');
  assert(TaskSchema.STATUS.NOT_STARTED === 'Not Started', 'Status enum correct');
  assert(TaskSchema.PRIORITY.HIGH === 'High', 'Priority enum correct');
  assert(TaskSchema.PRIORITY.CRITICAL === 'Critical', 'Priority Critical enum correct');
  assert(TaskSchema.DIFFICULTY.EXPERT === 'Expert', 'Difficulty Expert enum correct');
  assert(TaskSchema.WEIGHT.PRIORITY['Critical'] === 1.8, 'Weight Priority Critical = 1.8');
  assert(TaskSchema.WEIGHT.DIFFICULTY['Expert'] === 2.0, 'Weight Difficulty Expert = 2.0');
  assert(TaskSchema.isValidStatusTransition('Not Started', 'In Progress') === true, 'Valid transition');
  assert(TaskSchema.isValidStatusTransition('Not Started', 'Approved') === false, 'Invalid transition blocked');

  console.log('\n--- TaskRepository ---');
  assert(typeof TaskRepository.findById === 'function', 'Repository has findById');
  assert(typeof TaskRepository.findAll === 'function', 'Repository has findAll');
  assert(typeof TaskRepository.create === 'function', 'Repository has create');
  assert(typeof TaskRepository.update === 'function', 'Repository has update');
  assert(typeof TaskRepository.delete === 'function', 'Repository has delete');

  console.log('\n--- TaskService ---');
  const sampleTask = {
    priority: 'High', difficulty: 'Hard',
    completion: 80, quality: 90, impact: 70, evidence: 60,
    status: 'In Progress', dueDate: new Date(Date.now() + 86400000)
  };
  const weight = TaskService.calculateTaskWeight(sampleTask);
  assert(weight === 1.95, 'Weight calculated: ' + weight + ' (expected 1.95 = 1.3*1.5)');
  const score = TaskService.calculateTaskScore(sampleTask);
  assert(score === 79, 'Score calculated: ' + score + ' (expected 79)');
  const weightedScore = TaskService.calculateWeightedScore(sampleTask);
  assert(weightedScore === 154.05, 'Weighted score: ' + weightedScore + ' (expected 154.05 = 79*1.95)');
  assert(TaskService.calculateLateDays(sampleTask) === 0, 'Late days for future task: 0');
  assert(TaskService.calculateLateDays(Object.assign({}, sampleTask, { dueDate: new Date(Date.now() - 86400000) })) > 0, 'Late days for past task > 0');
  assert(TaskService.calculateLateDays(Object.assign({}, sampleTask, { status: 'Approved' })) === 0, 'Late days for approved: 0');
  try { TaskService.createTask({}); assert(false, 'Validation should reject empty task'); }
  catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Validation rejects empty task'); }
  assert(typeof TaskService.createTaskLegacy === 'function', 'Legacy createTask exists');
  assert(typeof TaskService.getTasksLegacy === 'function', 'Legacy getTasks exists');
  assert(typeof TaskService.updateTaskLegacy === 'function', 'Legacy updateTask exists');

  console.log('\n--- TaskController ---');
  assert(typeof TaskController.onEdit === 'function', 'Controller has onEdit');
  assert(typeof TaskController.handleApiAction === 'function', 'Controller has handleApiAction');
  assert(typeof TaskController.showTaskStats === 'function', 'Controller has showTaskStats');
  try { TaskController.handleApiAction('task.stats', {}); assert(true, 'Stats API action routes correctly'); }
  catch (e) { assert(false, 'Stats API action failed: ' + e.message); }
  try { TaskController.handleApiAction('task.unknown', {}); assert(false, 'Unknown action should fail'); }
  catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Unknown action rejected'); }

  console.log('\n--- Backward Compatibility ---');
  assert(typeof createTask === 'function' || typeof TaskService.createTaskLegacy === 'function', 'Task creation API available');
  assert(typeof getTask === 'function' || typeof TaskService.getTaskLegacy === 'function', 'Task retrieval API available');

  console.log('\n=== Test Summary ===');
  console.log('Passed: ' + pass); console.log('Failed: ' + fail); console.log('Total: ' + (pass + fail));
  if (fail > 0) throw new Error(fail + ' test(s) failed');
  console.log('All tests passed!');
  return { passed: pass, failed: fail };
}

/**
 * Tasks E2E Test
 * Full flow: create → get → update → status → assign → delete
 * Uses REAL data in Tasks sheet. Cleans up after itself.
 * Run: testTasksE2E()
 */
function testTasksE2E() {
  console.log('=== Tasks E2E Test ===');
  let pass = 0, fail = 0;
  function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

  const testPrefix = 'E2E-TEST-' + Date.now();
  let taskId = null;
  let cleanupIds = [];

  function cleanup() {
    console.log('--- Cleaning up test data ---');
    cleanupIds.forEach(function(id) {
      try { TaskService.deleteTask(id); console.log('  Deleted: ' + id); } catch (e) {}
    });
    // Also clean by title prefix
    try {
      const all = TaskService.getTasks({ limit: 1000 });
      all.data.forEach(function(t) {
        if (t.title && String(t.title).indexOf(testPrefix) === 0) {
          try { TaskService.deleteTask(t.id); console.log('  Deleted by prefix: ' + t.id); } catch (e) {}
        }
      });
    } catch (e) {}
  }

  try {
    // 1. CREATE
    console.log('\n--- Step 1: Create ---');
    taskId = TaskService.createTask({
      title: testPrefix + ' Create Test',
      assignedTo: 'test@phinox.io',
      priority: TaskSchema.PRIORITY.HIGH,
      difficulty: TaskSchema.DIFFICULTY.HARD,
      category: 'E2E',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString()
    });
    cleanupIds.push(taskId);
    assert(typeof taskId === 'string' && taskId.indexOf('TASK-') === 0, 'createTask returns TASK ID: ' + taskId);

    // 2. GET
    console.log('\n--- Step 2: Get ---');
    const task = TaskService.getTask(taskId);
    assert(task !== null, 'getTask finds created task');
    assert(task.title === testPrefix + ' Create Test', 'getTask title matches');
    assert(task.priority === 'High', 'getTask priority correct');
    assert(task.status === 'Not Started', 'getTask default status');
    assert(task.taskWeight === 1.95, 'getTask weight auto-calculated: ' + task.taskWeight);
    assert(task.taskScore === 0, 'getTask score starts at 0');
    assert(task.assignedTo === 'test@phinox.io', 'getTask assignee correct');

    // 3. UPDATE (completion + quality)
    console.log('\n--- Step 3: Update ---');
    TaskService.updateTask(taskId, { completion: 50, quality: 80 });
    const updated = TaskService.getTask(taskId);
    assert(updated.completion === 50, 'updateTask completion: 50');
    assert(updated.quality === 80, 'updateTask quality: 80');
    assert(updated.taskScore > 0, 'updateTask auto-recalculated score: ' + updated.taskScore);
    assert(updated.taskWeight === 1.95, 'updateTask weight unchanged: ' + updated.taskWeight);

    // 4. ASSIGN
    console.log('\n--- Step 4: Assign ---');
    TaskService.assignTask(taskId, 'assigned@phinox.io');
    const assigned = TaskService.getTask(taskId);
    assert(assigned.assignedTo === 'assigned@phinox.io', 'assignTask changes assignee');

    // 5. STATUS TRANSITIONS
    console.log('\n--- Step 5: Status Transitions ---');
    TaskService.startTask(taskId);
    assert(TaskService.getTask(taskId).status === 'In Progress', 'startTask → In Progress');

    TaskService.submitTask(taskId);
    assert(TaskService.getTask(taskId).status === 'Waiting Review', 'submitTask → Waiting Review');

    TaskService.approveTask(taskId);
    const approved = TaskService.getTask(taskId);
    assert(approved.status === 'Approved', 'approveTask → Approved');
    assert(approved.completion === 100, 'approveTask auto-sets completion 100');

    // 6. QUERIES
    console.log('\n--- Step 6: Queries ---');
    const byStatus = TaskService.getTasksByStatus('Approved');
    assert(byStatus.data.some(function(t) { return t.id === taskId; }), 'getTasksByStatus finds task');

    const byMember = TaskService.getTasksByMember('assigned@phinox.io');
    assert(byMember.data.some(function(t) { return t.id === taskId; }), 'getTasksByMember finds task');

    const byPriority = TaskService.getTasksByPriority('High');
    assert(byPriority.data.some(function(t) { return t.id === taskId; }), 'getTasksByPriority finds task');

    const byCategory = TaskService.getTasksByCategory('E2E');
    assert(byCategory.data.some(function(t) { return t.id === taskId; }), 'getTasksByCategory finds task');

    // 7. LATE TASKS (create a late task specifically)
    console.log('\n--- Step 7: Late Tasks ---');
    const lateTaskId = TaskService.createTask({
      title: testPrefix + ' Late Task',
      assignedTo: 'late@phinox.io',
      priority: TaskSchema.PRIORITY.LOW,
      difficulty: TaskSchema.DIFFICULTY.EASY,
      dueDate: new Date(Date.now() - 2 * 86400000).toISOString()
    });
    cleanupIds.push(lateTaskId);
    const lateList = TaskService.getLateTasks();
    assert(lateList.data.some(function(t) { return t.id === lateTaskId; }), 'getLateTasks finds overdue task');
    assert(TaskService.calculateLateDays(TaskService.getTask(lateTaskId)) >= 2, 'calculateLateDays >= 2');

    // Approve late task — should disappear from late list
    TaskService.approveTask(lateTaskId);
    assert(!TaskService.getLateTasks().data.some(function(t) { return t.id === lateTaskId; }), 'Approved task not in late tasks');

    // 8. DELETE
    console.log('\n--- Step 8: Delete ---');
    TaskService.deleteTask(taskId);
    assert(TaskService.getTask(taskId) === null, 'deleteTask removes task');
    TaskService.deleteTask(lateTaskId);
    assert(TaskService.getTask(lateTaskId) === null, 'deleteTask removes late task');

    // Remove from cleanup since already deleted
    cleanupIds = cleanupIds.filter(function(id) { return id !== taskId && id !== lateTaskId; });

    // 9. STATISTICS
    console.log('\n--- Step 9: Statistics ---');
    assert(typeof TaskService.totalTasks() === 'number', 'totalTasks returns number');
    assert(typeof TaskService.completedTasks() === 'number', 'completedTasks returns number');
    assert(typeof TaskService.activeTasks() === 'number', 'activeTasks returns number');
    assert(typeof TaskService.pendingTasks() === 'number', 'pendingTasks returns number');
    assert(typeof TaskService.averageTaskScore() === 'number', 'averageTaskScore returns number');

    console.log('\n=== E2E Results: ' + pass + ' passed, ' + fail + ' failed ===');
    if (fail > 0) throw new Error(fail + ' E2E tests failed');
    return 'E2E: ' + pass + ' passed, ' + fail + ' failed';

  } catch (e) {
    console.error('E2E TEST FAILED: ' + e.message);
    cleanup();
    throw e;
  } finally {
    cleanup();
  }
}