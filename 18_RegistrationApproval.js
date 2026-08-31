/* ================================================================
   PHINOX - Server-Side Updates
   ================================================================
   أضف هذا الكود في نهاية ملف UI_Server.js
   أو أنشئ ملف جديد 20_RegistrationApproval.js
   ================================================================ */

/* ---------------------------------------------------------------
   1. نظام موافقة التسجيل - Approval System
   --------------------------------------------------------------- */

/**
   بنية طلب التسجيل المعلق في Sheet "PendingRegistrations"
   الأعمدة:
   0: TIMESTAMP   - وقت الطلب
   1: EMAIL       - البريد الإلكتروني
   2: DISPLAY_NAME- الاسم المعروض
   3: PHOTO_URL   - رابط الصورة
   4: GOOGLE_ID   - معرف Google
   5: PROVIDER     - 'google' أو 'email'
   6: STATUS      - 'pending' / 'approved' / 'rejected'
   7: REQUEST_ID  - معرف فريد للطلب
   8: PASSWORD_HASH- تجزئة كلمة المرور (فقط لتسجيل البريد)
   9: DEPARTMENT   - القسم
*/

var PENDING_COL = {
  TIMESTAMP: 0, EMAIL: 1, DISPLAY_NAME: 2, PHOTO_URL: 3,
  GOOGLE_ID: 4, PROVIDER: 5, STATUS: 6, REQUEST_ID: 7,
  PASSWORD_HASH: 8, DEPARTMENT: 9
};

/**
   تسجيل عضو جديد عبر Google - يرسل طلب موافقة
*/
function uiRegisterWithGoogle(profile) {
  try {
    _checkRateLimit();
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    var pendingSheet = ss.getSheetByName('PendingRegistrations');

    if (!membersSheet) throw new Error('Members sheet not found');

    // التأكد من عدم وجود العضو بالفعل
    var email = profile.email || profile.getEmail();
    if (!email) throw new Error('Email is required');

    var existing = _findMemberByEmail(email);
    if (existing) throw new Error('هذا البريد مسجل بالفعل');

    // التأكد من عدم وجود طلب معلق سابق
    if (pendingSheet) {
      var pendingData = pendingSheet.getDataRange().getValues();
      for (var i = 1; i < pendingData.length; i++) {
        if (pendingData[i][PENDING_COL.EMAIL] === email &&
            pendingData[i][PENDING_COL.STATUS] === 'pending') {
          throw new Error('لديك طلب تسجيل معلق بالفعل، يرجى الانتظار حتى يتم مراجعته');
        }
      }
    } else {
      // إنشاء شيت الطلبات المعلقة إذا لم يكن موجوداً
      pendingSheet = ss.insertSheet('PendingRegistrations');
      pendingSheet.appendRow([
        'Timestamp', 'Email', 'Display Name', 'Photo URL',
        'Google ID', 'Provider', 'Status', 'Request ID',
        'Password Hash', 'Department'
      ]);
      // تنسيق الرأس
      var headerRange = pendingSheet.getRange(1, 1, 1, 10);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a2235');
      headerRange.setFontColor('#ffffff');
    }

    var requestId = Utilities.getUuid();
    var displayName = profile.name || profile.getName() || '';
    var photoUrl = profile.picture || profile.getImageUrl() || '';
    var googleId = profile.id || profile.getId() || '';

    // إضافة الطلب المعلق
    pendingSheet.appendRow([
      new Date(), email, displayName, photoUrl,
      googleId, 'google', 'pending', requestId,
      '', '' // no password for Google auth
    ]);

    // إرسال إشعار للأدمن والـ CEO
    _notifyAdminsNewRequest({
      email: email,
      displayName: displayName,
      photoUrl: photoUrl,
      provider: 'google',
      requestId: requestId
    });

    return {
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح. سيتم مراجعته من قبل الإدارة.'
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/**
   تسجيل عضو جديد بالبريد الإلكتروني - يرسل طلب موافقة
*/
function uiRegisterWithEmail(data) {
  try {
    _checkRateLimit();
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    var pendingSheet = ss.getSheetByName('PendingRegistrations');

    if (!membersSheet) throw new Error('Members sheet not found');

    var email = data.email;
    var password = data.password;
    var displayName = data.displayName || '';
    var department = data.department || '';

    if (!email || !password) throw new Error('البريد وكلمة المرور مطلوبان');
    if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    // التأكد من عدم وجود العضو بالفعل
    var existing = _findMemberByEmail(email);
    if (existing) throw new Error('هذا البريد مسجل بالفعل');

    // التأكد من عدم وجود طلب معلق
    if (pendingSheet) {
      var pendingData = pendingSheet.getDataRange().getValues();
      for (var i = 1; i < pendingData.length; i++) {
        if (pendingData[i][PENDING_COL.EMAIL] === email &&
            pendingData[i][PENDING_COL.STATUS] === 'pending') {
          throw new Error('لديك طلب تسجيل معلق بالفعل، يرجى الانتظار حتى يتم مراجعته');
        }
      }
    } else {
      pendingSheet = ss.insertSheet('PendingRegistrations');
      pendingSheet.appendRow([
        'Timestamp', 'Email', 'Display Name', 'Photo URL',
        'Google ID', 'Provider', 'Status', 'Request ID',
        'Password Hash', 'Department'
      ]);
      var headerRange = pendingSheet.getRange(1, 1, 1, 10);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#1a2235');
      headerRange.setFontColor('#ffffff');
    }

    // تجزئة كلمة المرور
    var passwordHash = AuthPassword.hash(password);

    var requestId = Utilities.getUuid();

    // إضافة الطلب المعلق
    pendingSheet.appendRow([
      new Date(), email, displayName, '',
      '', 'email', 'pending', requestId,
      passwordHash, department
    ]);

    // إرسال إشعار للأدمن والـ CEO
    _notifyAdminsNewRequest({
      email: email,
      displayName: displayName,
      photoUrl: '',
      provider: 'email',
      requestId: requestId
    });

    return {
      success: true,
      message: 'تم إرسال طلب التسجيل بنجاح. سيتم مراجعته من قبل الإدارة.'
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/* ---------------------------------------------------------------
   2. موافقة / رفض الطلبات - Approve / Reject
   --------------------------------------------------------------- */

/**
   موافقة على طلب تسجيل (للأدمن والـ CEO فقط)
*/
function uiApproveRegistration(requestId) {
  try {
    var user = _requireAuth(['admin', 'ceo']);
    var ss = _getSpreadsheet();
    var pendingSheet = ss.getSheetByName('PendingRegistrations');
    var membersSheet = ss.getSheetByName('Members');

    if (!pendingSheet) throw new Error('لا يوجد طلبات تسجيل معلقة');
    if (!membersSheet) throw new Error('Members sheet not found');

    var pendingData = pendingSheet.getDataRange().getValues();
    var targetRow = -1;
    var requestData = null;

    for (var i = 1; i < pendingData.length; i++) {
      if (pendingData[i][PENDING_COL.REQUEST_ID] === requestId &&
          pendingData[i][PENDING_COL.STATUS] === 'pending') {
        targetRow = i + 1; // +1 لأن الصف 1 هو الرأس
        requestData = pendingData[i];
        break;
      }
    }

    if (!requestData) throw new Error('الطلب غير موجود أو تم معالجته بالفعل');

    // إضافة العضو إلى جدول الأعضاء
    var memberId = Utilities.getUuid();
    var now = new Date();
    var role = 'member'; // الدور الافتراضي

    var newMember = [];
    newMember[MEMBER_COL.ID] = memberId;
    newMember[MEMBER_COL.EMAIL] = requestData[PENDING_COL.EMAIL];
    newMember[MEMBER_COL.DISPLAY_NAME] = requestData[PENDING_COL.DISPLAY_NAME];
    newMember[MEMBER_COL.PHOTO_URL] = requestData[PENDING_COL.PHOTO_URL];
    newMember[MEMBER_COL.GOOGLE_ID] = requestData[PENDING_COL.GOOGLE_ID];
    newMember[MEMBER_COL.PROVIDER] = requestData[PENDING_COL.PROVIDER];
    newMember[MEMBER_COL.ROLE] = role;
    newMember[MEMBER_COL.STATUS] = 'active';
    newMember[MEMBER_COL.CREATED_AT] = now;
    newMember[MEMBER_COL.UPDATED_AT] = now;
    newMember[MEMBER_COL.LAST_LOGIN] = '';
    newMember[MEMBER_COL.DEPARTMENT] = requestData[PENDING_COL.DEPARTMENT] || '';
    newMember[MEMBER_COL.PASSWORD_HASH] = requestData[PENDING_COL.PASSWORD_HASH] || '';

    membersSheet.appendRow(newMember);

    // تحديث حالة الطلب
    pendingSheet.getRange(targetRow, PENDING_COL.STATUS + 1).setValue('approved');
    pendingSheet.getRange(targetRow, PENDING_COL.STATUS + 1).setBackground('#22c55e');

    return {
      success: true,
      message: 'تم قبول العضو: ' + requestData[PENDING_COL.DISPLAY_NAME]
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/**
   رفض طلب تسجيل (للأدمن والـ CEO فقط)
*/
function uiRejectRegistration(requestId, reason) {
  try {
    var user = _requireAuth(['admin', 'ceo']);
    var ss = _getSpreadsheet();
    var pendingSheet = ss.getSheetByName('PendingRegistrations');

    if (!pendingSheet) throw new Error('لا يوجد طلبات تسجيل');

    var pendingData = pendingSheet.getDataRange().getValues();
    var targetRow = -1;
    var requestData = null;

    for (var i = 1; i < pendingData.length; i++) {
      if (pendingData[i][PENDING_COL.REQUEST_ID] === requestId &&
          pendingData[i][PENDING_COL.STATUS] === 'pending') {
        targetRow = i + 1;
        requestData = pendingData[i];
        break;
      }
    }

    if (!requestData) throw new Error('الطلب غير موجود أو تم معالجته بالفعل');

    // تحديث حالة الطلب
    pendingSheet.getRange(targetRow, PENDING_COL.STATUS + 1).setValue('rejected');
    pendingSheet.getRange(targetRow, PENDING_COL.STATUS + 1).setBackground('#ef4444');

    return {
      success: true,
      message: 'تم رفض طلب التسجيل: ' + requestData[PENDING_COL.EMAIL]
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/**
   جلب جميع طلبات التسجيل المعلقة (للأدمن والـ CEO)
*/
function uiGetPendingRegistrations() {
  try {
    var user = _requireAuth(['admin', 'ceo']);
    var ss = _getSpreadsheet();
    var pendingSheet = ss.getSheetByName('PendingRegistrations');

    if (!pendingSheet) return [];

    var data = pendingSheet.getDataRange().getValues();
    var pending = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][PENDING_COL.STATUS] === 'pending') {
        pending.push({
          requestId: data[i][PENDING_COL.REQUEST_ID],
          email: data[i][PENDING_COL.EMAIL],
          displayName: data[i][PENDING_COL.DISPLAY_NAME],
          photoUrl: data[i][PENDING_COL.PHOTO_URL],
          provider: data[i][PENDING_COL.PROVIDER],
          timestamp: data[i][PENDING_COL.TIMESTAMP],
          department: data[i][PENDING_COL.DEPARTMENT] || ''
        });
      }
    }

    return pending;

  } catch (e) {
    throw new Error(e.message);
  }
}

/* ---------------------------------------------------------------
   3. إشعارات الأدمن - Admin Notifications
   --------------------------------------------------------------- */


/**
   إرسال إشعار بريد إلكتروني للأدمن والـ CEO بطلب تسجيل جديد
*/
function _notifyAdminsNewRequest(requestData) {
  try {
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    if (!membersSheet) return;

    var data = membersSheet.getDataRange().getValues();
    var adminEmails = [];

    for (var i = 1; i < data.length; i++) {
      var role = data[i][MEMBER_COL.ROLE];
      var status = data[i][MEMBER_COL.STATUS];
      var email = data[i][MEMBER_COL.EMAIL];
      if ((role === 'admin' || role === 'ceo') && status === 'active' && email) {
        adminEmails.push(email);
      }
    }

    if (adminEmails.length === 0) return;

    var subject = 'طلب تسجيل جديد - PHINOX';
    
    // بناء HTML كسطر واحد لتفادي مشاكل السلاسل المتعددة
    var htmlBody = '<div style="font-family:Arial,sans-serif;direction:rtl;max-width:600px;margin:0 auto;">'
      + '<div style="background:#1a2235;color:#fff;padding:20px;border-radius:8px 8px 0 0;">'
      + '<h2 style="margin:0;">PHINOX - طلب تسجيل جديد</h2>'
      + '</div>'
      + '<div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;">'
      + '<p>طلب تسجيل جديد بانتظار مراجعتك:</p>'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:140px;">الاسم:</td>'
      + '<td style="padding:8px;border:1px solid #e2e8f0;">' + requestData.displayName + '</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">البريد:</td>'
      + '<td style="padding:8px;border:1px solid #e2e8f0;">' + requestData.email + '</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">طريقة التسجيل:</td>'
      + '<td style="padding:8px;border:1px solid #e2e8f0;">' + requestData.provider + '</td></tr>'
      + '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">معرف الطلب:</td>'
      + '<td style="padding:8px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;">' + requestData.requestId + '</td></tr>'
      + '</table>'
      + '<p style="margin-top:16px;color:#64748b;font-size:13px;">سجل الدخول إلى لوحة التحكم لمراجعة الطلب والقبول أو الرفض.</p>'
      + '</div></div>';

    for (var j = 0; j < adminEmails.length; j++) {
      try {
        MailApp.sendEmail({
          to: adminEmails[j],
          subject: subject,
          htmlBody: htmlBody
        });
      } catch (mailErr) {
        Logger.log('Failed to notify ' + adminEmails[j] + ': ' + mailErr.message);
      }
    }

  } catch (e) {
    Logger.log('Notification error: ' + e.message);
  }
}
/* ---------------------------------------------------------------
   4. CRUD كامل - Full CRUD Operations
   --------------------------------------------------------------- */

/**
   حذف عضو (للأدمن والـ CEO فقط)
*/
function uiDeleteMember(memberId) {
  try {
    var user = _requireAuth(['admin', 'ceo']);
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    if (!membersSheet) throw new Error('Members sheet not found');

    var data = membersSheet.getDataRange().getValues();
    var targetRow = -1;
    var memberEmail = '';
    var memberName = '';

    for (var i = 1; i < data.length; i++) {
      if (data[i][MEMBER_COL.ID] === memberId) {
        targetRow = i + 1;
        memberEmail = data[i][MEMBER_COL.EMAIL];
        memberName = data[i][MEMBER_COL.DISPLAY_NAME];
        break;
      }
    }

    if (targetRow === -1) throw new Error('العضو غير موجود');

    // منع حذف الحساب الحالي
    if (memberEmail === user.email) {
      throw new Error('لا يمكنك حذف حسابك الخاص');
    }

    // منع حذف أدمن آخر (فقط CEO يمكنه حذف أدمن)
    var targetRole = data[targetRow - 1][MEMBER_COL.ROLE];
    if (targetRole === 'ceo') {
      throw new Error('لا يمكن حذف حساب CEO');
    }
    if (targetRole === 'admin' && user.role !== 'ceo') {
      throw new Error('فقط CEO يمكنه حذف أدمن');
    }

    membersSheet.deleteRow(targetRow);

    return {
      success: true,
      message: 'تم حذف العضو: ' + memberName
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/**
   تعديل بيانات عضو (للأدمن والـ CEO، أو العضو نفسه للبيانات الأساسية)
*/
function uiUpdateMember(memberId, updates) {
  try {
    var user = _requireAuth(); // أي عضو مسجل
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    if (!membersSheet) throw new Error('Members sheet not found');

    var data = membersSheet.getDataRange().getValues();
    var targetRow = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][MEMBER_COL.ID] === memberId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) throw new Error('العضو غير موجود');

    // صلاحيات التعديل
    var targetEmail = data[targetRow - 1][MEMBER_COL.EMAIL];
    var targetRole = data[targetRow - 1][MEMBER_COL.ROLE];

    if (user.role !== 'admin' && user.role !== 'ceo') {
      // عضو عادي يمكنه تعديل بياناته فقط
      if (targetEmail !== user.email) {
        throw new Error('ليس لديك صلاحية تعديل بيانات أعضاء آخرين');
      }
      // عضو عادي لا يمكنه تعديل الدور أو الحالة
      if (updates.role || updates.status) {
        throw new Error('ليس لديك صلاحية تعديل الدور أو الحالة');
      }
    }

    // منع تعديل CEO إلا بواسطة CEO
    if (targetRole === 'ceo' && user.role !== 'ceo') {
      throw new Error('فقط CEO يمكنه تعديل بيانات CEO');
    }

    // تطبيق التحديثات المسموحة
    var allowedFields = ['displayName', 'department', 'role', 'status', 'photoUrl'];
    for (var key in updates) {
      if (allowedFields.indexOf(key) === -1) continue;

      var colIndex = -1;
      if (key === 'displayName') colIndex = MEMBER_COL.DISPLAY_NAME;
      else if (key === 'department') colIndex = MEMBER_COL.DEPARTMENT;
      else if (key === 'role') colIndex = MEMBER_COL.ROLE;
      else if (key === 'status') colIndex = MEMBER_COL.STATUS;
      else if (key === 'photoUrl') colIndex = MEMBER_COL.PHOTO_URL;

      if (colIndex >= 0) {
        membersSheet.getRange(targetRow, colIndex + 1).setValue(updates[key]);
      }
    }

    // تحديث تاريخ التعديل
    membersSheet.getRange(targetRow, MEMBER_COL.UPDATED_AT + 1).setValue(new Date());

    return {
      success: true,
      message: 'تم تحديث البيانات بنجاح'
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/**
   تغيير كلمة المرور (للعضو نفسه، أو الأدمن/CEO لأي عضو)
*/
function uiChangePassword(memberId, newPassword) {
  try {
    var user = _requireAuth();
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    if (!membersSheet) throw new Error('Members sheet not found');

    if (!newPassword || newPassword.length < 6) {
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    var data = membersSheet.getDataRange().getValues();
    var targetRow = -1;
    var targetEmail = '';

    for (var i = 1; i < data.length; i++) {
      if (data[i][MEMBER_COL.ID] === memberId) {
        targetRow = i + 1;
        targetEmail = data[i][MEMBER_COL.EMAIL];
        break;
      }
    }

    if (targetRow === -1) throw new Error('العضو غير موجود');

    // العضو يغير كلمة مروره، أو الأدمن/CEO يغير لأي عضو
    if (user.role !== 'admin' && user.role !== 'ceo') {
      if (targetEmail !== user.email) {
        throw new Error('ليس لديك صلاحية تغيير كلمة مرور عضو آخر');
      }
    }

    var passwordHash = AuthPassword.hash(newPassword);
    membersSheet.getRange(targetRow, MEMBER_COL.PASSWORD_HASH + 1).setValue(passwordHash);
    membersSheet.getRange(targetRow, MEMBER_COL.UPDATED_AT + 1).setValue(new Date());

    return {
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    };

  } catch (e) {
    throw new Error(e.message);
  }
}

/* ---------------------------------------------------------------
   5. بيانات الداشبورد - Dashboard Data
   --------------------------------------------------------------- */

/**
   جلب جميع بيانات الداشبورد (للأدمن والـ CEO)
*/
function uiGetDashboardData() {
  try {
    var user = _requireAuth(['admin', 'ceo']);
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    var pendingSheet = ss.getSheetByName('PendingRegistrations');

    var result = {
      memberStats: {},
      recentMembers: [],
      pendingRequests: [],
      roleDistribution: {},
      providerDistribution: {},
      departmentDistribution: {},
      activityLog: []
    };

    // إحصائيات الأعضاء
    if (membersSheet) {
      var members = membersSheet.getDataRange().getValues();
      var totalMembers = members.length - 1; // minus header
      var activeMembers = 0;
      var inactiveMembers = 0;
      var roles = {};
      var providers = {};
      var departments = {};
      var recent = [];

      for (var i = 1; i < members.length; i++) {
        var status = members[i][MEMBER_COL.STATUS];
        var role = members[i][MEMBER_COL.ROLE];
        var provider = members[i][MEMBER_COL.PROVIDER];
        var dept = members[i][MEMBER_COL.DEPARTMENT] || 'غير محدد';
        var createdAt = members[i][MEMBER_COL.CREATED_AT];
        var lastLogin = members[i][MEMBER_COL.LAST_LOGIN];

        if (status === 'active') activeMembers++;
        else inactiveMembers++;

        roles[role] = (roles[role] || 0) + 1;
        providers[provider || 'unknown'] = (providers[provider || 'unknown'] || 0) + 1;
        departments[dept] = (departments[dept] || 0) + 1;

        // آخر 10 أعضاء
        if (createdAt) {
          recent.push({
            id: members[i][MEMBER_COL.ID],
            displayName: members[i][MEMBER_COL.DISPLAY_NAME],
            email: members[i][MEMBER_COL.EMAIL],
            role: role,
            provider: provider,
            department: dept,
            status: status,
            createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
            lastLogin: lastLogin instanceof Date ? lastLogin.toISOString() : (lastLogin || 'لم يسجل دخول بعد'),
            photoUrl: members[i][MEMBER_COL.PHOTO_URL] || ''
          });
        }
      }

      // ترتيب حسب التاريخ (الأحدث أولاً)
      recent.sort(function(a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      result.recentMembers = recent.slice(0, 15);

      result.memberStats = {
        total: totalMembers,
        active: activeMembers,
        inactive: inactiveMembers,
        percentActive: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0
      };
      result.roleDistribution = roles;
      result.providerDistribution = providers;
      result.departmentDistribution = departments;
    }

    // طلبات التسجيل المعلقة
    if (pendingSheet) {
      var pendingData = pendingSheet.getDataRange().getValues();
      for (var j = 1; j < pendingData.length; j++) {
        if (pendingData[j][PENDING_COL.STATUS] === 'pending') {
          result.pendingRequests.push({
            requestId: pendingData[j][PENDING_COL.REQUEST_ID],
            email: pendingData[j][PENDING_COL.EMAIL],
            displayName: pendingData[j][PENDING_COL.DISPLAY_NAME],
            photoUrl: pendingData[j][PENDING_COL.PHOTO_URL],
            provider: pendingData[j][PENDING_COL.PROVIDER],
            timestamp: pendingData[j][PENDING_COL.TIMESTAMP] instanceof Date
              ? pendingData[j][PENDING_COL.TIMESTAMP].toISOString()
              : String(pendingData[j][PENDING_COL.TIMESTAMP]),
            department: pendingData[j][PENDING_COL.DEPARTMENT] || ''
          });
        }
      }
    }

    return result;

  } catch (e) {
    throw new Error(e.message);
  }
}

/**
   جلب قائمة الأعضاء مع التصفية (للأدمن والـ CEO)
*/
function uiGetMembersList(filter) {
  try {
    var user = _requireAuth(['admin', 'ceo']);
    var ss = _getSpreadsheet();
    var membersSheet = ss.getSheetByName('Members');
    if (!membersSheet) return [];

    var data = membersSheet.getDataRange().getValues();
    var members = [];
    var f = filter || {};

    for (var i = 1; i < data.length; i++) {
      var role = data[i][MEMBER_COL.ROLE];
      var status = data[i][MEMBER_COL.STATUS];
      var provider = data[i][MEMBER_COL.PROVIDER];
      var dept = data[i][MEMBER_COL.DEPARTMENT] || '';

      // تطبيق الفلاتر
      if (f.role && role !== f.role) continue;
      if (f.status && status !== f.status) continue;
      if (f.provider && provider !== f.provider) continue;
      if (f.department && dept !== f.department) continue;
      if (f.search) {
        var searchLower = f.search.toLowerCase();
        var name = (data[i][MEMBER_COL.DISPLAY_NAME] || '').toLowerCase();
        var email = (data[i][MEMBER_COL.EMAIL] || '').toLowerCase();
        if (name.indexOf(searchLower) === -1 && email.indexOf(searchLower) === -1) continue;
      }

      members.push({
        id: data[i][MEMBER_COL.ID],
        displayName: data[i][MEMBER_COL.DISPLAY_NAME],
        email: data[i][MEMBER_COL.EMAIL],
        role: role,
        status: status,
        provider: provider,
        department: dept,
        createdAt: data[i][MEMBER_COL.CREATED_AT] instanceof Date
          ? data[i][MEMBER_COL.CREATED_AT].toISOString()
          : String(data[i][MEMBER_COL.CREATED_AT] || ''),
        lastLogin: data[i][MEMBER_COL.LAST_LOGIN] instanceof Date
          ? data[i][MEMBER_COL.LAST_LOGIN].toISOString()
          : String(data[i][MEMBER_COL.LAST_LOGIN] || ''),
        photoUrl: data[i][MEMBER_COL.PHOTO_URL] || ''
      });
    }

    // ترتيب: الأحدث أولاً
    members.sort(function(a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return members;

  } catch (e) {
    throw new Error(e.message);
  }
}
