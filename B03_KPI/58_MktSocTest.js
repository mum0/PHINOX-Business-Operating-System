// @ts-nocheck
/**
 * Marketing & Social Media Module Tests
 * Phase 7C - PHINOX BOS v5
 */

function testMktSocLayer() {
  'use strict';

  console.log('=== PHINOX BOS MKT/SOC Module v7C ===');

  var prereqs = ['MktSchema', 'MktRepository', 'MktService', 'SocSchema', 'SocRepository', 'SocService'];
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

  var today = new Date();
  var todayStr = KpiSchema._formatDateIso(today);

  // 1. SCHEMAS
  assert(typeof MktSchema !== 'undefined', 'MktSchema exists');
  assert(typeof MktSchema.SCHEMA !== 'undefined', 'MktSchema.SCHEMA exists');
  assert(Object.keys(MktSchema.SCHEMA).length === 20, 'MktSchema has 20 columns');
  assert(typeof SocSchema !== 'undefined', 'SocSchema exists');
  assert(typeof SocSchema.SCHEMA !== 'undefined', 'SocSchema.SCHEMA exists');
  assert(Object.keys(SocSchema.SCHEMA).length === 22, 'SocSchema has 22 columns');

  // 2. REPOSITORIES
  assert(typeof MktRepository !== 'undefined', 'MktRepository exists');
  assert(typeof SocRepository !== 'undefined', 'SocRepository exists');

  // 3. SERVICES
  assert(typeof MktService !== 'undefined', 'MktService exists');
  assert(typeof SocService !== 'undefined', 'SocService exists');

  // 4. MARKETING RECORD VALIDATION
  try {
    MktService.createRecord({
      date: todayStr,
      platform: 'Meta',
      currency: 'EGP',
      spend: 1000,
      impressions: 50000,
      clicks: 500
    });
    assert(true, 'Marketing record created with valid data');
  } catch (e) {
    assert(false, 'Marketing record creation FAILED: ' + e.message);
  }

  // 5. SOCIAL RECORD VALIDATION
  try {
    SocService.createRecord({
      date: todayStr,
      platform: 'Instagram',
      followers: 5000,
      reach: 2000,
      impressions: 5000,
      engagements: 300
    });
    assert(true, 'Social record created with valid data');
  } catch (e) {
    assert(false, 'Social record creation FAILED: ' + e.message);
  }

  // 6. DATE VALIDATION
  try {
    MktService.createRecord({ date: 'invalid', platform: 'Meta', currency: 'EGP', spend: 100 });
    assert(false, 'Marketing rejected invalid date');
  } catch (e) {
    assert(true, 'Marketing correctly rejects invalid date');
  }

  // 7. NUMERIC VALIDATION (negative values)
  try {
    MktService.createRecord({ date: todayStr, platform: 'Meta', currency: 'EGP', spend: -100 });
    assert(false, 'Marketing rejected negative spend');
  } catch (e) {
    assert(true, 'Marketing correctly rejects negative spend');
  }

  // 8. CSV PARSING
  var csvText = 'date,platform,spend,impressions,clicks\n2026-08-01,Meta,1000,50000,500\n2026-08-02,Google,2000,100000,800';
  var csvResult = MktService.importFromCsv(csvText);
  assert(csvResult.imported === 2, 'CSV imported 2 rows');
  assert(csvResult.rejected.length === 0, 'CSV had 0 rejected rows');

  // 9. CSV INVALID ROW HANDLING
  var badCsv = 'date,platform,spend\n2026-08-01,Meta,abc\n,Google,100';
  var badResult = MktService.importFromCsv(badCsv);
  assert(badResult.rejected.length > 0, 'CSV rejected invalid rows');

  // 10. MKT-01 AD SPEND
  var mkt01 = KpiService.calculateKpi('MKT-01', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt01 && mkt01.value >= 0, 'MKT-01 Ad Spend calculated');

  // 11. MKT-05 CTR
  var mkt05 = KpiService.calculateKpi('MKT-05', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt05 && typeof mkt05.value === 'number', 'MKT-05 CTR calculated');

  // 12. MKT-06 CPC
  var mkt06 = KpiService.calculateKpi('MKT-06', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt06 && typeof mkt06.value === 'number', 'MKT-06 CPC calculated');

  // 13. MKT-07 CPM
  var mkt07 = KpiService.calculateKpi('MKT-07', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt07 && typeof mkt07.value === 'number', 'MKT-07 CPM calculated');

  // 14. MKT-10 CONVERSION RATE
  var mkt10 = KpiService.calculateKpi('MKT-10', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt10 && typeof mkt10.value === 'number', 'MKT-10 Conversion Rate calculated');

  // 15. MKT-11 CPA
  var mkt11 = KpiService.calculateKpi('MKT-11', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt11 && typeof mkt11.value === 'number', 'MKT-11 CPA calculated');

  // 16. MKT-12 COST PER LEAD
  var mkt12 = KpiService.calculateKpi('MKT-12', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt12 && typeof mkt12.value === 'number', 'MKT-12 Cost per Lead calculated');

  // 17. MKT-13 ROAS
  var mkt13 = KpiService.calculateKpi('MKT-13', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt13 && typeof mkt13.value === 'number', 'MKT-13 ROAS calculated');

  // 18. MKT-14 ROI
  var mkt14 = KpiService.calculateKpi('MKT-14', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt14 && typeof mkt14.value === 'number', 'MKT-14 ROI calculated');

  // 19. MKT-15 CAC
  var mkt15 = KpiService.calculateKpi('MKT-15', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt15 && typeof mkt15.value === 'number', 'MKT-15 CAC calculated');

  // 20. MKT-16 LTV
  var mkt16 = KpiService.calculateKpi('MKT-16', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt16 && typeof mkt16.value === 'number', 'MKT-16 LTV calculated');

  // 21. MKT-17 LTV:CAC RATIO
  var mkt17 = KpiService.calculateKpi('MKT-17', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt17 && typeof mkt17.value === 'number', 'MKT-17 LTV:CAC Ratio calculated');

  // 22. MKT-18 PAYBACK PERIOD
  var mkt18 = KpiService.calculateKpi('MKT-18', KpiSchema.PERIOD.MONTHLY, today);
  assert(mkt18 && typeof mkt18.value === 'number', 'MKT-18 Payback Period calculated');

  // 23. SOC-01 FOLLOWERS
  var soc01 = KpiService.calculateKpi('SOC-01', KpiSchema.PERIOD.DAILY, today);
  assert(soc01 && typeof soc01.value === 'number', 'SOC-01 Followers calculated');

  // 24. SOC-02 FOLLOWER GROWTH
  var soc02 = KpiService.calculateKpi('SOC-02', KpiSchema.PERIOD.MONTHLY, today);
  assert(soc02 && typeof soc02.value === 'number', 'SOC-02 Follower Growth calculated');

  // 25. SOC-05 ENGAGEMENTS
  var soc05 = KpiService.calculateKpi('SOC-05', KpiSchema.PERIOD.MONTHLY, today);
  assert(soc05 && typeof soc05.value === 'number', 'SOC-05 Engagements calculated');

  // 26. SOC-06 ENGAGEMENT RATE
  var soc06 = KpiService.calculateKpi('SOC-06', KpiSchema.PERIOD.MONTHLY, today);
  assert(soc06 && typeof soc06.value === 'number', 'SOC-06 Engagement Rate calculated');

  // 27. SOC-15 SOCIAL ATTRIBUTED PURCHASES
  var soc15 = KpiService.calculateKpi('SOC-15', KpiSchema.PERIOD.MONTHLY, today);
  assert(soc15 && typeof soc15.value === 'number', 'SOC-15 Social Purchases calculated');

  // 28. SOC-16 SOCIAL ATTRIBUTED REVENUE
  var soc16 = KpiService.calculateKpi('SOC-16', KpiSchema.PERIOD.MONTHLY, today);
  assert(soc16 && typeof soc16.value === 'number', 'SOC-16 Social Revenue calculated');

  // 29. ZERO DIVISION PROTECTION FOR MKT
  var zdMkt = ['MKT-05','MKT-06','MKT-07','MKT-10','MKT-11','MKT-12','MKT-13','MKT-14','MKT-15','MKT-17','MKT-18'];
  zdMkt.forEach(function(kpiId) {
    try {
      var r = KpiService.calculateKpi(kpiId, KpiSchema.PERIOD.MONTHLY, today);
      assert(r && typeof r.value === 'number' && !isNaN(r.value) && r.value !== Infinity,
        'Zero-division safe MKT: ' + kpiId + ' = ' + r.value);
    } catch (e) {
      assert(false, 'Zero-division FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // 30. ZERO DIVISION PROTECTION FOR SOC
  var zdSoc = ['SOC-06'];
  zdSoc.forEach(function(kpiId) {
    try {
      var r = KpiService.calculateKpi(kpiId, KpiSchema.PERIOD.MONTHLY, today);
      assert(r && typeof r.value === 'number' && !isNaN(r.value) && r.value !== Infinity,
        'Zero-division safe SOC: ' + kpiId + ' = ' + r.value);
    } catch (e) {
      assert(false, 'Zero-division FAILED for ' + kpiId + ': ' + e.message);
    }
  });

  // 31. PERIOD ISOLATION
  var pm = KpiSchema._periodKey(KpiSchema.PERIOD.MONTHLY, today);
  var pd = KpiSchema._periodKey(KpiSchema.PERIOD.DAILY, today);
  assert(pm !== pd, 'Monthly and Daily period keys differ');

  // 32. DASHBOARD RETRIEVAL
  var dashboard = KpiService.getDashboardKpis();
  assert(typeof dashboard['MKT-01'] !== 'undefined', 'Dashboard includes MKT-01');
  assert(typeof dashboard['SOC-01'] !== 'undefined', 'Dashboard includes SOC-01');

  // 33. CATEGORY CALCULATION
  var catMkt = KpiService.calculateCategory(KpiSchema.CATEGORY.MARKETING, KpiSchema.PERIOD.MONTHLY, today);
  assert(catMkt.length === 18, 'Marketing category calculation returns 18 KPIs');

  var catSoc = KpiService.calculateCategory(KpiSchema.CATEGORY.SOCIAL_MEDIA, KpiSchema.PERIOD.MONTHLY, today);
  assert(catSoc.length === 16, 'Social Media category calculation returns 16 KPIs');

  // 34. EXISTING BUSINESS KPI REGRESSION
  var finResults = KpiService.calculateCategory(KpiSchema.CATEGORY.FINANCE, KpiSchema.PERIOD.MONTHLY, today);
  assert(finResults.length === 10, 'Finance regression: still 10 KPIs');

  var saleResults = KpiService.calculateCategory(KpiSchema.CATEGORY.SALES, KpiSchema.PERIOD.MONTHLY, today);
  assert(saleResults.length === 7, 'Sales regression: still 7 KPIs');

  console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failed > 0) throw new Error(failed + ' MKT/SOC tests failed');
  return 'All MKT/SOC tests passed: ' + passed;
}
