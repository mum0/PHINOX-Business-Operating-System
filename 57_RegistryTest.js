/**
 * PHINOX BOS v5.1 — Registry Module Tests
 * File: 57_RegistryTest.js
 * v5.1 ADDED
 * Run: Select testRegistryModule → Run in GAS editor
 */

function testRegistryModule() {
  'use strict';
  console.log('=== PHINOX BOS Registry Module v5.1 ===');

  var passed = 0;
  var failed = 0;

  function assert(cond, msg) {
    if (cond) { passed++; console.log('✓ ' + msg); }
    else { failed++; console.error('✗ ' + msg); }
  }

  // v5.1 ADDED — Module existence
  assert(typeof Registry !== 'undefined', 'Registry module exists');
  assert(typeof Registry.init === 'function', 'Registry.init is a function');
  assert(typeof Registry.getByCategory === 'function', 'Registry.getByCategory is a function');
  assert(typeof Registry.getById === 'function', 'Registry.getById is a function');
  assert(typeof Registry.getByValue === 'function', 'Registry.getByValue is a function');
  assert(typeof Registry.getLabel === 'function', 'Registry.getLabel is a function');
  assert(typeof Registry.add === 'function', 'Registry.add is a function');
  assert(typeof Registry.update === 'function', 'Registry.update is a function');
  assert(typeof Registry.deactivate === 'function', 'Registry.deactivate is a function');
  assert(typeof Registry.activate === 'function', 'Registry.activate is a function');
  assert(typeof Registry.getCategories === 'function', 'Registry.getCategories is a function');
  assert(typeof Registry.getSubcategories === 'function', 'Registry.getSubcategories is a function');

  // v5.1 ADDED — Initialize registry
  var initResult = Registry.init();
  assert(initResult && initResult.success === true, 'Registry.init() succeeds');

  // v5.1 ADDED — Categories constant
  var cats = Registry.CATEGORIES;
  assert(typeof cats === 'object', 'CATEGORIES is an object');
  assert(cats.DEPARTMENT === 'department', 'DEPARTMENT category exists');
  assert(cats.JOB_TITLE === 'jobTitle', 'JOB_TITLE category exists');
  assert(cats.EXPENSE_CATEGORY === 'expenseCategory', 'EXPENSE_CATEGORY category exists');
  assert(cats.EXPENSE_SUBCATEGORY === 'expenseSubcategory', 'EXPENSE_SUBCATEGORY category exists');
  assert(cats.CURRENCY === 'currency', 'CURRENCY category exists');
  assert(cats.PAYMENT_METHOD === 'paymentMethod', 'PAYMENT_METHOD category exists');

  // v5.1 ADDED — getCategories metadata
  var meta = Registry.getCategories();
  assert(Array.isArray(meta), 'getCategories returns array');
  assert(meta.length === 6, 'getCategories returns 6 categories');

  // v5.1 ADDED — Each of the six registry types has seeded data
  var depts = Registry.getByCategory(Registry.CATEGORIES.DEPARTMENT);
  assert(Array.isArray(depts), 'Departments returns array');
  assert(depts.length >= 6, 'Departments has seeded data (>=6)');
  assert(depts[0].value && depts[0].labelEn, 'Department entry has value and labelEn');
  assert(depts[0].labelAr, 'Department entry has labelAr');
  assert(depts[0].hasOwnProperty('active'), 'Department entry has active field');
  assert(depts[0].hasOwnProperty('order'), 'Department entry has order field');

  var jobs = Registry.getByCategory(Registry.CATEGORIES.JOB_TITLE);
  assert(Array.isArray(jobs), 'Job Titles returns array');
  assert(jobs.length >= 9, 'Job Titles has seeded data (>=9)');

  var expCats = Registry.getByCategory(Registry.CATEGORIES.EXPENSE_CATEGORY);
  assert(Array.isArray(expCats), 'Expense Categories returns array');
  assert(expCats.length >= 7, 'Expense Categories has seeded data (>=7)');

  var expSubcats = Registry.getByCategory(Registry.CATEGORIES.EXPENSE_SUBCATEGORY);
  assert(Array.isArray(expSubcats), 'Expense Subcategories returns array');
  assert(expSubcats.length >= 12, 'Expense Subcategories has seeded data (>=12)');

  var currencies = Registry.getByCategory(Registry.CATEGORIES.CURRENCY);
  assert(Array.isArray(currencies), 'Currencies returns array');
  assert(currencies.length >= 5, 'Currencies has seeded data (>=5)');

  var methods = Registry.getByCategory(Registry.CATEGORIES.PAYMENT_METHOD);
  assert(Array.isArray(methods), 'Payment Methods returns array');
  assert(methods.length >= 5, 'Payment Methods has seeded data (>=5)');

  // v5.1 ADDED — Read: activeOnly filtering
  var activeDepts = Registry.getByCategory(Registry.CATEGORIES.DEPARTMENT, { activeOnly: true });
  assert(activeDepts.length === depts.length, 'activeOnly:true returns all active seeded entries');

  var allDepts = Registry.getByCategory(Registry.CATEGORIES.DEPARTMENT, { activeOnly: false });
  assert(allDepts.length >= depts.length, 'activeOnly:false returns at least as many');

  // v5.1 ADDED — Read: getByValue
  var dept = Registry.getByValue(Registry.CATEGORIES.DEPARTMENT, 'finance');
  assert(dept !== null, 'getByValue finds existing entry');
  assert(dept.value === 'finance', 'getByValue returns correct value');
  assert(dept.labelEn === 'Finance', 'getByValue returns correct labelEn');
  assert(dept.labelAr === 'المالية', 'getByValue returns correct labelAr');

  // v5.1 ADDED — Read: getLabel i18n
  assert(Registry.getLabel(Registry.CATEGORIES.DEPARTMENT, 'finance', 'en') === 'Finance', 'getLabel EN works');
  assert(Registry.getLabel(Registry.CATEGORIES.DEPARTMENT, 'finance', 'ar') === 'المالية', 'getLabel AR works');
  assert(Registry.getLabel(Registry.CATEGORIES.DEPARTMENT, 'nonexistent', 'en') === 'nonexistent', 'getLabel falls back to value for unknown');

  // v5.1 ADDED — Read: getSubcategories hierarchical
  var rentSubs = Registry.getSubcategories('rent');
  assert(Array.isArray(rentSubs), 'getSubcategories returns array');
  assert(rentSubs.length >= 2, 'getSubcategories returns subcategories for rent');
  assert(rentSubs.every(function(s) { return s.parent === 'rent'; }), 'All subcategories have correct parent');

  var salarySubs = Registry.getSubcategories('salaries');
  assert(salarySubs.length >= 2, 'getSubcategories returns subcategories for salaries');

  // v5.1 ADDED — Invalid category handling
  var invalid = Registry.getByCategory('invalid_category_xyz');
  assert(Array.isArray(invalid), 'Invalid category returns array, not error');
  assert(invalid.length === 0, 'Invalid category returns empty array');

  // v5.1 ADDED — Empty / nonexistent lookup handling
  var notFound = Registry.getByValue(Registry.CATEGORIES.DEPARTMENT, 'does_not_exist');
  assert(notFound === null, 'getByValue for nonexistent returns null');

  var notFoundId = Registry.getById('does-not-exist-12345');
  assert(notFoundId === null, 'getById for nonexistent returns null');

  // v5.1 ADDED — Write: add + retrieve
  var testValue = 'test_dept_' + Date.now();
  var testId = null;
  try {
    var created = Registry.add({
      category: Registry.CATEGORIES.DEPARTMENT,
      value: testValue,
      labelEn: 'Test Department',
      labelAr: 'قسم تجريبي',
      order: 99
    });
    assert(typeof created === 'object', 'add() returns object');
    assert(typeof created.id === 'string', 'add() returns object with id');
    assert(created.value === testValue, 'add() returns correct value');
    testId = created.id;

    var added = Registry.getById(testId);
    assert(added !== null, 'Added entry can be retrieved by ID');
    assert(added.labelEn === 'Test Department', 'Added entry has correct labelEn');
    assert(added.active === true || added.active === 'true' || added.active === 'TRUE', 'Added entry is active by default');
  } catch (e) {
    failed++;
    console.error('✗ add() test failed: ' + e.message);
  }

  // v5.1 ADDED — Duplicate handling
  if (testId) {
    var duplicateError = false;
    try {
      Registry.add({
        category: Registry.CATEGORIES.DEPARTMENT,
        value: testValue,
        labelEn: 'Duplicate',
        labelAr: 'مكرر'
      });
    } catch (e) {
      if (e.message && e.message.indexOf('already exists') > -1) duplicateError = true;
    }
    assert(duplicateError === true, 'Duplicate value in same category throws conflict error');
  }

  // v5.1 ADDED — Validation: missing category
  var validationError = false;
  try {
    Registry.add({ category: '', value: '' });
  } catch (e) {
    validationError = true;
  }
  assert(validationError === true, 'Empty category/value throws validation error');

  // v5.1 ADDED — Validation: invalid category
  var invalidCatError = false;
  try {
    Registry.add({ category: 'invalid', value: 'test', labelEn: 'Test' });
  } catch (e) {
    invalidCatError = true;
  }
  assert(invalidCatError === true, 'Invalid category throws validation error');

  // v5.1 ADDED — Write: update
  if (testId) {
    var updated = Registry.update(testId, { labelEn: 'Updated Test', order: 100 });
    assert(updated.labelEn === 'Updated Test', 'update() changes labelEn');
    assert(Number(updated.order) === 100, 'update() changes order');

    var fetchedUpdated = Registry.getById(testId);
    assert(fetchedUpdated.labelEn === 'Updated Test', 'Updated entry persists after re-fetch');
  }

  // v5.1 ADDED — Write: deactivate / activate
  if (testId) {
    Registry.deactivate(testId);
    var deactivated = Registry.getById(testId);
    assert(deactivated.active === false || deactivated.active === 'false' || deactivated.active === 'FALSE', 'deactivate() sets active to false');

    var activeDeptsAfter = Registry.getByCategory(Registry.CATEGORIES.DEPARTMENT, { activeOnly: true });
    var foundDeactivated = activeDeptsAfter.some(function(d) { return d.id === testId; });
    assert(foundDeactivated === false, 'Deactivated entry excluded from activeOnly query');

    Registry.activate(testId);
    var reactivated = Registry.getById(testId);
    assert(reactivated.active === true || reactivated.active === 'true' || reactivated.active === 'TRUE', 'activate() sets active to true');
  }

  // v5.1 ADDED — Backward compatibility: existing modules untouched
  assert(typeof FinanceSchema !== 'undefined', 'FinanceSchema still exists (backward compatibility)');
  assert(FinanceSchema.EXPENSE_CATEGORY.RENT === 'RENT', 'Existing Finance enum RENT unchanged');
  assert(FinanceSchema.EXPENSE_CATEGORY.SALARIES === 'SALARIES', 'Existing Finance enum SALARIES unchanged');
  assert(typeof Utils !== 'undefined', 'Utils module still exists');
  assert(typeof BaseRepository !== 'undefined', 'BaseRepository still exists');
  assert(typeof ErrorHandler !== 'undefined', 'ErrorHandler still exists');
  assert(typeof Logger !== 'undefined', 'Logger still exists');
  assert(typeof Validator !== 'undefined', 'Validator still exists');

  // v5.1 ADDED — Repository/storage behavior: objects returned, not arrays
  if (depts.length > 0) {
    assert(typeof depts[0] === 'object', 'getByCategory returns objects, not arrays');
    assert(depts[0].hasOwnProperty('id'), 'Entry has id property');
    assert(depts[0].hasOwnProperty('category'), 'Entry has category property');
    assert(depts[0].hasOwnProperty('value'), 'Entry has value property');
  }

  // v5.1 ADDED — Cleanup test data
  if (testId) {
    try {
      Registry.deactivate(testId);
      console.log('  (Test entry deactivated: ' + testId + ')');
    } catch (e) {
      console.log('  (Cleanup warning: ' + e.message + ')');
    }
  }

  console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failed > 0) throw new Error(failed + ' tests failed');
  return 'All Registry v5.1 tests passed: ' + passed;
}
