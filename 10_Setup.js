/**
 * ============================================================
 * PHINOX BOS — Setup Module
 * Initialize sheets, headers, and properties.
 * Run once per spreadsheet.
 * UPDATED v7C: Added Marketing Spend and Social Media Performance sheets
 * PHASE 3A.1: Inventory headers now obtained from canonical InventorySchema
 * PHASE 3B: Added StockMovement sheet with canonical StockMovementSchema
 * ============================================================
 */

const Setup = (function() {
  'use strict';

  const SHEET_CONFIGS = {
    'Tasks': {
      headers: ['id','title','assignee','priority','status','dueDate','createdAt','updatedAt','createdBy'],
      widths: [22, 30, 20, 10, 12, 15, 20, 20, 25]
    },
    'Members': {
      headers: ['id','name','email','role','department','kpiScore','status','createdAt','updatedAt'],
      widths: [22, 20, 25, 12, 15, 10, 10, 20, 20]
    },
    'Finance': {
      headers: ['id','type','category','amount','currency','date','description','reference','status','createdAt','updatedAt'],
      widths: [22, 12, 15, 12, 8, 15, 30, 20, 10, 20, 20]
    },
    'Sales': {
      headers: ['id','customerId','productId','quantity','unitPrice','total','status','channel','date','createdAt','updatedAt'],
      widths: [22, 22, 22, 10, 12, 12, 10, 12, 15, 20, 20]
    },
    'Logs': {
      headers: ['Timestamp','Level','Module','User','Message','Context'],
      widths: [22, 8, 15, 25, 40, 40]
    },
    'Settings': {
      headers: ['key','value','type','description','updatedAt','updatedBy'],
      widths: [25, 30, 10, 40, 20, 25]
    },
    'KPI Results': {
      headers: ['id','kpiId','name','value','period','date','sheet','createdAt'],
      widths: [22, 20, 20, 15, 10, 15, 15, 20]
    },
    'Finance Ledger': {
      headers: ['id','date','type','category','description','amount','account','relatedId','relatedType','status','idempotencyKey','approvedBy','notes','createdAt','updatedAt','createdBy'],
      widths: [22, 15, 12, 15, 35, 12, 12, 22, 12, 10, 30, 25, 25, 20, 20, 25]
    },
    'Finance Expenses': {
      headers: ['id','title','category','amount','description','status','requestedBy','approvedBy','rejectionReason','createdAt','updatedAt'],
      widths: [22, 25, 15, 12, 35, 12, 25, 25, 25, 20, 20]
    },
    'Marketing Spend': {
      headers: ['id','date','platform','channel','campaignId','campaignName','currency','spend','impressions','reach','clicks','leads','conversions','attributedRevenue','creativeCost','agencyCost','otherCost','notes','createdAt','createdBy'],
      widths: [22, 15, 12, 12, 20, 25, 8, 12, 12, 12, 12, 10, 10, 15, 12, 12, 12, 25, 20, 25]
    },
    'Social Media Performance': {
      headers: ['id','date','platform','followers','followerGrowth','reach','impressions','engagements','likes','comments','shares','saves','videoViews','watchTime','profileVisits','linkClicks','leads','purchases','attributedRevenue','notes','createdAt','createdBy'],
      widths: [22, 15, 12, 12, 12, 12, 12, 12, 10, 10, 10, 10, 12, 12, 12, 12, 10, 10, 15, 25, 20, 25]
    },
    'Customers': {
      headers: ['id','name','email','phone','status','segment','joinDate','lastOrderDate','totalOrders','totalAmount','averageOrderValue','notes','createdAt','updatedAt'],
      widths: [22, 20, 25, 15, 10, 12, 15, 15, 12, 12, 12, 25, 20, 20]
    },
    'Satisfaction': {
      headers: ['id','customerEmail','orderId','score','feedback','createdAt','updatedAt'],
      widths: [22, 25, 22, 8, 40, 20, 20]
    },
    'NPS': {
      headers: ['id','customerEmail','orderId','score','feedback','createdAt','updatedAt'],
      widths: [22, 25, 22, 8, 40, 20, 20]
    }
  };

  /**
   * PHASE 3A.1: Obtain Inventory configuration from canonical InventorySchema.
   * This ensures Setup.js never drifts from the schema again.
   * Fallback hardcodes the correct 20-column headers if schema is unavailable.
   */
  function _getInventoryConfig() {
    if (typeof InventorySchema !== 'undefined' && typeof InventorySchema.getSheetHeaders === 'function') {
      return {
        headers: InventorySchema.getSheetHeaders(),
        widths: [22, 15, 25, 15, 10, 10, 10, 10, 10, 12, 12, 15, 10, 15, 10, 30, 20, 20, 25, 12]
      };
    }
    // Fallback: canonical 20-column headers (must match InventorySchema exactly)
    return {
      headers: ['id','sku','name','category','size','color','quantity','reserved','available','cost','price','location','reorderLevel','supplierId','status','notes','createdAt','updatedAt','createdBy','type'],
      widths: [22, 15, 25, 15, 10, 10, 10, 10, 10, 12, 12, 15, 10, 15, 10, 30, 20, 20, 25, 12]
    };
  }

  /**
   * PHASE 3B: Obtain StockMovement configuration from canonical StockMovementSchema.
   * Fallback hardcodes the correct 13-column headers if schema is unavailable.
   */
  function _getStockMovementConfig() {
    if (typeof StockMovementSchema !== 'undefined' && typeof StockMovementSchema.getSheetHeaders === 'function') {
      return {
        headers: StockMovementSchema.getSheetHeaders(),
        widths: [22, 22, 15, 12, 10, 10, 10, 20, 15, 22, 30, 20, 25]
      };
    }
    // Fallback: canonical 13-column headers (must match StockMovementSchema exactly)
    return {
      headers: ['id','inventoryId','sku','movementType','quantity','quantityBefore','quantityAfter','reason','referenceType','referenceId','notes','createdAt','createdBy'],
      widths: [22, 22, 15, 12, 10, 10, 10, 20, 15, 22, 30, 20, 25]
    };
  }

  function createSheet(ss, name, cfg) {
    let sheet = ss.getSheetByName(name);
    if (sheet) {
      Logger.info('Setup', 'Sheet exists', { name: name });
      return sheet;
    }

    sheet = ss.insertSheet(name);
    sheet.appendRow(cfg.headers);

    const headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
    headerRange.setFontWeight('bold')
      .setBackground('#1a237e')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center');

    cfg.widths.forEach(function(w, i) {
      sheet.setColumnWidth(i + 1, w);
    });

    sheet.setFrozenRows(1);
    Logger.info('Setup', 'Sheet created', { name: name });
    return sheet;
  }

  return {
    run: function() {
      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // Create all standard sheets from SHEET_CONFIGS
      Object.keys(SHEET_CONFIGS).forEach(function(name) {
        createSheet(ss, name, SHEET_CONFIGS[name]);
      });

      // PHASE 3A.1: Create Inventory sheet from canonical schema
      createSheet(ss, 'Inventory', _getInventoryConfig());

      // PHASE 3B: Create StockMovement sheet from canonical schema
      createSheet(ss, 'StockMovement', _getStockMovementConfig());

      // Default settings
      const settingsSheet = ss.getSheetByName('Settings');
      const defaults = [
        ['app.version', CONFIG.APP.VERSION, 'string', 'Application version', new Date().toISOString(), Security.currentUser()],
        ['app.initialized', 'true', 'boolean', 'System initialized flag', new Date().toISOString(), Security.currentUser()],
        ['security.defaultRole', 'viewer', 'string', 'Default role for new users', new Date().toISOString(), Security.currentUser()]
      ];

      defaults.forEach(function(row) {
        // Check if key exists
        const data = settingsSheet.getDataRange().getValues();
        let exists = false;
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === row[0]) { exists = true; break; }
        }
        if (!exists) settingsSheet.appendRow(row);
      });

      Logger.info('Setup', 'Initialization complete');
      return 'System initialized. Sheets created: ' + Object.keys(SHEET_CONFIGS).join(', ') + ', Inventory, StockMovement';
    },

    reset: function() {
      // Dangerous: deletes all data. Use with caution.
      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // Reset standard sheets
      Object.keys(SHEET_CONFIGS).forEach(function(name) {
        const sheet = ss.getSheetByName(name);
        if (sheet) {
          sheet.clearContents();
          sheet.appendRow(SHEET_CONFIGS[name].headers);
        }
      });

      // PHASE 3A.1: Reset Inventory sheet from canonical schema
      const invSheet = ss.getSheetByName('Inventory');
      if (invSheet) {
        invSheet.clearContents();
        invSheet.appendRow(_getInventoryConfig().headers);
      }

      // PHASE 3B: Reset StockMovement sheet from canonical schema
      const smSheet = ss.getSheetByName('StockMovement');
      if (smSheet) {
        smSheet.clearContents();
        smSheet.appendRow(_getStockMovementConfig().headers);
      }

      Logger.warn('Setup', 'System reset performed');
      return 'System reset complete.';
    }
  };
})();