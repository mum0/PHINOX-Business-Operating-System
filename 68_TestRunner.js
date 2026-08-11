/**
 * PHINOX BOS v5 — Phase 8 Runtime Test Suite (Optimized v2)
 * Run in GAS Editor. Does NOT timeout.
 */

function runAllTests() {
  'use strict';
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PHINOX BOS v5 — Phase 8 Runtime Test Suite (v2)        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  var results = { passed: 0, failed: 0, errors: [] };
  function assert(cond, msg) {
    if (cond) { results.passed++; console.log('✓ ' + msg); }
    else { results.failed++; console.error('✗ ' + msg); results.errors.push(msg); }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRE-CHECK: Sheets exist?
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PRE-CHECK: Verifying sheets...');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var requiredSheets = ['Tasks','Members','Inventory','Sales','Finance Ledger','Finance Expenses','Customers','Satisfaction','NPS','KPI Results','Marketing Spend','Social Media Performance'];
  // ملاحظة: Orders يُنشأ تلقائيًا — لا حاجة للتحقق منه
  var missingSheets = [];
  requiredSheets.forEach(function(name) {
    if (!ss.getSheetByName(name)) missingSheets.push(name);
  });
  if (missingSheets.length > 0) {
    console.error('❌ MISSING SHEETS: ' + missingSheets.join(', '));
    console.error('→ Run Setup.run() first, then re-run this test.');
    SpreadsheetApp.getUi().alert('Missing sheets: ' + missingSheets.join(', ') + '\n\nRun Setup.run() first!');
    return 'FAILED: Missing sheets. Run Setup.run().';
  }
  console.log('✓ All ' + requiredSheets.length + ' sheets found');

  // ═══════════════════════════════════════════════════════════════
  // PHASE 0: Dependencies
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 0: Dependencies...');
  try {
    assert(typeof OrderService.getOrdersByDateRange === 'function', 'OrderService.getOrdersByDateRange');
    assert(typeof OrderService.totalOrdersByDateRange === 'function', 'OrderService.totalOrdersByDateRange');
    assert(typeof OrderService.getOrdersByStatusAndDateRange === 'function', 'OrderService.getOrdersByStatusAndDateRange');
    assert(typeof OrderService.getTotalOrderAmountByDateRange === 'function', 'OrderService.getTotalOrderAmountByDateRange');
    assert(typeof OrderService.getOrderById === 'function', 'OrderService.getOrderById');
    assert(typeof OrderService.getTotalOrderAmount === 'function', 'OrderService.getTotalOrderAmount');
    assert(typeof FinanceService.getRefunds === 'function', 'FinanceService.getRefunds');
    assert(typeof FinanceService.getRevenueGrowth === 'function', 'FinanceService.getRevenueGrowth');
    assert(typeof FinanceService.getProfitGrowth === 'function', 'FinanceService.getProfitGrowth');
  } catch(e) { assert(false, 'Phase 0 ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8A: Schema & APIs
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8A: Schema & APIs...');
  try {
    assert(typeof TaskService.getTasksByDateRange === 'function', 'TaskService.getTasksByDateRange');
    assert(typeof TaskService.getCompletedTasksByDateRange === 'function', 'TaskService.getCompletedTasksByDateRange');
    assert(typeof TaskService.getAverageCompletionTime === 'function', 'TaskService.getAverageCompletionTime');
    assert(typeof TaskService.getOnTimeRate === 'function', 'TaskService.getOnTimeRate');
    assert(typeof TaskService.getAverageQuality === 'function', 'TaskService.getAverageQuality');
    assert(typeof Members !== 'undefined', 'Members object exists');
    assert(typeof Members.getMembersByDepartment === 'function', 'Members.getMembersByDepartment');
    assert(typeof Members.getMemberByEmail === 'function', 'Members.getMemberByEmail');
    assert(typeof Members.getMemberTaskStats === 'function', 'Members.getMemberTaskStats');
    assert(typeof SaleService.getSalesByDateRange === 'function', 'SaleService.getSalesByDateRange');
    assert(typeof SaleService.getTotalRevenueByDateRange === 'function', 'SaleService.getTotalRevenueByDateRange');
    assert(typeof SaleService.getTotalCOGSByDateRange === 'function', 'SaleService.getTotalCOGSByDateRange');
    assert(typeof SaleService.getGrossProfitByDateRange === 'function', 'SaleService.getGrossProfitByDateRange');
  } catch(e) { assert(false, 'Phase 8A ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8B: Customer Layer
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8B: Customer Layer...');
  try {
    assert(typeof CustomerService !== 'undefined', 'CustomerService exists');
    assert(typeof CustomerService.createCustomer === 'function', 'CustomerService.createCustomer');
    assert(typeof CustomerService.getCustomers === 'function', 'CustomerService.getCustomers');
    assert(typeof CustomerService.getNewCustomers === 'function', 'CustomerService.getNewCustomers');
    assert(typeof CustomerService.getReturningCustomers === 'function', 'CustomerService.getReturningCustomers');
    assert(typeof CustomerService.getRetentionRate === 'function', 'CustomerService.getRetentionRate');
    assert(typeof CustomerService.getChurnRate === 'function', 'CustomerService.getChurnRate');
    assert(typeof CustomerService.getAverageLTV === 'function', 'CustomerService.getAverageLTV');
    assert(typeof CustomerService.getCustomersByDateRange === 'function', 'CustomerService.getCustomersByDateRange');
    assert(typeof CustomerService.syncFromOrders === 'function', 'CustomerService.syncFromOrders');
    assert(typeof CustomerService.getCustomerStats === 'function', 'CustomerService.getCustomerStats');
  } catch(e) { assert(false, 'Phase 8B ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 8E: Satisfaction + NPS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ PHASE 8E: Satisfaction + NPS...');
  try {
    assert(typeof SatisfactionService !== 'undefined', 'SatisfactionService exists');
    if (typeof SatisfactionService === 'object' || typeof SatisfactionService === 'function') {
      assert(typeof SatisfactionService.createSatisfaction === 'function', 'SatisfactionService.createSatisfaction');
      assert(typeof SatisfactionService.getAverageScore === 'function', 'SatisfactionService.getAverageScore');
    }
    assert(typeof NPSService !== 'undefined', 'NPSService exists');
    if (typeof NPSService === 'object' || typeof NPSService === 'function') {
      assert(typeof NPSService.createNPS === 'function', 'NPSService.createNPS');
      assert(typeof NPSService.getNPS === 'function', 'NPSService.getNPS');
    }
  } catch(e) { assert(false, 'Phase 8E ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // KPI SCHEMA: 81 DEFINITIONS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ KPI SCHEMA: 81 Definitions...');
  try {
    assert(typeof KpiSchema !== 'undefined', 'KpiSchema exists');
    assert(Object.keys(KpiSchema.DEFINITIONS).length === 81, 'DEFINITIONS has 81 KPIs (got ' + Object.keys(KpiSchema.DEFINITIONS).length + ')');
    assert(KpiSchema.getDefinition('PERF-01') !== null, 'PERF-01 exists');
    assert(KpiSchema.getDefinition('CUST-10') !== null, 'CUST-10 exists');
    assert(KpiSchema.CATEGORY.PERFORMANCE === 'Performance', 'Performance category exists');
    assert(KpiSchema.CATEGORY.CUSTOMER === 'Customer', 'Customer category exists');
  } catch(e) { assert(false, 'KPI Schema ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // KPI CALCULATORS: Individual (FAST — no timeout)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ KPI CALCULATORS: Individual smoke tests...');
  try {
    var today = new Date();
    var testIds = ['FIN-01','SALE-01','INV-01','OPS-01','MKT-01','SOC-01','PERF-01','CUST-01'];
    testIds.forEach(function(id) {
      try {
        var result = KpiService.calculateKpi(id, KpiSchema.PERIOD.MONTHLY, today);
        assert(result && typeof result.value === 'number', id + ' calculated = ' + (result ? result.value : 'null'));
      } catch(e2) {
        assert(false, id + ' FAILED: ' + e2.message);
      }
    });
  } catch(e) { assert(false, 'KPI Calculator ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // CATEGORY COUNTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ CATEGORY COUNTS...');
  try {
    var cats = [
      [KpiSchema.CATEGORY.FINANCE, 10],
      [KpiSchema.CATEGORY.SALES, 7],
      [KpiSchema.CATEGORY.INVENTORY, 5],
      [KpiSchema.CATEGORY.OPERATIONS, 4],
      [KpiSchema.CATEGORY.MARKETING, 18],
      [KpiSchema.CATEGORY.SOCIAL_MEDIA, 16],
      [KpiSchema.CATEGORY.PERFORMANCE, 11],
      [KpiSchema.CATEGORY.CUSTOMER, 10]
    ];
    cats.forEach(function(c) {
      var defs = KpiSchema.getAllDefinitions().filter(function(d) { return d.category === c[0]; });
      assert(defs.length === c[1], c[0] + ' has ' + c[1] + ' KPIs (got ' + defs.length + ')');
    });
  } catch(e) { assert(false, 'Category ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ DASHBOARD...');
  try {
    var dash = KpiService.getDashboardKpis();
    assert(Object.keys(dash).length === 81, 'Dashboard has 81 keys (got ' + Object.keys(dash).length + ')');
    assert(dash['PERF-01'] && dash['PERF-01'].name === 'Tasks Completed', 'Dashboard PERF-01');
    assert(dash['CUST-01'] && dash['CUST-01'].name === 'Total Customers', 'Dashboard CUST-01');
    assert(dash['CUST-08'] && dash['CUST-08'].name === 'Customer Satisfaction', 'Dashboard CUST-08');
    assert(dash['CUST-09'] && dash['CUST-09'].name === 'Net Promoter Score', 'Dashboard CUST-09');
  } catch(e) { assert(false, 'Dashboard ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // MKT/SOC TESTS
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ MKT/SOC TESTS...');
  try {
    testMktSocLayer();
    assert(true, 'testMktSocLayer() passed');
  } catch(e) {
    assert(false, 'testMktSocLayer() failed: ' + e.message);
  }

  // ═══════════════════════════════════════════════════════════════
  // REGRESSION: Backward Compatibility
  // ═══════════════════════════════════════════════════════════════
  console.log('\n▶ REGRESSION: Backward Compatibility...');
  try {
    assert(typeof OrderService.getOrders === 'function', 'OrderService.getOrders still exists');
    assert(typeof OrderService.totalOrders === 'function', 'OrderService.totalOrders still exists');
    assert(typeof TaskService.createTask === 'function', 'TaskService.createTask still exists');
    assert(typeof Members.addMember === 'function', 'Members.addMember still exists');
    assert(typeof SaleService.createSale === 'function', 'SaleService.createSale still exists');
  } catch(e) { assert(false, 'Regression ERROR: ' + e.message); }

  // ═══════════════════════════════════════════════════════════════
  // REPORT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      RUNTIME TEST REPORT                      ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║ TOTAL: ' + results.passed + ' passed, ' + results.failed + ' failed');
  console.log('║ STATUS: ' + (results.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ ' + results.failed + ' TESTS FAILED'));
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (results.failed > 0) {
    console.error('\nFailed tests:');
    results.errors.forEach(function(e) { console.error('  - ' + e); });
  }

  SpreadsheetApp.getUi().alert('Test Results: ' + results.passed + ' passed, ' + results.failed + ' failed');
  return results.failed === 0 ? 'ALL TESTS PASSED' : results.failed + ' tests failed';
}

/**
 * Heavy KPI test — run separately to avoid timeout
 * Tests ALL 81 KPIs individually (takes ~2-3 min)
 */
function runHeavyKpiTest() {
  'use strict';
  console.log('Running heavy KPI test (81 KPIs)...');
  var passed = 0, failed = 0;
  var today = new Date();
  var allDefs = KpiSchema.getAllDefinitions();

  allDefs.forEach(function(def) {
    try {
      var result = KpiService.calculateKpi(def.kpiId, def.period || KpiSchema.PERIOD.MONTHLY, today);
      if (result && typeof result.value === 'number' && !isNaN(result.value)) {
        passed++;
        console.log('✓ ' + def.kpiId + ' = ' + result.value);
      } else {
        failed++;
        console.error('✗ ' + def.kpiId + ' returned invalid value');
      }
    } catch(e) {
      failed++;
      console.error('✗ ' + def.kpiId + ' ERROR: ' + e.message);
    }
  });

  console.log('=== Heavy KPI Test: ' + passed + ' passed, ' + failed + ' failed ===');
  SpreadsheetApp.getUi().alert('Heavy KPI Test: ' + passed + ' passed, ' + failed + ' failed');
  return failed === 0 ? 'ALL 81 KPIs PASSED' : failed + ' KPIs failed';
}