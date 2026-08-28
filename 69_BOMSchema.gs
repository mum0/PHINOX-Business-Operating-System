/**
 * BOM Schema (Bill of Materials Header)
 * Single source of truth for BOM column mapping, enums, validation, and defaults.
 * PHASE 3C
 */

const BOMSchema = (function() {
    'use strict';
  
    const SCHEMA = Object.freeze({
      id: 1,
      finishedProductSku: 2,
      name: 3,
      description: 4,
      active: 5,
      createdAt: 6,
      updatedAt: 7,
      createdBy: 8
    });
  
    const VALIDATION = Object.freeze({
      finishedProductSku: { required: true, type: 'string', minLength: 1, maxLength: 50 },
      name: { required: true, type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 }
      // 'active' is normalized manually in BOMService (boolean coercion)
    });
  
    function getDefaultBOM() {
      return {
        name: '',
        description: '',
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
      getDefaultBOM: getDefaultBOM,
      getSheetHeaders: getSheetHeaders
    };
  })();