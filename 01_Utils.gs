/**
 * Core Utilities
 * Safe sanitization, ID generation, helpers.
 * Fixes: XSS vulnerability, incorrect date fallback.
 */

const Utils = (function() {
    'use strict';
    
    const HTML_ESCAPE_MAP = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return {
      generateId: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
      
      safeStr: function(value) {
        if (value === null || value === undefined) return '';
        var str = String(value).replace(/[\n\r]/g, ' ').trim();
        var out = '';
        for (var i = 0; i < str.length; i++) {
          var ch = str.charAt(i);
          if (ch === '&') out += '&amp;';
          else if (ch === '<') out += '&lt;';
          else if (ch === '>') out += '&gt;';
          else if (ch === '"') out += '&quot;';
          else if (ch === "'") out += '&#x27;';
          else if (ch === '/') out += '&#x2F;';
          else out += ch;
        }
        return out;
      },
      
      safeNum: function(value, defaultValue) {
        if (value === null || value === undefined || value === '') {
          return defaultValue !== undefined ? defaultValue : null;
        }
        const num = Number(value);
        return isNaN(num) ? (defaultValue !== undefined ? defaultValue : null) : num;
      },
      
      safeDate: function(value) {
        if (value instanceof Date) {
          return isNaN(value.getTime()) ? null : value;
        }
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      },
      
      formatDate: function(date) {
        const d = this.safeDate(date);
        return d ? d.toISOString() : null;
      },
      
      clone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
      },
      
      pick: function(obj, keys) {
        const result = {};
        keys.forEach(key => {
          if (obj.hasOwnProperty(key)) result[key] = obj[key];
        });
        return result;
      },
      
      omit: function(obj, keys) {
        const result = {};
        Object.keys(obj).forEach(key => {
          if (!keys.includes(key)) result[key] = obj[key];
        });
        return result;
      }
    };
  })();