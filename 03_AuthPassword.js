/**
 * Auth System — Password Hashing
 * PHINOX BOS v5
 *
 * يستخدم SHA-256 مع ملح (salt) عشوائي 16 حرف.
 * التنسيق المخزن: salt$hash (64 hex chars)
 *
 * يعتمد على: لا شيء (وحدة مستقلة تماماً)
 * يُستخدم من: 01_Auth.js
 */

var AuthPassword = (function() {
  'use strict';

  var SALT_LENGTH = 16;

  /**
   * تحويل مصفوفة بايت إلى سلسلة hex
   * @param {byte[]} bytes — مصفوفة البايت من computeDigest
   * @returns {string}
   */
  function _bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      if (b < 0) b += 256; // تعويض القيم السلبية
      hex += ('0' + b.toString(16)).slice(-2);
    }
    return hex;
  }

  /**
   * إنشاء سلسلة عشوائية (salt)
   * @param {number} length — طول الملح
   * @returns {string}
   */
  function _generateSalt(length) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var salt = '';
    var randomBytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(Math.random()) + String(Date.now()) + Session.getActiveUser().getEmail()
    );
    for (var i = 0; i < length; i++) {
      var idx = (randomBytes[i % randomBytes.length] & 0x7F) % chars.length;
      if (idx < 0) idx += chars.length;
      salt += chars.charAt(idx);
    }
    return salt;
  }

  /**
   * تشفير كلمة المرور
   * @param {string} password — كلمة المرور النصية
   * @returns {string} — salt$hash
   */
  function hash(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('كلمة المرور مطلوبة');
    }
    if (password.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    var salt = _generateSalt(SALT_LENGTH);
    var combined = salt + password;
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      combined
    );
    var hashHex = _bytesToHex(digest);

    return salt + '$' + hashHex;
  }

  /**
   * التحقق من كلمة المرور
   * @param {string} password — كلمة المرور المدخلة
   * @param {string} stored — القيمة المخزنة (salt$hash)
   * @returns {boolean}
   */
  function verify(password, stored) {
    if (!password || !stored) return false;
    if (!stored.indexOf('$')) return false;

    var separatorIndex = stored.indexOf('$');
    if (separatorIndex < 1) return false;

    var salt = stored.substring(0, separatorIndex);
    var storedHash = stored.substring(separatorIndex + 1);

    if (!salt || !storedHash) return false;

    var combined = salt + password;
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      combined
    );
    var computedHash = _bytesToHex(digest);

    var isValid = (computedHash === storedHash);

    // توقيت ثابت لمنع هجمات التوقيت (تأخير اصطناعي)
    if (!isValid) {
      Utilities.sleep(50); // 50ms تأخير عند الفشل
    }

    return isValid;
  }

  /**
   * التحقق من قوة كلمة المرور
   * @param {string} password
   * @returns {object} { valid: boolean, errors: string[] }
   */
  function validateStrength(password) {
    var errors = [];

    if (!password || password.length < 6) {
      errors.push('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    if (password && password.length > 128) {
      errors.push('كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)');
    }
    if (password && !/[a-zA-Z]/.test(password)) {
      errors.push('يجب أن تحتوي على حرف لاتيني واحد على الأقل');
    }
    if (password && !/[0-9]/.test(password)) {
      errors.push('يجب أن تحتوي على رقم واحد على الأقل');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      strength: errors.length === 0 ? (password.length >= 10 ? 'strong' : 'medium') : 'weak'
    };
  }

  // ─── واجهة عامة ───
  return {
    hash: hash,
    verify: verify,
    validateStrength: validateStrength
  };

})();
