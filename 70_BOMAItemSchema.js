/**
 * BOM Item Schema (Bill of Materials Line Items)
 * Single source of truth for BOM_ITEM column mapping, enums, validation, and defaults.
 * PHASE 3C
 */

const BOMAItemSchema = (function() {
    'use strict';
  
    const SCHEMA = Object.freeze({
      id: 1,
      bomId: 2,
      componentSku: 3,
      quantityRequired: 4,
      unit: 5,
      wastagePercent: 6,
      notes: 7,
      active: 8,
      createdAt: 9,
      updatedAt: 10,
      createdBy: 11
    });
  
    const VALIDATION = Object.freeze({
      bomId: { required: true, type: 'string', minLength: 1, maxLength: 50 },
      componentSku: { required: true, type: 'string', minLength: 1, maxLength: 50 },
      quantityRequired: { required: true, type: 'number', min: 0.01 },
      unit: { type: 'string', maxLength: 20 },
      wastagePercent: { type: 'number', min: 0, max: 100 },
      notes: { type: 'string', maxLength: 2000 }
      // 'active' is normalized manually in BOMService (boolean coercion)
    });
  
    function getDefaultItem() {
      return {
        quantityRequired: 1,
        unit: 'pc',
        wastagePercent: 0,
        notes: '',
        active: true
      };
    }
  
    function getSheetHeaders() {
      const headers = new Array(Object.keys(SCHEMA).length).fill('');
      Object.keys(SCHEMA).forEach(function(field) {
        headers[SCHEMA[field] - 1] = field;
      });
      return headers;
    }
  
    return {
      SCHEMA: SCHEMA,
      VALIDATION: VALIDATION,
      getDefaultItem: getDefaultItem,
      getSheetHeaders: getSheetHeaders
    };
  })();