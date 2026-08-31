/**
 * Auth System — Session Management (GAS-Adapted) — FIXED v6
 * PHINOX BOS v6
 *
 * FIXES APPLIED:
 *   1. كل Date objects تُحوّل لـ .toISOString() قبل الإرجاع
 *      (يمنع "illegal value in property: 0" في google.script.run)
 *   2. UserProperties استُبدل بـ ScriptProperties للـ multi-user
 *   3. إضافة uiValidateSession دالة عامة للاستدعاء من الواجهة
 *
 * يعتمد على: لا شيء (وحدة مستقلة)
 * يُستخدم من: 01_Auth.js, 04_AuthMiddleware.js, UI_Server.js
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
    var nowIso = new Date().toISOString();
    var expiryMs = Date.now() + SESSION_TTL_SECONDS * 1000;
    var expiryIso = new Date(expiryMs).toISOString();

    var sessionData = JSON.stringify({
      memberId: String(memberId),
      email: String(email),
      createdAt: nowIso,     // ✅ string وليس Date
      expiresAt: expiryIso    // ✅ string وليس Date
    });

    // تخزين في Cache (ينتهي تلقائياً بعد TTL)
    _getCache().put(SESSION_PREFIX + token, sessionData, SESSION_TTL_SECONDS);

    // أيضاً في ScriptProperties كنسخة احتياطية (مشترك بين كل المستخدمين)
    try {
      var props = PropertiesService.getScriptProperties();
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
   * @returns {object|null} — بيانات الجلسة أو null (كل القيم strings — آمنة للتسلسل)
   */
  function validateSession(token) {
    if (!token || typeof token !== 'string') return null;

    // 1. البحث في Cache أولاً (أسرع)
    var sessionData = _getCache().get(SESSION_PREFIX + token);

    // 2. إذا لم يُوجد، ابحث في ScriptProperties (نسخة احتياطية)
    if (!sessionData) {
      try {
        var props = PropertiesService.getScriptProperties();
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

    // ✅ التحقق من انتهاء الصلاحية — مقارنة strings بدل Date objects
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
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
      PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
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
      email: String(email),
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

    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
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
      _getCache().put(key, String(count), LOCKOUT_TTL_SECONDS);
      return { attempts: count, isLocked: true, remaining: 0 };
    }

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
   * مسح عداد المحاولات الفاشلة
   * @param {string} email
   */
  function clearFailedAttempts(email) {
    var key = FAILED_PREFIX + email.trim().toLowerCase();
    _getCache().remove(key);
  }

  // ─── تنظيف (يُستدعى يومياً من dailyTrigger) ──────────

  /**
   * تنظيف الجلسات المنتهية من ScriptProperties
   * ملاحظة: CacheService يحذف تلقائياً حسب TTL
   */
  function cleanup() {
    try {
      var props = PropertiesService.getScriptProperties();
      var keys = props.getKeys();
      var nowMs = Date.now();
      var removed = 0;

      for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(SESSION_PREFIX) === 0) {
          var data = props.getProperty(keys[i]);
          if (data) {
            try {
              var parsed = JSON.parse(data);
              if (new Date(parsed.expiresAt).getTime() < nowMs) {
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
        Logger.info('AuthSession', 'Cleaned up ' + removed + ' expired sessions');
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

      var totalCols = sheet.getLastColumn();
      var data = sheet.getRange(2, 1, lastRow - 1, totalCols).getValues();
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
