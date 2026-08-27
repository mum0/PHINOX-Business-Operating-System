// 00_RequestValidator.gs — PHINOX BOS v5 Enterprise
// ============================================
// جديد: طبقة التحقق من المدخلات والتطهير
// يُستخدم في كل نقاط النهاية (UI_Server.js)
// تاريخ الإنشاء: 2026-08-27
// ============================================

const RequestValidator = (function() {
  'use strict';

  // ─── ثوابت ───
  const MAX_STRING_LENGTH = 5000;
  const MAX_NUMBER = 999999999999;
  const MIN_NUMBER = -999999999999;
  const ALLOWED_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];
  const HTML_TAG_REGEX = /<[^>]*>/g;

  // ─── دوال خاصة ───

  function _isNullOrUndefined(value) {
    return value === null || value === undefined;
  }

  function _isEmptyString(value) {
    return typeof value === 'string' && value.trim() === '';
  }

  // ─── API عام ───

  return {

    // ─── 1. التطهير الأساسي ───

    /**
     * تطهير سلسلة نصية — منع Formula Injection في Sheets
     * @param {*} input
     * @returns {string}
     */
    sanitizeString: function(input) {
      if (_isNullOrUndefined(input)) return '';
      let str = String(input).trim();

      // منع Formula Injection: إضافة apostrophe قبل الأحرف الخطرة
      if (str.length > 0 && DANGEROUS_PREFIXES.includes(str[0])) {
        str = "'" + str;
      }

      // تقصير إذا كان طويلاً جداً
      if (str.length > MAX_STRING_LENGTH) {
        str = str.substring(0, MAX_STRING_LENGTH);
      }

      return str;
    },

    /**
     * تطهير HTML — إزالة الوسوم
     * @param {*} input
     * @returns {string}
     */
    sanitizeHtml: function(input) {
      if (_isNullOrUndefined(input)) return '';
      return String(input).replace(HTML_TAG_REGEX, '');
    },

    /**
     * تطهير رقم
     * @param {*} input
     * @returns {number|null}
     */
    sanitizeNumber: function(input) {
      if (_isNullOrUndefined(input)) return null;
      const num = Number(input);
      if (isNaN(num)) return null;
      if (num > MAX_NUMBER) return MAX_NUMBER;
      if (num < MIN_NUMBER) return MIN_NUMBER;
      return num;
    },

    /**
     * تطهير بريد إلكتروني
     * @param {*} input
     * @returns {string|null}
     */
    sanitizeEmail: function(input) {
      if (_isNullOrUndefined(input)) return null;
      const email = String(input).trim().toLowerCase();
      if (!ALLOWED_EMAIL_REGEX.test(email)) return null;
      return email;
    },

    /**
     * تطهير معرف (ID)
     * @param {*} input
     * @returns {string|null}
     */
    sanitizeId: function(input) {
      if (_isNullOrUndefined(input)) return null;
      const id = String(input).trim();
      // السماح فقط بأحرف alphanumeric وشرطات
      if (!/^[a-zA-Z0-9-_]+$/.test(id)) return null;
      return id;
    },

    // ─── 2. التحقق من الحقول الإلزامية ───

    /**
     * التحقق من وجود حقول إلزامية
     * @param {Object} params
     * @param {string[]} requiredFields
     * @throws {Error}
     */
    validateRequired: function(params, requiredFields) {
      if (!params || typeof params !== 'object') {
        throw new Error('MISSING_PARAMS: Request parameters are required');
      }

      for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        const value = params[field];

        if (_isNullOrUndefined(value) || _isEmptyString(value)) {
          throw new Error(`MISSING_PARAM: "${field}" is required`);
        }
      }
    },

    /**
     * التحقق من أن القيمة واحدة من قائمة مسموحة
     * @param {*} value
     * @param {Array} allowedValues
     * @param {string} fieldName
     * @throws {Error}
     */
    validateEnum: function(value, allowedValues, fieldName) {
      if (!allowedValues.includes(value)) {
        throw new Error(
          `INVALID_PARAM: "${fieldName}" must be one of [${allowedValues.join(', ')}], got "${value}"`
        );
      }
    },

    /**
     * التحقق من نطاق رقمي
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @param {string} fieldName
     * @throws {Error}
     */
    validateRange: function(value, min, max, fieldName) {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`INVALID_PARAM: "${fieldName}" must be a number`);
      }
      if (value < min || value > max) {
        throw new Error(
          `INVALID_PARAM: "${fieldName}" must be between ${min} and ${max}, got ${value}`
        );
      }
    },

    /**
     * التحقق من تاريخ صالح
     * @param {*} value
     * @param {string} fieldName
     * @returns {Date}
     * @throws {Error}
     */
    validateDate: function(value, fieldName) {
      if (_isNullOrUndefined(value)) {
        throw new Error(`MISSING_PARAM: "${fieldName}" is required`);
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`INVALID_PARAM: "${fieldName}" is not a valid date`);
      }
      // التحقق من أن التاريخ ليس في المستقبل البعيد
      const now = new Date();
      const maxFuture = new Date(now.getFullYear() + 5, 11, 31);
      if (date > maxFuture) {
        throw new Error(`INVALID_PARAM: "${fieldName}" is too far in the future`);
      }
      return date;
    },

    // ─── 3. التحقق من الصلاحيات ───

    /**
     * التحقق من صلاحية الدور
     * @param {string} requiredPermission — إحدى PERMISSIONS
     * @throws {Error}
     */
    validateRole: function(requiredPermission) {
      Security.requirePermission(requiredPermission);
    },

    /**
     * التحقق من أدمن
     * @throws {Error}
     */
    validateAdmin: function() {
      Security.requireAdmin();
    },

    // ─── 4. تطهير كائن كامل ───

    /**
     * تطهير جميع حقول كائن
     * @param {Object} params
     * @param {Object} schema — {fieldName: 'string'|'number'|'email'|'id'|'html'}
     * @returns {Object}
     */
    sanitizeObject: function(params, schema) {
      if (!params || typeof params !== 'object') return {};

      const sanitized = {};
      for (const key in schema) {
        if (!schema.hasOwnProperty(key)) continue;

        const type = schema[key];
        const value = params[key];

        switch (type) {
          case 'string':
            sanitized[key] = this.sanitizeString(value);
            break;
          case 'number':
            sanitized[key] = this.sanitizeNumber(value);
            break;
          case 'email':
            sanitized[key] = this.sanitizeEmail(value);
            break;
          case 'id':
            sanitized[key] = this.sanitizeId(value);
            break;
          case 'html':
            sanitized[key] = this.sanitizeHtml(value);
            break;
          case 'date':
            sanitized[key] = value ? new Date(value) : null;
            break;
          default:
            sanitized[key] = this.sanitizeString(value);
        }
      }
      return sanitized;
    }
  };
})();

// ─── دوال مساعدة سريعة (للتوافقية) ───

function sanitizeString(input) {
  return RequestValidator.sanitizeString(input);
}

function sanitizeNumber(input) {
  return RequestValidator.sanitizeNumber(input);
}

function sanitizeEmail(input) {
  return RequestValidator.sanitizeEmail(input);
}
