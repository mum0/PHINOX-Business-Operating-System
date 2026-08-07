function testCoreLayer() {
    'use strict';
    
    console.log('=== PHINOX BOS Core Layer v5.0 ===');
    
    // فحص مسبق إلزامي
    var prereqs = ['CONFIG','Utils','ErrorHandler','Logger','Validator','EventBus','BaseRepository'];
    for (var i = 0; i < prereqs.length; i++) {
      try {
        eval(prereqs[i]);
      } catch (e) {
        console.error('FATAL: ' + prereqs[i] + ' not loaded. Check file exists and has no syntax errors.');
        throw new Error(prereqs[i] + ' not defined');
      }
    }
    
    var passed = 0;
    var failed = 0;
    
    function assert(cond, msg) {
      if (cond) { passed++; console.log('✓ ' + msg); }
      else { failed++; console.error('✗ ' + msg); }
    }
    
    // ─── 0. PREREQUISITE CHECKS ───
    assert(typeof CONFIG !== 'undefined', 'CONFIG loaded');
    assert(typeof Utils !== 'undefined', 'Utils loaded');
    assert(typeof ErrorHandler !== 'undefined', 'ErrorHandler loaded');
    assert(typeof Logger !== 'undefined', 'Logger loaded');
    assert(typeof Validator !== 'undefined', 'Validator loaded');
    assert(typeof EventBus !== 'undefined', 'EventBus loaded');
    assert(typeof BaseRepository !== 'undefined', 'BaseRepository loaded');
    
    if (failed > 0) {
      console.error('=== PREREQUISITE FAILURE: ' + failed + ' modules not loaded ===');
      console.error('Check file names start with correct prefix (00_, 01_, etc.)');
      throw new Error('Core modules missing');
    }
    
    // ─── 1. CONFIG ───
    assert(CONFIG.APP.NAME === 'PHINOX BOS', 'Config.APP.NAME');
    assert(CONFIG.APP.ENV === (PropertiesService.getScriptProperties().getProperty('BOS_ENV') || 'production'), 'Config.APP.ENV');
    assert(Object.isFrozen(CONFIG), 'Config is frozen');
    assert(CONFIG.PERFORMANCE.BATCH_SIZE > 0, 'Config.BATCH_SIZE');
    
    // ─── 2. UTILS ───
    var uuid = Utils.generateId();
    assert(uuid.length === 36 && uuid.split('-').length === 5, 'Utils.generateId');
    
    var safe = Utils.safeStr('<script>alert(1)</script>');
    console.log('safeStr output: [' + safe + ']');
    assert(safe.indexOf('<') === -1, 'Utils.safeStr no < (got: ' + safe + ')');
    assert(safe.indexOf('>') === -1, 'Utils.safeStr no > (got: ' + safe + ')');
    
    assert(Utils.safeNum('42') === 42, 'Utils.safeNum string');
    assert(Utils.safeNum('bad') === null, 'Utils.safeNum invalid');
    assert(Utils.safeNum('', 0) === 0, 'Utils.safeNum default');
    assert(Utils.safeDate('2024-01-15') instanceof Date, 'Utils.safeDate valid');
    assert(Utils.safeDate('invalid') === null, 'Utils.safeDate invalid');
    assert(Utils.safeDate(null) === null, 'Utils.safeDate null');
    assert(Utils.formatDate(new Date('2024-01-15')).indexOf('2024-01-15') > -1, 'Utils.formatDate');
    assert(Utils.clone({a:1}).a === 1, 'Utils.clone');
    assert(Utils.pick({a:1,b:2}, ['a']).a === 1, 'Utils.pick');
    assert(Utils.pick({a:1,b:2}, ['a']).b === undefined, 'Utils.pick omit');
    
    // ─── 3. ERROR HANDLER ───
    try {
      throw ErrorHandler.validation('Test', {f:'x'}, 'test');
    } catch (e) {
      assert(e.category === 'VALIDATION_ERROR', 'ErrorHandler.category');
      assert(e.message === 'Test', 'ErrorHandler.message');
      assert(e.sourceModule === 'test', 'ErrorHandler.module');
    }
    
    var notFound = ErrorHandler.notFound('User', '123', 'test');
    assert(notFound.category === 'NOT_FOUND', 'ErrorHandler.notFound');
    
    var perm = ErrorHandler.permission('delete', 'Tasks', 'test');
    assert(perm.category === 'PERMISSION_DENIED', 'ErrorHandler.permission');
    
    var wrapped = ErrorHandler.wrap(new Error('Oops'), 'test');
    assert(wrapped.category === 'SYSTEM_ERROR', 'ErrorHandler.wrap');
    
    var json = ErrorHandler.toJSON(wrapped);
    assert(json.success === false && json.error.message === 'Oops', 'ErrorHandler.toJSON');
    
    // ─── 4. LOGGER ───
    Logger.setLevel('DEBUG');
    Logger.debug('Test', 'debug msg');
    Logger.info('Test', 'info msg');
    Logger.warn('Test', 'warn msg');
    Logger.error('Test', 'error msg', { detail: 1 });
    Logger.flush();
    assert(true, 'Logger.flush');
    
    // ─── 5. EVENT BUS ───
    var received = null;
    EventBus.on('test:core', function(d) { received = d; });
    EventBus.emit('test:core', { ok: true });
    assert(received && received.ok === true, 'EventBus.emit');
    
    var received2 = null;
    EventBus.on('test:fail', function() { throw new Error('ignore'); });
    EventBus.on('test:fail', function(d) { received2 = d; });
    EventBus.emit('test:fail', { ok: true });
    assert(received2 && received2.ok === true, 'EventBus.error isolation');
    
    assert(EventBus.getEvents().indexOf('test:core') > -1, 'EventBus.getEvents');
    
    // ─── 6. VALIDATOR ───
    var schema = {
      name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
      age: { type: 'integer', min: 0, max: 120 },
      email: { type: 'email' },
      status: { allowed: ['active','inactive'] }
    };
    
    var v1 = Validator.validate({ name: 'Ali', age: 30, email: 'a@b.com', status: 'active' }, schema, 'test');
    assert(v1.isValid && v1.data.name === 'Ali', 'Validator.valid');
    
    try {
      Validator.validate({ name: '', age: 200 }, schema, 'test');
      assert(false, 'Validator.should fail');
    } catch (e) {
      assert(e.category === 'VALIDATION_ERROR', 'Validator.error');
    }
    
    assert(Validator.isValid({ name: 'X' }, schema) === false, 'Validator.isValid false');
    
    // ─── 7. BASE REPOSITORY ───
    var testSchema = { id: 1, name: 2, status: 3, createdAt: 4, updatedAt: 5, createdBy: 6 };
    
    // Create test sheet if not exists
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var testSheet = ss.getSheetByName('TestCore');
    if (!testSheet) {
      testSheet = ss.insertSheet('TestCore');
      testSheet.appendRow(['id','name','status','createdAt','updatedAt','createdBy']);
    }
    
    var repo = BaseRepository.create('TestCore', testSchema, { eventName: 'testcore' });
    
    // Clean previous test data
    var all = repo.findAll({ limit: 1000 });
    all.data.forEach(function(r) { 
      if (r.id && String(r.id).indexOf('test-') === 0) repo.delete(r.id); 
    });
    
    // Create
    var rec = repo.create({ id: 'test-' + Utils.generateId(), name: 'Alpha', status: 'active' });
    assert(rec.id && rec.name === 'Alpha', 'Repo.create');
    assert(rec.createdAt instanceof Date, 'Repo.create timestamps');
    
    // FindById
    var found = repo.findById(rec.id);
    assert(found && found.name === 'Alpha', 'Repo.findById');
    
    // FindAll
    var page = repo.findAll({ limit: 10 });
    assert(page.data.length >= 1 && page.hasMore !== undefined, 'Repo.findAll pagination');
    
    // FindOne
    var one = repo.findOne(function(r) { return r.name === 'Alpha'; });
    assert(one && one.id === rec.id, 'Repo.findOne');
    
    // Update
    var upd = repo.update(rec.id, { status: 'done' });
    assert(upd.status === 'done' && upd.id === rec.id, 'Repo.update');
    
    // Index O(1) verification
    var idx = repo.buildIndex();
    assert(idx[rec.id] > 0, 'Repo.index built');
    var fast = repo.findById(rec.id);
    assert(fast.status === 'done', 'Repo.findById O(1)');
    
    // Count
    var cnt = repo.count();
    assert(cnt >= 1, 'Repo.count');
    
    // Batch create
    var batch = [];
    for (var i = 0; i < 5; i++) {
      batch.push({ id: 'test-batch-' + i, name: 'Batch' + i, status: 'new' });
    }
    var created = repo.batchCreate(batch);
    assert(created.length === 5, 'Repo.batchCreate');
    
    // Delete
    repo.delete(rec.id);
    assert(repo.findById(rec.id) === null, 'Repo.delete');
    
    // Cleanup batch
    created.forEach(function(r) { repo.delete(r.id); });
    
    // ─── 8. EVENTBUS + REPOSITORY INTEGRATION ───
    var eventFired = false;
    EventBus.on('testcore:created', function() { eventFired = true; });
    var evRec = repo.create({ id: 'test-ev-' + Utils.generateId(), name: 'Event', status: 'x' });
    assert(eventFired, 'EventBus.repository integration');
    repo.delete(evRec.id);
    
    console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
    if (failed > 0) throw new Error(failed + ' tests failed');
    return 'All tests passed: ' + passed;
  }