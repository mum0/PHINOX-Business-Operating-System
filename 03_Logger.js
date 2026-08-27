// 03_Logger.js — PHINOX BOS v5 Enterprise
// ============================================
// تم التعديل: إضافة Logger.log() المفقودة
// السبب: IIFE القديمة حذفت .log() → TypeError في UI_Server.js
// تاريخ التعديل: 2026-08-27
// ============================================

var Logger = (function() {
  'use strict';

  var LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
  var currentLevel = LOG_LEVELS.INFO;
  var buffer = [];
  var BUFFER_SIZE = 50;

  function _write(level, context, message, data) {
    var timestamp = new Date().toISOString();
    var levelStr = Object.keys(LOG_LEVELS)[level] || 'INFO';
    var entry = '[' + timestamp + '] [' + levelStr + ']';
    if (context) entry += ' [' + context + ']';
    entry += ' ' + message;
    if (data) entry += ' | DATA: ' + JSON.stringify(data);

    // ✅ الكتابة في شيت Logs (إن وجد)
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName('Logs');
      if (sheet) {
        sheet.appendRow([timestamp, levelStr, context || '', message, data ? JSON.stringify(data) : '']);
      }
    } catch (e) {
      // silent — Logs sheet might not exist
    }

    // ✅ الكتابة في Stackdriver (الأصلي)
    try {
      if (level >= LOG_LEVELS.ERROR) {
        console.error(entry);
      } else if (level >= LOG_LEVELS.WARN) {
        console.warn(entry);
      } else {
        console.log(entry);
      }
    } catch (e) {
      // fallback
    }

    // ✅ التخزين المؤقت
    buffer.push(entry);
    if (buffer.length > BUFFER_SIZE) buffer.shift();
  }

  return {
    // ✅ هذه الدالة كانت مفقودة — أضفناها
    log: function(message) {
      _write(LOG_LEVELS.INFO, null, String(message), null);
    },

    debug: function(context, message, data) {
      if (currentLevel <= LOG_LEVELS.DEBUG) {
        _write(LOG_LEVELS.DEBUG, context, message, data);
      }
    },

    info: function(context, message, data) {
      if (currentLevel <= LOG_LEVELS.INFO) {
        _write(LOG_LEVELS.INFO, context, message, data);
      }
    },

    warn: function(context, message, data) {
      if (currentLevel <= LOG_LEVELS.WARN) {
        _write(LOG_LEVELS.WARN, context, message, data);
      }
    },

    error: function(context, error, data) {
      if (currentLevel <= LOG_LEVELS.ERROR) {
        var msg = error && error.message ? error.message : String(error);
        _write(LOG_LEVELS.ERROR, context, msg, data);
      }
    },

    setLevel: function(levelName) {
      var lvl = LOG_LEVELS[levelName.toUpperCase()];
      if (lvl !== undefined) currentLevel = lvl;
    },

    flush: function() {
      buffer = [];
    },

    getBuffer: function() {
      return buffer.slice();
    }
  };
})();