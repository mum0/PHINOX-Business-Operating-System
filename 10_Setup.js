/**
 * Initialize sheets, headers, and properties.
 * Run once per spreadsheet.
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
    'Inventory': {
      headers: ['id','sku','name','category','quantity','minStock','unitCost','location','status','createdAt','updatedAt'],
      widths: [22, 15, 25, 15, 10, 10, 12, 15, 10, 20, 20]
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
    }
  };
  
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
      
      Object.keys(SHEET_CONFIGS).forEach(function(name) {
        createSheet(ss, name, SHEET_CONFIGS[name]);
      });
      
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
      return 'System initialized. Sheets created: ' + Object.keys(SHEET_CONFIGS).join(', ');
    },
    
    reset: function() {
      // Dangerous: deletes all data. Use with caution.
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      Object.keys(SHEET_CONFIGS).forEach(function(name) {
        const sheet = ss.getSheetByName(name);
        if (sheet) {
          sheet.clearContents();
          sheet.appendRow(SHEET_CONFIGS[name].headers);
        }
      });
      Logger.warn('Setup', 'System reset performed');
      return 'System reset complete.';
    }
  };
})();