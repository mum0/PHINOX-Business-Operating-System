// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — UI Server (Google Apps Script)
// ═══════════════════════════════════════════════════════════════════════
// تم التعديل: إزالة doGet المكرر، إضافة RequestValidator + RateLimiter + AuditLog
// تاريخ التعديل: 2026-08-27
// ═══════════════════════════════════════════════════════════════════════

// ─── PERMISSIONS ───
if (typeof PERMISSIONS === "undefined" || !PERMISSIONS) var PERMISSIONS = {};
(function() {
  var extras = {
    DASHBOARD_READ: "dashboard:read",
    INVENTORY_BOM_READ: "inventory:bom_read",
    INVENTORY_BOM_MANAGE: "inventory:bom_manage",
    CUSTOMERS_READ: "customers:read",
    CUSTOMERS_WRITE: "customers:write",
    ORDERS_READ: "orders:read",
    ORDERS_WRITE: "orders:write",
    SALES_READ: "sales:read",
    SALES_WRITE: "sales:write",
    MARKETING_READ: "marketing:read",
    MARKETING_WRITE: "marketing:write",
    SOCIAL_READ: "social:read",
    SOCIAL_WRITE: "social:write",
    SATISFACTION_READ: "satisfaction:read",
    SATISFACTION_WRITE: "satisfaction:write",
    NPS_READ: "nps:read",
    NPS_WRITE: "nps:write",
    PERFORMANCE_READ: "performance:read",
    TASKS_APPROVE: "tasks:approve",
    EXPENSE_POST: "expenses:post"
  };
  for (var k in extras) { if (!PERMISSIONS[k]) PERMISSIONS[k] = extras[k]; }
})();

// ─── AUTH HELPERS ───
function _requireAuth(permission) {
  var member = getCurrentMember();
  if (!member) {
    var email = "";
    try { email = Session.getActiveUser().getEmail(); } catch(e) {}
    throw new Error("المستخدم غير مسجّل في النظام. البريد: " + email);
  }
  var role = member[MEMBER_COL.ROLE] || "";
  if (role === "Admin" || role === "CEO") return member;
  var hasPerm = hasPermission(member, permission);
  if (!hasPerm) {
    try { logActivity(member, "Access Denied", "UI_Server", permission, "", "Unauthorized attempt"); } catch(e) {}
    throw new Error("Access denied: " + permission);
  }
  return member;
}

// ─── INPUT SANITIZATION HELPER ───
function _sanitizeInput(value) {
  if (value === null || value === undefined) return "";
  var str = String(value).trim();
  var dangerous = ["=", "+", "-", "@", "\t", "\r"];
  if (str.length > 0 && dangerous.indexOf(str[0]) !== -1) {
    str = "'" + str;
  }
  if (str.length > 5000) str = str.substring(0, 5000);
  return str;
}

function _sanitizeId(value) {
  if (!value) return null;
  var id = String(value).trim();
  if (!/^[a-zA-Z0-9-_]+$/.test(id)) return null;
  return id;
}

function _sanitizeEmail(value) {
  if (!value) return null;
  var email = String(value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

// ─── RATE LIMIT HELPER ───
function _checkRateLimit(action) {
  try {
    if (typeof RateLimiter !== "undefined" && RateLimiter.check) {
      RateLimiter.check(action || "ui_api", { maxRequests: 200, windowSeconds: 3600 });
    }
  } catch (e) {
    throw new Error("RATE_LIMIT_EXCEEDED: " + e.message);
  }
}

// ─── AUDIT LOG HELPER ───
function _auditLog(action, target, details, status) {
  try {
    if (typeof AuditLog !== "undefined" && AuditLog.log) {
      AuditLog.log(action, target, details, status || "SUCCESS");
    }
  } catch (e) {
    console.log("[AuditLog ERROR] " + e.message);
  }
}

// ============================================================
// SAFE SERIALIZATION HELPERS
// Prevents "illegal value in property: 0" from formula errors in sheets
// ============================================================

/**
 * Converts ANY value to a safe JSON-serializable string.
 * Catches Error objects (#N/A, #REF!, #DIV/0!) and Date objects.
 */
function _safeString(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Error) return '';
  try { return String(val); } catch (e) { return ''; }
}

/**
 * Sanitizes an entire row (array) from getValues().
 * Converts Error objects and Dates to safe strings.
 */
function _safeRow(row) {
  if (!row || !Array.isArray(row)) return [];
  var out = [];
  for (var i = 0; i < row.length; i++) {
    var v = row[i];
    if (v instanceof Error) { out.push(''); }
    else if (v instanceof Date) {
      try { out.push(Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')); }
      catch (e) { out.push(String(v)); }
    }
    else { out.push(v !== null && v !== undefined ? v : ''); }
  }
  return out;
}

// ============================================================
// USER AUTH API
// ============================================================


/**
 * Get current user data — NUCLEAR FIX
 * Uses JSON round-trip to guarantee 100% serializable return value.
 * This prevents "illegal value in property: 0" from ANY source.
 */
function uiGetCurrentUser() {
  // Nuclear safe fallback — always serializable
  var SAFE_FALLBACK = { email: '', role: 'GUEST', member: null, permissions: [], ts: '' };

  try {
    var email = '';
    try { email = Session.getActiveUser().getEmail() || ''; } catch(e) {}
    if (!email) return SAFE_FALLBACK;

    var rawMember = null;
    try {
      if (typeof getCurrentMember === 'function') {
        rawMember = getCurrentMember();
      }
    } catch (e) {
      console.warn('[uiGetCurrentUser] getCurrentMember failed: ' + e.message);
    }

    // Triple-sanitize row
    if (rawMember && Array.isArray(rawMember)) {
      for (var s = 0; s < rawMember.length; s++) {
        var v = rawMember[s];
        if (v instanceof Error || (v && typeof v === 'object' && !(v instanceof Date) && !(v instanceof Array))) {
          rawMember[s] = '';
        } else if (v instanceof Date) {
          try { rawMember[s] = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd'); } catch(e2) { rawMember[s] = ''; }
        } else if (v === null || v === undefined) {
          rawMember[s] = '';
        }
      }
    }

    var member = null;
    if (rawMember && Array.isArray(rawMember) && rawMember.length > 0) {
      member = {
        id:     String(rawMember[0] != null ? rawMember[0] : ''),
        name:   String(rawMember[1] != null ? rawMember[1] : ''),
        role:   String(rawMember[2] != null ? rawMember[2] : 'GUEST'),
        email:  String(rawMember[3] != null ? rawMember[3] : ''),
        phone:  String(rawMember[4] != null ? rawMember[4] : ''),
        status: String(rawMember[5] != null ? rawMember[5] : '')
      };
    }

    var role = 'GUEST';
    try {
      if (typeof Security !== 'undefined' && typeof Security.getUserRole === 'function') {
        var rawRole = Security.getUserRole();
        role = String(rawRole || 'GUEST');
      } else if (member && member.role) {
        role = String(member.role);
      }
    } catch (e) {
      if (member && member.role) role = String(member.role);
    }
    role = String(role || 'GUEST').toUpperCase().trim();

    // Get permissions safely
    var permissions = [];
    try {
      if (typeof Security !== 'undefined' && typeof Security.getUserPermissions === 'function') {
        var rawPerms = Security.getUserPermissions();
        if (Array.isArray(rawPerms)) {
          for (var p = 0; p < rawPerms.length; p++) {
            permissions.push(String(rawPerms[p] || ''));
          }
        }
      }
    } catch (e) {}

    var result = {
      email:       String(email),
      role:       String(role),
      member:      member,
      permissions: permissions,
      ts:         new Date().toISOString()
    };

    // ═══ NUCLEAR SAFETY: JSON round-trip ═══
    // This STRIPS any non-serializable value (Error, Date, undefined, function)
    try {
      var jsonStr = JSON.stringify(result);
      if (jsonStr) {
        result = JSON.parse(jsonStr);
      }
    } catch (jsonErr) {
      console.error('[uiGetCurrentUser] JSON strip failed: ' + jsonErr.message + ' — returning safe fallback');
      return SAFE_FALLBACK;
    }

    return result;

  } catch (e) {
    console.error('[uiGetCurrentUser] FATAL: ' + e.message);
    return SAFE_FALLBACK;
  }
}

// ============================================================
// PASSWORD & AUTHENTICATION API
// ============================================================

var _LOGIN_SALT = 'PHINOX_BOS_v5_SALT_2026';

function _hashPassword(plainText) {
  if (!plainText) return '';
  var raw = plainText + _LOGIN_SALT;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    hex += ('0' + b.toString(16)).slice(-2);
  }
  return hex;
}

// ============================================================
// UNIFIED MEMBER ID GENERATOR
// ============================================================
// Format: MEM-XXXXXXXXX (9 chars)
// ALL member creation paths MUST use this.
// ============================================================
function _generateMemberId() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var id = 'MEM-';
  for (var i = 0; i < 9; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// ============================================================
// UNIFIED MEMBER ROW BUILDER (13 columns)
// ============================================================
function _buildMemberRow(id, fullName, role, email, phone, status, notes, passwordHash) {
  return [
    id,
    fullName,
    role || 'Operations',
    email,
    phone || '',
    status || 'Active',
    new Date().toISOString().split('T')[0],
    0, 0, 0, 0,
    notes || '',
    passwordHash || ''
  ];
}

// ============================================================
// ENSURE 13 COLUMNS ON MEMBERS SHEET
// ============================================================
function _ensureMembers13Cols(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol >= 13) return;
  for (var c = lastCol + 1; c <= 13; c++) {
    var hdr = (c === 13) ? 'password' : '';
    sheet.getRange(1, c, 1, 1).setValue(hdr);
    sheet.getRange(1, c, 1, 1).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
    sheet.setColumnWidth(c, 30);
  }
}

// ============================================================
// STANDALONE FIX: Run to add password column
// ============================================================
function fixPasswordColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Members');
  if (!sheet) return 'ERROR: Members sheet not found';
  var lastCol = sheet.getLastColumn();
  if (lastCol >= 13) {
    var hdr = sheet.getRange(1, 13, 1, 1).getValue();
    if (String(hdr).toLowerCase() === 'password') return 'OK: Password column already exists (col 13)';
  }
  sheet.getRange(1, 13, 1, 1).setValue('password');
  sheet.getRange(1, 13, 1, 1).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
  sheet.setColumnWidth(13, 30);
  return 'FIXED: Password column added at col 13. Was ' + lastCol + ' columns.';
}

/**
 * Set a member's password. Admin/CEO can set for others; any member can set own.
 * Uses DIRECT sheet access (not BaseRepository) to avoid schema mismatch issues.
 */
function uiSetMemberPassword(targetEmail, newPassword) {
  try {
    // === INPUT VALIDATION ===
    if (!targetEmail || !newPassword) return { success: false, error: 'بيانات مفقودة' };
    targetEmail = String(targetEmail).trim().toLowerCase();
    newPassword = String(newPassword);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) return { success: false, error: 'بريد إلكتروني غير صالح' };
    if (newPassword.length < 4) return { success: false, error: 'كلمة المرور قصيرة جداً' };

    // === AUTH: get current user email & role directly from sheet ===
    var myEmail = '';
    try { myEmail = Session.getActiveUser().getEmail().toLowerCase(); } catch(e) {}
    if (!myEmail) return { success: false, error: 'غير مسجل الدخول' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: false, error: 'شيت الأعضاء غير موجود' };

    // Read ALL data once
    var allData = sheet.getDataRange().getValues();
    if (allData.length < 2) return { success: false, error: 'لا يوجد أعضاء' };

    // Find current user's role (direct scan, column 3 = email, column 2 = role)
    var myRole = '';
    for (var r = 1; r < allData.length; r++) {
      if (String(allData[r][3] || '').toLowerCase() === myEmail) {
        myRole = String(allData[r][2] || '');
        break;
      }
    }
    if (myRole !== 'Admin' && myRole !== 'CEO' && targetEmail !== myEmail) {
      return { success: false, error: 'ليس لديك صلاحية لتعديل كلمة مرور هذا العضو' };
    }

    // === ENSURE PASSWORD COLUMN (col 13) EXISTS ===
    var lastCol = sheet.getLastColumn();
    if (lastCol < 13) {
      sheet.getRange(1, 13, 1, 1).setValue('password');
      sheet.getRange(1, 13, 1, 1).setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
      sheet.setColumnWidth(13, 30);
      console.log('[uiSetMemberPassword] Added password column (13)');
    }

    // === FIND TARGET MEMBER & WRITE PASSWORD ===
    for (var r = 1; r < allData.length; r++) {
      if (String(allData[r][3] || '').toLowerCase() === targetEmail) {
        var rowNum = r + 1; // 1-indexed for getRange
        var hash = _hashPassword(newPassword);
        sheet.getRange(rowNum, 13, 1, 1).setValue(hash);
        console.log('[uiSetMemberPassword] Password set for ' + targetEmail + ' row=' + rowNum);
        return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
      }
    }
    return { success: false, error: 'العضو غير موجود: ' + targetEmail };

  } catch (e) {
    console.error('[uiSetMemberPassword] ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Login with email + password (for non-Google accounts).
 */
function uiLoginWithEmail(inputEmail, inputPassword) {
  try {
    inputEmail = _sanitizeEmail(inputEmail);
    if (!inputEmail) return { success: false, error: 'بريد إلكتروني غير صالح' };
    if (!inputPassword) return { success: false, error: 'كلمة المرور مطلوبة' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: false, error: 'شيت الأعضاء غير موجود' };

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var foundRow = null;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][3] || '').toLowerCase() === inputEmail) {
        foundRow = values[i];
        break;
      }
    }
    if (!foundRow) return { success: false, error: 'البريد الإلكتروني غير مسجّل' };

    // Check status
    var status = String(foundRow[5] || '');
    if (status !== 'Active') {
      return { success: false, error: 'الحساب غير مفعّل: ' + status };
    }

    // Check password (column index 12 = 0-indexed, might not exist for Gmail users)
    var storedHash = '';
    if (foundRow.length > 12) {
      storedHash = String(foundRow[12] || '');
    }
    if (!storedHash) {
      return { success: false, error: 'لا توجد كلمة مرور مسجلة. استخدم تسجيل الدخول بـ Google.' };
    }

    var inputHash = _hashPassword(inputPassword);
    if (inputHash !== storedHash) {
      return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    var role = String(foundRow[2] || 'Viewer');
    _auditLog('LOGIN_SUCCESS', inputEmail, { method: 'password' }, 'SUCCESS');

    return {
      success: true,
      member: {
        id: String(foundRow[0] || ''),
        name: String(foundRow[1] || ''),
        role: role,
        email: String(foundRow[3] || ''),
        phone: String(foundRow[4] || ''),
        status: status
      },
      permissions: _getRolePermissions(role)
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function _getRolePermissions(role) {
  if (!role) return [];
  var perms = [];
  if (typeof ROLE_PERMISSIONS === 'function') {
    try { return ROLE_PERMISSIONS(role); } catch(e) {}
  }
  if (typeof PERMISSIONS !== 'undefined') {
    var allPerms = Object.values(PERMISSIONS);
    if (role === 'Admin' || role === 'CEO') return allPerms;
    if (role === 'Partner') {
      var exclude = ['admin'];
      allPerms.forEach(function(p) { if (exclude.indexOf(p) === -1) perms.push(p); });
      return perms;
    }
  }
  return perms;
}

/**
 * Check if an email is already registered (no auth required).
 */
function uiCheckRegistrationStatus(inputEmail) {
  try {
    inputEmail = _sanitizeEmail(inputEmail);
    if (!inputEmail) return { success: false, error: 'بريد إلكتروني غير صالح' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { exists: false, canRegister: true };

    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][3] || '').toLowerCase() === inputEmail) {
        var isGmail = inputEmail.indexOf('gmail.com') !== -1;
        return {
          exists: true,
          canRegister: false,
          status: String(values[i][5] || ''),
          role: String(values[i][2] || ''),
          name: String(values[i][1] || ''),
          isGmail: isGmail
        };
      }
    }
    return { exists: false, canRegister: true };
  } catch (e) {
    return { exists: false, canRegister: true, error: e.message };
  }
}

/**
 * Register a new member — works for BOTH Gmail and non-Gmail.
 * 
 * Gmail users (detected automatically):
 *   - No password needed (Google OAuth handles auth)
 *   - Status = 'Pending' (admin approves role assignment)
 *   - Can also be called by uiQuickRegisterGmail for one-click flow
 *
 * Non-Gmail users:
 *   - Password required & hashed
 *   - Status = 'Pending' (admin must approve)
 *
 * Unified ID: MEM-XXXXXXXXX (same format as menu & UI paths)
 */
function uiRegisterNewMember(data) {
  try {
    var email = String(data.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'بريد إلكتروني غير صالح' };
    }
    var fullName = String(data.fullName || data.name || '').trim();
    if (!fullName) return { success: false, error: 'الاسم مطلوب' };

    // Role: prevent self-registration as Admin/CEO
    var role = String(data.role || 'Operations').trim();
    if (role === 'Admin' || role === 'CEO') {
      return { success: false, error: 'لا يمكن التسجيل كـ ' + role + '. تواصل مع المدير.' };
    }
    // Normalize role to Title Case
    role = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

    var phone = String(data.phone || '').trim();
    var notes = String(data.notes || '').trim();

    // Detect Gmail
    var isGmail = (email.indexOf('gmail.com') !== -1);
    var passwordHash = '';
    if (!isGmail) {
      if (!data.password || String(data.password).length < 4) {
        return { success: false, error: 'كلمة المرور مطلوبة (4 أحرف على الأقل)' };
      }
      passwordHash = _hashPassword(String(data.password));
    }

    // Get sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: false, error: 'شيت الأعضاء غير موجود' };

    // Ensure 13 columns
    _ensureMembers13Cols(sheet);

    // Check duplicate
    var existing = sheet.getDataRange().getValues();
    for (var i = 1; i < existing.length; i++) {
      if (String(existing[i][3] || '').toLowerCase() === email) {
        var existingStatus = String(existing[i][5] || '');
        return {
          success: false,
          error: 'هذا البريد مسجّل مسبقاً (الحالة: ' + existingStatus + ')',
          exists: true,
          status: existingStatus
        };
      }
    }

    // Build row using unified builder
    var memberId = _generateMemberId();
    var row = _buildMemberRow(memberId, fullName, role, email, phone, 'Pending', notes, passwordHash);

    sheet.appendRow(row);
    console.log('[uiRegisterNewMember] Created ' + memberId + ' (' + email + ') isGmail=' + isGmail);

    return {
      success: true,
      id: memberId,
      isGmail: isGmail,
      message: isGmail
        ? 'تم تسجيل طلب الانضمام بـ Gmail. في انتظار موافقة المدير.'
        : 'تم التسجيل بنجاح. في انتظار موافقة المدير.'
    };
  } catch (e) {
    console.error('[uiRegisterNewMember] ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Quick registration for Gmail users already authenticated via Google OAuth.
 * Called from the web app when a Gmail user is not yet in the system.
 * No password needed — Google is the identity provider.
 */
function uiQuickRegisterGmail(data) {
  try {
    // Verify the caller is actually authenticated as this Gmail user
    var googleEmail = '';
    try { googleEmail = Session.getActiveUser().getEmail().toLowerCase(); } catch(e) {}
    if (!googleEmail) return { success: false, error: 'غير مسجل الدخول بـ Google' };

    var inputEmail = String(data.email || '').trim().toLowerCase();
    if (inputEmail && inputEmail !== googleEmail) {
      return { success: false, error: 'البريد لا يتطابق مع حساب Google المسجل' };
    }

    // Use Google email as the registration email
    data.email = googleEmail;
    data.isGmailAuto = true;

    return uiRegisterNewMember(data);
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Check if an email is already registered (no auth required).
 */
function uiGetPendingRegistrations() {
  try {
    _checkRateLimit('uiGetPendingRegistrations');
    _requireAuth(PERMISSIONS.MEMBERS_READ);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: true, data: [] };

    var values = sheet.getDataRange().getValues();
    var pending = [];
    for (var i = 1; i < values.length; i++) {
      var row = _safeRow(values[i]);
      if (String(row[5] || '') === 'Pending') {
        pending.push({
          id: _safeString(row[0]),
          name: _safeString(row[1]),
          role: _safeString(row[2]),
          email: _safeString(row[3]),
          phone: _safeString(row[4]),
          status: 'Pending',
          joinDate: _safeString(row[6])
        });
      }
    }
    return { success: true, data: pending };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Approve a pending registration (Admin/CEO only).
 */
function uiApproveMemberRegistration(targetEmail, approvedRole) {
  try {
    _checkRateLimit('uiApproveMemberRegistration');
    var member = _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var myRole = String(member[MEMBER_COL.ROLE] || '');
    if (myRole !== 'Admin' && myRole !== 'CEO') {
      return { success: false, error: 'ليس لديك صلاحية للموافقة على التسجيلات' };
    }

    targetEmail = _sanitizeEmail(targetEmail);
    if (!targetEmail) return { success: false, error: 'بريد إلكتروني غير صالح' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: false, error: 'شيت الأعضاء غير موجود' };

    var values = sheet.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][3] || '').toLowerCase() === targetEmail) {
        foundRow = i + 1;
        break;
      }
    }
    if (foundRow < 0) return { success: false, error: 'العضو غير موجود' };

    // Set status to Active
    sheet.getRange(foundRow, 6, 1, 1).setValue('Active');

    // Optionally change role
    if (approvedRole) {
      sheet.getRange(foundRow, 3, 1, 1).setValue(approvedRole);
    }

    _auditLog('MEMBER_APPROVED', targetEmail, { role: approvedRole }, 'SUCCESS');
    return { success: true, message: 'تم قبول العضو: ' + targetEmail };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Reject a pending registration (Admin/CEO only).
 */
function uiRejectMemberRegistration(targetEmail, reason) {
  try {
    _checkRateLimit('uiRejectMemberRegistration');
    var member = _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var myRole = String(member[MEMBER_COL.ROLE] || '');
    if (myRole !== 'Admin' && myRole !== 'CEO') {
      return { success: false, error: 'ليس لديك صلاحية لرفض التسجيلات' };
    }

    targetEmail = _sanitizeEmail(targetEmail);
    if (!targetEmail) return { success: false, error: 'بريد إلكتروني غير صالح' };

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: false, error: 'شيت الأعضاء غير موجود' };

    var values = sheet.getDataRange().getValues();
    var foundRow = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][3] || '').toLowerCase() === targetEmail) {
        foundRow = i + 1;
        break;
      }
    }
    if (foundRow < 0) return { success: false, error: 'العضو غير موجود' };

    // Set status to Rejected
    sheet.getRange(foundRow, 6, 1, 1).setValue('Rejected');

    // Append reason to notes (column 12, 1-indexed)
    if (reason) {
      var currentNotes = String(sheet.getRange(foundRow, 12, 1, 1).getValue() || '');
      var newNotes = currentNotes ? currentNotes + '\n[مرفوض: ' + reason + ']' : '[مرفوض: ' + reason + ']';
      sheet.getRange(foundRow, 12, 1, 1).setValue(newNotes);
    }

    _auditLog('MEMBER_REJECTED', targetEmail, { reason: reason }, 'SUCCESS');
    return { success: true, message: 'تم رفض العضو: ' + targetEmail };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * SAFE version of getCurrentMember — reads Members sheet directly
 * Sanitizes all values to prevent "illegal value in property" errors
 */
// ─── DASHBOARD CACHE (1 hour) ───
var _dashboardCache = { ts: 0, data: null };

// ═══════════════════════════════════════════════════════
// KPI APIs
// ═══════════════════════════════════════════════════════

function uiGetDashboardKpis() {
  try {
    _checkRateLimit("uiGetDashboardKpis");
    _requireAuth(PERMISSIONS.KPI_READ);
    // Cache: return cached result if less than 1 hour old
    var now = Date.now();
    if (_dashboardCache.data && (now - _dashboardCache.ts) < 3600000) {
      return _dashboardCache.data;
    }
    var dashboard = KpiService.getDashboardKpis();
    var result = { success: true, data: dashboard };
    _dashboardCache = { ts: now, data: result };
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetKpiHistory(kpiId, limit) {
  try {
    _checkRateLimit("uiGetKpiHistory");
    _requireAuth(PERMISSIONS.KPI_READ);
    var history = KpiService.getKpiHistory(kpiId, limit || 12);
    return { success: true, data: history };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateCategory(category, periodType, refDate) {
  try {
    _checkRateLimit("uiCalculateCategory");
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateCategory(category, periodType, refDate);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateAll(periodType, refDate) {
  try {
    _checkRateLimit("uiCalculateAll");
    _requireAuth(PERMISSIONS.KPI_READ);
    var results = KpiService.calculateAll(periodType, refDate);
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// CUSTOMER APIs
// ============================================================

function uiGetCustomers(options) {
  try {
    _checkRateLimit("uiGetCustomers");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var result = CustomerService.getCustomers(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomer(id) {
  try {
    _checkRateLimit("uiGetCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid customer ID");
    var customer = CustomerService.getCustomer(safeId);
    return { success: true, data: customer };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetCustomerStats() {
  try {
    _checkRateLimit("uiGetCustomerStats");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var stats = CustomerService.getCustomerStats();
    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateCustomer(data) {
  try {
    _checkRateLimit("uiCreateCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    if (data && data.name) data.name = _sanitizeInput(data.name);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = CustomerService.createCustomer(data);
    _auditLog("CUSTOMER_CREATE", id, { name: data && data.name }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("CUSTOMER_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateCustomer(id, data) {
  try {
    _checkRateLimit("uiUpdateCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid customer ID");
    if (data && data.name) data.name = _sanitizeInput(data.name);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var updated = CustomerService.updateCustomer(safeId, data);
    _auditLog("CUSTOMER_UPDATE", safeId, { name: data && data.name }, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("CUSTOMER_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteCustomer(id) {
  try {
    _checkRateLimit("uiDeleteCustomer");
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid customer ID");
    CustomerService.deleteCustomer(safeId);
    _auditLog("CUSTOMER_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("CUSTOMER_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiSyncCustomers() {
  try {
    _checkRateLimit("uiSyncCustomers");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var result = CustomerService.syncFromOrders();
    _auditLog("CUSTOMER_SYNC", "", { count: result && result.length }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("CUSTOMER_SYNC", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// SATISFACTION APIs
// ============================================================

function uiGetSatisfactionRecords(options) {
  try {
    _checkRateLimit("uiGetSatisfactionRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = SatisfactionService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSatisfactionStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetSatisfactionStats");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var avg = SatisfactionService.getAverageScore(startDate, endDate);
    var count = SatisfactionService.getCount(startDate, endDate);
    var records = SatisfactionService.getByDateRange(startDate, endDate);
    return { success: true, data: { average: avg, count: count, records: records } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSatisfaction(data) {
  try {
    _checkRateLimit("uiCreateSatisfaction");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = SatisfactionService.createSatisfaction(data);
    _auditLog("SATISFACTION_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("SATISFACTION_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// NPS APIs
// ============================================================

function uiGetNPSRecords(options) {
  try {
    _checkRateLimit("uiGetNPSRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = NPSService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetNPSStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetNPSStats");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var nps = NPSService.getNPS(startDate, endDate);
    var breakdown = NPSService.getBreakdown(startDate, endDate);
    var count = NPSService.getCount(startDate, endDate);
    return { success: true, data: { nps: nps, breakdown: breakdown, count: count } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateNPS(data) {
  try {
    _checkRateLimit("uiCreateNPS");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.feedback) data.feedback = _sanitizeInput(data.feedback);
    var id = NPSService.createNPS(data);
    _auditLog("NPS_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("NPS_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// TASK APIs
// ============================================================

function uiGetTasks(options) {
  try {
    _checkRateLimit("uiGetTasks");
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasks(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTasksByDateRange(startDate, endDate) {
  try {
    _checkRateLimit("uiGetTasksByDateRange");
    _requireAuth(PERMISSIONS.TASKS_READ);
    var result = TaskService.getTasksByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetTaskStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetTaskStats");
    _requireAuth(PERMISSIONS.TASKS_READ);
    var completed = TaskService.getCompletedTasksByDateRange(startDate, endDate);
    var overdue = TaskService.getOverdueTasks(startDate, endDate);
    var avgTime = TaskService.getAverageCompletionTime(startDate, endDate);
    var onTimeRate = TaskService.getOnTimeRate(startDate, endDate);
    var avgQuality = TaskService.getAverageQuality(startDate, endDate);
    var all = TaskService.getTasksByDateRange(startDate, endDate);
    return {
      success: true,
      data: {
        completed: completed && completed.data ? completed.data.length : 0,
        overdue: overdue && overdue.data ? overdue.data.length : 0,
        avgCompletionTime: avgTime,
        onTimeRate: onTimeRate,
        avgQuality: avgQuality,
        total: all && all.data ? all.data.length : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateTask(data) {
  try {
    _checkRateLimit("uiCreateTask");
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    if (data && data.title) data.title = _sanitizeInput(data.title);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    var id = TaskService.createTask(data);
    _auditLog("TASK_CREATE", id, { title: data && data.title }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("TASK_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateTask(id, data) {
  try {
    _checkRateLimit("uiUpdateTask");
    _requireAuth(PERMISSIONS.TASKS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    if (data && data.title) data.title = _sanitizeInput(data.title);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    var updated = TaskService.updateTask(safeId, data);
    _auditLog("TASK_UPDATE", safeId, { title: data && data.title }, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("TASK_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteTask(id) {
  try {
    _checkRateLimit("uiDeleteTask");
    _requireAuth(PERMISSIONS.TASKS_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    TaskService.deleteTask(safeId);
    _auditLog("TASK_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("TASK_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiApproveTask(id) {
  try {
    _checkRateLimit("uiApproveTask");
    _requireAuth(PERMISSIONS.TASKS_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    var result = TaskService.approveTask(safeId);
    _auditLog("TASK_APPROVE", safeId, {}, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("TASK_APPROVE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRejectTask(id, reason) {
  try {
    _checkRateLimit("uiRejectTask");
    _requireAuth(PERMISSIONS.TASKS_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid task ID");
    var safeReason = _sanitizeInput(reason);
    var result = TaskService.rejectTask(safeId, safeReason);
    _auditLog("TASK_REJECT", safeId, { reason: safeReason }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("TASK_REJECT", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// MEMBER APIs
// ============================================================

function uiGetMembers() {
  try {
    _checkRateLimit("uiGetMembers");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var members = Members.getMembers();
    return { success: true, data: members };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMemberStats() {
  try {
    _checkRateLimit("uiGetMemberStats");
    _requireAuth(PERMISSIONS.MEMBERS_READ);
    var total = Members.totalMembers();
    var active = Members.activeMembers();
    return { success: true, data: { total: total, active: active.length } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAddMember(data) {
  try {
    // Auth check (self-contained, no BaseRepository)
    var myEmail = '';
    try { myEmail = Session.getActiveUser().getEmail().toLowerCase(); } catch(e) {}
    if (!myEmail) return { success: false, error: 'غير مسجل الدخول' };

    var fullName = String(data.fullName || data.name || '').trim();
    if (!fullName) return { success: false, error: 'الاسم مطلوب' };
    var email = String(data.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'بريد إلكتروني غير صالح' };
    }
    var role = String(data.role || 'Operations').trim();
    // Normalize role to Title Case
    role = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    var phone = String(data.phone || '').trim();
    var notes = String(data.notes || '').trim();
    var password = String(data.password || '').trim();
    var passwordHash = password ? _hashPassword(password) : '';

    // Get sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) return { success: false, error: 'شيت الأعضاء غير موجود' };

    // Ensure 13 columns
    _ensureMembers13Cols(sheet);

    // Check duplicate
    var existing = sheet.getDataRange().getValues();
    for (var i = 1; i < existing.length; i++) {
      if (String(existing[i][3] || '').toLowerCase() === email) {
        return { success: false, error: 'هذا البريد مسجّل مسبقاً' };
      }
    }

    // Check Admin/CEO limit
    if (role === 'Admin' || role === 'CEO') {
      var count = 0;
      for (var j = 1; j < existing.length; j++) {
        if (String(existing[j][2] || '') === role) count++;
      }
      if (count >= 1) return { success: false, error: 'يوجد ' + role + ' واحد بالفعل' };
    }

    // Build row using unified builder
    var memberId = _generateMemberId();
    var row = _buildMemberRow(memberId, fullName, role, email, phone, 'Active', notes, passwordHash);

    sheet.appendRow(row);
    console.log('[uiAddMember] Created ' + memberId + ' (' + email + ') by ' + myEmail);

    return { success: true, id: memberId };
  } catch (e) {
    console.error('[uiAddMember] ' + e.message);
    return { success: false, error: e.message };
  }
}

function uiUpdateMember(id, data) {
  try {
    _checkRateLimit("uiUpdateMember");
    _requireAuth(PERMISSIONS.MEMBERS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid member ID");
    if (data && data.fullName) data.fullName = _sanitizeInput(data.fullName);
    if (data && data.email) data.email = _sanitizeEmail(data.email);
    if (data && data.phone) data.phone = _sanitizeInput(data.phone);
    var limitErr = _checkAdminCEOLimit(data.role, safeId);
    if (limitErr) throw new Error(limitErr);
    Members.updateMember(safeId, data);
    _auditLog("MEMBER_UPDATE", safeId, { role: data && data.role }, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("MEMBER_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteMember(id) {
  try {
    _checkRateLimit("uiDeleteMember");
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid member ID");
    Members.deleteMember(safeId);
    _auditLog("MEMBER_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("MEMBER_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function _checkAdminCEOLimit(role, excludeId) {
  if (role !== "Admin" && role !== "CEO") return null;
  var all = Members.getMembers();
  for (var i = 0; i < all.length; i++) {
    var m = all[i];
    if (excludeId && String(m[MEMBER_COL.MEMBER_ID]) === String(excludeId)) continue;
    if (m[MEMBER_COL.ROLE] === role) return "Cannot have more than one " + role;
  }
  return null;
}

// ============================================================
// SALE APIs
// ============================================================

function uiGetSales(options) {
  try {
    _checkRateLimit("uiGetSales");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSales(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSalesByDateRange(startDate, endDate) {
  try {
    _checkRateLimit("uiGetSalesByDateRange");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = SaleService.getSalesByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSale(data) {
  try {
    _checkRateLimit("uiCreateSale");
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = SaleService.createSale(data);
    _auditLog("SALE_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("SALE_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// ORDER APIs
// ============================================================

function uiGetOrders(options) {
  try {
    _checkRateLimit("uiGetOrders");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrders(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOrdersByDateRange(startDate, endDate) {
  try {
    _checkRateLimit("uiGetOrdersByDateRange");
    _requireAuth(PERMISSIONS.ORDERS_READ);
    var result = OrderService.getOrdersByDateRange(startDate, endDate);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateOrder(data) {
  try {
    _checkRateLimit("uiCreateOrder");
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = OrderService.createOrder(data);
    _auditLog("ORDER_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("ORDER_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateOrderStatus(id, status) {
  try {
    _checkRateLimit("uiUpdateOrderStatus");
    _requireAuth(PERMISSIONS.ORDERS_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid order ID");
    var safeStatus = _sanitizeInput(status);
    var result;
    if (safeStatus === "Confirmed") result = OrderService.confirmOrder(safeId);
    else if (safeStatus === "Shipped") result = OrderService.shipOrder(safeId);
    else if (safeStatus === "Delivered") result = OrderService.deliverOrder(safeId);
    else if (safeStatus === "Cancelled") result = OrderService.cancelOrder(safeId);
    else throw new Error("Invalid status: " + safeStatus);
    _auditLog("ORDER_STATUS_UPDATE", safeId, { status: safeStatus }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("ORDER_STATUS_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// FINANCE APIs
// ============================================================

function uiGetFinanceStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetFinanceStats");
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var pnl = FinanceService.getProfitAndLoss(startDate, endDate);
    var cashFlow = FinanceService.getCashFlow(startDate, endDate);
    var cashBalance = FinanceService.getCashBalance("Cash", endDate);
    return { success: true, data: { pnl: pnl, cashFlow: cashFlow, cashBalance: cashBalance } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLedger(options) {
  try {
    _checkRateLimit("uiGetLedger");
    _requireAuth(PERMISSIONS.FINANCE_READ);
    var result = FinanceService.getLedger(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// INVENTORY APIs
// ============================================================

function uiGetInventory(options) {
  try {
    _checkRateLimit("uiGetInventory");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getItems(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetInventoryStats() {
  try {
    _checkRateLimit("uiGetInventoryStats");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var total = InventoryService.totalItems();
    var lowStock = InventoryService.getLowStockItems();
    var outOfStock = InventoryService.getOutOfStockItems();
    var value = InventoryService.getInventoryValue();
    var retailValue = InventoryService.getInventoryRetailValue();
    return {
      success: true,
      data: {
        total: total,
        lowStock: lowStock && lowStock.data ? lowStock.data.length : 0,
        outOfStock: outOfStock && outOfStock.data ? outOfStock.data.length : 0,
        value: value,
        retailValue: retailValue
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateInventoryItem(data) {
  try {
    _checkRateLimit("uiCreateInventoryItem");
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (data && data.name) data.name = _sanitizeInput(data.name);
    if (data && data.sku) data.sku = _sanitizeInput(data.sku);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    var id = InventoryService.createItem(data);
    _auditLog("INVENTORY_CREATE", id, { sku: data && data.sku }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("INVENTORY_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiCreateInventory(data) {
  return uiCreateInventoryItem(data);
}

// ============================================================
// INVENTORY APIs — PHASE 3D EXTENSIONS
// ============================================================

function uiGetStockMovements(sku, options) {
  try {
    _checkRateLimit("uiGetStockMovements");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    if (!sku) throw new Error("SKU required");
    var safeSku = _sanitizeInput(sku);
    var movements = StockMovementService.getMovementsBySku(safeSku);
    return { success: true, data: movements };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAdjustStock(data) {
  try {
    _checkRateLimit("uiAdjustStock");
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.inventoryId || data.newQuantity === undefined || !data.reason) {
      throw new Error("inventoryId, newQuantity, and reason required");
    }
    var safeReason = _sanitizeInput(data.reason);
    var safeNotes = data.notes ? _sanitizeInput(data.notes) : "";
    var result = InventoryService.adjustStock(
      data.inventoryId,
      data.newQuantity,
      safeReason,
      safeNotes
    );
    _auditLog("STOCK_ADJUST", data.inventoryId, { qty: data.newQuantity, reason: safeReason }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("STOCK_ADJUST", data && data.inventoryId, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRestockStock(data) {
  try {
    _checkRateLimit("uiRestockStock");
    _requireAuth(PERMISSIONS.INVENTORY_WRITE);
    if (!data || !data.sku || !data.qty) throw new Error("SKU and quantity required");
    var safeSku = _sanitizeInput(data.sku);
    var refId = data.referenceId ? _sanitizeInput(data.referenceId) : "";
    InventoryService.restock(safeSku, data.qty, "UI_RESTOCK", refId);
    _auditLog("STOCK_RESTOCK", safeSku, { qty: data.qty }, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("STOCK_RESTOCK", data && data.sku, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// BOM APIs
// ============================================================

function uiGetBOM(sku) {
  try {
    _checkRateLimit("uiGetBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!sku) throw new Error("SKU required");
    var safeSku = _sanitizeInput(sku);
    var bom = BOMService.getBOMByFinishedProductSku(safeSku);
    return { success: true, data: bom };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetBOMItems(bomId) {
  try {
    _checkRateLimit("uiGetBOMItems");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!bomId) throw new Error("bomId required");
    var safeId = _sanitizeId(bomId);
    if (!safeId) throw new Error("Invalid bomId");
    var items = BOMService.getBOMItems(safeId);
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateBOM(data) {
  try {
    _checkRateLimit("uiCreateBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!data) throw new Error("BOM data required");
    if (data.name) data.name = _sanitizeInput(data.name);
    if (data.sku) data.sku = _sanitizeInput(data.sku);
    var id = BOMService.createBOM(data);
    _auditLog("BOM_CREATE", id, { name: data.name }, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("BOM_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateBOM(id, data) {
  try {
    _checkRateLimit("uiUpdateBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM ID");
    if (data && data.name) data.name = _sanitizeInput(data.name);
    var updated = BOMService.updateBOM(safeId, data);
    _auditLog("BOM_UPDATE", safeId, {}, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("BOM_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteBOM(id) {
  try {
    _checkRateLimit("uiDeleteBOM");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM ID");
    BOMService.deleteBOM(safeId);
    _auditLog("BOM_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("BOM_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiAddBOMItem(bomId, data) {
  try {
    _checkRateLimit("uiAddBOMItem");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!bomId) throw new Error("bomId required");
    var safeId = _sanitizeId(bomId);
    if (!safeId) throw new Error("Invalid bomId");
    var id = BOMService.addBOMItem(safeId, data);
    _auditLog("BOM_ITEM_ADD", safeId, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("BOM_ITEM_ADD", bomId, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiUpdateBOMItem(id, data) {
  try {
    _checkRateLimit("uiUpdateBOMItem");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM Item ID");
    var updated = BOMService.updateBOMItem(safeId, data);
    _auditLog("BOM_ITEM_UPDATE", safeId, {}, "SUCCESS");
    return { success: true, data: updated };
  } catch (e) {
    _auditLog("BOM_ITEM_UPDATE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRemoveBOMItem(id) {
  try {
    _checkRateLimit("uiRemoveBOMItem");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_MANAGE);
    if (!id) throw new Error("BOM Item ID required");
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid BOM Item ID");
    BOMService.removeBOMItem(safeId);
    _auditLog("BOM_ITEM_REMOVE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("BOM_ITEM_REMOVE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiCalculateCost(productId) {
  try {
    _checkRateLimit("uiCalculateCost");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var safeId = _sanitizeId(productId);
    if (!safeId) throw new Error("Invalid productId");
    var result = BOMService.calculateUnitCost(safeId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCalculateMargin(productId) {
  try {
    _checkRateLimit("uiCalculateMargin");
    _requireAuth(PERMISSIONS.INVENTORY_BOM_READ);
    if (!productId) throw new Error("productId required");
    var safeId = _sanitizeId(productId);
    if (!safeId) throw new Error("Invalid productId");
    var result = BOMService.calculateGrossMargin(safeId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetLowStock() {
  try {
    _checkRateLimit("uiGetLowStock");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getLowStockItems();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetOutOfStock() {
  try {
    _checkRateLimit("uiGetOutOfStock");
    _requireAuth(PERMISSIONS.INVENTORY_READ);
    var result = InventoryService.getOutOfStockItems();
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// EXPENSE APIs
// ============================================================

function uiGetExpenses(options) {
  try {
    _checkRateLimit("uiGetExpenses");
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var result = FinanceRepository.findAllExpenses(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetExpense(id) {
  try {
    _checkRateLimit("uiGetExpense");
    _requireAuth(PERMISSIONS.EXPENSES_READ);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var result = FinanceRepository.findExpenseById(safeId);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateExpense(data) {
  try {
    _checkRateLimit("uiCreateExpense");
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    if (data && data.description) data.description = _sanitizeInput(data.description);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = FinanceService.createExpenseRequest(data);
    _auditLog("EXPENSE_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("EXPENSE_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiSubmitExpense(id) {
  try {
    _checkRateLimit("uiSubmitExpense");
    _requireAuth(PERMISSIONS.EXPENSES_WRITE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var result = FinanceService.submitExpenseRequest(safeId);
    _auditLog("EXPENSE_SUBMIT", safeId, {}, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_SUBMIT", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiApproveExpense(id) {
  try {
    _checkRateLimit("uiApproveExpense");
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var result = FinanceService.approveExpenseRequest(safeId);
    _auditLog("EXPENSE_APPROVE", safeId, {}, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_APPROVE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiRejectExpense(id, reason) {
  try {
    _checkRateLimit("uiRejectExpense");
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var safeReason = _sanitizeInput(reason);
    var result = FinanceService.rejectExpenseRequest(safeId, safeReason);
    _auditLog("EXPENSE_REJECT", safeId, { reason: safeReason }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_REJECT", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiPostExpense(id, account) {
  try {
    _checkRateLimit("uiPostExpense");
    _requireAuth(PERMISSIONS.EXPENSES_APPROVE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    var safeAccount = _sanitizeInput(account);
    var result = FinanceService.postExpenseToLedger(safeId, safeAccount);
    _auditLog("EXPENSE_POST", safeId, { account: safeAccount }, "SUCCESS");
    return { success: true, data: result };
  } catch (e) {
    _auditLog("EXPENSE_POST", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

function uiDeleteExpense(id) {
  try {
    _checkRateLimit("uiDeleteExpense");
    _requireAuth(PERMISSIONS.EXPENSES_DELETE);
    var safeId = _sanitizeId(id);
    if (!safeId) throw new Error("Invalid expense ID");
    FinanceService.deleteExpenseRequest(safeId);
    _auditLog("EXPENSE_DELETE", safeId, {}, "SUCCESS");
    return { success: true };
  } catch (e) {
    _auditLog("EXPENSE_DELETE", id, { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// MARKETING APIs
// ============================================================

function uiGetMarketingRecords(options) {
  try {
    _checkRateLimit("uiGetMarketingRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = MktService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetMarketingStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetMarketingStats");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var spend = MktService.getTotalSpend(startDate, endDate);
    var impressions = MktService.getTotalImpressions(startDate, endDate);
    var reach = MktService.getTotalReach(startDate, endDate);
    var clicks = MktService.getTotalClicks(startDate, endDate);
    var leads = MktService.getTotalLeads(startDate, endDate);
    var conversions = MktService.getTotalConversions(startDate, endDate);
    var revenue = MktService.getTotalAttributedRevenue(startDate, endDate);
    var cost = MktService.getTotalCost(startDate, endDate);
    return {
      success: true,
      data: {
        spend: spend,
        impressions: impressions,
        reach: reach,
        clicks: clicks,
        leads: leads,
        conversions: conversions,
        revenue: revenue,
        cost: cost,
        roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateMarketingRecord(data) {
  try {
    _checkRateLimit("uiCreateMarketingRecord");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.campaignName) data.campaignName = _sanitizeInput(data.campaignName);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = MktService.createRecord(data);
    _auditLog("MARKETING_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("MARKETING_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// SOCIAL MEDIA APIs
// ============================================================

function uiGetSocialRecords(options) {
  try {
    _checkRateLimit("uiGetSocialRecords");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var result = SocService.getRecords(options || { limit: 1000 });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetSocialStats(startDate, endDate) {
  try {
    _checkRateLimit("uiGetSocialStats");
    _requireAuth(PERMISSIONS.REPORTS_READ);
    var followers = SocService.getFollowersAtDate(endDate);
    var reach = SocService.getTotalReach(startDate, endDate);
    var impressions = SocService.getTotalImpressions(startDate, endDate);
    var engagements = SocService.getTotalEngagements(startDate, endDate);
    var likes = SocService.getTotalLikes(startDate, endDate);
    var comments = SocService.getTotalComments(startDate, endDate);
    var shares = SocService.getTotalShares(startDate, endDate);
    var saves = SocService.getTotalSaves(startDate, endDate);
    var videoViews = SocService.getTotalVideoViews(startDate, endDate);
    var profileVisits = SocService.getTotalProfileVisits(startDate, endDate);
    var linkClicks = SocService.getTotalLinkClicks(startDate, endDate);
    var leads = SocService.getTotalLeads(startDate, endDate);
    var purchases = SocService.getTotalPurchases(startDate, endDate);
    var revenue = SocService.getTotalAttributedRevenue(startDate, endDate);
    return {
      success: true,
      data: {
        followers: followers,
        reach: reach,
        impressions: impressions,
        engagements: engagements,
        likes: likes,
        comments: comments,
        shares: shares,
        saves: saves,
        videoViews: videoViews,
        profileVisits: profileVisits,
        linkClicks: linkClicks,
        leads: leads,
        purchases: purchases,
        revenue: revenue,
        engagementRate: impressions > 0 ? Math.round((engagements / impressions) * 10000) / 100 : 0
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateSocialRecord(data) {
  try {
    _checkRateLimit("uiCreateSocialRecord");
    _requireAuth(PERMISSIONS.REPORTS_WRITE);
    if (data && data.caption) data.caption = _sanitizeInput(data.caption);
    if (data && data.notes) data.notes = _sanitizeInput(data.notes);
    var id = SocService.createRecord(data);
    _auditLog("SOCIAL_CREATE", id, {}, "SUCCESS");
    return { success: true, id: id };
  } catch (e) {
    _auditLog("SOCIAL_CREATE", "", { error: e.message }, "FAILED");
    return { success: false, error: e.message };
  }
}

// ============================================================
// KPI EXTENDED API (NEW)
// ============================================================

function uiGetKPIs(params) {
  try {
    _checkRateLimit("uiGetKPIs");
    _requireAuth(PERMISSIONS.KPI_READ);
    var p = params || {};
    var period = (p.period || "MONTHLY").toUpperCase();
    var refDate = p.refDate || new Date().toISOString().split("T")[0];
    var periodType = period === "MONTHLY" ? "MONTHLY" : period === "QUARTERLY" ? "QUARTERLY" : "YEARLY";
    var kpis = KpiService.calculateAll(periodType, refDate);
    var finStats = FinanceService.getProfitAndLoss(refDate, refDate);
    var finData = finStats || null;
    var revenue = (finData && finData.revenue) ? finData.revenue : 0;
    var operatingExpenses = (finData && finData.operatingExpenses) ? finData.operatingExpenses : 0;
    var netProfit = (finData && finData.netProfit) ? finData.netProfit : (revenue - operatingExpenses);
    var result = {
      period: period,
      refDate: refDate,
      kpis: kpis && kpis.success ? kpis.data : [],
      summary: { revenue: revenue, expenses: operatingExpenses, netProfit: netProfit }
    };
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// LAUNCH UI — NO BUSINESS PERMISSIONS REQUIRED
// ============================================================

function showPhinoxDashboard() {
  var html = HtmlService.createHtmlOutputFromFile("UI_Index")
    .setTitle("PHINOX BOS Dashboard")
    .setWidth(1280)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, "PHINOX BOS");
}

function showPhinoxDashboardSidebar() {
  var html = HtmlService.createHtmlOutputFromFile("UI_Index")
    .setTitle("PHINOX BOS")
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}
function _handleDoGetInternal(e) {
  var page = e.parameter ? (e.parameter.page || "index") : "index";
  if (page === "index" || page === "dashboard") {
    return HtmlService.createHtmlOutputFromFile("UI_Index")
      .setTitle("PHINOX BOS")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (page === "login") {
    return HtmlService.createHtmlOutput("<h2>Login Page</h2>");
  }
  return HtmlService.createHtmlOutputFromFile("UI_Index")
    .setTitle("PHINOX BOS")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
