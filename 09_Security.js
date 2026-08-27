// 09_Security.js — PHINOX BOS v5 Enterprise
// ============================================
// تم التعديل: إعادة بناء RBAC — Members Sheet هي مصدر الحقيقة الوحيد
// تم إزالة: setUserRole العامة، UserProperties لتخزين الأدوار
// تاريخ التعديل: 2026-08-27
// ============================================

const Security = (function() {
  'use strict';

  const ROLE_HIERARCHY = {
    'GUEST': 0,
    'MEMBER': 1,
    'MANAGER': 2,
    'PARTNER': 3,
    'ADMIN': 4,
    'CEO': 5,
    'SUPER_ADMIN': 6,
    'OWNER': 7
  };

  const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin',
    FINANCE: 'finance',
    APPROVE: 'approve'
  };

  function _getRoleFromMembers(email) {
    if (!email) return 'GUEST';

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('Members');
      if (!sheet) {
        AppLogger.error('Security._getRoleFromMembers', new Error('Members sheet not found'), email);
        return 'GUEST';
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const emailIdx = headers.indexOf('email');
      const roleIdx = headers.indexOf('role');
      const statusIdx = headers.indexOf('status');

      if (emailIdx === -1 || roleIdx === -1) return 'GUEST';

      for (let i = 1; i < data.length; i++) {
        if (data[i][emailIdx] === email) {
          if (statusIdx !== -1 && data[i][statusIdx] === 'inactive') {
            return 'GUEST';
          }
          return data[i][roleIdx] || 'GUEST';
        }
      }
      return 'GUEST';
    } catch (e) {
      AppLogger.error('Security._getRoleFromMembers', e, email);
      return 'GUEST';
    }
  }

  function _hasPermission(userRole, requiredPermission) {
    const level = ROLE_HIERARCHY[userRole] || 0;

    const permissionMap = {
      [PERMISSIONS.READ]: 0,
      [PERMISSIONS.WRITE]: 1,
      [PERMISSIONS.DELETE]: 2,
      [PERMISSIONS.APPROVE]: 3,
      [PERMISSIONS.FINANCE]: 4,
      [PERMISSIONS.ADMIN]: 5
    };

    const requiredLevel = permissionMap[requiredPermission] || 0;
    return level >= requiredLevel;
  }

  return {
    getUserRole: function() {
      const email = Session.getActiveUser().getEmail();
      return _getRoleFromMembers(email);
    },

    currentUser: function() {
      return Session.getActiveUser().getEmail();
    },

    requirePermission: function(permission) {
      const role = this.getUserRole();
      if (!_hasPermission(role, permission)) {
        const email = this.currentUser();
        const err = new Error(
          `FORBIDDEN: User "${email}" with role "${role}" lacks permission "${permission}"`
        );
        AppLogger.error('Security.requirePermission', err, email);
        throw err;
      }
    },

    requireAdmin: function() {
      this.requirePermission(PERMISSIONS.ADMIN);
    },

    can: function(permission) {
      const role = this.getUserRole();
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