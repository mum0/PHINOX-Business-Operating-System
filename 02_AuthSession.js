/**
 * Auth System — Session Management (GAS-Adapted)
 * PHINOX BOS v5
 *
 * ⚠️ اختلافات GAS عن Node.js:
 *   - لا يوجد HTTP sessions ثابتة — كل google.script.run مستقل
 *   - نستخدم CacheService للتخزين المؤقت (أسرع من PropertiesService)
 *   - مدة الجلسة: 8 ساعات (تتناسب مع جلسة GAS المعتادة)
 *   - تنظيف الجلسات يتم عبر Cache TTL التلقائي
 *
 * يعتمد على: لا شيء (وحدة مستقلة)
 * يُستخدم من: 01_Auth.js, 04_AuthMiddleware.js
 */

var AuthSession = (function() {
  'use strict';

  var SESSION_PREFIX = 'PHINOX_AUTH_';
  var RESET_PREFIX = 'PHINOX_RESET_';
  var FAILED_PREFIX = 'PHINOX_FAIL_';
  var SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 ساعات
  var RESET_TTL_SECONDS = 1 * 60 * 60;     // 1 ساعة لإعادة التعيين
  var MAX_FAILED_ATTEMPTS = 5;
  var LOCKOUT_TTL_SECONDS = 30 * 60;       // 30 دقيقة قفل

  var _cache = null;

  function _getCache() {
    if (!_cache) {
      _cache = CacheService.getScriptCache();
    }
    return _cache;
  }

  // ─── إدارة الجلسات ────────────────────────────────

  /**
   * إنشاء جلسة جديدة
   * @param {string} memberId — معرف العضو
   * @param {string} email — البريد الإلكتروني
   * @returns {string} token — رمز الجلسة
   */
  function createSession(memberId, email) {
    var token = Utilities.getUuid();
    var now = new Date();
    var expiry = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    var sessionData = JSON.stringify({
      memberId: memberId,
      email: email,
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString()
    });

    // تخزين في Cache (ينتهي تلقائياً بعد TTL)
    _getCache().put(SESSION_PREFIX + token, sessionData, SESSION_TTL_SECONDS);

    // أيضاً في UserProperties كنسخة احتياطية (في حالة مسح Cache)
    try {
      var props = PropertiesService.getUserProperties();
      props.setProperty(SESSION_PREFIX + token, sessionData);
    } catch(e) {
      // تجاهل إذا فشل — Cache يكفي
    }

    Logger.info('AuthSession', 'Session created', { memberId: memberId, email: email });

    return token;
  }

  /**
   * التحقق من صلاحية الجلسة
   * @param {string} token — رمز الجلسة
   * @returns {object|null} — بيانات الجلسة أو null
   */
  function validateSession(token) {
    if (!token || typeof token !== 'string') return null;

    // 1. البحث في Cache أولاً (أسرع)
    var sessionData = _getCache().get(SESSION_PREFIX + token);

    // 2. إذا لم يُوجد، ابحث في UserProperties (نسخة احتياطية)
    if (!sessionData) {
      try {
        var props = PropertiesService.getUserProperties();
        sessionData = props.getProperty(SESSION_PREFIX + token);
      } catch(e) {}
    }

    if (!sessionData) return null;

    var parsed;
    try {
      parsed = JSON.parse(sessionData);
    } catch(e) {
      return null;
    }

    // التحقق من انتهاء الصلاحية
    if (new Date(parsed.expiresAt) < new Date()) {
      destroySession(token);
      return null;
    }

    return parsed;
  }

  /**
   * تدمير جلسة (تسجيل الخروج)
   * @param {string} token
   */
  function destroySession(token) {
    if (!token) return;
    _getCache().remove(SESSION_PREFIX + token);
    try {
      PropertiesService.getUserProperties().deleteProperty(SESSION_PREFIX + token);
    } catch(e) {}
  }

  /**
   * جلب بيانات المستخدم من Members sheet عبر الجلسة
   * @param {string} token
   * @returns {Array|null} — صف العضو أو null
   */
  function getSessionMember(token) {
    var session = validateSession(token);
    if (!session) return null;
    return _findMemberById(session.memberId);
  }

  // ─── إعادة تعيين كلمة المرور ────────────────────────

  /**
   * إنشاء رمز إعادة التعيين
   * @param {string} email
   * @returns {string} resetToken
   */
  function createResetToken(email) {
    var token = Utilities.getUuid();
    var data = JSON.stringify({
      email: email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + RESET_TTL_SECONDS * 1000).toISOString()
    });

    _getCache().put(RESET_PREFIX + token, data, RESET_TTL_SECONDS);

    return token;
  }

  /**
   * التحقق من رمز إعادة التعيين
   * @param {string} token
   * @returns {object|null}
   */
  function validateResetToken(token) {
    if (!token) return null;
    var data = _getCache().get(RESET_PREFIX + token);
    if (!data) return null;

    var parsed;
    try { parsed = JSON.parse(data); } catch(e) { return null; }

    if (new Date(parsed.expiresAt) < new Date()) {
      _getCache().remove(RESET_PREFIX + token);
      return null;
    }

    return parsed;
  }

  /**
   * حذف رمز إعادة التعيين
   * @param {string} token
   */
  function destroyResetToken(token) {
    if (!token) return;
    _getCache().remove(RESET_PREFIX + token);
  }

  // ─── حماية من التخمين ──────────────────────────────

  /**
   * تسجيل محاولة فاشلة
   * @param {string} email
   * @returns {object} { attempts, isLocked, remaining }
   */
  function recordFailedAttempt(email) {
    var key = FAILED_PREFIX + email.trim().toLowerCase();
    var raw = _getCache().get(key);
    var count = raw ? parseInt(raw, 10) : 0;
    count++;

    var remaining = Math.max(0, MAX_FAILED_ATTEMPTS - count);

    if (count >= MAX_FAILED_ATTEMPTS) {
      // قفل الحساب مؤقتاً
      _getCache().put(key, String(count), LOCKOUT_TTL_SECONDS);
      return { attempts: count, isLocked: true, remaining: 0 };
    }

    // تخزين مع TTL ساعة (تُعيد العداد بعد ساعة من عدم المحاولة)
    _getCache().put(key, String(count), 60 * 60);

    return { attempts: count, isLocked: false, remaining: remaining };
  }

  /**
   * التحقق مما إذا كان الحساب مقفولاً
   * @param {string} email
   * @returns {boolean}
   */
  function isLocked(email) {
    var key = FAILED_PREFIX + email.trim().toLowerCase();
    var raw = _getCache().get(key);
    if (!raw) return false;
    var count = parseInt(raw, 10);
    return count >= MAX_FAILED_ATTEMPTS;
  }

  /**
   * مسح عداد المحاولات الفاشلة (عند نجاح الدخول)
   * @param {string} email
   */
  function clearFailedAttempts(email) {
    var key = FAILED_PREFIX + email.trim().toLowerCase();
    _getCache().remove(key);
  }

  // ─── تنظيف (يُستدعى يومياً من dailyTrigger) ──────────

  /**
   * تنظيف الجلسات والرموز المنتهية
   * ملاحظة: CacheService يحذف تلقائياً حسب TTL
   * هذه الدالة تنظف UserProperties فقط
   */
  function cleanup() {
    try {
      var props = PropertiesService.getUserProperties();
      var keys = props.getKeys();
      var now = new Date();
      var removed = 0;

      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(SESSION_PREFIX) === 0) {
          var data = props.getProperty(keys[i]);
          if (data) {
            try {
              var parsed = JSON.parse(data);
              if (new Date(parsed.expiresAt) < now) {
                props.deleteProperty(keys[i]);
                removed++;
              }
            } catch(e) {
              props.deleteProperty(keys[i]);
              removed++;
            }
          }
        }
      }

      if (removed > 0) {
        Logger.info('AuthSession', 'Cleaned up ' + removed + ' expired sessions from UserProperties');
      }
    } catch(e) {
      Logger.error('AuthSession', 'Cleanup failed: ' + e.message);
    }
  }

  // ─── دوال خاصة ──────────────────────────────────────

  function _findMemberById(memberId) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) return null;
      var sheet = ss.getSheetByName('Members');
      if (!sheet) return null;

      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return null;

      var data = sheet.getRange(2, 1, lastRow - 1, 14).getValues(); // 14 عمود
      var target = String(memberId).trim();

      for (var i = 0; i < data.length; i++) {
        if (String(data[i][MEMBER_COL.MEMBER_ID] || '').trim() === target) {
          return data[i];
        }
      }
    } catch(e) {
      Logger.error('AuthSession', '_findMemberById failed: ' + e.message);
    }
    return null;
  }

  // ─── واجهة عامة ───
  return {
    createSession: createSession,
    validateSession: validateSession,
    destroySession: destroySession,
    getSessionMember: getSessionMember,
    createResetToken: createResetToken,
    validateResetToken: validateResetToken,
    destroyResetToken: destroyResetToken,
    recordFailedAttempt: recordFailedAttempt,
    isLocked: isLocked,
    clearFailedAttempts: clearFailedAttempts,
    cleanup: cleanup
  };

})();
