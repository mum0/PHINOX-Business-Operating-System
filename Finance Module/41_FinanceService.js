/**
 * Finance Service
 * Ledger Operations + Expense Workflow + Financial Reports
 * Phase 6 - PHINOX BOS v5
 */

const FinanceService = (function() {
    'use strict';
  
    const S = FinanceSchema;
    const T = S.LEDGER_TYPE;
    const ST = S.STATUS;
  
    function _now() { return new Date(); }
    function _toNumber(value, def) { var n = Number(value); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
    function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
    function _formatDate(d) { return d ? new Date(d).toISOString().split('T')[0] : ''; }
  
    // IDEMPOTENCY
    function _checkIdempotency(key) {
      if (!key) return false;
      if (FinanceRepository.isIdempotencyKeyExists(key)) {
        Logger.info('FinanceService', 'Idempotency key exists, skipping', { key: key });
        return true;
      }
      return false;
    }
  
    // LEDGER POSTING (Immutable)
    function _postEntry(data) {
      if (_checkIdempotency(data.idempotencyKey)) {
        return FinanceRepository.findLedgerByIdempotencyKey(data.idempotencyKey);
      }
  
      var defaults = S.getDefaultLedgerEntry();
      var entry = Object.assign({}, defaults, data);
      entry.status = ST.POSTED;
      entry.createdAt = _now();
      entry.updatedAt = _now();
      entry.createdBy = Security.currentUser ? Security.currentUser() : 'system';
  
      Validator.validate(entry, S.LEDGER_VALIDATION, 'FinanceService');
      var created = FinanceRepository.createLedger(entry);
      EventBus.emit('finance:transaction:posted', { id: created.id, type: entry.type, amount: entry.amount });
      Logger.info('FinanceService', 'Ledger entry posted', { id: created.id, type: entry.type, amount: entry.amount });
      return created;
    }
  
    // SALES EVENT HANDLERS
    function postRevenue(saleData) {
      if (!saleData || !saleData.id) return null;
      return _postEntry({
        idempotencyKey: 'SALE-' + saleData.id + ':REVENUE',
        date: saleData.createdAt || _now(),
        type: T.REVENUE,
        category: 'Product Sales',
        description: 'Revenue from Sale ' + saleData.id,
        amount: _toNumber(saleData.totalAmount),
        account: 'Cash',
        relatedId: saleData.id,
        relatedType: 'Sale'
      });
    }
  
    function postCOGS(saleData) {
      if (!saleData || !saleData.id) return null;
      return _postEntry({
        idempotencyKey: 'SALE-' + saleData.id + ':COGS',
        date: saleData.createdAt || _now(),
        type: T.COGS,
        category: 'Product Sales',
        description: 'COGS for Sale ' + saleData.id,
        amount: -(_toNumber(saleData.cogs)),
        account: 'Cash',
        relatedId: saleData.id,
        relatedType: 'Sale'
      });
    }
  
    function postCashIn(saleId, amount, paymentIndex, paymentMethod) {
      if (!saleId || !amount) return null;
      var idx = paymentIndex || 1;
      return _postEntry({
        idempotencyKey: 'SALE-' + saleId + ':PAYMENT-' + idx,
        date: _now(),
        type: T.CASH_IN,
        category: 'Sale Payment',
        description: 'Payment received for Sale ' + saleId,
        amount: _toNumber(amount),
        account: paymentMethod || 'Cash',
        relatedId: saleId,
        relatedType: 'Sale'
      });
    }
  
    function postRefund(saleId, amount, refundIndex) {
      if (!saleId || !amount) return null;
      var idx = refundIndex || 1;
      return _postEntry({
        idempotencyKey: 'SALE-' + saleId + ':REFUND-' + idx,
        date: _now(),
        type: T.REFUND,
        category: 'Sale Refund',
        description: 'Refund for Sale ' + saleId,
        amount: -(_toNumber(amount)),
        account: 'Cash',
        relatedId: saleId,
        relatedType: 'Sale'
      });
    }
  
    // EXPENSE WORKFLOW
    function createExpenseRequest(data) {
      var req = Utils.clone(data);
      req.id = req.id || ('EXP-' + Utils.generateId());
      var defaults = S.getDefaultExpenseRequest();
      Object.keys(defaults).forEach(function(k) {
        if (req[k] === undefined || req[k] === null || req[k] === '') req[k] = defaults[k];
      });
      req.requestedBy = Security.currentUser ? Security.currentUser() : 'system';
      req.createdAt = _now();
      req.updatedAt = _now();
      Validator.validate(req, S.EXPENSE_VALIDATION, 'FinanceService');
      var created = FinanceRepository.createExpense(req);
      Logger.info('FinanceService', 'Expense request created', { id: created.id, amount: created.amount });
      return created.id;
    }
  
    function submitExpenseRequest(id) {
      var exp = FinanceRepository.findExpenseById(id);
      if (!exp) throw ErrorHandler.notFound('Expense Request', id, 'FinanceService');
      if (exp.status !== S.EXPENSE_STATUS.DRAFT) {
        throw ErrorHandler.validation('Only Draft expenses can be submitted', { status: exp.status }, 'FinanceService');
      }
      var updated = FinanceRepository.updateExpense(id, { status: S.EXPENSE_STATUS.PENDING, updatedAt: _now() });
      Logger.info('FinanceService', 'Expense submitted for approval', { id: id });
      return updated;
    }
  
    function _getApprovalThreshold(amount) {
      var th = CONFIG.EXPENSE_APPROVAL_THRESHOLDS || {};
      if (amount < (th.manager || 100)) return 'auto';
      if (amount < (th.finance || 500)) return 'finance';
      if (amount < (th.ceo || 2000)) return 'ceo';
      return 'ceo';
    }
  
    function approveExpenseRequest(id) {
      var exp = FinanceRepository.findExpenseById(id);
      if (!exp) throw ErrorHandler.notFound('Expense Request', id, 'FinanceService');
      if (exp.status !== S.EXPENSE_STATUS.PENDING) {
        throw ErrorHandler.validation('Only Pending expenses can be approved', { status: exp.status }, 'FinanceService');
      }
      var user = Security.currentUser ? Security.currentUser() : 'system';
      var updated = FinanceRepository.updateExpense(id, {
        status: S.EXPENSE_STATUS.APPROVED,
        approvedBy: user,
        updatedAt: _now()
      });
      EventBus.emit('finance:expense:approved', { id: id, amount: exp.amount, approvedBy: user });
      Logger.info('FinanceService', 'Expense approved', { id: id, approver: user });
      return updated;
    }
  
    function rejectExpenseRequest(id, reason) {
      var exp = FinanceRepository.findExpenseById(id);
      if (!exp) throw ErrorHandler.notFound('Expense Request', id, 'FinanceService');
      if (exp.status !== S.EXPENSE_STATUS.PENDING) {
        throw ErrorHandler.validation('Only Pending expenses can be rejected', { status: exp.status }, 'FinanceService');
      }
      var updated = FinanceRepository.updateExpense(id, {
        status: S.EXPENSE_STATUS.REJECTED,
        rejectionReason: reason || '',
        updatedAt: _now()
      });
      Logger.info('FinanceService', 'Expense rejected', { id: id, reason: reason });
      return updated;
    }
  
    // POST EXPENSE TO LEDGER (Only when actually paid)
    function postExpenseToLedger(id, account) {
      var exp = FinanceRepository.findExpenseById(id);
      if (!exp) throw ErrorHandler.notFound('Expense Request', id, 'FinanceService');
      if (exp.status !== S.EXPENSE_STATUS.APPROVED) {
        throw ErrorHandler.validation('Only Approved expenses can be posted to ledger', { status: exp.status }, 'FinanceService');
      }
      var entry = _postEntry({
        idempotencyKey: 'EXP-' + id + ':POSTED',
        date: _now(),
        type: T.EXPENSE,
        category: exp.category,
        description: exp.title + (exp.description ? ' - ' + exp.description : ''),
        amount: -(_toNumber(exp.amount)),
        account: account || 'Cash',
        relatedId: id,
        relatedType: 'Expense',
        approvedBy: exp.approvedBy || ''
      });
      FinanceRepository.updateExpense(id, { status: S.EXPENSE_STATUS.POSTED, updatedAt: _now() });
      EventBus.emit('finance:expense:posted', { id: id, ledgerId: entry.id, amount: exp.amount });
      Logger.info('FinanceService', 'Expense posted to ledger', { expenseId: id, ledgerId: entry.id });
      return entry;
    }
  
    function deleteExpenseRequest(id) {
      var exp = FinanceRepository.findExpenseById(id);
      if (!exp) throw ErrorHandler.notFound('Expense Request', id, 'FinanceService');
      if (exp.status !== S.EXPENSE_STATUS.DRAFT) {
        throw ErrorHandler.validation('Only Draft expenses can be deleted', { status: exp.status }, 'FinanceService');
      }
      FinanceRepository.deleteExpense(id);
      Logger.info('FinanceService', 'Expense request deleted', { id: id });
      return true;
    }
  
    // REVERSAL (Immutable Ledger)
    function reverseLedgerEntry(id, reason) {
      var entry = FinanceRepository.findLedgerById(id);
      if (!entry) throw ErrorHandler.notFound('Ledger Entry', id, 'FinanceService');
      if (entry.status === ST.REVERSED) {
        throw ErrorHandler.validation('Entry already reversed', {}, 'FinanceService');
      }
      var rev = _postEntry({
        idempotencyKey: 'REV-' + id + ':' + Date.now(),
        date: _now(),
        type: T.ADJUSTMENT,
        category: 'Reversal',
        description: 'Reversal of ' + entry.id + (reason ? ' - ' + reason : ''),
        amount: -(_toNumber(entry.amount)),
        account: entry.account,
        relatedId: entry.id,
        relatedType: 'Reversal'
      });
      FinanceRepository.updateLedger(id, { status: ST.REVERSED, updatedAt: _now() });
      Logger.info('FinanceService', 'Ledger entry reversed', { original: id, reversal: rev.id });
      return { original: entry, reversal: rev };
    }
  
    // REPORTS
    function _sumByType(type, startDate, endDate) {
      var result = FinanceRepository.findAllLedger({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(e) {
          if (e.type !== type) return false;
          if (startDate && new Date(e.date) < new Date(startDate)) return false;
          if (endDate && new Date(e.date) > new Date(endDate)) return false;
          return true;
        }
      });
      return result.data.reduce(function(acc, e) { return acc + _toNumber(e.amount); }, 0);
    }
  
    function getRevenue(startDate, endDate) {
      return _round(_sumByType(T.REVENUE, startDate, endDate), 2);
    }
  
    function getCOGS(startDate, endDate) {
      return _round(_sumByType(T.COGS, startDate, endDate), 2);
    }
  
    function getExpenses(startDate, endDate) {
      return _round(_sumByType(T.EXPENSE, startDate, endDate), 2);
    }
  
    function getCashIn(startDate, endDate) {
      return _round(_sumByType(T.CASH_IN, startDate, endDate), 2);
    }
  
    function getCashOut(startDate, endDate) {
      return _round(_sumByType(T.CASH_OUT, startDate, endDate) + _sumByType(T.REFUND, startDate, endDate), 2);
    }
  
    function getCashBalance(account, asOfDate) {
      var types = [T.CASH_IN, T.CASH_OUT, T.REFUND, T.EXPENSE, T.ADJUSTMENT];
      var result = FinanceRepository.findAllLedger({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(e) {
          if (types.indexOf(e.type) === -1) return false;
          if (account && e.account !== account) return false;
          if (asOfDate && new Date(e.date) > new Date(asOfDate)) return false;
          return true;
        }
      });
      var balance = result.data.reduce(function(acc, e) {
        var amt = _toNumber(e.amount);
        if (e.type === T.CASH_IN) return acc + amt;
        if (e.type === T.CASH_OUT || e.type === T.REFUND || e.type === T.EXPENSE) return acc - Math.abs(amt);
        if (e.type === T.ADJUSTMENT) return acc + amt;
        return acc;
      }, 0);
      return _round(balance, 2);
    }
  
    function getOutstanding(asOfDate) {
      var rev = getRevenue(null, asOfDate);
      var cashIn = getCashIn(null, asOfDate);
      return _round(rev - cashIn, 2);
    }
  
    function getProfitAndLoss(startDate, endDate) {
      var revenue = getRevenue(startDate, endDate);
      var cogs = getCOGS(startDate, endDate);
      var grossProfit = revenue + cogs;
      var opex = getExpenses(startDate, endDate);
      var netProfit = grossProfit + opex;
      return {
        revenue: _round(revenue, 2),
        cogs: _round(Math.abs(cogs), 2),
        grossProfit: _round(grossProfit, 2),
        operatingExpenses: _round(Math.abs(opex), 2),
        netProfit: _round(netProfit, 2)
      };
    }
  
    function getCashFlow(startDate, endDate) {
      var cashIn = getCashIn(startDate, endDate);
      var cashOut = getCashOut(startDate, endDate);
      return {
        cashIn: _round(cashIn, 2),
        cashOut: _round(Math.abs(cashOut), 2),
        netCashFlow: _round(cashIn + cashOut, 2)
      };
    }
  
    function getLedger(options) {
      return FinanceRepository.findAllLedger(options || { limit: CONFIG.PAGINATION.MAX_LIMIT });
    }
  
    // EVENT LISTENERS - Adapted to actual SaleService payloads
    EventBus.on('sale:created', function(payload) {
      try {
        if (payload && payload.saleId) {
          postRevenue({
            id: payload.saleId,
            totalAmount: payload.totalAmount,
            createdAt: new Date()
          });
          postCOGS({
            id: payload.saleId,
            cogs: payload.cogs
          });
        }
      } catch (e) {
        Logger.error('FinanceService', 'Failed to process sale:created', { error: e.message });
      }
    });
  
    EventBus.on('sale:paid', function(payload) {
      try {
        if (payload && payload.saleId && payload.amount) {
          postCashIn(payload.saleId, payload.amount, payload.paidTotal, payload.method);
        }
      } catch (e) {
        Logger.error('FinanceService', 'Failed to process sale:paid', { error: e.message });
      }
    });
  
    EventBus.on('sale:refunded', function(payload) {
      try {
        if (payload && payload.saleId && payload.amount) {
          postRefund(payload.saleId, payload.amount, payload.refundedTotal);
        }
      } catch (e) {
        Logger.error('FinanceService', 'Failed to process sale:refunded', { error: e.message });
      }
    });
  
    return {
      postRevenue: postRevenue,
      postCOGS: postCOGS,
      postCashIn: postCashIn,
      postRefund: postRefund,
      postExpenseToLedger: postExpenseToLedger,
      reverseLedgerEntry: reverseLedgerEntry,
      createExpenseRequest: createExpenseRequest,
      submitExpenseRequest: submitExpenseRequest,
      approveExpenseRequest: approveExpenseRequest,
      rejectExpenseRequest: rejectExpenseRequest,
      deleteExpenseRequest: deleteExpenseRequest,
      getRevenue: getRevenue,
      getCOGS: getCOGS,
      getExpenses: getExpenses,
      getCashIn: getCashIn,
      getCashOut: getCashOut,
      getCashBalance: getCashBalance,
      getOutstanding: getOutstanding,
      getProfitAndLoss: getProfitAndLoss,
      getCashFlow: getCashFlow,
      getLedger: getLedger
    };
  })();