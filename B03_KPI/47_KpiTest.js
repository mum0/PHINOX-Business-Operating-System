/**
 * KPI Module Tests
 * Phase 7B - PHINOX BOS v5
 */

function testKpiLayer() {
  'use strict';

  console.log('=== PHINOX BOS KPI Module v7B ===');

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

  // 1. SCHEMA
  assert(typeof S.RESULT_SCHEMA !== 'undefined', 'KpiSchema.RESULT_SCHEMA exists');
  assert(Object.keys(S.RESULT_SCHEMA).length === 8, 'RESULT_SCHEMA has 8 columns');
  assert(typeof S.PERIOD !== 'undefined', 'KpiSchema.PERIOD exists');
  assert(typeof S.CATEGORY !== 'undefined', 'KpiSchema.CATEGORY exists');
  assert(typeof S.DEFINITIONS !== 'undefined', 'KpiSchema.DEFINITIONS exists');
  assert(Object.keys(S.DEFINITIONS).length === 60, 'DEFINITIONS has 26 KPIs');

  // 2. PERIOD LOGIC
  var ps1 = S._periodStart(S.PERIOD.MONTHLY, '2026-08-15');
  assert(S._formatDateIso(ps1) === '2026-08-01', 'Monthly period starts on 1st');

  var ps2 = S._periodStart(S.PERIOD.QUARTERLY, '2026-08-15');
  assert(S._formatDateIso(ps2) === '2026-07-01', 'Quarterly period starts on Q3 1st');

  var ps3 = S._periodStart(S.PERIOD.YEARLY, '2026-08-15');
  assert(S._formatDateIso(ps3) === '2026-01-01', 'Yearly period starts on Jan 1');

  var pk1 = S._periodKey(S.PERIOD.MONTHLY, '2026-08-15');
  assert(pk1 === '2026-08', 'Monthly period key format');

  // 3. DEFINITION LOOKUP
  var fin01 = S.getDefinition('FIN-01');
  assert(fin01 && fin01.name === 'Revenue', 'FIN-01 definition correct');
  assert(fin01.category === S.CATEGORY.FINANCE, 'FIN-01 category is Finance');

  var sale04 = S.getDefinition('SALE-04');
  assert(sale04 && sale04.unit === 'EGP', 'SALE-04 unit is EGP');

  var inv01 = S.getDefinition('INV-01');
  assert(inv01 && inv01.period === S.PERIOD.DAILY, 'INV-01 period is Daily');

  var allDefs = S.getAllDefinitions();
  assert(allDefs.length === 60, 'getAllDefinitions returns 26');

  // 4. IDEMPOTENCY
  var testKpi = 'FIN-07';
  var testPeriod = S._periodKey(S.PERIOD.DAILY, today);
  try { KpiRepository.deleteByKpiId(testKpi); } catch(e) {}

  var first = svc.calculateKpi(testKpi, S.PERIOD.DAILY, today);
  assert(first && first.kpiId === testKpi, 'First calculateKpi creates record');

  var second = svc.calculateKpi(testKpi, S.PERIOD.DAILY, today);
  assert(second && second.id === first.id, 'Idempotency: same period updates, not duplicates');

  var history = svc.getKpiHistory(testKpi, 5);
  assert(history.length === 1, 'History shows exactly 1 record after upsert');

  // 5. ZERO DIVISION PROTECTION
  var zdKpis = ['FIN-05', 'FIN-06', 'SALE-03', 'SALE-04', 'SALE-05', 'SALE-06', 'SALE-07', 'INV-05', 'OPS-03', 'OPS-04', 'MKT-05', 'MKT-06', 'MKT-07', 'MKT-10', 'MKT-11', 'MKT-12', 'MKT-13', 'MKT-14', 'MKT-15', 'MKT-17', 'MKT-18', 'SOC-06'];
  zdKpis.forEach(function(kpiId) {
    try {
      var result = svc.calculateKpi(kpiId, S.PERIOD.MONTHLY, today);
      assert(result && typeof result.value === 'number' && !isNaN(result.value),
        'Zero-division safe: ' + kpiId + ' = ' + result.value);
    } catch (e) {
      assert(false, 'Zero-division FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // 6. ALL 26 KPIs CALCULATE WITHOUT ERROR
  var calcResults = svc.calculateAll(S.PERIOD.MONTHLY, today);
  assert(calcResults && calcResults.results, 'calculateAll returns results object');
  assert(calcResults.results.length === 60, 'calculateAll processes all 26 KPIs');

  var errorCount = calcResults.errors ? calcResults.errors.length : 0;
  assert(errorCount === 0, 'calculateAll has zero errors (got ' + errorCount + ')');

  calcResults.results.forEach(function(r) {
    assert(r.status === 'ok', 'KPI ' + r.kpiId + ' calculated successfully');
  });

  // 7. DASHBOARD
  var dashboard = svc.getDashboardKpis();
  assert(typeof dashboard === 'object', 'getDashboardKpis returns object');
  assert(Object.keys(dashboard).length === 60, 'Dashboard has all 26 KPI keys');

  var fin01Dash = dashboard['FIN-01'];
  assert(fin01Dash && fin01Dash.name === 'Revenue', 'Dashboard FIN-01 has name');
  assert(typeof fin01Dash.value === 'number', 'Dashboard FIN-01 has numeric value');

  // 8. CATEGORY CALCULATION
  var financeResults = svc.calculateCategory(S.CATEGORY.FINANCE, S.PERIOD.MONTHLY, today);
  assert(financeResults.length === 10, 'Finance category has 10 KPIs');

  var salesResults = svc.calculateCategory(S.CATEGORY.SALES, S.PERIOD.MONTHLY, today);
  assert(salesResults.length === 7, 'Sales category has 7 KPIs');

  var invResults = svc.calculateCategory(S.CATEGORY.INVENTORY, S.PERIOD.DAILY, today);
  assert(invResults.length === 5, 'Inventory category has 5 KPIs');

  var opsResults = svc.calculateCategory(S.CATEGORY.OPERATIONS, S.PERIOD.MONTHLY, today);
  assert(opsResults.length === 4, 'Operations category has 4 KPIs');

  // 9. ORDER SERVICE BACKWARD COMPATIBILITY
  assert(typeof OrderService.getOrderById === 'function', 'OrderService.getOrderById exists');
  assert(typeof OrderService.getTotalOrderAmount === 'function', 'OrderService.getTotalOrderAmount exists');
  assert(typeof OrderService.totalOrders === 'function', 'OrderService.totalOrders still exists');
  assert(typeof OrderService.getOrders === 'function', 'OrderService.getOrders still exists');
  assert(typeof OrderService.getOrdersByStatus === 'function', 'OrderService.getOrdersByStatus still exists');

  // 10. HISTORY RETRIEVAL
  var finHistory = svc.getKpiHistory('FIN-01', 3);
  assert(Array.isArray(finHistory), 'getKpiHistory returns array');

  // 11. MKT + SOC DEFINITIONS EXIST
  assert(S.getDefinition('MKT-01') !== null, 'MKT-01 definition exists');
  assert(S.getDefinition('MKT-18') !== null, 'MKT-18 definition exists');
  assert(S.getDefinition('SOC-01') !== null, 'SOC-01 definition exists');
  assert(S.getDefinition('SOC-16') !== null, 'SOC-16 definition exists');
  assert(S.CATEGORY.MARKETING === 'Marketing', 'Marketing category exists');
  assert(S.CATEGORY.SOCIAL_MEDIA === 'Social Media', 'Social Media category exists');

  // 12. MKT + SOC CALCULATORS RUN WITHOUT ERROR
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

  // 13. DASHBOARD INCLUDES MKT + SOC
  var dash = svc.getDashboardKpis();
  assert(dash['MKT-01'] && dash['MKT-01'].name === 'Ad Spend', 'Dashboard includes MKT-01');
  assert(dash['SOC-01'] && dash['SOC-01'].name === 'Followers', 'Dashboard includes SOC-01');

  // 14. CATEGORY CALCULATION FOR MKT + SOC
  var mktResults = svc.calculateCategory(S.CATEGORY.MARKETING, S.PERIOD.MONTHLY, today);
  assert(mktResults.length === 18, 'Marketing category has 18 KPIs');

  var socResults = svc.calculateCategory(S.CATEGORY.SOCIAL_MEDIA, S.PERIOD.MONTHLY, today);
  assert(socResults.length === 16, 'Social Media category has 16 KPIs');

  // CLEANUP
  try { KpiRepository.deleteByKpiId(testKpi); } catch(e) {}

  console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failed > 0) throw new Error(failed + ' KPI tests failed');
  return 'All KPI tests passed: ' + passed;
}
