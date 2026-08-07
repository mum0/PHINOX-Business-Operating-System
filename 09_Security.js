/**
 * RBAC middleware. Permission check with role inheritance.
 */

const Security = (function() {
    'use strict';
    
    const ROLES = Object.freeze({
      admin:     { level: 100, inherits: [], perms: ['*'] },
      ceo:       { level: 90,  inherits: ['manager'], perms: ['read_all','write_strategy','approve_budget'] },
      manager:   { level: 70,  inherits: ['sales'], perms: ['read_department','write_department','read_team'] },
      finance:   { level: 60,  inherits: ['viewer'], perms: ['read_finance','write_finance','read_invoices'] },
      marketing: { level: 60,  inherits: ['viewer'], perms: ['read_marketing','write_campaigns','read_leads'] },
      warehouse: { level: 50,  inherits: ['viewer'], perms: ['read_inventory','write_inventory','read_orders'] },
      sales:     { level: 50,  inherits: ['viewer'], perms: ['read_sales','write_orders','read_customers'] },
      viewer:    { level: 10,  inherits: [], perms: ['read_limited'] }
    });
    
    function resolvePerms(roleName, visited) {
      visited = visited || {};
      if (visited[roleName]) return [];
      visited[roleName] = true;
      
      const role = ROLES[roleName];
      if (!role) return [];
      
      let perms = role.perms.slice();
      role.inherits.forEach(function(r) {
        perms = perms.concat(resolvePerms(r, visited));
      });
      return [...new Set(perms)];
    }
    
    const PERM_CACHE = {};
    Object.keys(ROLES).forEach(function(r) {
      PERM_CACHE[r] = resolvePerms(r);
    });
    
    return {
      ROLES: ROLES,
      
      currentUser: function() {
        try { return Session.getActiveUser().getEmail(); } 
        catch (e) { return 'anonymous'; }
      },
      
      getUserRole: function() {
        // TODO: اربط بورقة Users عند بناء Module المستخدمين
        const email = this.currentUser();
        const props = PropertiesService.getUserProperties();
        const role = props.getProperty('BOS_ROLE_' + email);
        return role || 'viewer';
      },
      
      setUserRole: function(email, role) {
        if (!ROLES[role]) throw ErrorHandler.validation('Invalid role', { role: role }, 'Security');
        PropertiesService.getUserProperties().setProperty('BOS_ROLE_' + email, role);
        Logger.info('Security', 'Role assigned', { email: email, role: role });
      },
      
      hasPermission: function(perm) {
        const role = this.getUserRole();
        const perms = PERM_CACHE[role] || [];
        return perms.includes('*') || perms.includes(perm);
      },
      
      require: function(perm) {
        if (!this.hasPermission(perm)) {
          throw ErrorHandler.permission(perm, 'resource', 'Security');
        }
      },
      
      requireAny: function(perms) {
        const ok = perms.some(function(p) { return this.hasPermission(p); }, this);
        if (!ok) throw ErrorHandler.permission(perms.join('|'), 'resource', 'Security');
      },
      
      requireLevel: function(minLevel) {
        const role = this.getUserRole();
        const level = (ROLES[role] || {}).level || 0;
        if (level < minLevel) {
          throw ErrorHandler.permission('level ' + minLevel, 'resource', 'Security');
        }
      }
    };
  })();