/**
 * Order Schema
 * Single source of truth for Order column mapping, enums, validation, and defaults.
 * 12 fields. items stored as JSON string.
 */

const OrderSchema = (function() {
  'use strict';

  const SCHEMA = Object.freeze({
    id: 1,
    customerEmail: 2,
    items: 3,
    itemsTotal: 4,
    shippingCost: 5,
    totalAmount: 6,
    status: 7,
    shippingAddress: 8,
    notes: 9,
    createdAt: 10,
    updatedAt: 11,
    createdBy: 12
  });

  const STATUS = Object.freeze({
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  });

  const ALLOWED_TRANSITIONS = Object.freeze({
    'Pending': ['Confirmed', 'Cancelled'],
    'Confirmed': ['Shipped', 'Cancelled'],
    'Shipped': ['Delivered'],
    'Delivered': [],
    'Cancelled': []
  });

  function isValidStatusTransition(current, next) {
    if (!current || !next) return false;
    if (current === next) return true;
    const allowed = ALLOWED_TRANSITIONS[current];
    return allowed ? allowed.indexOf(next) > -1 : false;
  }

  const VALIDATION = Object.freeze({
    customerEmail: { required: true, type: 'email' },
    items: { required: true, type: 'array', minLength: 1 },
    shippingCost: { type: 'number', min: 0 },
    status: { allowed: Object.values(STATUS) },
    shippingAddress: { type: 'string', maxLength: 500 },
    notes: { type: 'string', maxLength: 2000 }
  });

  function getDefaultOrder() {
    return {
      status: STATUS.PENDING,
      shippingCost: 0,
      itemsTotal: 0,
      totalAmount: 0,
      shippingAddress: '',
      notes: ''
    };
  }

  return {
    SCHEMA: SCHEMA,
    STATUS: STATUS,
    ALLOWED_TRANSITIONS: ALLOWED_TRANSITIONS,
    isValidStatusTransition: isValidStatusTransition,
    VALIDATION: VALIDATION,
    getDefaultOrder: getDefaultOrder
  };
})();
