/**
 * Cache wrapper with TTL and namespacing.
 */

const Cache = (function() {
  'use strict';
  
  const svc = CacheService.getScriptCache();
  const TTL = CONFIG.PERFORMANCE.CACHE_TTL_SECONDS;
  
  function key(ns, id) { return ns + ':' + id; }
  
  return {
    get: function(ns, id) {
      const raw = svc.get(key(ns, id));
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    
    set: function(ns, id, value, ttl) {
      svc.put(key(ns, id), JSON.stringify(value), ttl || TTL);
    },
    
    remove: function(ns, id) {
      svc.remove(key(ns, id));
    },
    
    flush: function(ns) {
      // GAS لا يدعم prefix delete. نستخدم تسجيل invalidation.
      this.set('_invalid', ns, Date.now());
    },
    
    isValid: function(ns, timestamp) {
      const invalid = this.get('_invalid', ns);
      return !invalid || timestamp > invalid;
    }
  };
})();