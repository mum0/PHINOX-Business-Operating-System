/**
 * Auth System — Middleware / Guard
 * PHINOX BOS v6
 *
 * المسؤوليات:
 *   - التحقق من صلاحية الجلسة قبل تنفيذ العمليات
 *   - تحويل token إلى member data بأمان (بدون Date objects)
 *   - دعم الوضع الاختياري (getMemberIfAuthenticated) والإلزامي (requireSession)
 *
 * يعتمد على:
 *   - 02_AuthSession.js (validateSession, getSessionMember)
 *   - 13_Permissions.js (MEMBER_COL, getRolePermissions)
 */

var AuthGuard = (function() {
  'use strict';

  /**
   * تحويل صف العضو (array) إلى كائن آمن للتسلسل
   * كل القيم strings — لا Date، لا undefined، لا Error
   * @param {Array} member — صف من شيت Members
   * @returns {object|null}
   */
  function _memberToSafeObject(member) {
    if (!member || !Array.isArray(member)) return null;

    var safePermissions = [];
    try {
      var role = String(member[MEMBER_COL.ROLE] || '').trim();
      var perms = getRolePermissions(role);
      if (Array.isArray(perms)) {
        safePermissions = perms.filter(function(p) { return typeof p === 'string'; });
      }
    } catch(e) {
      // تجاهل — صلاحيات فاضية أفضل من خطأ
    }

    return {
      id: String(member[MEMBER_COL.MEMBER_ID] || ''),
      name: String(member[MEMBER_COL.FULL_NAME] || ''),
      email: String(member[MEMBER_COL.EMAIL] || ''),
      role: String(member[MEMBER_COL.ROLE] || ''),
      phone: String(member[MEMBER_COL.PHONE] || ''),
      department: typeof MEMBER_COL.DEPARTMENT !== 'undefined'
        ? String(member[MEMBER_COL.DEPARTMENT] || '')
        : '',
      status: String(member[MEMBER_COL.STATUS] || ''),
      hasPassword: typeof MEMBER_COL.PASSWORD_HASH !== 'undefined'
        ? !!member[MEMBER_COL.PASSWORD_HASH]
        : false,
      permissions: safePermissions
    };
  }

  /**
   * التحقق الإلزامي من الجلسة — يرمي Error إذا غير صالحة
   * @param {string} token
   * @returns {object} — بيانات المستخدم الآمنة
   * @throws {Error} AUTH_REQUIRED / AUTH_SESSION_EXPIRED
   */
  function requireSession(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('AUTH_REQUIRED: يرجى تسجيل الدخول أولاً');
    }

    var session = AuthSession.validateSession(token);
    if (!session) {
      throw new Error('AUTH_SESSION_EXPIRED: انتهت صلاحية الجلسة. سجّل الدخول مجدداً');
    }

    var member = AuthSession.getSessionMember(token);
    if (!member) {
      // الجلسة صالحة لكن العضو محذوف — ندمّر الجلسة
      AuthSession.destroySession(token);
      throw new Error('AUTH_USER_NOT_FOUND: المستخدم غير موجود. تم تسجيل خروجك تلقائياً');
    }

    // التحقق من الحالة
    var status = String(member[MEMBER_COL.STATUS] || '').trim().toLowerCase();
    if (status !== 'active') {
      AuthSession.destroySession(token);
      throw new Error('AUTH_ACCOUNT_INACTIVE: الحساب غير نشط. تواصل مع المدير');
    }

    return _memberToSafeObject(member);
  }

  /**
   * التحقق الاختياري — يرجع null بدل رمي Error
   * @param {string} token
   * @returns {object|null}
   */
  function getMemberIfAuthenticated(token) {
    try {
      return requireSession(token);
    } catch(e) {
      return null;
    }
  }

  /**
   * التحقق من صلاحية محددة
   * @param {object} user — كائن المستخدم من requireSession
   * @param {string} permission — اسم الصلاحية
   * @returns {object} user — يرجع المستخدم إذا لديه الصلاحية
   * @throws {Error} AUTH_PERMISSION_DENIED
   */
  function requirePermission(user, permission) {
    if (!user || !user.permissions) {
      throw new Error('AUTH_PERMISSION_DENIED: صلاحية غير كافية: ' + permission);
    }
    var perms = user.permissions;
    if (perms.indexOf('*') > -1 || perms.indexOf('admin') > -1 || perms.indexOf('Admin') > -1) {
      return user;
    }
    if (perms.indexOf(permission) === -1) {
      throw new Error('AUTH_PERMISSION_DENIED: صلاحية غير كافية: ' + permission);
    }
    return user;
  }

  /**
   * التحقق من دور محدد
   * @param {object} user
   * @param {string[]} allowedRoles
   * @throws {Error}
   */
  function requireRole(user, allowedRoles) {
    if (!user || !user.role) {
      throw new Error('AUTH_ROLE_REQUIRED: دور غير محدد');
    }
    if (allowedRoles.indexOf(user.role) === -1) {
      throw new Error('AUTH_ROLE_REQUIRED: يتطلب دوراً من: ' + allowedRoles.join(', '));
    }
    return user;
  }

  // ─── واجهة عامة ───
  return {
    requireSession: requireSession,
    getMemberIfAuthenticated: getMemberIfAuthenticated,
    requirePermission: requirePermission,
    requireRole: requireRole,
    // دالة مساعدة للاستخدام الداخلي
    _memberToSafeObject: _memberToSafeObject
  };

})();