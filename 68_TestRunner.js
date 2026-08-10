/**
 * PHINOX BOS v5 — Phase 8 Complete Test Runner
 * Runtime Testing for 81 KPIs + All Backend Layers
 * 
 * Usage: In GAS Editor, run: runAllTests()
 */

function runAllTests() {
  'use strict';

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PHINOX BOS v5 — Phase 8 Complete Runtime Test Suite     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  var results = {
    phase0: { name: 'Phase 0 — Broken Dependencies', status: 'PENDING', passed: 0, failed: 0 },
    phase8a: { name: 'Phase 8A — Schema & Core APIs', status: 'PENDING', passed: 0, failed: 0 },
    phase8b: { name: 'Phase 8B — Customer Layer', status: 'PENDING', passed: 0, failed: 0 },
    phase8e: { name: 'Phase 8E — Satisfaction + NPS', status: 'PENDING', passed: 0, failed: 0 },
    kpi60: { name: 'Phase 7B/7C — Original 60 KPIs', status: 'PENDING', passed: 0, failed: 0 },
    kpi21: { name: 'Phase 8C/D — New 21 KPIs', status: 'PENDING', passed: 0, failed: 0 },
    mktsoc: { name: 'Phase 7C — Marketing + Social', status: 'PENDING', passed: 0, failed: 0 },
    regression: { name: 'Regression — Backward Compatibility', status: 'PENDING', passed: 0, failed: 0 }
  };

  var totalPassed = 0;
  var totalFailed = 0;

  function makeAssert(module) {
    return function(cond, msg) {
      if (cond) { results[module].passed++; totalPassed++; }
      else { results[module].failed++; totalFailed++; console.error('✗ [' + module + '] ' + msg); }
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 0 — BROKEN DEPENDENCIES
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 0: Verifying fixed dependencies...');
  var a0 = makeAssert('phase0');
  try {
    a0(typeof OrderService.getOrdersByDateRange === 'function', 
      'OrderService.getOrdersByDateRange exists');
    a0(typeof OrderService.totalOrdersByDateRange === 'function',
      'OrderService.totalOrdersByDateRange exists');
    a0(typeof OrderService.getOrdersByStatusAndDateRange === 'function',
      'OrderService.getOrdersByStatusAndDateRange exists');
    a0(typeof OrderService.getTotalOrderAmountByDateRange === 'function',
      'OrderService.getTotalOrderAmountByDateRange exists');
    a0(typeof OrderService.getOrderById === 'function',
      'OrderService.getOrderById alias exists');
    a0(typeof OrderService.getTotalOrderAmount === 'function',
      'OrderService.getTotalOrderAmount alias exists');
    a0(typeof FinanceService.getRefunds === 'function',
      'FinanceService.getRefunds exists');
    a0(typeof FinanceService.getRevenueGrowth === 'function',
      'FinanceService.getRevenueGrowth exists');
    a0(typeof FinanceService.getProfitGrowth === 'function',
      'FinanceService.getProfitGrowth exists');

    // Runtime: test actual date filtering
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), 1);
    var orders = OrderService.getOrdersByDateRange(start.toISOString(), now.toISOString());
    a0(orders && typeof orders.data === 'object', 
      'getOrdersByDateRange returns valid result object');

    results.phase0.status = results.phase0.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.phase0.status = 'ERROR';
    console.error('Phase 0 ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8A — SCHEMA & CORE APIs
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8A: Verifying schema extensions and date APIs...');
  var a8a = makeAssert('phase8a');
  try {
    // TaskService date APIs
    a8a(typeof TaskService.getTasksByDateRange === 'function',
      'TaskService.getTasksByDateRange exists');
    a8a(typeof TaskService.getCompletedTasksByDateRange === 'function',
      'TaskService.getCompletedTasksByDateRange exists');
    a8a(typeof TaskService.getAverageCompletionTime === 'function',
      'TaskService.getAverageCompletionTime exists');
    a8a(typeof TaskService.getOnTimeRate === 'function',
      'TaskService.getOnTimeRate exists');
    a8a(typeof TaskService.getAverageQuality === 'function',
      'TaskService.getAverageQuality exists');

    // Members APIs
    a8a(typeof Members.getMembersByDepartment === 'function',
      'Members.getMembersByDepartment exists');
    a8a(typeof Members.getMemberByEmail === 'function',
      'Members.getMemberByEmail exists');
    a8a(typeof Members.getMemberTaskStats === 'function',
      'Members.getMemberTaskStats exists');

    // SaleService date APIs
    a8a(typeof SaleService.getSalesByDateRange === 'function',
      'SaleService.getSalesByDateRange exists');
    a8a(typeof SaleService.getTotalRevenueByDateRange === 'function',
      'SaleService.getTotalRevenueByDateRange exists');
    a8a(typeof SaleService.getTotalCOGSByDateRange === 'function',
      'SaleService.getTotalCOGSByDateRange exists');
    a8a(typeof SaleService.getGrossProfitByDateRange === 'function',
      'SaleService.getGrossProfitByDateRange exists');

    // Task schema: completedAt and approvedAt fields
    var defaultTask = TaskService.getDefaultTask ? TaskService.getDefaultTask() : null;
    if (defaultTask) {
      a8a('completedAt' in defaultTask, 'Task schema has completedAt field');
      a8a('approvedAt' in defaultTask, 'Task schema has approvedAt field');
    }

    // Member schema: department field
    var memberArr = Members.getMembers ? Members.getMembers() : [];
    if (memberArr.length > 0) {
      a8a(memberArr[0].length >= 13, 'Member row has at least 13 columns (department added)');
    }

    results.phase8a.status = results.phase8a.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.phase8a.status = 'ERROR';
    console.error('Phase 8A ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8B — CUSTOMER LAYER
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8B: Verifying Customer Service...');
  var a8b = makeAssert('phase8b');
  try {
    a8b(typeof CustomerService !== 'undefined', 'CustomerService is defined');
    a8b(typeof CustomerService.createCustomer === 'function',
      'CustomerService.createCustomer exists');
    a8b(typeof CustomerService.getCustomers === 'function',
      'CustomerService.getCustomers exists');
    a8b(typeof CustomerService.getCustomerByEmail === 'function',
      'CustomerService.getCustomerByEmail exists');
    a8b(typeof CustomerService.getNewCustomers === 'function',
      'CustomerService.getNewCustomers exists');
    a8b(typeof CustomerService.getReturningCustomers === 'function',
      'CustomerService.getReturningCustomers exists');
    a8b(typeof CustomerService.getRetentionRate === 'function',
      'CustomerService.getRetentionRate exists');
    a8b(typeof CustomerService.getChurnRate === 'function',
      'CustomerService.getChurnRate exists');
    a8b(typeof CustomerService.getAverageLTV === 'function',
      'CustomerService.getAverageLTV exists');
    a8b(typeof CustomerService.getCustomersByDateRange === 'function',
      'CustomerService.getCustomersByDateRange exists');
    a8b(typeof CustomerService.syncFromOrders === 'function',
      'CustomerService.syncFromOrders exists');

    // Runtime: test customer deduplication
    var customers = CustomerService.getCustomers();
    a8b(Array.isArray(customers), 'getCustomers returns array');

    // Check uniqueness
    var hasDupes = false;
    for (var i = 0; i < customers.length; i++) {
      for (var j = i + 1; j < customers.length; j++) {
        if (customers[i] === customers[j]) { hasDupes = true; break; }
      }
    }
    a8b(!hasDupes, 'Customer emails are deduplicated');

    results.phase8b.status = results.phase8b.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.phase8b.status = 'ERROR';
    console.error('Phase 8B ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8E — SATISFACTION + NPS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8E: Verifying Satisfaction + NPS Backend...');
  var a8e = makeAssert('phase8e');
  try {
    a8e(typeof SatisfactionService !== 'undefined', 'SatisfactionService is defined');
    a8e(typeof SatisfactionService.createSatisfaction === 'function',
      'SatisfactionService.createSatisfaction exists');
    a8e(typeof SatisfactionService.getAverageScore === 'function',
      'SatisfactionService.getAverageScore exists');
    a8e(typeof NPSService !== 'undefined', 'NPSService is defined');
    a8e(typeof NPSService.createNPS === 'function',
      'NPSService.createNPS exists');
    a8e(typeof NPSService.getNPS === 'function',
      'NPSService.getNPS exists');

    // Runtime: create test records and verify calculations
    var now = new Date().toISOString();
    var testEmail = 'test_runtime_' + Date.now() + '@example.com';

    // Satisfaction
    try {
      var satId = SatisfactionService.createSatisfaction({
        customerEmail: testEmail,
        orderId: 'test-order-1',
        score: 8,
        feedback: 'Great service'
      });
      a8e(typeof satId === 'string' && satId.length > 0, 
        'Satisfaction record created with ID: ' + satId);

      var avgScore = SatisfactionService.getAverageScore(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        new Date().toISOString()
      );
      a8e(typeof avgScore === 'number' && avgScore >= 0 && avgScore <= 10,
        'getAverageScore returns valid number: ' + avgScore);
    } catch(e2) {
      a8e(false, 'Satisfaction runtime test failed: ' + e2.message);
    }

    // NPS
    try {
      var npsId1 = NPSService.createNPS({
        customerEmail: testEmail,
        orderId: 'test-order-1',
        score: 9,
        feedback: 'Promoter'
      });
      var npsId2 = NPSService.createNPS({
        customerEmail: 'test2@example.com',
        orderId: 'test-order-2',
        score: 3,
        feedback: 'Detractor'
      });
      a8e(typeof npsId1 === 'string', 'NPS promoter record created');
      a8e(typeof npsId2 === 'string', 'NPS detractor record created');

      var nps = NPSService.getNPS(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        new Date().toISOString()
      );
      a8e(typeof nps === 'number' && nps >= -100 && nps <= 100,
        'getNPS returns valid NPS score: ' + nps);
    } catch(e3) {
      a8e(false, 'NPS runtime test failed: ' + e3.message);
    }

    results.phase8e.status = results.phase8e.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.phase8e.status = 'ERROR';
    console.error('Phase 8E ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 7B/7C — ORIGINAL 60 KPIs (REGRESSION)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ REGRESSION: Testing original 60 KPIs...');
  var a60 = makeAssert('kpi60');
  try {
    var S = KpiSchema;
    var svc = KpiService;
    var today = new Date();

    var originalIds = [
      'FIN-01','FIN-02','FIN-03','FIN-04','FIN-05','FIN-06','FIN-07','FIN-08','FIN-09','FIN-10',
      'SALE-01','SALE-02','SALE-03','SALE-04','SALE-05','SALE-06','SALE-07',
      'INV-01','INV-02','INV-03','INV-04','INV-05',
      'OPS-01','OPS-02','OPS-03','OPS-04',
      'MKT-01','MKT-02','MKT-03','MKT-04','MKT-05','MKT-06','MKT-07','MKT-08','MKT-09','MKT-10',
      'MKT-11','MKT-12','MKT-13','MKT-14','MKT-15','MKT-16','MKT-17','MKT-18',
      'SOC-01','SOC-02','SOC-03','SOC-04','SOC-05','SOC-06','SOC-07','SOC-08','SOC-09','SOC-10',
      'SOC-11','SOC-12','SOC-13','SOC-14','SOC-15','SOC-16'
    ];

    var calcResults = svc.calculateAll(S.PERIOD.MONTHLY, today);
    a60(calcResults && calcResults.results.length === 81, 
      'calculateAll returns 81 results');
    a60(calcResults.errors.length === 0, 
      'calculateAll has zero errors');

    // Verify each original KPI calculated successfully
    var resultMap = {};
    calcResults.results.forEach(function(r) { resultMap[r.kpiId] = r; });

    var missingOriginal = [];
    originalIds.forEach(function(id) {
      if (!resultMap[id] || resultMap[id].status !== 'ok') {
        missingOriginal.push(id);
      }
    });
    a60(missingOriginal.length === 0,
      'All 60 original KPIs calculated successfully (failed: ' + missingOriginal.join(', ') + ')');

    results.kpi60.status = results.kpi60.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.kpi60.status = 'ERROR';
    console.error('KPI 60 ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8C/D — NEW 21 KPIs
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8C/D: Testing new 21 KPIs (PERF + CUST)...');
  var a21 = makeAssert('kpi21');
  try {
    var S = KpiSchema;
    var svc = KpiService;
    var today = new Date();

    var newIds = [
      'PERF-01','PERF-02','PERF-03','PERF-04','PERF-05','PERF-06',
      'PERF-07','PERF-08','PERF-09','PERF-10','PERF-11',
      'CUST-01','CUST-02','CUST-03','CUST-04','CUST-05',
      'CUST-06','CUST-07','CUST-08','CUST-09','CUST-10'
    ];

    var calcResults = svc.calculateAll(S.PERIOD.MONTHLY, today);
    var resultMap = {};
    calcResults.results.forEach(function(r) { resultMap[r.kpiId] = r; });

    var missingNew = [];
    newIds.forEach(function(id) {
      if (!resultMap[id] || resultMap[id].status !== 'ok') {
        missingNew.push(id);
      }
    });
    a21(missingNew.length === 0,
      'All 21 new KPIs calculated successfully (failed: ' + missingNew.join(', ') + ')');

    // Bounds checks
    var perf03 = resultMap['PERF-03'];
    var perf05 = resultMap['PERF-05'];
    var perf06 = resultMap['PERF-06'];
    var perf10 = resultMap['PERF-10'];
    var cust04 = resultMap['CUST-04'];
    var cust08 = resultMap['CUST-08'];
    var cust09 = resultMap['CUST-09'];

    if (perf03) a21(perf03.value >= 0 && perf03.value <= 100, 'PERF-03 within 0-100%');
    if (perf05) a21(perf05.value >= 0 && perf05.value <= 100, 'PERF-05 within 0-100%');
    if (perf06) a21(perf06.value >= 0 && perf06.value <= 100, 'PERF-06 within 0-100%');
    if (perf10) a21(perf10.value >= 0 && perf10.value <= 100, 'PERF-10 within 0-100');
    if (cust04) a21(cust04.value >= 0 && cust04.value <= 100, 'CUST-04 within 0-100%');
    if (cust08) a21(cust08.value >= 0 && cust08.value <= 10, 'CUST-08 within 0-10');
    if (cust09) a21(cust09.value >= -100 && cust09.value <= 100, 'CUST-09 within -100 to +100');

    results.kpi21.status = results.kpi21.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.kpi21.status = 'ERROR';
    console.error('KPI 21 ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 7C — MARKETING + SOCIAL
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 7C: Testing Marketing + Social...');
  var amkt = makeAssert('mktsoc');
  try {
    testMktSocLayer();
    amkt(true, 'testMktSocLayer() executed without throwing');
    results.mktsoc.status = 'PASS';
  } catch(e) {
    amkt(false, 'testMktSocLayer() failed: ' + e.message);
    results.mktsoc.status = 'FAIL';
  }

  // ═══════════════════════════════════════════════════════════════
  // REGRESSION — BACKWARD COMPATIBILITY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ REGRESSION: Backward compatibility checks...');
  var areg = makeAssert('regression');
  try {
    // Old APIs still exist
    areg(typeof OrderService.getOrder === 'function', 'OrderService.getOrder still exists');
    areg(typeof OrderService.getOrders === 'function', 'OrderService.getOrders still exists');
    areg(typeof OrderService.getTotalSales === 'function', 'OrderService.getTotalSales still exists');
    areg(typeof FinanceService.getRevenue === 'function', 'FinanceService.getRevenue still exists');
    areg(typeof FinanceService.getProfitAndLoss === 'function', 'FinanceService.getProfitAndLoss still exists');
    areg(typeof TaskService.createTask === 'function', 'TaskService.createTask still exists');
    areg(typeof TaskService.getTask === 'function', 'TaskService.getTask still exists');
    areg(typeof Members.addMember === 'function', 'Members.addMember still exists');
    areg(typeof Members.getMembers === 'function', 'Members.getMembers still exists');
    areg(typeof SaleService.createSale === 'function', 'SaleService.createSale still exists');
    areg(typeof SaleService.getTotalRevenue === 'function', 'SaleService.getTotalRevenue still exists');

    // Dashboard still has all keys
    var dash = KpiService.getDashboardKpis();
    areg(Object.keys(dash).length === 81, 'Dashboard has exactly 81 KPIs');

    // Categories still work
    areg(KpiService.calculateCategory(KpiSchema.CATEGORY.FINANCE, KpiSchema.PERIOD.MONTHLY, new Date()).length === 10,
      'Finance category still has 10 KPIs');
    areg(KpiService.calculateCategory(KpiSchema.CATEGORY.SALES, KpiSchema.PERIOD.MONTHLY, new Date()).length === 7,
      'Sales category still has 7 KPIs');
    areg(KpiService.calculateCategory(KpiSchema.CATEGORY.MARKETING, KpiSchema.PERIOD.MONTHLY, new Date()).length === 18,
      'Marketing category still has 18 KPIs');
    areg(KpiService.calculateCategory(KpiSchema.CATEGORY.SOCIAL_MEDIA, KpiSchema.PERIOD.MONTHLY, new Date()).length === 16,
      'Social Media category still has 16 KPIs');

    results.regression.status = results.regression.failed === 0 ? 'PASS' : 'FAIL';
  } catch(e) {
    results.regression.status = 'ERROR';
    console.error('Regression ERROR: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      RUNTIME TEST REPORT                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  var allPass = true;
  Object.keys(results).forEach(function(key) {
    var r = results[key];
    var statusStr = r.status === 'PASS' ? '✅ PASS' : (r.status === 'FAIL' ? '❌ FAIL' : (r.status === 'ERROR' ? '💥 ERROR' : '⏳ SKIP'));
    console.log('║ ' + statusStr + ' | ' + r.name);
    console.log('║        Passed: ' + r.passed + ' | Failed: ' + r.failed);
    if (r.status !== 'PASS') allPass = false;
  });

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ TOTAL: ' + totalPassed + ' passed, ' + totalFailed + ' failed');
  console.log('║ OVERALL: ' + (allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (totalFailed > 0) {
    throw new Error(totalFailed + ' runtime tests failed. See logs above.');
  }

  return 'All runtime tests passed: ' + totalPassed + ' assertions';
}

/**
 * Quick smoke test — runs only essential checks (faster)
 */
function runSmokeTest() {
  'use strict';
  console.log('Running smoke test...');

  var errors = [];

  // Essential services exist
  var services = ['KpiService', 'KpiSchema', 'CustomerService', 'SatisfactionService', 'NPSService'];
  services.forEach(function(s) {
    try { eval(s); }
    catch(e) { errors.push(s + ' not defined'); }
  });

  // 81 KPIs calculate
  try {
    var result = KpiService.calculateAll(KpiSchema.PERIOD.MONTHLY, new Date());
    if (result.results.length !== 81) errors.push('Expected 81 KPIs, got ' + result.results.length);
    if (result.errors.length > 0) errors.push('KPI errors: ' + result.errors.length);
  } catch(e) {
    errors.push('calculateAll failed: ' + e.message);
  }

  if (errors.length > 0) {
    console.error('Smoke test FAILED:');
    errors.forEach(function(e) { console.error('  - ' + e); });
    throw new Error('Smoke test failed with ' + errors.length + ' errors');
  }

  console.log('✅ Smoke test passed');
  return 'Smoke test passed';
}
