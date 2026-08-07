/**
 * Tasks Module Test
 * Run: testTasksModule()
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