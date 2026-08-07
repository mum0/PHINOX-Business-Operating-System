/**
 * Centralized Logger
 * Batched writes to 'Logs' sheet.
 */

const Logger = (function() {
    'use strict';
    
    const LEVELS = {
      DEBUG: { value: 0, label: 'DEBUG' },
      INFO:  { value: 1, label: 'INFO' },
      WARN:  { value: 2, label: 'WARN' },
      ERROR: { value: 3, label: 'ERROR' }
    };
    
    let minLevel = LEVELS.INFO.value;
    const buffer = [];
    const BUFFER_SIZE = 20;
    
    function timestamp() {
      return new Date().toISOString();
    }
    
    function currentUser() {
      try {
        return Session.getActiveUser().getEmail() || 'system';
      } catch (e) {
        return 'system';
      }
    }
    
    function log(level, module, message, context) {
      if (level.value < minLevel) return;
      
      const entry = [
        timestamp(),
        level.label,
        module,
        currentUser(),
        String(message).slice(0, 500),
        context ? JSON.stringify(context).slice(0, 500) : ''
      ];
      
      buffer.push(entry);
      
      if (buffer.length >= BUFFER_SIZE) {
        flush();
      }
    }
    
    function flush() {
      if (buffer.length === 0) return;
      
      try {
        const ss = CONFIG.SPREADSHEET.ID 
          ? SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID)
          : SpreadsheetApp.getActiveSpreadsheet();
          
        let sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS);
        
        if (!sheet) {
          sheet = ss.insertSheet(CONFIG.SHEETS.LOGS);
          sheet.appendRow(['Timestamp', 'Level', 'Module', 'User', 'Message', 'Context']);
          sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
        }
        
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, buffer.length, 6).setValues(buffer);
        buffer.length = 0;
        
      } catch (e) {
        console.error('Logger flush failed:', e);
        buffer.forEach(entry => console.log(JSON.stringify(entry)));
        buffer.length = 0;
      }
    }
    
    return {
      debug: function(module, message, context) { log(LEVELS.DEBUG, module, message, context); },
      info:  function(module, message, context) { log(LEVELS.INFO, module, message, context); },
      warn:  function(module, message, context) { log(LEVELS.WARN, module, message, context); },
      error: function(module, message, context) { log(LEVELS.ERROR, module, message, context); },
      
      setLevel: function(levelName) {
        const level = LEVELS[levelName.toUpperCase()];
        if (level) minLevel = level.value;
      },
      
      flush: flush
    };
  })();