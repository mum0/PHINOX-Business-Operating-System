// ═══════════════════════════════════════════════════════════════════════
// PHINOX BOS v5 — Setup & Sheet Initialization
// ═══════════════════════════════════════════════════════════════════════════════════
// CRITICAL: Members headers MUST match MEMBER_COL in 13_Permissions.js exactly.
// Any column order change here MUST be reflected in MEMBER_COL constants.
// Also includes auto-migration from old 9-column to new 12-column Members format.
// UPDATE (2026-08-27): Added menu refresh after setup completes.
// ═══════════════════════════════════════════════════════════════════════════════════

var SHEET_CONFIGS = {
  'Members': {
    headers: ['id','fullName','role','email','phone','status','joinDate','kpiScore','tasksCompleted','tasksLate','averageQuality','notes'],
    widths: [22, 20, 14, 28, 16, 12, 16, 10, 12, 10, 12, 30]
  },
  'Tasks': {
    headers: ['id','title','description','assigneeEmail','priority','status','dueDate','createdAt','completedAt','approvedBy','notes'],
    widths: [22, 25, 35, 25, 12, 14, 14, 16, 16, 20, 30]
  },
  'KPI': {
    headers: ['id','name','category','target','actual','unit','period','periodType','createdAt','notes'],
    widths: [22, 20, 16, 12, 12, 10, 14, 14, 16, 30]
  },
  'Inventory': {
    headers: ['id','sku','name','category','quantity','unitCost','sellingPrice','minStock','supplier','status','createdAt','updatedAt','notes'],
    widths: [22, 18, 22, 16, 10, 12, 12, 10, 20, 12, 16, 16, 30]
  },
  'Suppliers': {
    headers: ['id','name','contactPerson','email','phone','address','category','rating','status','notes'],
    widths: [22, 22, 20, 25, 16, 30, 16, 10, 12, 30]
  },
  'Orders': {
    headers: ['id','customerEmail','customerName','items','totalAmount','status','orderDate','deliveryDate','notes'],
    widths: [22, 25, 20, 40, 14, 12, 14, 14, 30]
  },
  'Finance': {
    headers: ['id','date','type','category','description','amount','account','ref','createdAt','notes'],
    widths: [22, 14, 14, 18, 30, 14, 18, 22, 16, 30]
  },
  'Reports': {
    headers: ['id','type','title','data','generatedBy','generatedAt','notes'],
    widths: [22, 16, 25, 50, 22, 18, 30]
  },
  'Settings': {
    headers: ['key','value','updatedBy','updatedAt','notes'],
    widths: [25, 40, 22, 18, 30]
  },
  'Audit Log': {
    headers: ['id','date','user','action','sheet','recordId','oldValue','newValue'],
    widths: [22, 18, 25, 20, 14, 22, 30, 30]
  },
  'Approvals': {
    headers: ['id','type','requester','requestDate','targetSheet','targetId','details','status','approver','approvalDate','notes'],
    widths: [22, 18, 22, 16, 16, 22, 40, 14, 22, 16, 30]
  },
  'Archive': {
    headers: ['id','originalSheet','data','deletedBy','deletedAt','restoredAt','purgeAfter'],
    widths: [22, 18, 50, 22, 18, 18, 14]
  },
  'Customers': {
    headers: ['id','name','email','phone','address','city','status','totalOrders','totalSpent','createdAt','notes'],
    widths: [22, 22, 25, 16, 30, 14, 12, 12, 14, 16, 30]
  },
  'Sales': {
    headers: ['id','orderId','productId','productName','quantity','unitPrice','total','saleDate','salesperson','channel','notes'],
    widths: [22, 22, 22, 22, 10, 12, 12, 14, 20, 14, 30]
  },
  'Marketing': {
    headers: ['id','date','channel','campaign','reach','impressions','clicks','conversions','cost','notes'],
    widths: [22, 14, 14, 22, 12, 12, 10, 12, 12, 30]
  },
  'Social': {
    headers: ['id','date','platform','followers','reach','impressions','engagements','likes','comments','shares','saves','videoViews','profileVisits','linkClicks','leads','purchases','revenue','notes'],
    widths: [22, 14, 12, 12, 12, 12, 12, 10, 10, 10, 10, 12, 12, 12, 10, 10, 12, 30]
  },
  'Satisfaction': {
    headers: ['id','customerId','customerName','score','feedback','category','date','followUp','notes'],
    widths: [22, 22, 22, 10, 35, 16, 14, 10, 30]
  },
  'NPS': {
    headers: ['id','customerId','customerName','score','feedback','date','notes'],
    widths: [22, 22, 22, 10, 35, 14, 30]
  },
  'BOM': {
    headers: ['id','sku','name','totalCost','status','createdAt','updatedAt','notes'],
    widths: [22, 18, 22, 14, 12, 16, 16, 30]
  },
  'BOM_ITEM': {
    headers: ['id','bomId','componentSku','componentName','quantity','unit','unitCost','totalCost','notes'],
    widths: [22, 22, 18, 22, 10, 10, 12, 12, 30]
  },
  'Expenses': {
    headers: ['id','date','category','amount','description','submittedBy','status','approvedBy','approvedAt','postedToAccount','account','receiptUrl','notes'],
    widths: [22, 14, 16, 14, 30, 22, 14, 22, 16, 18, 18, 25, 30]
  },
  // NEW (2026-08-27): AuditLog sheet for security logging
  'AuditLog': {
    headers: ['timestamp','userEmail','userRole','action','target','details','status','ip'],
    widths: [20, 25, 14, 20, 25, 40, 12, 20]
  }
};

/**
 * Auto-migrate Members sheet from old 9-column format to new 12-column format.
 */
function _migrateMembersIfNeeded(opt_ss) {
  var ss = opt_ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Members');
  if (!sheet) {
    console.log('[SETUP] No Members sheet — will be created by normal flow.');
    return;
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    console.log('[SETUP] Members sheet is blank — will be set up by normal flow.');
    return;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var expected = SHEET_CONFIGS['Members'].headers;

  if (existingHeaders.length >= expected.length) {
    var isCorrect = true;
    for (var i = 0; i < expected.length; i++) {
      if (String(existingHeaders[i]) !== expected[i]) { isCorrect = false; break; }
    }
    if (isCorrect) {
      console.log('[SETUP] Members columns already correct (' + existingHeaders.length + ' cols). No migration needed.');
      return;
    }
  }

  console.log('[SETUP] Members migration needed. Old headers: ' + JSON.stringify(existingHeaders));

  var lastRow = sheet.getLastRow();
  var oldData = [];
  if (lastRow > 1) {
    oldData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  }
  console.log('[SETUP] Read ' + oldData.length + ' existing member rows.');

  var oldIdx = {};
  for (var h = 0; h < existingHeaders.length; h++) {
    var hdr = String(existingHeaders[h]).toLowerCase().trim();
    if (hdr === 'id' || hdr === 'member_id') oldIdx.id = h;
    else if (hdr === 'name' || hdr === 'fullname' || hdr === 'full_name') oldIdx.name = h;
    else if (hdr === 'email') oldIdx.email = h;
    else if (hdr === 'role') oldIdx.role = h;
    else if (hdr === 'phone') oldIdx.phone = h;
    else if (hdr === 'status') oldIdx.status = h;
    else if (hdr === 'department' || hdr === 'dept') oldIdx.dept = h;
    else if (hdr === 'kpiscore' || hdr === 'kpi_score' || hdr === 'kpi') oldIdx.kpi = h;
  }
  console.log('[SETUP] Detected old column map: ' + JSON.stringify(oldIdx));

  var newRows = [];
  for (var r = 0; r < oldData.length; r++) {
    var row = oldData[r];
    newRows.push([
      oldIdx.id    !== undefined ? row[oldIdx.id]    : ('MEM-' + String(r + 1).padStart(3, '0')),
      oldIdx.name  !== undefined ? row[oldIdx.name]  : '',
      oldIdx.role  !== undefined ? row[oldIdx.role]  : 'Operations',
      oldIdx.email !== undefined ? row[oldIdx.email] : '',
      oldIdx.phone !== undefined ? row[oldIdx.phone] : '',
      oldIdx.status !== undefined ? row[oldIdx.status] : 'Active',
      new Date().toISOString().split('T')[0],
      oldIdx.kpi   !== undefined ? row[oldIdx.kpi]   : 0,
      0, 0, 0,
      ''
    ]);
  }

  if (newRows.length === 0) {
    var currentUser = Session.getActiveUser().getEmail();
    newRows.push([
      'MEM-001',
      'Admin User',
      'Admin',
      currentUser,
      '',
      'Active',
      new Date().toISOString().split('T')[0],
      0, 0, 0, 0,
      'Initial admin created by Setup migration'
    ]);
    console.log('[SETUP] No existing data. Seeded default Admin: ' + currentUser);
  }

  ss.deleteSheet(sheet);
  var newSheet = ss.insertSheet('Members');

  newSheet.getRange(1, 1, 1, expected.length).setValues([expected])
    .setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');

  newSheet.getRange(2, 1, newRows.length, expected.length).setValues(newRows);

  var widths = SHEET_CONFIGS['Members'].widths;
  for (var w = 0; w < widths.length; w++) {
    newSheet.setColumnWidth(w + 1, widths[w]);
  }

  console.log('[SETUP] Members migration done! ' + newRows.length + ' rows → new 12-column format.');
}


function run() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  console.log('[SETUP] Starting sheet initialization...');

  // ── Step 1: Migrate Members if columns are outdated ──
  _migrateMembersIfNeeded(ss);

  // ── Step 2: Create / verify all sheets ──
  var sheetNames = Object.keys(SHEET_CONFIGS);
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var config = SHEET_CONFIGS[name];
    var sheet = ss.getSheetByName(name);

    if (!sheet) {
      sheet = ss.insertSheet(name);
      console.log('[SETUP] Created sheet: ' + name);
    }

    var headerRow = sheet.getRange(1, 1, 1, config.headers.length);
    var existingHeaders = headerRow.getValues()[0];
    var needsUpdate = false;

    for (var j = 0; j < config.headers.length; j++) {
      if (existingHeaders[j] !== config.headers[j]) {
        needsUpdate = true;
        break;
      }
    }

    if (needsUpdate || existingHeaders[0] === '') {
      headerRow.setValues([config.headers]);
      headerRow.setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff');
      console.log('[SETUP] Headers set for: ' + name + ' (' + config.headers.length + ' columns)');
    }

    if (config.widths) {
      for (var j = 0; j < config.widths.length; j++) {
        sheet.setColumnWidth(j + 1, config.widths[j]);
      }
    }
  }

  console.log('[SETUP] Done. ' + sheetNames.length + ' sheets verified.');

  // ── Step 3: Refresh menu so new items appear immediately ──
  try {
    if (typeof onOpen === 'function') {
      onOpen();
      console.log('[SETUP] Menu refreshed successfully.');
    }
  } catch (e) {
    console.log('[SETUP] Menu refresh skipped: ' + e.message);
  }

  // ── Step 4: Show completion message ──
  try {
    SpreadsheetApp.getUi().alert('PHINOX BOS Setup Complete', 'All sheets verified and menu refreshed.\n\nNew security features active:\n• Rate Limiting\n• Audit Logging\n• Input Validation\n• Security Tests', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    console.log('[SETUP] ' + e.message);
  }

  return 'Setup complete. ' + sheetNames.length + ' sheets verified.';
}