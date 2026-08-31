// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — Registration Approval Module
// ═══════════════════════════════════════════════════════════════════════
// ملف مستقل: لا يعتمد على ملفات أخرى سوى CONFIG و Member COL
// تاريخ الإنشاء: 2026-08-31
// ═══════════════════════════════════════════════════════════════════════

// ─── SCHEMA: PendingRegistrations Sheet ───
var REG_COL = {
  ID: 0, FULL_NAME: 1, EMAIL: 2, PHONE: 3, ROLE: 4,
  DEPARTMENT: 5, POSITION: 6, STATUS: 7,
  REQUESTED_AT: 8, REVIEWED_AT: 9, REVIEWED_BY: 10,
  REJECT_REASON: 11, NOTES: 12
};

var REG_STATUS = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };

// ─── ENSURE SHEET ───
function _ensurePendingSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('PendingRegistrations');
  if (!sheet) {
    sheet = ss.insertSheet('PendingRegistrations');
    var headers = [
      'id', 'fullName', 'email', 'phone', 'role',
      'department', 'position', 'status',
      'requestedAt', 'reviewedAt', 'reviewedBy',
      'rejectReason', 'notes'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a237e')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    console.log('[Registration] PendingRegistrations sheet created');
  }
  return sheet;
}

// ─── GENERATE ID ───
function _generateRegId() {
  var sheet = _ensurePendingSheet();
  var data = sheet.getDataRange().getValues();
  return 'REG-' + String(data.length).padStart(3, '0');
}

// ─── SUBMIT REGISTRATION REQUEST ───
// Called from client via google.script.run.submitRegistrationRequest(data)
function submitRegistrationRequest(data) {
  try {
    if (!data || !data.fullName || !data.email) {
      throw new Error('الاسم والبريد الإلكتروني مطلوبان');
    }

    var email = String(data.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('بريد إلكتروني غير صالح');
    }

    // Check if already a member
    try {
      var existingMember = getMemberByEmail(email);
      if (existingMember) {
        throw new Error('هذا البريد مسجل بالفعل في النظام');
      }
    } catch (e) {
      if (e.message.indexOf('مسجل بالفعل') > -1) throw e;
    }

    // Check if already pending
    var sheet = _ensurePendingSheet();
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][REG_COL.EMAIL]).toLowerCase() === email
          && String(rows[i][REG_COL.STATUS]) === REG_STATUS.PENDING) {
        throw new Error('يوجد طلب تسجيل معلق بالفعل لهذا البريد');
      }
    }

    var id = _generateRegId();
    var now = new Date().toISOString();
    var row = [
      id,
      String(data.fullName).trim().substring(0, 100),
      email,
      String(data.phone || '').trim().substring(0, 50),
      String(data.role || 'Operations').trim(),
      String(data.department || '').trim().substring(0, 50),
      String(data.position || '').trim().substring(0, 50),
      REG_STATUS.PENDING,
      now,
      '', '', '',
      String(data.notes || '').trim().substring(0, 500)
    ];

    sheet.appendRow(row);
    console.log('[Registration] New request: ' + id + ' / ' + email);

    // Notify admins
    try {
      _notifyAdminsNewRequest({
        id: id,
        fullName: row[REG_COL.FULL_NAME],
        email: email,
        phone: row[REG_COL.PHONE],
        role: row[REG_COL.ROLE],
        department: row[REG_COL.DEPARTMENT],
        position: row[REG_COL.POSITION],
        requestedAt: now
      });
    } catch (e) {
      console.log('[Registration] Email notification failed: ' + e.message);
    }

    return { success: true, id: id, message: 'تم تقديم طلب التسجيل بنجاح' };
  } catch (e) {
    console.log('[Registration] submitRegistrationRequest ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ─── GET PENDING REGISTRATIONS ───
function getPendingRegistrations() {
  var sheet = _ensurePendingSheet();
  var rows = sheet.getDataRange().getValues();
  var pending = [];
  for (var i = 1; i < rows.length; i++) {
    var status = String(rows[i][REG_COL.STATUS] || '');
    if (status === REG_STATUS.PENDING) {
      pending.push({
        id: String(rows[i][REG_COL.ID] || ''),
        fullName: String(rows[i][REG_COL.FULL_NAME] || ''),
        email: String(rows[i][REG_COL.EMAIL] || ''),
        phone: String(rows[i][REG_COL.PHONE] || ''),
        role: String(rows[i][REG_COL.ROLE] || ''),
        department: String(rows[i][REG_COL.DEPARTMENT] || ''),
        position: String(rows[i][REG_COL.POSITION] || ''),
        status: status,
        requestedAt: String(rows[i][REG_COL.REQUESTED_AT] || ''),
        notes: String(rows[i][REG_COL.NOTES] || '')
      });
    }
  }
  return pending;
}

// ─── APPROVE REGISTRATION ───
function approveRegistration(requestId) {
  try {
    _requireAuth('members:write');
    var sheet = _ensurePendingSheet();
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var regData = null;

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][REG_COL.ID]) === String(requestId)) {
        rowIndex = i + 1; // 1-based for sheet
        regData = {
          fullName: String(rows[i][REG_COL.FULL_NAME] || ''),
          email: String(rows[i][REG_COL.EMAIL] || ''),
          phone: String(rows[i][REG_COL.PHONE] || ''),
          role: String(rows[i][REG_COL.ROLE] || 'Operations'),
          department: String(rows[i][REG_COL.DEPARTMENT] || ''),
          position: String(rows[i][REG_COL.POSITION] || ''),
          notes: String(rows[i][REG_COL.NOTES] || '')
        };
        break;
      }
    }

    if (!regData) {
      throw new Error('طلب التسجيل غير موجود: ' + requestId);
    }

    var currentStatus = String(rows[rowIndex - 1][REG_COL.STATUS]);
    if (currentStatus !== REG_STATUS.PENDING) {
      throw new Error('هذا الطلب ليس في حالة معلقة (الحالة: ' + currentStatus + ')');
    }

    // Check Admin/CEO limits
    var limitErr = _checkAdminCEOLimit(regData.role, null);
    if (limitErr) throw new Error(limitErr);

    // Check duplicate email in Members
    var existingMember = getMemberByEmail(regData.email);
    if (existingMember) {
      throw new Error('هذا البريد مسجل بالفعل كعضو');
    }

    // Add to Members
    var memberId = addMember({
      name: regData.fullName,
      email: regData.email,
      role: regData.role,
      phone: regData.phone,
      notes: 'تم التسجيل عبر طلب الموافقة: ' + requestId
    });

    // Update pending row
    var reviewer = '';
    try { reviewer = Session.getActiveUser().getEmail(); } catch(e) {}
    sheet.getRange(rowIndex, REG_COL.STATUS + 1).setValue(REG_STATUS.APPROVED);
    sheet.getRange(rowIndex, REG_COL.REVIEWED_AT + 1).setValue(new Date().toISOString());
    sheet.getRange(rowIndex, REG_COL.REVIEWED_BY + 1).setValue(reviewer);

    console.log('[Registration] Approved: ' + requestId + ' -> Member: ' + memberId);

    // Notify user
    try {
      _notifyUserApproved(regData.email, regData.fullName);
    } catch (e) {
      console.log('[Registration] Approval email failed: ' + e.message);
    }

    _auditLog('REG_APPROVE', requestId, { email: regData.email }, 'SUCCESS');
    return { success: true, memberId: memberId };
  } catch (e) {
    _auditLog('REG_APPROVE', requestId, { error: e.message }, 'FAILED');
    return { success: false, error: e.message };
  }
}

// ─── REJECT REGISTRATION ───
function rejectRegistration(requestId, reason) {
  try {
    _requireAuth('members:write');
    if (!reason) throw new Error('سبب الرفض مطلوب');

    var sheet = _ensurePendingSheet();
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;
    var regData = null;

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][REG_COL.ID]) === String(requestId)) {
        rowIndex = i + 1;
        regData = {
          fullName: String(rows[i][REG_COL.FULL_NAME] || ''),
          email: String(rows[i][REG_COL.EMAIL] || '')
        };
        break;
      }
    }

    if (!regData) {
      throw new Error('طلب التسجيل غير موجود: ' + requestId);
    }

    var currentStatus = String(rows[rowIndex - 1][REG_COL.STATUS]);
    if (currentStatus !== REG_STATUS.PENDING) {
      throw new Error('هذا الطلب ليس في حالة معلقة');
    }

    var reviewer = '';
    try { reviewer = Session.getActiveUser().getEmail(); } catch(e) {}
    sheet.getRange(rowIndex, REG_COL.STATUS + 1).setValue(REG_STATUS.REJECTED);
    sheet.getRange(rowIndex, REG_COL.REVIEWED_AT + 1).setValue(new Date().toISOString());
    sheet.getRange(rowIndex, REG_COL.REVIEWED_BY + 1).setValue(reviewer);
    sheet.getRange(rowIndex, REG_COL.REJECT_REASON + 1).setValue(String(reason).substring(0, 500));

    console.log('[Registration] Rejected: ' + requestId);

    // Notify user
    try {
      _notifyUserRejected(regData.email, regData.fullName, reason);
    } catch (e) {
      console.log('[Registration] Rejection email failed: ' + e.message);
    }

    _auditLog('REG_REJECT', requestId, { email: regData.email, reason: reason }, 'SUCCESS');
    return { success: true };
  } catch (e) {
    _auditLog('REG_REJECT', requestId, { error: e.message }, 'FAILED');
    return { success: false, error: e.message };
  }
}

// ─── GET ALL REGISTRATIONS (including approved/rejected for history) ───
function getAllRegistrations() {
  var sheet = _ensurePendingSheet();
  var rows = sheet.getDataRange().getValues();
  var all = [];
  for (var i = 1; i < rows.length; i++) {
    all.push({
      id: String(rows[i][REG_COL.ID] || ''),
      fullName: String(rows[i][REG_COL.FULL_NAME] || ''),
      email: String(rows[i][REG_COL.EMAIL] || ''),
      phone: String(rows[i][REG_COL.PHONE] || ''),
      role: String(rows[i][REG_COL.ROLE] || ''),
      department: String(rows[i][REG_COL.DEPARTMENT] || ''),
      position: String(rows[i][REG_COL.POSITION] || ''),
      status: String(rows[i][REG_COL.STATUS] || ''),
      requestedAt: String(rows[i][REG_COL.REQUESTED_AT] || ''),
      reviewedAt: String(rows[i][REG_COL.REVIEWED_AT] || ''),
      reviewedBy: String(rows[i][REG_COL.REVIEWED_BY] || ''),
      rejectReason: String(rows[i][REG_COL.REJECT_REASON] || ''),
      notes: String(rows[i][REG_COL.NOTES] || '')
    });
  }
  return all;
}

// ═══════════════════════════════════════════════════════════════════════
// EMAIL NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════

function _getAdminEmails() {
  var emails = [];
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Members');
    if (!sheet) {
      try { emails.push(ss.getOwner().getEmail()); } catch(e) {}
      return emails;
    }
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      try { emails.push(ss.getOwner().getEmail()); } catch(e) {}
      return emails;
    }
    var headers = data[0];
    var emailCol = -1, roleCol = -1;
    for (var h = 0; h < headers.length; h++) {
      var hdr = String(headers[h] || '').toLowerCase().trim();
      if (hdr === 'email') emailCol = h;
      if (hdr === 'role') roleCol = h;
    }
    if (emailCol === -1 || roleCol === -1) {
      try { emails.push(ss.getOwner().getEmail()); } catch(e) {}
      return emails;
    }
    for (var i = 1; i < data.length; i++) {
      var role = String(data[i][roleCol] || '').toUpperCase().trim();
      if (role === 'ADMIN' || role === 'CEO') {
        var em = String(data[i][emailCol] || '').trim();
        if (em && emails.indexOf(em) === -1) {
          emails.push(em);
        }
      }
    }
  } catch (e) {
    console.log('[Registration] _getAdminEmails error: ' + e.message);
  }
  if (emails.length === 0) {
    try { emails.push(SpreadsheetApp.getActiveSpreadsheet().getOwner().getEmail()); } catch(e) {}
  }
  return emails;
}

function _notifyAdminsNewRequest(reg) {
  // FIX: Using string concatenation instead of multi-line strings to avoid syntax errors
  var htmlBody = '<div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">'
    + '<div style="background: #1a237e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">'
    + '<h2 style="margin: 0;">PHINOX BOS - طلب تسجيل جديد</h2>'
    + '</div>'
    + '<div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">'
    + '<p style="color: #333;">تم استلام طلب تسجيل جديد في النظام:</p>'
    + '<table style="width: 100%; border-collapse: collapse; margin-top: 12px;">'
    + '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #e8eaf6; font-weight: bold;">رقم الطلب</td>'
    + '<td style="padding: 8px; border: 1px solid #ddd;">' + esc(reg.id) + '</td></tr>'
    + '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #e8eaf6; font-weight: bold;">الاسم</td>'
    + '<td style="padding: 8px; border: 1px solid #ddd;">' + esc(reg.fullName) + '</td></tr>'
    + '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #e8eaf6; font-weight: bold;">البريد</td>'
    + '<td style="padding: 8px; border: 1px solid #ddd;">' + esc(reg.email) + '</td></tr>'
    + '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #e8eaf6; font-weight: bold;">الدور</td>'
    + '<td style="padding: 8px; border: 1px solid #ddd;">' + esc(reg.role) + '</td></tr>'
    + '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #e8eaf6; font-weight: bold;">القسم</td>'
    + '<td style="padding: 8px; border: 1px solid #ddd;">' + esc(reg.department || '-') + '</td></tr>'
    + '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #e8eaf6; font-weight: bold;">التاريخ</td>'
    + '<td style="padding: 8px; border: 1px solid #ddd;">' + esc(reg.requestedAt) + '</td></tr>'
    + '</table>'
    + '<p style="margin-top: 16px; color: #666; font-size: 13px;">يرجى مراجعة الطلب والموافقة أو الرفض من لوحة التحكم.</p>'
    + '</div></div>';

  var subject = 'PHINOX BOS - طلب تسجيل جديد: ' + reg.fullName;
  var admins = _getAdminEmails();
  for (var i = 0; i < admins.length; i++) {
    try {
      MailApp.sendEmail({
        to: admins[i],
        subject: subject,
        htmlBody: htmlBody
      });
    } catch (e) {
      console.log('[Registration] Failed to send email to ' + admins[i] + ': ' + e.message);
    }
  }
}

function _notifyUserApproved(email, name) {
  var htmlBody = '<div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">'
    + '<div style="background: #16A34A; color: white; padding: 20px; border-radius: 8px 8px 0 0;">'
    + '<h2 style="margin: 0;">PHINOX BOS - تم قبول تسجيلك</h2>'
    + '</div>'
    + '<div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">'
    + '<p style="color: #333; font-size: 15px;">مرحباً <strong>' + esc(name) + '</strong>,</p>'
    + '<p style="color: #333;">تم الموافقة على طلب تسجيلك في نظام PHINOX BOS.</p>'
    + '<p style="color: #333;">يمكنك الآن تسجيل الدخول باستخدام حسابك.</p>'
    + '</div></div>';

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'PHINOX BOS - تم قبول تسجيلك',
      htmlBody: htmlBody
    });
  } catch (e) {
    console.log('[Registration] Approval email failed: ' + e.message);
  }
}

function _notifyUserRejected(email, name, reason) {
  var htmlBody = '<div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto;">'
    + '<div style="background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">'
    + '<h2 style="margin: 0;">PHINOX BOS - تم رفض طلب التسجيل</h2>'
    + '</div>'
    + '<div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">'
    + '<p style="color: #333; font-size: 15px;">مرحباً <strong>' + esc(name) + '</strong>,</p>'
    + '<p style="color: #333;">تم رفض طلب تسجيلك في نظام PHINOX BOS.</p>'
    + '<p style="color: #333;"><strong>سبب الرفض:</strong> ' + esc(reason) + '</p>'
    + '</div></div>';

  try {
    MailApp.sendEmail({
      to: email,
      subject: 'PHINOX BOS - تم رفض طلب التسجيل',
      htmlBody: htmlBody
    });
  } catch (e) {
    console.log('[Registration] Rejection email failed: ' + e.message);
  }
}

// Helper: escape for HTML email content
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════════════════
// UI SERVER ENDPOINTS (called from UI_Index.html via google.script.run)
// ═══════════════════════════════════════════════════════════════════════

function uiGetPendingRegistrations() {
  try {
    _checkRateLimit('uiGetPendingRegistrations');
    _requireAuth('members:read');
    var pending = getPendingRegistrations();
    return { success: true, data: pending };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetAllRegistrations() {
  try {
    _checkRateLimit('uiGetAllRegistrations');
    _requireAuth('members:read');
    var all = getAllRegistrations();
    return { success: true, data: all };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiApproveRegistration(requestId) {
  try {
    _checkRateLimit('uiApproveRegistration');
    _requireAuth('members:write');
    var result = approveRegistration(requestId);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiRejectRegistration(requestId, reason) {
  try {
    _checkRateLimit('uiRejectRegistration');
    _requireAuth('members:write');
    var result = rejectRegistration(requestId, reason);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetRegistrationStats() {
  try {
    _checkRateLimit('uiGetRegistrationStats');
    _requireAuth('members:read');
    var all = getAllRegistrations();
    var pending = 0, approved = 0, rejected = 0;
    for (var i = 0; i < all.length; i++) {
      var s = all[i].status;
      if (s === REG_STATUS.PENDING) pending++;
      else if (s === REG_STATUS.APPROVED) approved++;
      else if (s === REG_STATUS.REJECTED) rejected++;
    }
    return { success: true, data: { total: all.length, pending: pending, approved: approved, rejected: rejected } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MENU HANDLERS (add to 11_Menu.js if desired)
// ═══════════════════════════════════════════════════════════════════════

function menuShowPendingRegistrations() {
  try {
    var pending = getPendingRegistrations();
    if (!pending.length) {
      SpreadsheetApp.getUi().alert('لا توجد طلبات تسجيل معلقة.');
      return;
    }
    var msg = 'طلبات التسجيل المعلقة (' + pending.length + '):\n\n';
    for (var i = 0; i < pending.length; i++) {
      msg += (i + 1) + '. ' + pending[i].fullName + ' (' + pending[i].email + ') - ' + pending[i].role + '\n';
    }
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}