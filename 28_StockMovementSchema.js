/**
 * Stock Movement Schema
 * Single source of truth for StockMovement column mapping, enums, validation, and defaults.
 * Append-only audit trail for all inventory quantity changes.
 */

const StockMovementSchema = (function() {
  'use strict';

  const SCHEMA = Object.freeze({
    id: 1, inventoryId: 2, sku: 3, movementType: 4, quantity: 5,
    quantityBefore: 6, quantityAfter: 7, reason: 8,
    referenceType: 9, referenceId: 10, notes: 11,
    createdAt: 12, createdBy: 13
  });

  const MOVEMENT_TYPES = Object.freeze({
    RESERVE: 'RESERVE', RELEASE: 'RELEASE', COMMIT: 'COMMIT',
    RESTOCK: 'RESTOCK', ADJUSTMENT: 'ADJUSTMENT', CUSTOMER_RETURN: 'CUSTOMER_RETURN'
  });

  const VALIDATION = Object.freeze({
    inventoryId: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    sku: { required: true, type: 'string', minLength: 1, maxLength: 50 },
    movementType: { required: true, allowed: Object.values(MOVEMENT_TYPES) },
    quantity: { required: true, type: 'number', min: 0.01 },
    quantityBefore: { required: true, type: 'number', min: 0 },
    quantityAfter: { required: true, type: 'number', min: 0 },
    reason: { type: 'string', maxLength: 500 },
    referenceType: { type: 'string', maxLength: 50 },
    referenceId: { type: 'string', maxLength: 50 },
    notes: { type: 'string', maxLength: 2000 }
  });

  function getDefaultMovement() {
    return { quantity: 0, quantityBefore: 0, quantityAfter: 0,
      reason: '', referenceType: '', referenceId: '', notes: '',
      createdAt: '', createdBy: '' };
  }

  function getSheetHeaders() {
    const headers = new Array(Object.keys(SCHEMA).length).fill('');
    Object.keys(SCHEMA).forEach(function(field) {
      headers[SCHEMA[field] - 1] = field;
    });
    return headers;
  }

  return { SCHEMA, MOVEMENT_TYPES, VALIDATION, getDefaultMovement, getSheetHeaders };
})();
