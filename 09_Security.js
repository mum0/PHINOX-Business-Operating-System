// 09_Security.js — PHINOX BOS v5 Enterprise
// ============================================
// تم التعديل: جعل البحث عن headers غير حساس لحالة الأحرف
// السبب: الشيت فيه 'Email' (Title Case) والكود بيدور على 'email' (lowercase)
// النتيجة: كل المستخدمين بيطلعوا GUEST
// تاريخ التعديل: 2026-08-27
// ============================================

var Security = (function() {
  'use strict';

  var ROLE_HIERARCHY = {
    'GUEST': 0,
    'MEMBER': 1,
    'MANAGER': 2,
    'PARTNER': 3,
    'ADMIN': 4,
    'CEO': 5,
    'SUPER_ADMIN': 6,
    'OWNER': 7
  };

  var PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin',
    FINANCE: 'finance',
    APPROVE: 'approve'
  };

  // ✅ دالة جديدة: البحث عن العمود بدون حساسية لحالة الأحرف
  function _findColIndex(headers, target) {
    var targetLower = target.toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).toLowerCase().trim() === targetLower) {
        return i;
      }
    }
    return -1;
  }

  function _getRoleFromMembers(email) {
    if (!email) return 'GUEST';

    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Members');
      if (!sheet) {
        Logger.log('[Security] Members sheet not found');
        return 'GUEST';
      }

      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return 'GUEST';

      var headers = data[0];

      // ✅ استخدام البحث غير الحساس لحالة الأحرف
      var emailIdx = _findColIndex(headers, 'email');
      var roleIdx  = _findColIndex(headers, 'role');
      var statusIdx = _findColIndex(headers, 'status');

      if (emailIdx === -1 || roleIdx === -1) {
        Logger.log('[Security] Missing required columns. Found headers: ' + JSON.stringify(headers));
        return 'GUEST';
      }

      for (var i = 1; i < data.length; i++) {
        var rowEmail = String(data[i][emailIdx] || '').toLowerCase().trim();
        var searchEmail = String(email).toLowerCase().trim();

        if (rowEmail === searchEmail) {
          // ✅ التحقق من الحالة
          if (statusIdx !== -1) {
            var status = String(data[i][statusIdx] || '').toLowerCase().trim();
            if (status === 'inactive' || status === 'disabled') {
              Logger.log('[Security] User ' + email + ' is inactive');
              return 'GUEST';
            }
          }
          var role = String(data[i][roleIdx] || 'GUEST').toUpperCase().trim();
          Logger.log('[Security] Role resolved for ' + email + ': ' + role);
          return role;
        }
      }

      Logger.log('[Security] Email not found in Members: ' + email);
      return 'GUEST';
    } catch (e) {
      Logger.log('[Security ERROR] ' + e.message);
      return 'GUEST';
    }
  }

  function _hasPermission(userRole, requiredPermission) {
    var level = ROLE_HIERARCHY[userRole] || 0;

    var permissionMap = {
      [PERMISSIONS.READ]: 0,
      [PERMISSIONS.WRITE]: 1,
      [PERMISSIONS.DELETE]: 2,
      [PERMISSIONS.APPROVE]: 3,
      [PERMISSIONS.FINANCE]: 4,
      [PERMISSIONS.ADMIN]: 5
    };

    var requiredLevel = permissionMap[requiredPermission] || 0;
    return level >= requiredLevel;
  }

  return {
    getUserRole: function() {
      var email = Session.getActiveUser().getEmail();
      return _getRoleFromMembers(email);
    },

    currentUser: function() {
      return Session.getActiveUser().getEmail();
    },

    requirePermission: function(permission) {
      var role = this.getUserRole();
      if (!_hasPermission(role, permission)) {
        var email = this.currentUser();
        var err = new Error(
          'FORBIDDEN: User "' + email + '" with role "' + role + '" lacks permission "' + permission + '"'
        );
        Logger.log('[Security] ' + err.message);
        throw err;
      }
    },

    requireAdmin: function() {
      this.requirePermission(PERMISSIONS.ADMIN);
    },

    can: function(permission) {
      var role = this.getUserRole();
      return _hasPermission(role, permission);
    },

    getRoleHierarchy: function() {
      return Object.assign({}, ROLE_HIERARCHY);
    },

    getPermissions: function() {
      return Object.assign({}, PERMISSIONS);
    },

    isRoleAtLeast: function(roleA, roleB) {
      return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0);
    }
  };
})();

// ─── Wrappers عامة ───
function requirePermission(permission) {
  Security.requirePermission(permission);
}

function requireAdmin() {
  Security.requireAdmin();
}

function getUserRole() {
  return Security.getUserRole();
}

function isCurrentUserAdmin() {
  return Security.can(Security.getPermissions().ADMIN);
}