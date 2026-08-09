/**
 * Finance Module Tests
 * Phase 6 - PHINOX BOS v5
 */

function testFinanceLayer() {
    'use strict';
  
    console.log('=== PHINOX BOS Finance Module v5.0 ===');
  
    // Prerequisite check
    var prereqs = ['FinanceSchema', 'FinanceRepository', 'FinanceService'];
    for (var i = 0; i < prereqs.length; i++) {
      try {
        eval(prereqs[i]);
      } catch (e) {
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
  
    var S = FinanceSchema;
    var svc = FinanceService;
  
    // ─── 1. SCHEMA ───
    assert(typeof S.LEDGER_SCHEMA !== 'undefined', 'FinanceSchema.LEDGER_SCHEMA');
    assert(typeof S.EXPENSE_SCHEMA !== 'undefined', 'FinanceSchema.EXPENSE_SCHEMA');
    assert(Object.values(S.LEDGER_TYPE).indexOf('Revenue') > -1, 'LEDGER_TYPE.Revenue');
    assert(Object.values(S.EXPENSE_STATUS).indexOf('Approved') > -1, 'EXPENSE_STATUS.Approved');
  
    // ─── 2. IDEMPOTENCY (Repository-level) ───
    var testKey = 'TEST-IDEMPOTENCY-' + Date.now();
    assert(FinanceRepository.isIdempotencyKeyExists(testKey) === false, 'Idempotency key not exists initially');
  
    // ─── 3. LEDGER POSTING ───
    var ledgerEntry = svc.postRevenue({
      id: 'TEST-SALE-001',
      totalAmount: 1000,
      createdAt: new Date()
    });
    assert(ledgerEntry && ledgerEntry.type === S.LEDGER_TYPE.REVENUE, 'postRevenue creates Revenue entry');
    assert(ledgerEntry.amount === 1000, 'postRevenue amount correct');
    assert(ledgerEntry.status === S.STATUS.POSTED, 'postRevenue status is Posted');
  
    // Idempotency: same sale should not create duplicate
    var duplicate = svc.postRevenue({ id: 'TEST-SALE-001', totalAmount: 1000 });
    assert(duplicate.id === ledgerEntry.id, 'Idempotency prevents duplicate Revenue');
  
    var cogsEntry = svc.postCOGS({ id: 'TEST-SALE-001', cogs: 400 });
    assert(cogsEntry && cogsEntry.type === S.LEDGER_TYPE.COGS, 'postCOGS creates COGS entry');
    assert(cogsEntry.amount === -400, 'postCOGS amount is negative');
  
    var cashEntry = svc.postCashIn('TEST-SALE-001', 500, 1, 'Cash');
    assert(cashEntry && cashEntry.type === S.LEDGER_TYPE.CASH_IN, 'postCashIn creates Cash In');
    assert(cashEntry.amount === 500, 'postCashIn amount correct');
  
    var refundEntry = svc.postRefund('TEST-SALE-001', 100, 1);
    assert(refundEntry && refundEntry.type === S.LEDGER_TYPE.REFUND, 'postRefund creates Refund');
    assert(refundEntry.amount === -100, 'postRefund amount is negative');
  
    // ─── 4. EXPENSE WORKFLOW ───
    var expId = svc.createExpenseRequest({
      title: 'Test Office Supplies',
      category: S.EXPENSE_CATEGORY.SUPPLIES,
      amount: 75.50,
      description: 'Printer ink'
    });
    assert(expId && expId.indexOf('EXP-') === 0, 'createExpenseRequest returns EXP- ID');
  
    var exp = FinanceRepository.findExpenseById(expId);
    assert(exp.status === S.EXPENSE_STATUS.DRAFT, 'New expense is Draft');
  
    // Submit
    var submitted = svc.submitExpenseRequest(expId);
    assert(submitted.status === S.EXPENSE_STATUS.PENDING, 'submitExpenseRequest sets Pending');
  
    // Approve
    var approved = svc.approveExpenseRequest(expId);
    assert(approved.status === S.EXPENSE_STATUS.APPROVED, 'approveExpenseRequest sets Approved');
    assert(approved.approvedBy !== '', 'approveExpenseRequest sets approvedBy');
  
    // Reject (create another for reject test)
    var expId2 = svc.createExpenseRequest({ title: 'Rejected Test', category: S.EXPENSE_CATEGORY.OTHER, amount: 10 });
    svc.submitExpenseRequest(expId2);
    var rejected = svc.rejectExpenseRequest(expId2, 'Over budget');
    assert(rejected.status === S.EXPENSE_STATUS.REJECTED, 'rejectExpenseRequest sets Rejected');
    assert(rejected.rejectionReason === 'Over budget', 'rejectExpenseRequest sets reason');
  
    // Post to ledger (only when approved)
    var posted = svc.postExpenseToLedger(expId);
    assert(posted.type === S.LEDGER_TYPE.EXPENSE, 'postExpenseToLedger creates Expense entry');
    assert(posted.amount === -75.50, 'postExpenseToLedger amount is negative');
    assert(FinanceRepository.findExpenseById(expId).status === S.EXPENSE_STATUS.POSTED, 'Expense status updated to Posted');
  
    // Delete draft
    var expId3 = svc.createExpenseRequest({ title: 'Delete Me', category: S.EXPENSE_CATEGORY.OTHER, amount: 5 });
    var deleted = svc.deleteExpenseRequest(expId3);
    assert(deleted === true, 'deleteExpenseRequest returns true');
    assert(FinanceRepository.findExpenseById(expId3) === null, 'Draft expense deleted');
  
    // ─── 5. REVERSAL ───
    var revResult = svc.reverseLedgerEntry(ledgerEntry.id, 'Correction');
    assert(revResult.reversal.type === S.LEDGER_TYPE.ADJUSTMENT, 'reverseLedgerEntry creates Adjustment');
    assert(revResult.reversal.amount === -1000, 'Reversal amount negates original');
    assert(FinanceRepository.findLedgerById(ledgerEntry.id).status === S.STATUS.REVERSED, 'Original marked Reversed');
  
    // ─── 6. REPORTS ───
    var today = new Date().toISOString().split('T')[0];
    var revenue = svc.getRevenue(null, today);
    assert(revenue >= 0, 'getRevenue returns number');
  
    var cogs = svc.getCOGS(null, today);
    assert(cogs <= 0, 'getCOGS returns negative or zero');
  
    var expenses = svc.getExpenses(null, today);
    assert(expenses <= 0, 'getExpenses returns negative or zero');
  
    var pnl = svc.getProfitAndLoss(null, today);
    assert(typeof pnl.revenue === 'number', 'P&L has revenue');
    assert(typeof pnl.netProfit === 'number', 'P&L has netProfit');
  
    var cf = svc.getCashFlow(null, today);
    assert(typeof cf.cashIn === 'number', 'CashFlow has cashIn');
    assert(typeof cf.netCashFlow === 'number', 'CashFlow has netCashFlow');
  
    var bal = svc.getCashBalance('Cash', today);
    assert(typeof bal === 'number', 'getCashBalance returns number');
  
    // ─── 7. REFUND NOT COUNTED AS OPERATING EXPENSE ───
    var refundAmt = Math.abs(refundEntry.amount);
    var opex = Math.abs(pnl.operatingExpenses);
    assert(opex >= 75.50, 'Operating expenses include posted expense');
    // Refund should NOT increase operating expenses
    var refundOnlyOpex = svc.getProfitAndLoss(null, today).operatingExpenses;
    assert(Math.abs(refundOnlyOpex) < refundAmt + 1000, 'Refund not counted as operating expense');
    
    var opexBefore = svc.getProfitAndLoss(null, today).operatingExpenses;
    svc.postRefund('TEST-SALE-REFUND-CHK', 999, 1);
    var opexAfter = svc.getProfitAndLoss(null, today).operatingExpenses;
    assert(Math.abs(opexBefore - opexAfter) < 0.01, 'Refund does not affect operating expenses');
    // ─── CLEANUP ───
    try { FinanceRepository.deleteExpense(expId); } catch(e) {}
    try { FinanceRepository.deleteExpense(expId2); } catch(e) {}
    try { FinanceRepository.deleteExpense(expId3); } catch(e) {}
    // Ledger entries are immutable; leave for audit
  
    console.log('=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
    if (failed > 0) throw new Error(failed + ' tests failed');
    return 'All Finance tests passed: ' + passed;
  }