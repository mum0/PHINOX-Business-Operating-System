/**
 * KPI Module Tests
 * Phase 8F - PHINOX BOS v5
 */

function testKpiLayer() {
  'use strict';

  console.log('=== PHINOX BOS KPI Module v8F ===');

  var prereqs = ['KpiSchema', 'KpiRepository', 'KpiService'];
  for (var i = 0; i < prereqs.length; i++) {
    try { eval(prereqs[i]); }
    catch (e) {
      console.error('FATAL: ' + prereqs[i] + ' not loaded.');
      throw new Error(prereqs[i] + ' not defined');
    }
  }

  var passed = 0;
  var failed = 0;

  function assert(cond, msg) {
    if (cond) { passed++; console.log('✓ ' + msg); }
    else { failed++; console.error('✗ ' + msg); }
  }

  var S = KpiSchema;
  var svc = KpiService;
  var today = new Date();
  var todayStr = S._formatDateIso(today);

  // ============================================================
  // 1. SCHEMA STRUCTURE
  // ============================================================
  assert(typeof S.RESULT_SCHEMA !== 'undefined', 'KpiSchema.RESULT_SCHEMA exists');
  assert(Object.keys(S.RESULT_SCHEMA).length === 8, 'RESULT_SCHEMA has 8 columns');
  assert(typeof S.PERIOD !== 'undefined', 'KpiSchema.PERIOD exists');
  assert(typeof S.CATEGORY !== 'undefined', 'KpiSchema.CATEGORY exists');
  assert(typeof S.DEFINITIONS !== 'undefined', 'KpiSchema.DEFINITIONS exists');
  assert(Object.keys(S.DEFINITIONS).length === 81, 'DEFINITIONS has 81 KPIs');

  // ============================================================
  // 2. PERIOD LOGIC
  // ============================================================
  var ps1 = S._periodStart(S.PERIOD.MONTHLY, '2026-08-15');
  assert(S._formatDateIso(ps1) === '2026-08-01', 'Monthly period starts on 1st');

  var ps2 = S._periodStart(S.PERIOD.QUARTERLY, '2026-08-15');
  assert(S._formatDateIso(ps2) === '2026-07-01', 'Quarterly period starts on Q3 1st');

  var ps3 = S._periodStart(S.PERIOD.YEARLY, '2026-08-15');
  assert(S._formatDateIso(ps3) === '2026-01-01', 'Yearly period starts on Jan 1');

  var pk1 = S._periodKey(S.PERIOD.MONTHLY, '2026-08-15');
  assert(pk1 === '2026-08', 'Monthly period key format');

  // ============================================================
  // 3. DEFINITION LOOKUP (Original 60 + Phase 8 new)
  // ============================================================
  var fin01 = S.getDefinition('FIN-01');
  assert(fin01 && fin01.name === 'Revenue', 'FIN-01 definition correct');
  assert(fin01.category === S.CATEGORY.FINANCE, 'FIN-01 category is Finance');

  var sale04 = S.getDefinition('SALE-04');
  assert(sale04 && sale04.unit === 'EGP', 'SALE-04 unit is EGP');

  var inv01 = S.getDefinition('INV-01');
  assert(inv01 && inv01.period === S.PERIOD.DAILY, 'INV-01 period is Daily');

  // Phase 8 categories exist
  assert(typeof S.CATEGORY.PERFORMANCE !== 'undefined', 'Performance category exists');
  assert(typeof S.CATEGORY.CUSTOMER !== 'undefined', 'Customer category exists');

  var perf01 = S.getDefinition('PERF-01');
  assert(perf01 && perf01.category === S.CATEGORY.PERFORMANCE, 'PERF-01 category is Performance');
  assert(perf01 && perf01.name === 'Tasks Completed', 'PERF-01 name is Tasks Completed');

  var cust01 = S.getDefinition('CUST-01');
  assert(cust01 && cust01.category === S.CATEGORY.CUSTOMER, 'CUST-01 category is Customer');
  assert(cust01 && cust01.name === 'Total Customers', 'CUST-01 name is Total Customers');

  var allDefs = S.getAllDefinitions();
  assert(allDefs.length === 81, 'getAllDefinitions returns 81');

  // ============================================================
  // 4. IDEMPOTENCY
  // ============================================================
  var testKpi = 'FIN-07';
  var testPeriod = S._periodKey(S.PERIOD.DAILY, today);
  try { KpiRepository.deleteByKpiId(testKpi); } catch(e) {}

  var first = svc.calculateKpi(testKpi, S.PERIOD.DAILY, today);
  assert(first && first.kpiId === testKpi, 'First calculateKpi creates record');

  var second = svc.calculateKpi(testKpi, S.PERIOD.DAILY, today);
  assert(second && second.id === first.id, 'Idempotency: same period updates, not duplicates');

  var history = svc.getKpiHistory(testKpi, 5);
  assert(history.length === 1, 'History shows exactly 1 record after upsert');

  // ============================================================
  // 5. ZERO DIVISION PROTECTION (Original 22 + Phase 8 new)
  // ============================================================
  var zdKpis = [
    'FIN-05', 'FIN-06', 'SALE-03', 'SALE-04', 'SALE-05', 'SALE-06', 'SALE-07',
    'INV-05', 'OPS-03', 'OPS-04',
    'MKT-05', 'MKT-06', 'MKT-07', 'MKT-10', 'MKT-11', 'MKT-12', 'MKT-13',
    'MKT-14', 'MKT-15', 'MKT-17', 'MKT-18', 'SOC-06',
    // Phase 8 Performance
    'PERF-03', 'PERF-05', 'PERF-06', 'PERF-07', 'PERF-09', 'PERF-11',
    // Phase 8 Customer
    'CUST-04', 'CUST-05', 'CUST-06', 'CUST-07', 'CUST-10'
  ];
  zdKpis.forEach(function(kpiId) {
    try {
      var result = svc.calculateKpi(kpiId, S.PERIOD.MONTHLY, today);
      assert(result && typeof result.value === 'number' && !isNaN(result.value),
        'Zero-division safe: ' + kpiId + ' = ' + result.value);
    } catch (e) {
      assert(false, 'Zero-division FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // ============================================================
  // 6. ALL 81 KPIs CALCULATE WITHOUT ERROR
  // ============================================================
  var calcResults = svc.calculateAll(S.PERIOD.MONTHLY, today);
  assert(calcResults && calcResults.results, 'calculateAll returns results object');
  assert(calcResults.results.length === 81, 'calculateAll processes all 81 KPIs');

  var errorCount = calcResults.errors ? calcResults.errors.length : 0;
  assert(errorCount === 0, 'calculateAll has zero errors (got ' + errorCount + ')');

  calcResults.results.forEach(function(r) {
    assert(r.status === 'ok', 'KPI ' + r.kpiId + ' calculated successfully');
  });

  // ============================================================
  // 7. DASHBOARD (81 KPIs)
  // ============================================================
  var dashboard = svc.getDashboardKpis();
  assert(typeof dashboard === 'object', 'getDashboardKpis returns object');
  assert(Object.keys(dashboard).length === 81, 'Dashboard has all 81 KPI keys');

  var fin01Dash = dashboard['FIN-01'];
  assert(fin01Dash && fin01Dash.name === 'Revenue', 'Dashboard FIN-01 has name');
  assert(typeof fin01Dash.value === 'number', 'Dashboard FIN-01 has numeric value');

  // Phase 8 dashboard inclusion
  assert(dashboard['PERF-01'] && dashboard['PERF-01'].category === S.CATEGORY.PERFORMANCE,
    'Dashboard includes PERF-01');
  assert(dashboard['CUST-01'] && dashboard['CUST-01'].category === S.CATEGORY.CUSTOMER,
    'Dashboard includes CUST-01');
  assert(dashboard['CUST-08'] && dashboard['CUST-08'].name === 'Customer Satisfaction',
    'Dashboard includes CUST-08 (Satisfaction)');
  assert(dashboard['CUST-09'] && dashboard['CUST-09'].name === 'Net Promoter Score',
    'Dashboard includes CUST-09 (NPS)');

  // ============================================================
  // 8. CATEGORY CALCULATION (All 8 categories)
  // ============================================================
  var financeResults = svc.calculateCategory(S.CATEGORY.FINANCE, S.PERIOD.MONTHLY, today);
  assert(financeResults.length === 10, 'Finance category has 10 KPIs');

  var salesResults = svc.calculateCategory(S.CATEGORY.SALES, S.PERIOD.MONTHLY, today);
  assert(salesResults.length === 7, 'Sales category has 7 KPIs');

  var invResults = svc.calculateCategory(S.CATEGORY.INVENTORY, S.PERIOD.DAILY, today);
  assert(invResults.length === 5, 'Inventory category has 5 KPIs');

  var opsResults = svc.calculateCategory(S.CATEGORY.OPERATIONS, S.PERIOD.MONTHLY, today);
  assert(opsResults.length === 4, 'Operations category has 4 KPIs');

  var mktResults = svc.calculateCategory(S.CATEGORY.MARKETING, S.PERIOD.MONTHLY, today);
  assert(mktResults.length === 18, 'Marketing category has 18 KPIs');

  var socResults = svc.calculateCategory(S.CATEGORY.SOCIAL_MEDIA, S.PERIOD.MONTHLY, today);
  assert(socResults.length === 16, 'Social Media category has 16 KPIs');

  // Phase 8 new categories
  var perfResults = svc.calculateCategory(S.CATEGORY.PERFORMANCE, S.PERIOD.MONTHLY, today);
  assert(perfResults.length === 11, 'Performance category has 11 KPIs');

  var custResults = svc.calculateCategory(S.CATEGORY.CUSTOMER, S.PERIOD.MONTHLY, today);
  assert(custResults.length === 10, 'Customer category has 10 KPIs');

  // ============================================================
  // 9. ORDER SERVICE BACKWARD COMPATIBILITY + PHASE 0 APIs
  // ============================================================
  assert(typeof OrderService.getOrderById === 'function', 'OrderService.getOrderById exists');
  assert(typeof OrderService.getTotalOrderAmount === 'function', 'OrderService.getTotalOrderAmount exists');
  assert(typeof OrderService.totalOrders === 'function', 'OrderService.totalOrders still exists');
  assert(typeof OrderService.getOrders === 'function', 'OrderService.getOrders still exists');
  assert(typeof OrderService.getOrdersByStatus === 'function', 'OrderService.getOrdersByStatus still exists');
  // Phase 0
  assert(typeof OrderService.getOrdersByDateRange === 'function',
    'OrderService.getOrdersByDateRange exists (Phase 0)');
  assert(typeof OrderService.totalOrdersByDateRange === 'function',
    'OrderService.totalOrdersByDateRange exists (Phase 0)');
  assert(typeof OrderService.getOrdersByStatusAndDateRange === 'function',
    'OrderService.getOrdersByStatusAndDateRange exists (Phase 0)');
  assert(typeof OrderService.getTotalOrderAmountByDateRange === 'function',
    'OrderService.getTotalOrderAmountByDateRange exists (Phase 0)');

  // ============================================================
  // 10. HISTORY RETRIEVAL
  // ============================================================
  var finHistory = svc.getKpiHistory('FIN-01', 3);
  assert(Array.isArray(finHistory), 'getKpiHistory returns array');

  // ============================================================
  // 11. MKT + SOC DEFINITIONS EXIST
  // ============================================================
  assert(S.getDefinition('MKT-01') !== null, 'MKT-01 definition exists');
  assert(S.getDefinition('MKT-18') !== null, 'MKT-18 definition exists');
  assert(S.getDefinition('SOC-01') !== null, 'SOC-01 definition exists');
  assert(S.getDefinition('SOC-16') !== null, 'SOC-16 definition exists');
  assert(S.CATEGORY.MARKETING === 'Marketing', 'Marketing category exists');
  assert(S.CATEGORY.SOCIAL_MEDIA === 'Social Media', 'Social Media category exists');

  // ============================================================
  // 12. MKT + SOC CALCULATORS RUN WITHOUT ERROR
  // ============================================================
  var mktIds = ['MKT-01','MKT-02','MKT-03','MKT-04','MKT-05','MKT-06','MKT-07','MKT-08','MKT-09','MKT-10','MKT-11','MKT-12','MKT-13','MKT-14','MKT-15','MKT-16','MKT-17','MKT-18'];
  mktIds.forEach(function(kpiId) {
    try {
      var result = svc.calculateKpi(kpiId, S.PERIOD.MONTHLY, today);
      assert(result && typeof result.value === 'number' && !isNaN(result.value),
        'MKT calculator ok: ' + kpiId + ' = ' + result.value);
    } catch (e) {
      assert(false, 'MKT calculator FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  var socIds = ['SOC-01','SOC-02','SOC-03','SOC-04','SOC-05','SOC-06','SOC-07','SOC-08','SOC-09','SOC-10','SOC-11','SOC-12','SOC-13','SOC-14','SOC-15','SOC-16'];
  socIds.forEach(function(kpiId) {
    try {
      var result = svc.calculateKpi(kpiId, S.PERIOD.MONTHLY, today);
      assert(result && typeof result.value === 'number' && !isNaN(result.value),
        'SOC calculator ok: ' + kpiId + ' = ' + result.value);
    } catch (e) {
      assert(false, 'SOC calculator FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // ============================================================
  // 13. DASHBOARD INCLUDES MKT + SOC
  // ============================================================
  var dash = svc.getDashboardKpis();
  assert(dash['MKT-01'] && dash['MKT-01'].name === 'Ad Spend', 'Dashboard includes MKT-01');
  assert(dash['SOC-01'] && dash['SOC-01'].name === 'Followers', 'Dashboard includes SOC-01');

  // ============================================================
  // 14. PHASE 8C: PERFORMANCE KPIs (PERF-01..11)
  // ============================================================
  var perfIds = ['PERF-01','PERF-02','PERF-03','PERF-04','PERF-05','PERF-06','PERF-07','PERF-08','PERF-09','PERF-10','PERF-11'];
  perfIds.forEach(function(kpiId) {
    try {
      var result = svc.calculateKpi(kpiId, S.PERIOD.MONTHLY, today);
      assert(result && typeof result.value === 'number' && !isNaN(result.value),
        'PERF calculator ok: ' + kpiId + ' = ' + result.value);
    } catch (e) {
      assert(false, 'PERF calculator FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // PERF bounds / sanity checks
  var perf03 = svc.calculateKpi('PERF-03', S.PERIOD.MONTHLY, today);
  assert(perf03.value >= 0 && perf03.value <= 100,
    'PERF-03 Approval Rate is within 0-100% (got ' + perf03.value + ')');

  var perf05 = svc.calculateKpi('PERF-05', S.PERIOD.MONTHLY, today);
  assert(perf05.value >= 0 && perf05.value <= 100,
    'PERF-05 On-Time Rate is within 0-100% (got ' + perf05.value + ')');

  var perf06 = svc.calculateKpi('PERF-06', S.PERIOD.MONTHLY, today);
  assert(perf06.value >= 0 && perf06.value <= 100,
    'PERF-06 Overdue Rate is within 0-100% (got ' + perf06.value + ')');

  var perf10 = svc.calculateKpi('PERF-10', S.PERIOD.MONTHLY, today);
  assert(perf10.value >= 0 && perf10.value <= 100,
    'PERF-10 Task Quality Score is within 0-100 (got ' + perf10.value + ')');

  // ============================================================
  // 15. PHASE 8D: CUSTOMER KPIs (CUST-01..10)
  // ============================================================
  var custIds = ['CUST-01','CUST-02','CUST-03','CUST-04','CUST-05','CUST-06','CUST-07','CUST-08','CUST-09','CUST-10'];
  custIds.forEach(function(kpiId) {
    try {
      var result = svc.calculateKpi(kpiId, S.PERIOD.MONTHLY, today);
      assert(result && typeof result.value === 'number' && !isNaN(result.value),
        'CUST calculator ok: ' + kpiId + ' = ' + result.value);
    } catch (e) {
      assert(false, 'CUST calculator FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // CUST bounds / sanity checks
  var cust04 = svc.calculateKpi('CUST-04', S.PERIOD.MONTHLY, today);
  assert(cust04.value >= 0 && cust04.value <= 100,
    'CUST-04 Retention Rate is within 0-100% (got ' + cust04.value + ')');

  var cust08 = svc.calculateKpi('CUST-08', S.PERIOD.MONTHLY, today);
  assert(cust08.value >= 0 && cust08.value <= 10,
    'CUST-08 Satisfaction is within 0-10 (got ' + cust08.value + ')');

  var cust09 = svc.calculateKpi('CUST-09', S.PERIOD.MONTHLY, today);
  assert(cust09.value >= -100 && cust09.value <= 100,
    'CUST-09 NPS is within -100 to +100 (got ' + cust09.value + ')');

  // ============================================================
  // 16. PHASE 8E: SATISFACTION + NPS SERVICES EXIST
  // ============================================================
  assert(typeof SatisfactionService !== 'undefined', 'SatisfactionService exists');
  assert(typeof SatisfactionService.getAverageScore === 'function',
    'SatisfactionService.getAverageScore exists');
  assert(typeof SatisfactionService.createSatisfaction === 'function',
    'SatisfactionService.createSatisfaction exists');

  assert(typeof NPSService !== 'undefined', 'NPSService exists');
  assert(typeof NPSService.getNPS === 'function', 'NPSService.getNPS exists');
  assert(typeof NPSService.createNPS === 'function', 'NPSService.createNPS exists');

  // ============================================================
  // 17. PHASE 8A: TASK SERVICE DATE APIs
  // ============================================================
  assert(typeof TaskService.getTasksByDateRange === 'function',
    'TaskService.getTasksByDateRange exists (8A)');
  assert(typeof TaskService.getCompletedTasksByDateRange === 'function',
    'TaskService.getCompletedTasksByDateRange exists (8A)');
  assert(typeof TaskService.getAverageCompletionTime === 'function',
    'TaskService.getAverageCompletionTime exists (8A)');
  assert(typeof TaskService.getOnTimeRate === 'function',
    'TaskService.getOnTimeRate exists (8A)');
  assert(typeof TaskService.getAverageQuality === 'function',
    'TaskService.getAverageQuality exists (8A)');

  // ============================================================
  // 18. PHASE 8A: MEMBER APIs
  // ============================================================
  assert(typeof Members.getMembersByDepartment === 'function',
    'Members.getMembersByDepartment exists (8A)');
  assert(typeof Members.getMemberByEmail === 'function',
    'Members.getMemberByEmail exists (8A)');
  assert(typeof Members.getMemberTaskStats === 'function',
    'Members.getMemberTaskStats exists (8A)');

  // ============================================================
  // 19. PHASE 8A: SALE DATE APIs
  // ============================================================
  assert(typeof SaleService.getSalesByDateRange === 'function',
    'SaleService.getSalesByDateRange exists (8A)');
  assert(typeof SaleService.getTotalRevenueByDateRange === 'function',
    'SaleService.getTotalRevenueByDateRange exists (8A)');
  assert(typeof SaleService.getTotalCOGSByDateRange === 'function',
    'SaleService.getTotalCOGSByDateRange exists (8A)');
  assert(typeof SaleService.getGrossProfitByDateRange === 'function',
    'SaleService.getGrossProfitByDateRange exists (8A)');

  // ============================================================
  // 20. PHASE 8B: CUSTOMER SERVICE
  // ============================================================
  assert(typeof CustomerService !== 'undefined', 'CustomerService exists');
  assert(typeof CustomerService.getCustomers === 'function',
    'CustomerService.getCustomers exists');
  assert(typeof CustomerService.getNewCustomers === 'function',
    'CustomerService.getNewCustomers exists');
  assert(typeof CustomerService.getReturningCustomers === 'function',
    'CustomerService.getReturningCustomers exists');
  assert(typeof CustomerService.getRetentionRate === 'function',
    'CustomerService.getRetentionRate exists');
  assert(typeof CustomerService.getChurnRate === 'function',
    'CustomerService.getChurnRate exists');
  assert(typeof CustomerService.getAverageLTV === 'function',
    'CustomerService.getAverageLTV exists');
  assert(typeof CustomerService.getCustomersByDateRange === 'function',
    'CustomerService.getCustomersByDateRange exists');

  // ============================================================
  // 21. PHASE 0: FINANCE APIs
  // ============================================================
  assert(typeof FinanceService.getRefunds === 'function',
    'FinanceService.getRefunds exists (Phase 0)');
  assert(typeof FinanceService.getRevenueGrowth === 'function',
    'FinanceService.getRevenueGrowth exists (Phase 0)');
  assert(typeof FinanceService.getProfitGrowth === 'function',
    'FinanceService.getProfitGrowth exists (Phase 0)');

  // ============================================================
  // 22. NO DUPLICATE IDs ACROSS ALL 81 KPIs
  // ============================================================
  var ids = allDefs.map(function(d) { return d.id; });
  var uniqueIds = [];
  var hasDupes = false;
  var dupeList = [];
  ids.forEach(function(id) {
    if (uniqueIds.indexOf(id) !== -1) {
      hasDupes = true;
      dupeList.push(id);
    } else {
      uniqueIds.push(id);
    }
  });
  assert(!hasDupes, 'All 81 KPI IDs are unique' + (dupeList.length ? ' (dupes: ' + dupeList.join(', ') + ')' : ''));

  // ============================================================
  // 23. ALL 60 ORIGINAL KPIs STILL PRESENT (Regression)
  // ============================================================
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
  var missingOriginal = [];
  originalIds.forEach(function(id) {
    if (!S.getDefinition(id)) missingOriginal.push(id);
  });
  assert(missingOriginal.length === 0,
    'All 60 original KPIs still present (missing: ' + missingOriginal.join(', ') + ')');

  // ============================================================
  // 24. NO PLACEHOLDERS REMAIN IN CUST-08 / CUST-09
  // ============================================================
  var cust08Def = S.getDefinition('CUST-08');
  var cust09Def = S.getDefinition('CUST-09');
  assert(cust08Def && cust08Def.name.toLowerCase().indexOf('placeholder') === -1,
    'CUST-08 definition is not a placeholder (name: ' + (cust08Def ? cust08Def.name : 'null') + ')');
  assert(cust09Def && cust09Def.name.toLowerCase().indexOf('placeholder') === -1,
    'CUST-09 definition is not a placeholder (name: ' + (cust09Def ? cust09Def.name : 'null') + ')');

  // ============================================================
  // 25. ALL NEW PHASE 8 IDs ARE PRESENT
  // ============================================================
  var newPerfIds = ['PERF-01','PERF-02','PERF-03','PERF-04','PERF-05','PERF-06','PERF-07','PERF-08','PERF-09','PERF-10','PERF-11'];
  var newCustIds = ['CUST-01','CUST-02','CUST-03','CUST-04','CUST-05','CUST-06','CUST-07','CUST-08','CUST-09','CUST-10'];
  var missingNew = [];
  newPerfIds.concat(newCustIds).forEach(function(id) {
    if (!S.getDefinition(id)) missingNew.push(id);
  });
  assert(missingNew.length === 0,
    'All 21 new Phase 8 KPIs are present (missing: ' + missingNew.join(', ') + ')');

  // CLEANUP
  try { KpiRepository.deleteByKpiId(testKpi); } catch(e) {}

  console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failed > 0) throw new Error(failed + ' KPI tests failed');
  return 'All KPI tests passed: ' + passed;
}
