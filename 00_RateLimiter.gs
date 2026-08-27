// 00_RateLimiter.gs — PHINOX BOS v5 Enterprise
// ============================================
// جديد: حماية من استنزاف الحصص (Quota Protection)
// يستخدم CacheService للتتبع
// تاريخ الإنشاء: 2026-08-27
// ============================================

const RateLimiter = (function() {
  'use strict';

  // ─── الإعدادات ───
  const DEFAULT_MAX_REQUESTS = 100;      // طلب/ساعة للمستخدم العادي
  const ADMIN_MAX_REQUESTS = 500;        // طلب/ساعة للأدمن
  const WINDOW_SECONDS = 3600;           // نافذة زمنية: ساعة
  const CACHE_PREFIX = 'RATE:';
  const GLOBAL_PREFIX = 'RATE_GLOBAL:';
  const GLOBAL_MAX = 5000;               // طلب/ساعة للنظام ككل

  // ─── دوال خاصة ───

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
    const value = cache.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  function _isAdmin(email) {
    try {
      const role = Security.getUserRole();
      return ['ADMIN', 'CEO', 'SUPER_ADMIN', 'OWNER'].includes(role);
    } catch (e) {
      return false;
    }
  }

  // ─── API عام ───

  return {

    /**
     * التحقق من الحد — يرمي خطأ إذا تجاوز
     * @param {string} action — اسم العملية (مثلاً 'uiCreateExpense')
     * @param {Object} options — {maxRequests, windowSeconds}
     * @throws {Error}
     */
    check: function(action, options) {
      options = options || {};
      const cache = _getCache();
      const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
      const isAdminUser = _isAdmin(userEmail);

      // ─── فحص الحد العام للنظام ───
      const globalKey = _getGlobalKey();
      const globalCount = _getCurrentCount(cache, globalKey);
      if (globalCount >= GLOBAL_MAX) {
        const err = new Error('RATE_LIMIT_EXCEEDED: System quota reached. Please try again later.');
        AppLogger.error('RateLimiter.check', err, userEmail);
        throw err;
      }

      // ─── فحص الحد الفردي ───
      const maxRequests = options.maxRequests || (isAdminUser ? ADMIN_MAX_REQUESTS : DEFAULT_MAX_REQUESTS);
      const windowSec = options.windowSeconds || WINDOW_SECONDS;
      const userKey = _getKey(userEmail, action);
      const userCount = _getCurrentCount(cache, userKey);

      if (userCount >= maxRequests) {
        const err = new Error(
          `RATE_LIMIT_EXCEEDED: Limit of ${maxRequests} requests per hour exceeded for "${action}".`
        );
        AppLogger.error('RateLimiter.check', err, userEmail);
        throw err;
      }

      // ─── زيادة العداد ───
      cache.put(userKey, userCount + 1, windowSec);
      cache.put(globalKey, globalCount + 1, windowSec);

      AppLogger.info('RateLimiter.check', `Allowed: ${action} for ${userEmail} (${userCount + 1}/${maxRequests})`);
    },

    /**
     * التحقق بدون رمي خطأ — يرجع true/false
     * @param {string} action
     * @param {Object} options
     * @returns {boolean}
     */
    canProceed: function(action, options) {
      try {
        this.check(action, options);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * الحصول على حالة الحدود للمستخدم الحالي
     * @returns {Object}
     */
    getStatus: function() {
      const cache = _getCache();
      const userEmail = Session.getActiveUser().getEmail() || 'anonymous';
      const isAdminUser = _isAdmin(userEmail);
      const maxRequests = isAdminUser ? ADMIN_MAX_REQUESTS : DEFAULT_MAX_REQUESTS;

      // جمع كل العدادات الخاصة بالمستخدم
      // ملاحظة: CacheService لا يدعم wildcard، لذا نُرجع ملخصاً عاماً
      const allKey = _getKey(userEmail, 'all');
      const allCount = _getCurrentCount(cache, allKey);

      return {
        user: userEmail,
        role: isAdminUser ? 'admin' : 'user',
        limit: maxRequests,
        windowSeconds: WINDOW_SECONDS,
        currentAll: allCount,
        remaining: Math.max(0, maxRequests - allCount)
      };
    },

    /**
     * إعادة تعيين العداد (للأدمن فقط)
     * @param {string} targetEmail
     */
    reset: function(targetEmail) {
      Security.requireAdmin();
      const cache = _getCache();
      // لا يمكن حذف مفاتيح محددة من CacheService بسهولة
      // لكن يمكننا تعيينها إلى 0
      const key = _getKey(targetEmail, 'all');
      cache.put(key, '0', WINDOW_SECONDS);
      AppLogger.info('RateLimiter.reset', `Reset counter for ${targetEmail}`, null);
    }
  };
})();

// ─── Wrapper سريع ───

/**
 * التحقق من الحد قبل تنفيذ عملية
 * @param {string} action
 * @param {Object} options
 */
function checkRateLimit(action, options) {
  RateLimiter.check(action, options);
}
