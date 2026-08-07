/**
 * Tasks Module Test
 * Independent test suite for Phase 2.
 * Run: testTasksModule()
 */

function testTasksModule() {
    console.log('=== Tasks Module Test Suite ===');
    
    let pass = 0;
    let fail = 0;
    
    function assert(condition, message) {
      if (condition) {
        pass++;
        console.log('  ✓ ' + message);
      } else {
        fail++;
        console.error('  ✗ ' + message);
      }
    }
    
    // ============ SCHEMA TESTS ============
    console.log('\n--- TaskSchema ---');
    
    assert(TaskSchema.SCHEMA.id === 1, 'Schema id column is 1');
    assert(TaskSchema.SCHEMA.title === 2, 'Schema title column is 2');
    assert(Object.keys(TaskSchema.SCHEMA).length >= 21, 'Schema has at least 21 fields');
    assert(TaskSchema.STATUS.NOT_STARTED === 'Not Started', 'Status enum correct');
    assert(TaskSchema.PRIORITY.HIGH === 'High', 'Priority enum correct');
    assert(TaskSchema.DIFFICULTY.CRITICAL === 'Critical', 'Difficulty enum correct');
    assert(TaskSchema.WEIGHT.PRIORITY['Urgent'] === 1.5, 'Weight map correct');
    assert(TaskSchema.isValidStatusTransition('Not Started', 'In Progress') === true, 'Valid transition');
    assert(TaskSchema.isValidStatusTransition('Not Started', 'Approved') === false, 'Invalid transition blocked');
    
    // ============ REPOSITORY TESTS ============
    console.log('\n--- TaskRepository ---');
    
    assert(typeof TaskRepository.findById === 'function', 'Repository has findById');
    assert(typeof TaskRepository.findAll === 'function', 'Repository has findAll');
    assert(typeof TaskRepository.create === 'function', 'Repository has create');
    assert(typeof TaskRepository.update === 'function', 'Repository has update');
    assert(typeof TaskRepository.delete === 'function', 'Repository has delete');
    
    // ============ SERVICE TESTS ============
    console.log('\n--- TaskService ---');
    
    // Test calculations
    const sampleTask = {
      priority: 'High',
      difficulty: 'Hard',
      completion: 80,
      quality: 90,
      impact: 70,
      evidence: 60,
      status: 'In Progress',
      dueDate: new Date(Date.now() + 86400000) // tomorrow
    };
    
    const weight = TaskService.calculateTaskWeight(sampleTask);
    assert(weight === 1.56, 'Weight calculated: ' + weight + ' (expected 1.56)');
    
    const score = TaskService.calculateTaskScore(sampleTask);
    assert(score === 79, 'Score calculated: ' + score + ' (expected 79)');
    
    const weightedScore = TaskService.calculateWeightedScore(sampleTask);
    assert(weightedScore === 123.24, 'Weighted score: ' + weightedScore + ' (expected 123.24)');
    
    const lateDays = TaskService.calculateLateDays(sampleTask);
    assert(lateDays === 0, 'Late days for future task: 0');
    
    const lateTask = Object.assign({}, sampleTask, { dueDate: new Date(Date.now() - 86400000) });
    assert(TaskService.calculateLateDays(lateTask) > 0, 'Late days for past task > 0');
    
    const approvedTask = Object.assign({}, sampleTask, { status: 'Approved' });
    assert(TaskService.calculateLateDays(approvedTask) === 0, 'Late days for approved: 0');
    
    // Test validation
    try {
      TaskService.createTask({}); // Should fail validation
      assert(false, 'Validation should reject empty task');
    } catch (e) {
      assert(e.category === 'VALIDATION_ERROR', 'Validation rejects empty task');
    }
    
    // Test backward compatibility wrappers exist
    assert(typeof TaskService.createTaskLegacy === 'function', 'Legacy createTask exists');
    assert(typeof TaskService.getTasksLegacy === 'function', 'Legacy getTasks exists');
    assert(typeof TaskService.updateTaskLegacy === 'function', 'Legacy updateTask exists');
    
    // ============ CONTROLLER TESTS ============
    console.log('\n--- TaskController ---');
    
    assert(typeof TaskController.onEdit === 'function', 'Controller has onEdit');
    assert(typeof TaskController.handleApiAction === 'function', 'Controller has handleApiAction');
    assert(typeof TaskController.showTaskStats === 'function', 'Controller has showTaskStats');
    
    // Test API routing
    try {
      TaskController.handleApiAction('task.stats', {});
      assert(true, 'Stats API action routes correctly');
    } catch (e) {
      assert(false, 'Stats API action failed: ' + e.message);
    }
    
    try {
      TaskController.handleApiAction('task.unknown', {});
      assert(false, 'Unknown action should fail');
    } catch (e) {
      assert(e.category === 'VALIDATION_ERROR', 'Unknown action rejected');
    }
    
    // ============ BACKWARD COMPATIBILITY CHECK ============
    console.log('\n--- Backward Compatibility ---');
    
    // Ensure old Tasks.js functions still exist (do not break existing code)
    assert(typeof createTask === 'function' || typeof TaskService.createTaskLegacy === 'function', 
           'Task creation API available');
    assert(typeof getTask === 'function' || typeof TaskService.getTaskLegacy === 'function', 
           'Task retrieval API available');
    
    // ============ SUMMARY ============
    console.log('\n=== Test Summary ===');
    console.log('Passed: ' + pass);
    console.log('Failed: ' + fail);
    console.log('Total: ' + (pass + fail));
    
    if (fail > 0) {
      throw new Error(fail + ' test(s) failed');
    }
    
    console.log('All tests passed!');
    return { passed: pass, failed: fail };
  }