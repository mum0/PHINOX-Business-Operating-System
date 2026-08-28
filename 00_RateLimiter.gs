// 00_RateLimiter.gs — PHINOX BOS v5 Enterprise
// ============================================
// SECURITY FIX (2026-08-27):
//   - Replaced AppLogger with Logger module (03_Logger.js)
//   - All logging calls now use Logger.info / Logger.error
// ============================================

var RateLimiter = (function() {
  'use strict';

  var DEFAULT_MAX_REQUESTS = 100;
  var ADMIN_MAX_REQUESTS = 500;
  var WINDOW_SECONDS = 3600;
  var CACHE_PREFIX = 'RATE:';
  var GLOBAL_PREFIX = 'RATE_GLOBAL:';
  var GLOBAL_MAX = 5000;

  function _getCache() {
    return CacheService.getScriptCache();
  }

  function _getKey(userEmail, action) {
    return CACHE_PREFIX + (userEmail || 'anonymous') + ':' + (action || 'all');
  }

  function _getGlobalKey() {
    return GLOBAL_PREFIX + 'system';
  }

  function _getCurrentCount(cache, key) {
    var value = cache.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  function _isAdmin(email) {
    try {
      var role = Security.getUserRole();
      return ['ADMIN', 'CEO', 'SUPER_ADMIN', 'OWNER'].indexOf(role) !== -1;
    } catch (e) {
      return false;
    }
  }

  return {

    check: function(action, options) {
      options = options || {};
      var cache = _getCache();
      var userEmail = Session.getActiveUser().getEmail() || 'anonymous';
      var isAdminUser = _isAdmin(userEmail);

      var globalKey = _getGlobalKey();
      var globalCount = _getCurrentCount(cache, globalKey);
      if (globalCount >= GLOBAL_MAX) {
        var err = new Error('RATE_LIMIT_EXCEEDED: System quota reached. Please try again later.');
        Logger.error('RateLimiter.check', err.message, { user: userEmail });
        throw err;
      }

      var maxRequests = options.maxRequests || (isAdminUser ? ADMIN_MAX_REQUESTS : DEFAULT_MAX_REQUESTS);
      var windowSec = options.windowSeconds || WINDOW_SECONDS;
      var userKey = _getKey(userEmail, action);
      var userCount = _getCurrentCount(cache, userKey);

      if (userCount >= maxRequests) {
        var err2 = new Error(
          'RATE_LIMIT_EXCEEDED: Limit of ' + maxRequests + ' requests per hour exceeded for "' + action + '".'
        );
        Logger.error('RateLimiter.check', err2.message, { user: userEmail, action: action });
        throw err2;
      }

      cache.put(userKey, String(userCount + 1), windowSec);
      cache.put(globalKey, String(globalCount + 1), windowSec);

      Logger.info('RateLimiter.check', 'Allowed: ' + action + ' for ' + userEmail + ' (' + (userCount + 1) + '/' + maxRequests + ')', null);
    },

    canProceed: function(action, options) {
      try {
        this.check(action, options);
        return true;
      } catch (e) {
        return false;
      }
    },

    getStatus: function() {
      var cache = _getCache();
      var userEmail = Session.getActiveUser().getEmail() || 'anonymous';
      var isAdminUser = _isAdmin(userEmail);
      var maxRequests = isAdminUser ? ADMIN_MAX_REQUESTS : DEFAULT_MAX_REQUESTS;
      var allKey = _getKey(userEmail, 'all');
      var allCount = _getCurrentCount(cache, allKey);

      return {
        user: userEmail,
        role: isAdminUser ? 'admin' : 'user',
        limit: maxRequests,
        windowSeconds: WINDOW_SECONDS,
        currentAll: allCount,
        remaining: Math.max(0, maxRequests - allCount)
      };
    },

    reset: function(targetEmail) {
      Security.requireAdmin();
      var cache = _getCache();
      var key = _getKey(targetEmail, 'all');
      cache.put(key, '0', WINDOW_SECONDS);
      Logger.info('RateLimiter.reset', 'Reset counter for ' + targetEmail, null);
    }
  };
})();

function checkRateLimit(action, options) {
  RateLimiter.check(action, options);
}
