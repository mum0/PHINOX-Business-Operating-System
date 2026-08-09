/**
 * Finance Repository
 * Dual repository: Ledger + Expense Requests
 * Extends BaseRepository
 */

const FinanceRepository = (function() {
    'use strict';
  
    if (typeof FinanceSchema === 'undefined') {
      throw new Error('FinanceSchema must be loaded before FinanceRepository');
    }
  
    // ─── LEDGER REPO ───
    const ledgerRepo = BaseRepository.create(
      CONFIG.SHEETS.FINANCE_LEDGER,
      FinanceSchema.LEDGER_SCHEMA,
      { eventName: 'finance:ledger' }
    );
  
    // ─── EXPENSE REPO ───
    const expenseRepo = BaseRepository.create(
      CONFIG.SHEETS.FINANCE_EXPENSES,
      FinanceSchema.EXPENSE_SCHEMA,
      { eventName: 'finance:expense' }
    );
  
    // ─── IDEMPOTENCY CHECK (Repository-level) ───
    function findByIdempotencyKey(key) {
      if (!key) return null;
      return ledgerRepo.findOne(function(entry) {
        return entry.idempotencyKey === key;
      });
    }
  
    function isIdempotencyKeyExists(key) {
      return findByIdempotencyKey(key) !== null;
    }
  
    return {
      // Ledger
      createLedger: function(data) { return ledgerRepo.create(data); },
      findLedgerById: function(id) { return ledgerRepo.findById(id); },
      findLedgerByIdempotencyKey: findByIdempotencyKey,
      isIdempotencyKeyExists: isIdempotencyKeyExists,
      findAllLedger: function(options) { return ledgerRepo.findAll(options); },
      updateLedger: function(id, updates) { return ledgerRepo.update(id, updates); },
      countLedger: function() { return ledgerRepo.count(); },
  
      // Expenses
      createExpense: function(data) { return expenseRepo.create(data); },
      findExpenseById: function(id) { return expenseRepo.findById(id); },
      findAllExpenses: function(options) { return expenseRepo.findAll(options); },
      updateExpense: function(id, updates) { return expenseRepo.update(id, updates); },
      deleteExpense: function(id) { return expenseRepo.delete(id); },
      countExpenses: function() { return expenseRepo.count(); }
    };
  })();