// 09_Security.js — PHINOX BOS v5 Enterprise
// ============================================
// SECURITY FIX (2026-08-27):
//   - Rebuilt RBAC: Members Sheet is single source of truth
//   - Removed: setUserRole (public), UserProperties for roles
//   - Added: isRoleAtLeast() for hierarchy comparison
//   - All logging uses Logger module (03_Logger.js)
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

  // ─── Private helpers ───

  function _getRoleFromMembers(email) {
    if (!email) return 'GUEST';

    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEETS.MEMBERS);
      if (!sheet) {
        Logger.error('Security._getRoleFromMembers', 'Members sheet not found', { email: email });
        return 'GUEST';
      }

      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var emailIdx = headers.indexOf('email');
      var roleIdx = headers.indexOf('role');
      var statusIdx = headers.indexOf('status');

      if (emailIdx === -1 || roleIdx === -1) return 'GUEST';

      for (var i = 1; i < data.length; i++) {
        if (data[i][emailIdx] === email) {
          if (statusIdx !== -1 && data[i][statusIdx] === 'inactive') {
            return 'GUEST';
          }
          return data[i][roleIdx] || 'GUEST';
        }
      }
      return 'GUEST';
    } catch (e) {
      Logger.error('Security._getRoleFromMembers', e.message, { email: email, error: e.toString() });
      return 'GUEST';
    }
  }

  function _hasPermission(userRole, requiredPermission) {
    var level = ROLE_HIERARCHY[userRole] || 0;

    var permissionMap = {};
    permissionMap[PERMISSIONS.READ] = 0;
    permissionMap[PERMISSIONS.WRITE] = 1;
    permissionMap[PERMISSIONS.DELETE] = 2;
    permissionMap[PERMISSIONS.APPROVE] = 3;
    permissionMap[PERMISSIONS.FINANCE] = 4;
    permissionMap[PERMISSIONS.ADMIN] = 5;

    var requiredLevel = permissionMap[requiredPermission] || 0;
    return level >= requiredLevel;
  }

  // ─── Public API ───

  return {
    /**
     * Get current user role from Members Sheet
     * @returns {string}
     */
    getUserRole: function() {
      var email = Session.getActiveUser().getEmail();
      return _getRoleFromMembers(email);
    },

    /**
     * Get current user email
     * @returns {string}
     */
    currentUser: function() {
      try {
        return Session.getActiveUser().getEmail();
      } catch (e) {
        return 'anonymous';
      }
    },

    /**
     * Require permission — throws if denied
     * @param {string} permission
     * @throws {Error}
     */
    requirePermission: function(permission) {
      var role = this.getUserRole();
      if (!_hasPermission(role, permission)) {
        var email = this.currentUser();
        var err = new Error(
          'FORBIDDEN: User "' + email + '" with role "' + role + '" lacks permission "' + permission + '"'
        );
        Logger.error('Security.requirePermission', err.message, { email: email, role: role, permission: permission });
        throw err;
      }
    },

    /**
     * Require admin permission
     * @throws {Error}
     */
    requireAdmin: function() {
      this.requirePermission(PERMISSIONS.ADMIN);
    },

    /**
     * Check permission without throwing
     * @param {string} permission
     * @returns {boolean}
     */
    can: function(permission) {
      var role = this.getUserRole();
      return _hasPermission(role, permission);
    },

    /**
     * Get role hierarchy
     * @returns {Object}
     */
    getRoleHierarchy: function() {
      return Object.assign({}, ROLE_HIERARCHY);
    },

    /**
     * Get permissions list
     * @returns {Object}
     */
    getPermissions: function() {
      return Object.assign({}, PERMISSIONS);
    },

    /**
     * Compare two roles — is roleA >= roleB?
     * @param {string} roleA
     * @param {string} roleB
     * @returns {boolean}
     */
    isRoleAtLeast: function(roleA, roleB) {
      return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0);
    }
  };
})();

// ─── Global wrappers (backward compatibility) ───

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