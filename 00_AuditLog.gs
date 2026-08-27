// 00_AuditLog.gs — PHINOX BOS v5 Enterprise
// ============================================
// جديد: سجل مركزي للعمليات الحساسة
// يكتب إلى ورقة "AuditLog" (يُنشأ تلقائياً إذا لم يكن موجوداً)
// تاريخ الإنشاء: 2026-08-27
// ============================================

const AuditLog = (function() {
  'use strict';

  const SHEET_NAME = 'AuditLog';
  const MAX_ROWS = 50000;  // حد تقريبي قبل الأرشفة

  // ─── دوال خاصة ───

  function _getOrCreateSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // إنشاء headers
      sheet.appendRow([
        'timestamp', 'userEmail', 'userRole', 'action', 'target', 'details', 'status', 'ip'
      ]);
      // تنسيق
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  function _getUserInfo() {
    try {
      const email = Session.getActiveUser().getEmail();
      const role = Security.getUserRole();
      return { email, role };
    } catch (e) {
      return { email: 'unknown', role: 'unknown' };
    }
  }

  // ─── API عام ───

  return {

    /**
     * تسجيل حدث
     * @param {string} action — اسم العملية (مثلاً 'ROLE_CHANGE', 'EXPENSE_APPROVE')
     * @param {string} target — الهدف (مثلاً بريد المستخدم المُعدَّل)
     * @param {Object} details — تفاصيل إضافية (JSON)
     * @param {string} status — 'SUCCESS' | 'FAILED' | 'DENIED'
     */
    log: function(action, target, details, status) {
      try {
        const sheet = _getOrCreateSheet();
        const user = _getUserInfo();
        const timestamp = new Date().toISOString();
        const detailsJson = details ? JSON.stringify(details) : '';

        // التحقق من الحد قبل الإلحاق
        const rowCount = sheet.getLastRow();
        if (rowCount >= MAX_ROWS) {
          // أرشفة: حذف أقدم 1000 صف
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
          ''  // IP غير متاح في Apps Script
        ]);

      } catch (e) {
        // لا نرمي خطأ — السجل مهم لكن لا يجب أن يعطل العملية
        Logger.log(`[AuditLog ERROR] ${e.message}`);
      }
    },

    /**
     * تسجيل نجاح
     */
    success: function(action, target, details) {
      this.log(action, target, details, 'SUCCESS');
    },

    /**
     * تسجيل فشل
     */
    failed: function(action, target, details, error) {
      const d = Object.assign({}, details || {}, { error: error ? error.message : '' });
      this.log(action, target, d, 'FAILED');
    },

    /**
     * تسجيل رفض (صلاحية مرفوضة)
     */
    denied: function(action, target, details) {
      this.log(action, target, details, 'DENIED');
    },

    /**
     * الحصول على آخر N سجل
     * @param {number} count
     * @returns {Array}
     */
    getRecent: function(count) {
      Security.requireAdmin();
      try {
        const sheet = _getOrCreateSheet();
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        const startRow = Math.max(2, lastRow - count + 1);
        const numRows = lastRow - startRow + 1;
        const data = sheet.getRange(startRow, 1, numRows, 8).getValues();

        return data.map(row => ({
          timestamp: row[0],
          userEmail: row[1],
          userRole: row[2],
          action: row[3],
          target: row[4],
          details: row[5],
          status: row[6]
        }));
      } catch (e) {
        AppLogger.error('AuditLog.getRecent', e, Session.getActiveUser().getEmail());
        return [];
      }
    },

    /**
     * البحث في السجل
     * @param {Object} filters — {action, userEmail, status, startDate, endDate}
     * @returns {Array}
     */
    search: function(filters) {
      Security.requireAdmin();
      try {
        const sheet = _getOrCreateSheet();
        const lastRow = sheet.getLastRow();
        if (lastRow <= 1) return [];

        const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
        const results = [];

        for (let i = 0; i < data.length; i++) {
          const row = {
            timestamp: data[i][0],
            userEmail: data[i][1],
            userRole: data[i][2],
            action: data[i][3],
            target: data[i][4],
            details: data[i][5],
            status: data[i][6]
          };

          let match = true;
          if (filters.action && row.action !== filters.action) match = false;
          if (filters.userEmail && row.userEmail !== filters.userEmail) match = false;
          if (filters.status && row.status !== filters.status) match = false;
          if (filters.startDate && new Date(row.timestamp) < filters.startDate) match = false;
          if (filters.endDate && new Date(row.timestamp) > filters.endDate) match = false;

          if (match) results.push(row);
        }

        return results;
      } catch (e) {
        AppLogger.error('AuditLog.search', e, Session.getActiveUser().getEmail());
        return [];
      }
    }
  };
})();

// ─── دوال مساعدة سريعة ───

function logAudit(action, target, details, status) {
  AuditLog.log(action, target, details, status);
}
