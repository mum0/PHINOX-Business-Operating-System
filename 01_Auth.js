/**
 * Auth System — Core Authentication
 * PHINOX BOS v5
 *
 * المسؤوليات:
 *   - تسجيل الدخول (بريد + كلمة مرور / Google OAuth)
 *   - تسجيل مستخدم جديد
 *   - إعادة تعيين كلمة المرور
 *   - تسجيل الخروج
 *
 * يعتمد على:
 *   - 13_Permissions.js (MEMBER_COL, getCurrentMember, logActivity)
 *   - 02_AuthSession.js (إدارة الجلسات)
 *   - 03_AuthPassword.js (تشفير كلمة المرور)
 *
 * ⚠️ ملاحظة مهمة حول GAS:
 *   في نشر GAS كـ "Execute as: User accessing"، توفر Google
 *   المصادقة تلقائياً عبر Session.getActiveUser(). هذا النظام
 *   مفيد عندما:
 *     1. تريد نشر التطبيق كـ "Execute as: Me" (المطور)
 *     2. تريد دعم مستخدمين بدون حسابات Google
 *     3. تريد إضافة طبقة حماية إضافية فوق Google Auth
 */

var Auth = (function() {
  'use strict';

  // ─── ثوابت ───────────────────────────────────────

  var MEMBERS_SHEET = 'Members';
  var MIN_PASSWORD_LENGTH = 6;
  var MAX_PASSWORD_LENGTH = 128;

  // ─── تسجيل الدخول بالبريد وكلمة المرور ─────────────

  /**
   * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
   * @param {string} email
   * @param {string} password
   * @returns {object} { success, token, user }
   */
  function loginWithEmail(email, password) {
    // 1. التحقق من المدخلات
    if (!email || !password) {
      throw new Error('AUTH_MISSING_CREDENTIALS: البريد الإلكتروني وكلمة المرور مطلوبان');
    }

    email = email.trim().toLowerCase();

    // 2. التحقق من القفل
    if (AuthSession.isLocked(email)) {
      Logger.warn('Auth', 'Locked account login attempt', { email: email });
      throw new Error('AUTH_ACCOUNT_LOCKED: الحساب مقفل مؤقتاً بسبب 5 محاولات فاشلة. حاول بعد 30 دقيقة');
    }

    // 3. البحث عن العضو
    var member = _findMemberByEmail(email);
    if (!member) {
      AuthSession.recordFailedAttempt(email);
      throw new Error('AUTH_USER_NOT_FOUND: البريد الإلكتروني غير مسجل في النظام');
    }

    // 4. التحقق من الحالة
    var status = String(member[MEMBER_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'active') {
      throw new Error('AUTH_ACCOUNT_INACTIVE: الحساب غير نشط. تواصل مع المدير');
    }

    // 5. التحقق من وجود كلمة مرور
    var storedHash = '';
    if (typeof MEMBER_COL.PASSWORD_HASH !== 'undefined') {
      storedHash = String(member[MEMBER_COL.PASSWORD_HASH] || '').trim();
    }

    if (!storedHash) {
      throw new Error('AUTH_NO_PASSWORD: لم يتم تعيين كلمة مرور لهذا الحساب. استخدم تسجيل الدخول عبر Google أو اطلب من المدير تعيين كلمة مرور');
    }

    // 6. التحقق من كلمة المرور
    var isValid = AuthPassword.verify(password, storedHash);
    if (!isValid) {
      var attemptInfo = AuthSession.recordFailedAttempt(email);
      Logger.warn('Auth', 'Failed login attempt', {
        email: email,
        attempt: attemptInfo.attempts,
        remaining: attemptInfo.remaining
      });

      if (attemptInfo.isLocked) {
        throw new Error('AUTH_ACCOUNT_LOCKED: تم قفل الحساب بعد 5 محاولات فاشلة. حاول بعد 30 دقيقة');
      }

      throw new Error('AUTH_WRONG_PASSWORD: كلمة المرور غير صحيحة. محاولات متبقية: ' + attemptInfo.remaining);
    }

    // 7. مسح المحاولات الفاشلة وإنشاء الجلسة
    AuthSession.clearFailedAttempts(email);
    var memberId = String(member[MEMBER_COL.MEMBER_ID] || '').trim();
    var token = AuthSession.createSession(memberId, email);

    // 8. تسجيل النشاط
    try {
      if (typeof logActivity === 'function') {
        logActivity(member, 'تسجيل دخول (كلمة مرور)', 'Auth', memberId, '', 'نجاح');
      }
    } catch(e) {}

    Logger.info('Auth', 'Login success', { email: email, role: member[MEMBER_COL.ROLE] });

    return {
      success: true,
      token: token,
      user: _memberToPublic(member)
    };
  }

  // ─── تسجيل الدخول عبر Google (المصادقة الحالية) ──────

  /**
   * تسجيل الدخول باستخدام حساب Google الحالي
   * مفيد كبديل أو كباب خلفي
   * @returns {object} { success, token, user }
   */
  function loginWithGoogle() {
    var email;
    try {
      email = Session.getActiveUser().getEmail();
    } catch(e) {
      try {
        email = Session.getEffectiveUser().getEmail();
      } catch(e2) {
        throw new Error('AUTH_NO_GOOGLE_IDENTITY: لم يتمكن النظام من الحصول على بريدك من Google');
      }
    }

    if (!email) {
      throw new Error('AUTH_NO_GOOGLE_IDENTITY: البريد الإلكتروني غير متاح');
    }

    email = email.trim().toLowerCase();
    var member = _findMemberByEmail(email);

    if (!member) {
      throw new Error('AUTH_USER_NOT_FOUND: البريد ' + email + ' غير مسجل في النظام');
    }

    var status = String(member[MEMBER_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'active') {
      throw new Error('AUTH_ACCOUNT_INACTIVE: الحساب غير نشط');
    }

    var memberId = String(member[MEMBER_COL.MEMBER_ID] || '').trim();
    var token = AuthSession.createSession(memberId, email);

    try {
      if (typeof logActivity === 'function') {
        logActivity(member, 'تسجيل دخول (Google)', 'Auth', memberId, '', 'نجاح');
      }
    } catch(e) {}

    Logger.info('Auth', 'Google login success', { email: email, role: member[MEMBER_COL.ROLE] });

    return {
      success: true,
      token: token,
      user: _memberToPublic(member)
    };
  }

  // ─── تسجيل مستخدم جديد ───────────────────────────

  /**
   * تسجيل عضو جديد في النظام
   * @param {object} data — { fullName, email, password, phone, role, department, notes }
   * @returns {object} { success, id, email }
   */
  function register(data) {
    var fullName = (data.fullName || data.name || '').trim();
    var email = (data.email || '').trim().toLowerCase();
    var password = data.password || '';
    var phone = (data.phone || '').trim();
    var role = data.role || '';
    var department = (data.department || 'General').trim();
    var notes = (data.notes || '').trim();

    // 1. التحقق من المدخلات الإلزامية
    if (!fullName) {
      throw new Error('AUTH_REGISTER_MISSING_NAME: الاسم الكامل مطلوب');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('AUTH_REGISTER_INVALID_EMAIL: بريد إلكتروني غير صالح');
    }

    // 2. التحقق من قوة كلمة المرور (إذا تم توفيرها)
    var passwordHash = '';
    if (password) {
      var strengthCheck = AuthPassword.validateStrength(password);
      if (!strengthCheck.valid) {
        throw new Error('AUTH_WEAK_PASSWORD: ' + strengthCheck.errors.join(' | '));
      }
      passwordHash = AuthPassword.hash(password);
    }

    // 3. التحقق من عدم تكرار البريد
    var existing = _findMemberByEmail(email);
    if (existing) {
      throw new Error('AUTH_EMAIL_EXISTS: هذا البريد الإلكتروني مسجل بالفعل');
    }

    // 4. التحقق من الدور (إذا تم تحديده)
    if (role) {
      ensureAppConstants();
      var validRoles = Object.values(APP.ROLES);
      if (validRoles.indexOf(role) === -1) {
        throw new Error('AUTH_INVALID_ROLE: الدور "' + role + '" غير صالح. الأدوار المتاحة: ' + validRoles.join(', '));
      }
    } else {
      role = APP.ROLES.DESIGNER; // دور افتراضي (أقل صلاحيات)
    }

    // 5. إنشاء معرف جديد
    var newId = 'MEM-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var joinDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // 6. إضافة الصف (14 عمود)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MEMBERS_SHEET);
    if (!sheet) {
      throw new Error('AUTH_NO_MEMBERS_SHEET: ورقة Members غير موجودة');
    }

    var newRow = [
      newId,          // 0  MEMBER_ID
      fullName,       // 1  FULL_NAME
      role,           // 2  ROLE
      email,          // 3  EMAIL
      phone,          // 4  PHONE
      'Active',       // 5  STATUS
      joinDate,       // 6  JOIN_DATE
      0,              // 7  KPI_SCORE
      0,              // 8  TASKS_COMPLETED
      0,              // 9  TASKS_LATE
      0,              // 10 AVERAGE_QUALITY
      notes,          // 11 NOTES
      department,     // 12 DEPARTMENT
      passwordHash    // 13 PASSWORD_HASH
    ];

    sheet.appendRow(newRow);

    // 7. تسجيل النشاط
    try {
      var member = _findMemberByEmail(email);
      if (typeof logActivity === 'function' && member) {
        logActivity(member, 'تسجيل عضو جديد', 'Auth', newId, '', role);
      }
    } catch(e) {}

    Logger.info('Auth', 'Registration success', { id: newId, email: email, role: role });

    return {
      success: true,
      id: newId,
      email: email,
      role: role,
      hasPassword: passwordHash ? true : false
    };
  }

  // ─── إعادة تعيين كلمة المرور ───────────────────────

  /**
   * طلب إعادة تعيين كلمة المرور (إرسال الرمز)
   * @param {string} email
   * @returns {object} { success, message }
   */
  function requestPasswordReset(email) {
    if (!email) {
      throw new Error('AUTH_MISSING_EMAIL: البريد الإلكتروني مطلوب');
    }

    email = email.trim().toLowerCase();
    var member = _findMemberByEmail(email);
    if (!member) {
      // لا نكشف أن البريد غير مسجل (أمان)
      return { success: true, message: 'إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق' };
    }

    var status = String(member[MEMBER_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'active') {
      return { success: true, message: 'إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق' };
    }

    // إنشاء رمز الإعادة
    var resetToken = AuthSession.createResetToken(email);

    // إرسال البريد
    var resetLink = 'https://script.google.com/macros/s/' + _getScriptId() + '/exec?action=resetPassword&token=' + resetToken;

    try {
      GmailApp.sendEmail(
        email,
        'إعادة تعيين كلمة المرور — PHINOX BOS',
        'مرحباً،\n\n' +
        'تم استلام طلب إعادة تعيين كلمة المرور.\n\n' +
        'انقر على الرابط التالي (صالح لمدة ساعة):\n' + resetLink + '\n\n' +
        'إذا لم تطلب هذا، تجاهل هذه الرسالة.\n\n' +
        'PHINOX BOS System'
      );
    } catch(e) {
      Logger.warn('Auth', 'Failed to send reset email', { email: email, error: e.message });
      // لا نوقف العملية — يمكن للمستخدم التواصل مع المدير
    }

    Logger.info('Auth', 'Password reset requested', { email: email });

    return { success: true, message: 'إذا كان البريد مسجلاً، ستصلك رسالة خلال دقائق' };
  }

  /**
   * تنفيذ إعادة تعيين كلمة المرور
   * @param {string} token — رمز الإعادة
   * @param {string} newPassword — كلمة المرور الجديدة
   * @returns {object} { success }
   */
  function confirmPasswordReset(token, newPassword) {
    // 1. التحقق من الرمز
    var resetData = AuthSession.validateResetToken(token);
    if (!resetData) {
      throw new Error('AUTH_INVALID_RESET_TOKEN: الرمز غير صالح أو منتهي الصلاحية');
    }

    // 2. التحقق من قوة الكلمة الجديدة
    var strengthCheck = AuthPassword.validateStrength(newPassword);
    if (!strengthCheck.valid) {
      throw new Error('AUTH_WEAK_PASSWORD: ' + strengthCheck.errors.join(' | '));
    }

    // 3. البحث عن العضو
    var member = _findMemberByEmail(resetData.email);
    if (!member) {
      throw new Error('AUTH_USER_NOT_FOUND: المستخدم غير موجود');
    }

    // 4. تحديث كلمة المرور
    var newHash = AuthPassword.hash(newPassword);
    _updateMemberField(
      String(member[MEMBER_COL.MEMBER_ID]),
      typeof MEMBER_COL.PASSWORD_HASH !== 'undefined' ? MEMBER_COL.PASSWORD_HASH : 13,
      newHash
    );

    // 5. حذف الرمز وتسجيل النشاط
    AuthSession.destroyResetToken(token);
    AuthSession.clearFailedAttempts(resetData.email);

    try {
      if (typeof logActivity === 'function') {
        logActivity(member, 'إعادة تعيين كلمة المرور', 'Auth', String(member[MEMBER_COL.MEMBER_ID]), '', 'نجاح');
      }
    } catch(e) {}

    Logger.info('Auth', 'Password reset completed', { email: resetData.email });

    return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
  }

  // ─── تسجيل الخروج ────────────────────────────────

  /**
   * تسجيل الخروج (تدمير الجلسة)
   * @param {string} token
   * @returns {object} { success }
   */
  function logout(token) {
    AuthSession.destroySession(token);
    Logger.info('Auth', 'User logged out');
    return { success: true };
  }

  // ─── تعيين/تغيير كلمة المرور (للمدير) ─────────────

  /**
   * تعيين كلمة مرور لعضو (يُستدعى من قبل المدير)
   * @param {Array} adminMember — بيانات المدير (من getCurrentMember)
   * @param {string} targetMemberId — معرف العضو المستهدف
   * @param {string} newPassword — كلمة المرور الجديدة
   * @returns {object} { success }
   */
  function setPassword(adminMember, targetMemberId, newPassword) {
    // التحقق من صلاحية المدير
    if (typeof isAdmin === 'function' && !isAdmin(adminMember)) {
      throw new Error('AUTH_ADMIN_REQUIRED: فقط المدير يمكنه تعيين كلمة مرور');
    }

    var strengthCheck = AuthPassword.validateStrength(newPassword);
    if (!strengthCheck.valid) {
      throw new Error('AUTH_WEAK_PASSWORD: ' + strengthCheck.errors.join(' | '));
    }

    var targetMember = _findMemberById(targetMemberId);
    if (!targetMember) {
      throw new Error('AUTH_USER_NOT_FOUND: العضو غير موجود');
    }

    var newHash = AuthPassword.hash(newPassword);
    _updateMemberField(
      targetMemberId,
      typeof MEMBER_COL.PASSWORD_HASH !== 'undefined' ? MEMBER_COL.PASSWORD_HASH : 13,
      newHash
    );

    try {
      if (typeof logActivity === 'function') {
        logActivity(adminMember, 'تعيين كلمة مرور', 'Auth', targetMemberId, '', 'بواسطة ' + adminMember[MEMBER_COL.FULL_NAME]);
      }
    } catch(e) {}

    Logger.info('Auth', 'Password set by admin', { target: targetMemberId, admin: adminMember[MEMBER_COL.EMAIL] });

    return { success: true, message: 'تم تعيين كلمة المرور بنجاح' };
  }

  // ─── دوال خاصة ──────────────────────────────────────

  /**
   * البحث عن عضو بالبريد الإلكتروني (case-insensitive)
   * @param {string} email
   * @returns {Array|null}
   */
  function _findMemberByEmail(email) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) return null;
      var sheet = ss.getSheetByName(MEMBERS_SHEET);
      if (!sheet) return null;

      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return null;

      var totalCols = sheet.getLastColumn();
      var data = sheet.getRange(2, 1, lastRow - 1, totalCols).getValues();
      var normalized = email.trim().toLowerCase();

      for (var i = 0; i < data.length; i++) {
        var colEmail = String(data[i][MEMBER_COL.EMAIL] || '').trim().toLowerCase();
        if (colEmail === normalized) {
          return data[i];
        }
      }
    } catch(e) {
      Logger.error('Auth', '_findMemberByEmail failed: ' + e.message);
    }
    return null;
  }

  /**
   * البحث عن عضو بالمعرف
   * @param {string} memberId
   * @returns {Array|null}
   */
  function _findMemberById(memberId) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) return null;
      var sheet = ss.getSheetByName(MEMBERS_SHEET);
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
      Logger.error('Auth', '_findMemberById failed: ' + e.message);
    }
    return null;
  }

  /**
   * تحديث حقل في صف عضو
   * @param {string} memberId
   * @param {number} colIndex — فهرس العمود (0-based)
   * @param {string} value
   */
  function _updateMemberField(memberId, colIndex, value) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName(MEMBERS_SHEET);
    if (!sheet) return;

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var target = String(memberId).trim();

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === target) {
        sheet.getRange(i + 2, colIndex + 1).setValue(value); // +1 لأن getRange يبدأ من 1
        return;
      }
    }

    Logger.warn('Auth', 'Member not found for field update', { memberId: memberId });
  }

  /**
   * تحويل صف العضو إلى كائن عام (بدون بيانات حساسة)
   * @param {Array} member
   * @returns {object}
   */
  function _memberToPublic(member) {
    return {
      id: String(member[MEMBER_COL.MEMBER_ID] || ''),
      name: String(member[MEMBER_COL.FULL_NAME] || ''),
      email: String(member[MEMBER_COL.EMAIL] || ''),
      role: String(member[MEMBER_COL.ROLE] || ''),
      department: typeof MEMBER_COL.DEPARTMENT !== 'undefined'
        ? String(member[MEMBER_COL.DEPARTMENT] || '')
        : '',
      phone: String(member[MEMBER_COL.PHONE] || ''),
      hasPassword: typeof MEMBER_COL.PASSWORD_HASH !== 'undefined'
        ? !!member[MEMBER_COL.PASSWORD_HASH]
        : false
    };
  }

  /**
   * الحصول على معرف السكربت (لروابط إعادة التعيين)
   */
  function _getScriptId() {
    try {
      var id = ScriptApp.getScriptId();
      return id || 'YOUR_SCRIPT_ID';
    } catch(e) {
      return 'YOUR_SCRIPT_ID';
    }
  }

  // ─── واجهة عامة ───
  return {
    loginWithEmail: loginWithEmail,
    loginWithGoogle: loginWithGoogle,
    register: register,
    logout: logout,
    requestPasswordReset: requestPasswordReset,
    confirmPasswordReset: confirmPasswordReset,
    setPassword: setPassword
  };

})();

// ═══════════════════════════════════════════════════════════════════════
// دوال عامة للاستدعاء من google.script.run — واجهات متوافقة مع UI_JS_Core.html
// ═══════════════════════════════════════════════════════════════════════

function uiLoginWithEmail(email, password) {
  try {
    _checkRateLimit('uiLoginWithEmail');
    if (!email || !password) {
      return { success: false, error: 'البريد وكلمة المرور مطلوبان' };
    }
    var result = Auth.loginWithEmail(email, password);
    if (result.success && result.user) {
      var safePermissions = [];
      try {
        var perms = getRolePermissions(result.user.role || '');
        if (Array.isArray(perms)) {
          safePermissions = perms.filter(function(p) { return typeof p === 'string'; });
        }
      } catch(e) {}
      result.user.permissions = safePermissions;
    }
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: String(e.message || 'خطأ في تسجيل الدخول') };
  }
}

function uiLoginWithGoogle() {
  try {
    _checkRateLimit('uiLoginWithGoogle');
    var result = Auth.loginWithGoogle();
    if (result.success && result.user) {
      var safePermissions = [];
      try {
        var perms = getRolePermissions(result.user.role || '');
        if (Array.isArray(perms)) {
          safePermissions = perms.filter(function(p) { return typeof p === 'string'; });
        }
      } catch(e) {}
      result.user.permissions = safePermissions;
    }
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: String(e.message || 'خطأ في المصادقة عبر Google') };
  }
}

function uiValidateSession(token) {
  try {
    _checkRateLimit('uiValidateSession');
    if (!token || typeof token !== 'string') {
      return { success: false, error: 'AUTH_REQUIRED: يرجى تسجيل الدخول' };
    }
    var session = AuthSession.validateSession(token);
    if (!session) {
      return { success: false, error: 'AUTH_SESSION_EXPIRED: انتهت صلاحية الجلسة' };
    }
    var member = AuthSession.getSessionMember(token);
    if (!member) {
      AuthSession.destroySession(token);
      return { success: false, error: 'AUTH_USER_NOT_FOUND: المستخدم محذوف' };
    }
    var status = String(member[MEMBER_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'active') {
      AuthSession.destroySession(token);
      return { success: false, error: 'AUTH_ACCOUNT_INACTIVE: الحساب غير نشط' };
    }
    var safeEmail = String(member[MEMBER_COL.EMAIL] || '').trim();
    var safeName = String(member[MEMBER_COL.FULL_NAME] || '').trim();
    var safeRole = String(member[MEMBER_COL.ROLE] || '').trim();
    var safePermissions = [];
    try {
      var perms = getRolePermissions(safeRole);
      if (Array.isArray(perms)) {
        safePermissions = perms.filter(function(p) { return typeof p === 'string'; });
      }
    } catch(e) {}
    return {
      success: true,
      data: {
        id: String(member[MEMBER_COL.MEMBER_ID] || ''),
        email: safeEmail,
        name: safeName,
        role: safeRole,
        department: typeof MEMBER_COL.DEPARTMENT !== 'undefined' ? String(member[MEMBER_COL.DEPARTMENT] || '') : '',
        permissions: safePermissions
      }
    };
  } catch (e) {
    return { success: false, error: String(e.message || 'Unknown error') };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// REGISTER NEW MEMBER — v6
// ═══════════════════════════════════════════════════════════════════════

function uiRegisterMember(data) {
  try {
    _checkRateLimit('uiRegisterMember');

    // 1. التحقق من المدخلات
    var fullName = data && data.fullName ? data.fullName.trim() : '';
    var email = data && data.email ? data.email.trim().toLowerCase() : '';
    var password = data && data.password ? data.password : '';
    var role = data && data.role ? data.role.trim() : 'Designer';
    var department = data && data.department ? data.department.trim() : '';

    if (!fullName || !email || !password) {
      return { success: false, error: 'الاسم الكامل، البريد الإلكتروني، وكلمة المرور مطلوبة' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'البريد الإلكتروني غير صالح' };
    }
    if (password.length < 6) {
      return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    }

    // 2. التحقق من وجود البريد مسبقاً
    var existing = _findMemberByEmailGlobal(email);
    if (existing) {
      return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل' };
    }

    // 3. تشفير كلمة المرور
    var passwordHash = AuthPassword.hash(password);

    // 4. إنشاء معرف جديد
    var newId = 'MEM-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    // 5. إضافة الصف إلى Members sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Members');
    if (!sheet) {
      return { success: false, error: 'ورقة Members غير موجودة' };
    }

    var joinDateStr = new Date().toISOString().split('T')[0]; // ✅ string وليس Date

    var newRow = [
      newId,          // 0  MEMBER_ID
      fullName,       // 1  FULL_NAME
      role,           // 2  ROLE
      email,          // 3  EMAIL
      data.phone || '', // 4  PHONE
      'Active',       // 5  STATUS
      joinDateStr,    // 6  JOIN_DATE ✅ string
      0,              // 7  KPI_SCORE
      0,              // 8  TASKS_COMPLETED
      0,              // 9  TASKS_LATE
      0,              // 10 AVERAGE_QUALITY
      data.notes || '', // 11 NOTES
      department,     // 12 DEPARTMENT
      passwordHash    // 13 PASSWORD_HASH
    ];

    sheet.appendRow(newRow);

    // 6. تسجيل النشاط
    try {
      if (typeof logActivity === 'function') {
        logActivity(null, 'تسجيل مستخدم جديد', 'Auth', newId, '', 'نجاح');
      }
    } catch(e) {}

    // 7. إنشاء جلسة تلقائياً بعد التسجيل
    var sessionToken = AuthSession.createSession(newId, email);

    // 8. إعادة بيانات المستخدم مع الصلاحيات
    var safePermissions = [];
    try {
      var perms = getRolePermissions(role);
      if (Array.isArray(perms)) {
        safePermissions = perms.filter(function(p) { return typeof p === 'string'; });
      }
    } catch(e) {}

    return {
      success: true,
      data: {
        token: sessionToken,
        user: {
          id: newId,
          email: email,
          name: fullName,
          role: role,
          department: department,
          permissions: safePermissions
        }
      }
    };
  } catch (e) {
    return { success: false, error: String(e.message || 'خطأ في التسجيل') };
  }
}

/**
 * دالة مساعدة عامة للبحث عن عضو بالبريد (للاستدعاء من دوال عامة خارج IIFE)
 */
function _findMemberByEmailGlobal(email) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Members');
    if (!sheet) return null;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return null;
    var totalCols = sheet.getLastColumn();
    var data = sheet.getRange(2, 1, lastRow - 1, totalCols).getValues();
    var normalized = email.trim().toLowerCase();
    for (var i = 0; i < data.length; i++) {
      var colEmail = String(data[i][MEMBER_COL.EMAIL] || '').trim().toLowerCase();
      if (colEmail === normalized) {
        return data[i];
      }
    }
  } catch(e) {
    console.log('[Auth] _findMemberByEmailGlobal error: ' + e.message);
  }
  return null;
}

/**
 * تسجيل مستخدم جديد (واجهة قديمة — للتوافق)
 */
function uiAuthRegister(data) {
  return uiRegisterMember(data);
}

/**
 * طلب إعادة تعيين كلمة المرور
 */
function uiAuthRequestReset(email) {
  try {
    return Auth.requestPasswordReset(email);
  } catch(e) {
    return { success: false, error: String(e.message || 'Unknown error') };
  }
}

/**
 * تنفيذ إعادة تعيين كلمة المرور
 */
function uiAuthConfirmReset(token, newPassword) {
  try {
    return Auth.confirmPasswordReset(token, newPassword);
  } catch(e) {
    return { success: false, error: String(e.message || 'Unknown error') };
  }
}

/**
 * تسجيل الخروج
 */
function uiAuthLogout(token) {
  try {
    return Auth.logout(token);
  } catch(e) {
    return { success: false, error: String(e.message || 'Unknown error') };
  }
}
