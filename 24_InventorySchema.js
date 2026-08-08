/**
 * Inventory Schema
 * Single source of truth for Inventory column mapping, enums, validation, and defaults.
 * PHINOX is a clothing store — SKU is per-variant, name is the base product name.
 */

const InventorySchema = (function() {
    'use strict';
  
    // ─── COLUMN MAPPING (19 fields) ───
    const SCHEMA = Object.freeze({
      id: 1,
      sku: 2,
      name: 3,
      category: 4,
      size: 5,
      color: 6,
      quantity: 7,
      reserved: 8,
      available: 9,
      cost: 10,
      price: 11,
      location: 12,
      reorderLevel: 13,
      supplierId: 14,
      status: 15,
      notes: 16,
      createdAt: 17,
      updatedAt: 18,
      createdBy: 19
    });
  
    // ─── STATUS ENUM ───
    const STATUS = Object.freeze({
      ACTIVE: 'Active',
      DISCONTINUED: 'Discontinued',
      OUT_OF_STOCK: 'Out of Stock'
    });
  
    // ─── VALIDATION SCHEMA ───
    const VALIDATION = Object.freeze({
      sku: { required: true, type: 'string', minLength: 1, maxLength: 50 },
      name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
      category: { required: true, type: 'string', minLength: 1, maxLength: 100 },
      size: { type: 'string', maxLength: 20 },
      color: { type: 'string', maxLength: 50 },
      quantity: { required: true, type: 'number', min: 0 },
      reserved: { type: 'number', min: 0 },
      cost: { required: true, type: 'number', min: 0 },
      price: { required: true, type: 'number', min: 0 },
      location: { type: 'string', maxLength: 100 },
      reorderLevel: { required: true, type: 'number', min: 0 },
      supplierId: { type: 'string', maxLength: 50 },
      status: { allowed: Object.values(STATUS) },
      notes: { type: 'string', maxLength: 2000 }
    });
  
    // ─── DEFAULTS ───
    function getDefaultItem() {
      return {
        quantity: 0,
        reserved: 0,
        available: 0,
        cost: 0,
        price: 0,
        location: '',
        reorderLevel: 10,
        supplierId: '',
        status: STATUS.ACTIVE,
        notes: '',
        size: '',
        color: ''
      };
    }
  
    return {
      SCHEMA: SCHEMA,
      STATUS: STATUS,
      VALIDATION: VALIDATION,
      getDefaultItem: getDefaultItem
    };
  })();