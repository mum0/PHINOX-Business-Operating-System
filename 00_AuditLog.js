// 00_AuditLog.gs — PHINOX BOS v5 Enterprise
// ============================================
// SECURITY FIX (2026-08-27) + UNIFICATION FIX (2026-08-31):
//   - Replaced Security* calls with 13_Permissions.js functions
//   - SecuritygetUserRole() → getCurrentMember() + getRole()
//   - SecurityrequireAdmin() → isAdmin(getCurrentMember())
// SECURITY FIX (2026-08-27):
//   - Replaced AppLogger with Logger module (03_Logger.js)
//   - All logging calls now use Logger.info / Logger.error
// ============================================

var AuditLog = (function() {
  'use strict';

  var SHEET_NAME = 'AuditLog';
  var MAX_ROWS = 50000;

  function _getOrCreateSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'timestamp', 'userEmail', 'userRole', 'action', 'target', 'details', 'status', 'ip'
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  function _getUserInfo() {
    try {
      var email = Session.getActiveUser().getEmail();
      var member = getCurrentMember();
      var role = member ? getRole(member) : 'unknown';
      return { email: email, role: role };
    } catch (e) {
      return { email: 'unknown', role: 'unknown' };
    }
  }

  return {

    log: function(action, target, details, status) {
      try {
        var sheet = _getOrCreateSheet();
        var user = _getUserInfo();
        var timestamp = new Date().toISOString();
        var detailsJson = details ? JSON.stringify(details) : '';

        var rowCount = sheet.getLastRow();
        if (rowCount >= MAX_ROWS) {
          sheet.deleteRows(2, 1000);
        }

        sheet.appendRow([
          timestamp,
          user.email,
          user.role,
          action,
          target || '',
          detailsJson,
          status || 'SUCCESS',
          ''
        ]);

      } catch (e) {
        Logger.error('AuditLog.log', e.message, { action: action, target: target });
      }
    },

    success: function(action, target, details) {
      this.log(action, target, details, 'SUCCESS');
    },

    failed: function(action, target, details, error) {
      var d = Object.assign({}, details || {}, { error: error ? error.message : '' });
      this.log(action, target, d, 'FAILED');
    },

    denied: function(action, target, details) {
      this.log(action, target, details, 'DENIED');
    },

    getRecent: function(count) {
      if (!isAdmin(getCurrentMember())) throw new Error('Admin access required');
      try {
        var sheet = _getOrCreateSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        var startRow = Math.max(2, lastRow - count + 1);
        var numRows = lastRow - startRow + 1;
        var data = sheet.getRange(startRow, 1, numRows, 8).getValues();

        return data.map(function(row) {
          return {
            timestamp: row[0],
            userEmail: row[1],
            userRole: row[2],
            action: row[3],
            target: row[4],
            details: row[5],
            status: row[6]
          };
        });
      } catch (e) {
        Logger.error('AuditLog.getRecent', e.message, { user: Session.getActiveUser().getEmail() });
        return [];
      }
    },

    search: function(filters) {
      if (!isAdmin(getCurrentMember())) throw new Error('Admin access required');
      try {
        var sheet = _getOrCreateSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
        var results = [];

        for (var i = 0; i < data.length; i++) {
          var row = {
            timestamp: data[i][0],
            userEmail: data[i][1],
            userRole: data[i][2],
            action: data[i][3],
            target: data[i][4],
            details: data[i][5],
            status: data[i][6]
          };

          var match = true;
          if (filters.action && row.action !== filters.action) match = false;
          if (filters.userEmail && row.userEmail !== filters.userEmail) match = false;
          if (filters.status && row.status !== filters.status) match = false;
          if (filters.startDate && new Date(row.timestamp) < filters.startDate) match = false;
          if (filters.endDate && new Date(row.timestamp) > filters.endDate) match = false;

          if (match) results.push(row);
        }

        return results;
      } catch (e) {
        Logger.error('AuditLog.search', e.message, { user: Session.getActiveUser().getEmail() });
        return [];
      }
    }
  };
})();

function logAudit(action, target, details, status) {
  AuditLog.log(action, target, details, status);
}
