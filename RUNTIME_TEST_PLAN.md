# PHINOX BOS v5 — Phase 8 Runtime Test Plan
# ============================================
# Execute this plan in Google Apps Script Editor
# AFTER uploading all modified/new files from Phases 0, 8A-8G

## PRE-REQUISITES (Before Running Tests)

1. Upload ALL modified files to your GAS project in this order:

   PHASE 0 (Dependencies Fix):
   - 31_OrderService.js (modified)
   - 41_FinanceService.js (modified)

   PHASE 8A (Schema & APIs):
   - 19_TaskSchema.js (modified)
   - 21_TaskService.js (modified)
   - 15_Members.js (modified)
   - 36_SaleService.js (modified)

   PHASE 8B (Customer Layer):
   - 59_CustomerSchema.js (new)
   - 60_CustomerRepository.js (new)
   - 61_CustomerService.js (new)

   PHASE 8C (Performance KPIs):
   - 44_KpiSchema.js (modified)
   - 46_KpiService.js (modified)

   PHASE 8D (Customer KPIs):
   - (same files as 8C, already uploaded)

   PHASE 8E (Satisfaction + NPS):
   - 62_SatisfactionSchema.js (new)
   - 63_SatisfactionRepository.js (new)
   - 64_SatisfactionService.js (new)
   - 65_NPSSchema.js (new)
   - 66_NPSRepository.js (new)
   - 67_NPSService.js (new)
   - 46_KpiService.js (modified — CUST-08/09 real calculators)

   PHASE 8F (Tests):
   - 47_KpiTest.js (modified — 81 KPI tests)

   PHASE 8G (Setup/Menu):
   - 10_Setup.js (modified — new sheets)
   - 11_Menu.js (modified — new menu items + handlers)

   TEST RUNNER:
   - 68_TestRunner.js (new)

2. Run Setup.run() ONCE to create new sheets:
   - Customers
   - Satisfaction
   - NPS

3. Refresh the spreadsheet (F5) to reload the menu.

## TEST EXECUTION STEPS

### Step 1: Smoke Test (30 seconds)
```javascript
runSmokeTest();
```
EXPECTED: "✅ Smoke test passed"
IF FAILED: Stop. Check that ALL files are loaded and no syntax errors.

### Step 2: Full Runtime Test (2-3 minutes)
```javascript
runAllTests();
```

EXPECTED OUTPUT STRUCTURE:
```
╔══════════════════════════════════════════════════════════════╗
║     PHINOX BOS v5 — Phase 8 Complete Runtime Test Suite     ║
╚══════════════════════════════════════════════════════════════╝

▶ PHASE 0: Verifying fixed dependencies...
▶ PHASE 8A: Verifying schema extensions and date APIs...
▶ PHASE 8B: Verifying Customer Service...
▶ PHASE 8E: Verifying Satisfaction + NPS Backend...
▶ REGRESSION: Testing original 60 KPIs...
▶ PHASE 8C/D: Testing new 21 KPIs (PERF + CUST)...
▶ PHASE 7C: Testing Marketing + Social...
▶ REGRESSION: Backward compatibility checks...

╔══════════════════════════════════════════════════════════════╗
║                      RUNTIME TEST REPORT                      ║
╠══════════════════════════════════════════════════════════════╣
║ ✅ PASS | Phase 0 — Broken Dependencies
║        Passed: X | Failed: 0
║ ✅ PASS | Phase 8A — Schema & Core APIs
║        Passed: X | Failed: 0
║ ✅ PASS | Phase 8B — Customer Layer
║        Passed: X | Failed: 0
║ ✅ PASS | Phase 8E — Satisfaction + NPS
║        Passed: X | Failed: 0
║ ✅ PASS | Phase 7B/7C — Original 60 KPIs
║        Passed: X | Failed: 0
║ ✅ PASS | Phase 8C/D — New 21 KPIs
║        Passed: X | Failed: 0
║ ✅ PASS | Phase 7C — Marketing + Social
║        Passed: X | Failed: 0
║ ✅ PASS | Regression — Backward Compatibility
║        Passed: X | Failed: 0
╠══════════════════════════════════════════════════════════════╣
║ TOTAL: XXX passed, 0 failed
║ OVERALL: ✅ ALL TESTS PASSED
╚══════════════════════════════════════════════════════════════╝
```

### Step 3: Manual Verification via Menu

1. Click **🚀 PHINOX BOS** → **▶️ Initialize System**
   - Should complete without error
   - Should create new sheets if they don't exist

2. Click **🚀 PHINOX BOS** → **👥 Customers** → **📊 Customer Stats**
   - Should show customer statistics dialog

3. Click **🚀 PHINOX BOS** → **👥 Customers** → **🔄 Sync from Orders**
   - Should sync customers from existing orders

4. Click **🚀 PHINOX BOS** → **📊 Analytics** → **🔁 Recalculate All KPIs**
   - Should process all 81 KPIs
   - Should show "KPIs calculated: 81, Errors: 0"

5. Click **🚀 PHINOX BOS** → **📊 Analytics** → **📈 Business Dashboard**
   - Should show dashboard with all 81 KPIs
   - Verify Performance and Customer sections appear

6. Click **🚀 PHINOX BOS** → **📊 Analytics** → **🧪 Run KPI Tests**
   - Should run testKpiLayer() and pass

7. Click **🚀 PHINOX BOS** → **📊 Analytics** → **🧪 Run Mkt/Soc Tests**
   - Should run testMktSocLayer() and pass

### Step 4: Sheet Data Verification

Open each new sheet and verify headers:

| Sheet | Expected Headers | Column Count |
|-------|-----------------|--------------|
| Customers | id, name, email, phone, status, segment, joinDate, lastOrderDate, totalOrders, totalAmount, averageOrderValue, notes, createdAt, updatedAt | 14 |
| Satisfaction | id, customerEmail, orderId, score, feedback, createdAt, updatedAt | 7 |
| NPS | id, customerEmail, orderId, score, feedback, createdAt, updatedAt | 7 |

### Step 5: KPI Results Sheet Verification

Open "KPI Results" sheet and verify:
- All 81 KPIs have rows (or will have after first calculateAll)
- No duplicate kpiId + period combinations
- Values are numeric (not #ERROR or #REF)

## TROUBLESHOOTING GUIDE

### Problem: "X is not defined" (e.g., CustomerService not defined)
**Cause:** File not loaded or has syntax error.
**Fix:**
1. Check GAS editor for red error indicators
2. Verify file was uploaded and saved
3. Check file loading order (dependencies must load first)

### Problem: "calculateAll has errors"
**Cause:** Calculator throwing runtime error.
**Fix:**
1. Check console for specific KPI ID that failed
2. Run individual KPI: `KpiService.calculateKpi('FAILED-ID', KpiSchema.PERIOD.MONTHLY, new Date())`
3. Check if required service method exists and returns expected format

### Problem: "Expected 81 KPIs, got 60"
**Cause:** KpiSchema.DEFINITIONS still has 60 entries.
**Fix:**
1. Verify 44_KpiSchema.js was uploaded correctly
2. Check that DEFINITIONS includes PERF-01..11 and CUST-01..10
3. Hard-refresh the editor (Ctrl+Shift+R)

### Problem: "Sheet already exists" during Setup
**Cause:** Normal — Setup skips existing sheets.
**Fix:** No action needed. Verify headers match expected.

### Problem: "CustomerService.getCustomerStats is not a function"
**Cause:** 61_CustomerService.js not loaded or old version cached.
**Fix:**
1. Re-upload 61_CustomerService.js
2. Check that getCustomerStats is in the return block
3. Save and refresh

### Problem: CUST-08 or CUST-09 returns 0 always
**Cause:** No satisfaction/NPS data in period, OR still using placeholder.
**Fix:**
1. Verify 46_KpiService.js has real calculators (not `return 0`)
2. Create test satisfaction/NPS records
3. Re-run calculateAll

### Problem: PERF-04 or PERF-05 returns 0 or NaN
**Cause:** Tasks don't have completedAt field (old data).
**Fix:**
1. Create a new task, approve it
2. Verify completedAt is set in the sheet
3. Re-run calculateAll

## SUCCESS CRITERIA

✅ runSmokeTest() passes
✅ runAllTests() passes with 0 failures
✅ All 81 KPIs calculate without error
✅ Menu shows new Customers submenu
✅ Menu shows Mkt/Soc Tests option
✅ Dashboard shows all 81 KPIs
✅ New sheets have correct headers
✅ No JavaScript errors in console

## POST-TEST CLEANUP

After successful testing, you may want to:
1. Delete test satisfaction/NPS records
2. Clear test customer data
3. Re-sync customers from real orders

## SIGN-OFF

Date: ___________
Tester: ___________
Result: ☐ PASS  ☐ FAIL (with ___ failures)
Notes: ___________________________________

Once signed off, proceed to: HTML/UI Phase (final step)
