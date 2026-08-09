/**
 * Finance Schema
 * Management Financial Ledger (Single-entry, Immutable)
 * Phase 6 - PHINOX BOS v5
 */

const FinanceSchema = (function() {
    'use strict';
  
    // ─── LEDGER COLUMN MAPPING (16 fields) ───
    const LEDGER_SCHEMA = Object.freeze({
      id: 1,
      date: 2,
      type: 3,
      category: 4,
      description: 5,
      amount: 6,
      account: 7,
      relatedId: 8,
      relatedType: 9,
      status: 10,
      idempotencyKey: 11,
      approvedBy: 12,
      notes: 13,
      createdAt: 14,
      updatedAt: 15,
      createdBy: 16
    });
  
    // ─── EXPENSE REQUEST COLUMN MAPPING (10 fields) ───
    const EXPENSE_SCHEMA = Object.freeze({
      id: 1,
      title: 2,
      category: 3,
      amount: 4,
      description: 5,
      status: 6,
      requestedBy: 7,
      approvedBy: 8,
      rejectionReason: 9,
      createdAt: 10,
      updatedAt: 11
    });
  
    // ─── ENUMS ───
    const LEDGER_TYPE = Object.freeze({
      REVENUE: 'Revenue',
      COGS: 'COGS',
      EXPENSE: 'Expense',
      CASH_IN: 'Cash In',
      CASH_OUT: 'Cash Out',
      REFUND: 'Refund',
      ADJUSTMENT: 'Adjustment'
    });
  
    const STATUS = Object.freeze({
      PENDING: 'Pending',
      POSTED: 'Posted',
      REVERSED: 'Reversed'
    });
  
    const EXPENSE_STATUS = Object.freeze({
      DRAFT: 'Draft',
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      POSTED: 'Posted'
    });
  
    const EXPENSE_CATEGORY = Object.freeze({
      RENT: 'Rent',
      SALARIES: 'Salaries',
      UTILITIES: 'Utilities',
      MARKETING: 'Marketing',
      SHIPPING: 'Shipping',
      SUPPLIES: 'Supplies',
      OTHER: 'Other'
    });
  
    // ─── VALIDATION ───
    const LEDGER_VALIDATION = Object.freeze({
      date: { required: true, type: 'date' },
      type: { required: true, allowed: Object.values(LEDGER_TYPE) },
      category: { required: true, type: 'string', minLength: 1, maxLength: 100 },
      description: { required: true, type: 'string', minLength: 1, maxLength: 500 },
      amount: { required: true, type: 'number' },
      account: { required: true, type: 'string', minLength: 1, maxLength: 50 },
      status: { allowed: Object.values(STATUS) },
      idempotencyKey: { required: true, type: 'string', minLength: 1, maxLength: 100 }
    });
  
    const EXPENSE_VALIDATION = Object.freeze({
      title: { required: true, type: 'string', minLength: 1, maxLength: 200 },
      category: { required: true, allowed: Object.values(EXPENSE_CATEGORY) },
      amount: { required: true, type: 'number', min: 0.01 },
      description: { type: 'string', maxLength: 1000 },
      status: { allowed: Object.values(EXPENSE_STATUS) }
    });
  
    // ─── DEFAULTS ───
    function getDefaultLedgerEntry() {
      return {
        status: STATUS.PENDING,
        account: 'Cash',
        relatedId: '',
        relatedType: '',
        approvedBy: '',
        notes: ''
      };
    }
  
    function getDefaultExpenseRequest() {
      return {
        status: EXPENSE_STATUS.DRAFT,
        approvedBy: '',
        rejectionReason: '',
        description: ''
      };
    }
  
    return {
      LEDGER_SCHEMA: LEDGER_SCHEMA,
      EXPENSE_SCHEMA: EXPENSE_SCHEMA,
      LEDGER_TYPE: LEDGER_TYPE,
      STATUS: STATUS,
      EXPENSE_STATUS: EXPENSE_STATUS,
      EXPENSE_CATEGORY: EXPENSE_CATEGORY,
      LEDGER_VALIDATION: LEDGER_VALIDATION,
      EXPENSE_VALIDATION: EXPENSE_VALIDATION,
      getDefaultLedgerEntry: getDefaultLedgerEntry,
      getDefaultExpenseRequest: getDefaultExpenseRequest
    };
  })();