/**
 * Sale Schema
 * Single source of truth for Sale column mapping, enums, validation, and defaults.
 * 16 fields. Financial record of revenue, COGS, and payments.
 */

const SaleSchema = (function() {
  'use strict';

  const SCHEMA = Object.freeze({
    id: 1,
    orderId: 2,
    customerEmail: 3,
    items: 4,
    itemsTotal: 5,
    shippingCost: 6,
    totalAmount: 7,
    paymentMethod: 8,
    paymentStatus: 9,
    paidAmount: 10,
    refundedAmount: 11,
    cogs: 12,
    notes: 13,
    createdAt: 14,
    updatedAt: 15,
    createdBy: 16
  });

  const PAYMENT_STATUS = Object.freeze({
    PENDING: 'Pending',
    PARTIAL: 'Partial',
    PAID: 'Paid',
    REFUNDED: 'Refunded'
  });

  const PAYMENT_METHOD = Object.freeze({
    CASH: 'Cash',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    OTHER: 'Other'
  });

  const VALIDATION = Object.freeze({
    customerEmail: { required: true, type: 'email' },
    items: { required: true, type: 'array', minLength: 1 },
    shippingCost: { type: 'number', min: 0 },
    paymentMethod: { required: true, allowed: Object.values(PAYMENT_METHOD) },
    paymentStatus: { allowed: Object.values(PAYMENT_STATUS) },
    paidAmount: { type: 'number', min: 0 },
    refundedAmount: { type: 'number', min: 0 },
    cogs: { type: 'number', min: 0 },
    notes: { type: 'string', maxLength: 2000 }
  });

  function getDefaultSale() {
    return {
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentMethod: PAYMENT_METHOD.CASH,
      paidAmount: 0,
      refundedAmount: 0,
      shippingCost: 0,
      itemsTotal: 0,
      totalAmount: 0,
      cogs: 0,
      notes: ''
    };
  }

  return {
    SCHEMA: SCHEMA,
    PAYMENT_STATUS: PAYMENT_STATUS,
    PAYMENT_METHOD: PAYMENT_METHOD,
    VALIDATION: VALIDATION,
    getDefaultSale: getDefaultSale
  };
})();
