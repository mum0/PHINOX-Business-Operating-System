/**
 * ============================================================
 * PHINOX Business Operating System
 * Permissions.gs
 * Access Control & Security Engine
 * ============================================================
 */

function ensureAppConstants(){
  if(typeof APP === 'undefined') throw new Error("APP config missing. Config.gs must load first.");
  if(!APP.ROLES){
    APP.ROLES = { CEO: "CEO", PARTNER: "Partner", DESIGNER: "Designer", MARKETING: "Marketing", OPERATIONS: "Operations", CUSTOMER_SERVICE: "Customer Service", FINANCE: "Finance" };
  }
  if(!APP.SHEETS){ APP.SHEETS = {}; }
  if(!APP.SHEETS.AUDIT){ APP.SHEETS.AUDIT = "Audit Log"; }
}

const MEMBER_COL = { MEMBER_ID: 0, FULL_NAME: 1, ROLE: 2, EMAIL: 3, PHONE: 4, STATUS: 5, JOIN_DATE: 6, KPI_SCORE: 7, TASKS_COMPLETED: 8, TASKS_LATE: 9, AVERAGE_QUALITY: 10, NOTES: 11 };
const AUDIT_COL = { LOG_ID: 0, DATE: 1, USER: 2, ACTION: 3, SHEET: 4, RECORD_ID: 5, OLD_VALUE: 6, NEW_VALUE: 7 };

const PERMISSIONS = {
  MEMBERS_READ: "members:read", MEMBERS_WRITE: "members:write", MEMBERS_DELETE: "members:delete",
  TASKS_READ: "tasks:read", TASKS_WRITE: "tasks:write", TASKS_DELETE: "tasks:delete", TASKS_APPROVE: "tasks:approve",
  KPI_READ: "kpi:read", KPI_WRITE: "kpi:write",
  INVENTORY_READ: "inventory:read", INVENTORY_WRITE: "inventory:write", INVENTORY_DELETE: "inventory:delete",
  SUPPLIERS_READ: "suppliers:read", SUPPLIERS_WRITE: "suppliers:write", SUPPLIERS_DELETE: "suppliers:delete",
  ORDERS_READ: "orders:read", ORDERS_WRITE: "orders:write", ORDERS_DELETE: "orders:delete",
  FINANCE_READ: "finance:read", FINANCE_WRITE: "finance:write", FINANCE_DELETE: "finance:delete",
  REPORTS_READ: "reports:read", REPORTS_WRITE: "reports:write",
  SETTINGS_READ: "settings:read", SETTINGS_WRITE: "settings:write",
  ADMIN: "admin"
};

let _permissionMatrixCache = null;

function getPermissionMatrix(){
  if(_permissionMatrixCache !== null) return _permissionMatrixCache;
  ensureAppConstants();
  const matrix = {
    [APP.ROLES.CEO]: [
      PERMISSIONS.MEMBERS_READ, PERMISSIONS.MEMBERS_WRITE, PERMISSIONS.MEMBERS_DELETE,
      PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_WRITE, PERMISSIONS.TASKS_DELETE, PERMISSIONS.TASKS_APPROVE,
      PERMISSIONS.KPI_READ, PERMISSIONS.KPI_WRITE,
      PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_WRITE, PERMISSIONS.INVENTORY_DELETE,
      PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.SUPPLIERS_WRITE, PERMISSIONS.SUPPLIERS_DELETE,
      PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE, PERMISSIONS.ORDERS_DELETE,
      PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_WRITE, PERMISSIONS.FINANCE_DELETE,
      PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_WRITE,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE,
      PERMISSIONS.ADMIN
    ],
    [APP.ROLES.PARTNER]: [
      PERMISSIONS.MEMBERS_READ, PERMISSIONS.MEMBERS_WRITE,
      PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_WRITE, PERMISSIONS.TASKS_APPROVE,
      PERMISSIONS.KPI_READ, PERMISSIONS.KPI_WRITE,
      PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.SUPPLIERS_WRITE,
      PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_WRITE,
      PERMISSIONS.REPORTS_READ, PERMISSIONS.REPORTS_WRITE,
      PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE
    ],
    [APP.ROLES.FINANCE]: [
      PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_WRITE, PERMISSIONS.REPORTS_READ,
      PERMISSIONS.ORDERS_READ, PERMISSIONS.INVENTORY_READ, PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.KPI_READ
    ],
    [APP.ROLES.OPERATIONS]: [
      PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_WRITE,
      PERMISSIONS.INVENTORY_READ, PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.SUPPLIERS_WRITE,
      PERMISSIONS.KPI_READ, PERMISSIONS.REPORTS_READ
    ],
    [APP.ROLES.MARKETING]: [
      PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_WRITE,
      PERMISSIONS.ORDERS_READ, PERMISSIONS.REPORTS_READ, PERMISSIONS.KPI_READ
    ],
    [APP.ROLES.DESIGNER]: [
      PERMISSIONS.TASKS_READ, PERMISSIONS.TASKS_WRITE,
      PERMISSIONS.INVENTORY_READ, PERMISSIONS.KPI_READ
    ],
    [APP.ROLES.CUSTOMER_SERVICE]: [
      PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.MEMBERS_READ, PERMISSIONS.TASKS_READ
    ]
  };
  _permissionMatrixCache = matrix;
  return matrix;
}

function getRole(member){
  if(Array.isArray(member)) return member[MEMBER_COL.ROLE];
  const m = getMember(member);
  return m ? m[MEMBER_COL.ROLE] : null;
}

function isAdmin(member){
  const role = getRole(member);
  return role === APP.ROLES.CEO || role === APP.ROLES.PARTNER;
}

function isManager(member){
  const role = getRole(member);
  return isAdmin(member) || role === APP.ROLES.OPERATIONS;
}

function isMemberLevel(member){
  const role = getRole(member);
  return role !== null && !isAdmin(member);
}

function hasPermission(member, permission){
  const role = getRole(member);
  if(!role) return false;
  const matrix = getPermissionMatrix();
  const list = matrix[role] || [];
  return list.includes(permission);
}

function hasAnyPermission(member, permissions){
  if(!Array.isArray(permissions)) return hasPermission(member, permissions);
  return permissions.some(p => hasPermission(member, p));
}

function hasAllPermissions(member, permissions){
  if(!Array.isArray(permissions)) return hasPermission(member, permissions);
  return permissions.every(p => hasPermission(member, p));
}

function requirePermission(member, permission){
  if(!hasPermission(member, permission)){
    throw new Error(t("err_access_denied", {permission: permission}));
  }
}

function getRolePermissions(role){
  const matrix = getPermissionMatrix();
  return matrix[role] || [];
}

function listRoles(){
  ensureAppConstants();
  return Object.values(APP.ROLES);
}

function assignRole(memberId, newRole, admin){
  requirePermission(admin, PERMISSIONS.ADMIN);
  ensureAppConstants();
  if(!Object.values(APP.ROLES).includes(newRole)){
    throw new Error(t("err_invalid_role"));
  }
  const member = getMemberById(memberId);
  if(!member){
    throw new Error(t("err_member_not_found"));
  }
  const oldRole = member[MEMBER_COL.ROLE];
  updateMember(memberId, {role: newRole});
  logActivity(admin, "Assign Role", APP.SHEETS.MEMBERS, memberId, oldRole, newRole);
  return true;
}

function getCurrentMember(){
  let email = null;
  try{
    email = Session.getActiveUser().getEmail();
  }catch(e1){
    try{ email = Session.getEffectiveUser().getEmail(); }catch(e2){ log("Session fallback failed: "+e2); return null; }
  }
  if(isEmpty(email)) return null;
  const members = getMembers();
  for(const m of members){
    if(m[MEMBER_COL.EMAIL] === email) return m;
  }
  return null;
}

function getSheetPermission(sheetName){
  const map = {
    [APP.SHEETS.MEMBERS]: { read: PERMISSIONS.MEMBERS_READ, write: PERMISSIONS.MEMBERS_WRITE, delete: PERMISSIONS.MEMBERS_DELETE },
    [APP.SHEETS.TASKS]: { read: PERMISSIONS.TASKS_READ, write: PERMISSIONS.TASKS_WRITE, delete: PERMISSIONS.TASKS_DELETE },
    [APP.SHEETS.KPI]: { read: PERMISSIONS.KPI_READ, write: PERMISSIONS.KPI_WRITE },
    [APP.SHEETS.INVENTORY]: { read: PERMISSIONS.INVENTORY_READ, write: PERMISSIONS.INVENTORY_WRITE, delete: PERMISSIONS.INVENTORY_DELETE },
    [APP.SHEETS.SUPPLIERS]: { read: PERMISSIONS.SUPPLIERS_READ, write: PERMISSIONS.SUPPLIERS_WRITE, delete: PERMISSIONS.SUPPLIERS_DELETE },
    [APP.SHEETS.ORDERS]: { read: PERMISSIONS.ORDERS_READ, write: PERMISSIONS.ORDERS_WRITE, delete: PERMISSIONS.ORDERS_DELETE },
    [APP.SHEETS.FINANCE]: { read: PERMISSIONS.FINANCE_READ, write: PERMISSIONS.FINANCE_WRITE, delete: PERMISSIONS.FINANCE_DELETE },
    [APP.SHEETS.REPORTS]: { read: PERMISSIONS.REPORTS_READ, write: PERMISSIONS.REPORTS_WRITE },
    [APP.SHEETS.SETTINGS]: { read: PERMISSIONS.SETTINGS_READ, write: PERMISSIONS.SETTINGS_WRITE },
    [APP.SHEETS.DASHBOARD]: { read: PERMISSIONS.REPORTS_READ, write: PERMISSIONS.REPORTS_WRITE }
  };
  return map[sheetName] || null;
}

function canReadSheet(member, sheetName){
  const perm = getSheetPermission(sheetName);
  if(!perm) return false;
  return hasPermission(member, perm.read);
}

function canWriteSheet(member, sheetName){
  const perm = getSheetPermission(sheetName);
  if(!perm) return false;
  return hasPermission(member, perm.write);
}

function canDeleteSheet(member, sheetName){
  const perm = getSheetPermission(sheetName);
  if(!perm || !perm.delete) return false;
  return hasPermission(member, perm.delete);
}

function canApproveTasks(member){ return hasPermission(member, PERMISSIONS.TASKS_APPROVE); }
function canViewKPI(member){ return hasPermission(member, PERMISSIONS.KPI_READ); }
function canEditKPI(member){ return hasPermission(member, PERMISSIONS.KPI_WRITE); }

function secureOperation(member, permission, operation){
  requirePermission(member, permission);
  if(typeof operation !== 'function') throw new Error("Operation must be a function");
  return operation();
}

function logActivity(user, action, sheet, recordId, oldValue, newValue){
  ensureAppConstants();
  const auditSheet = getSheet(APP.SHEETS.AUDIT);
  const userName = typeof user === 'string' ? user : (user ? user[MEMBER_COL.FULL_NAME] : 'System');
  auditSheet.appendRow([
    generateId("LOG"), now(), userName, action,
    sheet || "", recordId || "",
    oldValue !== undefined ? String(oldValue) : "",
    newValue !== undefined ? String(newValue) : ""
  ]);
}

function getActivityLog(){
  ensureAppConstants();
  const sheet = getSheet(APP.SHEETS.AUDIT);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getActivityByUser(user){ return getActivityLog().filter(row => row[AUDIT_COL.USER] === user); }
function getActivityBySheet(sheetName){ return getActivityLog().filter(row => row[AUDIT_COL.SHEET] === sheetName); }
function getActivityByAction(action){ return getActivityLog().filter(row => row[AUDIT_COL.ACTION] === action); }
function getRecentActivity(limit){
  const log = getActivityLog();
  if(log.length === 0) return [];
  return log.slice(-limit);
}
/**
 * ============================================================
 * PHINOX BOS — Advanced Security Layer v3.4
 * Approval Workflows · Soft Delete · Field Permissions · Backup
 * ============================================================
 */

/* ───────────────────────────────────────────
   1. APPROVAL WORKFLOWS ENGINE
   ─────────────────────────────────────────── */

   const WORKFLOW_TYPES = {
    EXPENSE_APPROVAL: {name: 'اعتماد مصروف', approvers: ['CEO','Partner','Finance'], autoExecute: true},
    PURCHASE_APPROVAL: {name: 'اعتماد مشتريات', approvers: ['CEO','Partner','Operations'], autoExecute: true},
    MEMBER_DELETE: {name: 'حذف عضو', approvers: ['CEO'], autoExecute: false},
    TASK_CANCEL: {name: 'إلغاء مهمة', approvers: ['CEO','Partner'], autoExecute: true},
    BUDGET_OVERRIDE: {name: 'تجاوز الميزانية', approvers: ['CEO'], autoExecute: false},
    SHAREHOLDER_CHANGE: {name: 'تعديل مساهم', approvers: ['CEO','Partner'], autoExecute: true}
  };
  
  const APPROVAL_COL = {
    ID:0, TYPE:1, REQUESTER:2, REQUEST_DATE:3, TARGET_SHEET:4, TARGET_ID:5,
    DETAILS:6, STATUS:7, APPROVER:8, APPROVAL_DATE:9, NOTES:10
  };
  
  function ensureApprovalSheet(){
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Approval Requests');
    if(!sheet){
      sheet = ss.insertSheet('Approval Requests');
      var h = ['Request ID','Type','Requester','Date','Target Sheet','Target ID','Details','Status','Approver','Approval Date','Notes'];
      sheet.getRange(1,1,1,h.length).setValues([h])
        .setBackground(APP.COLORS.HEADER).setFontColor('#FFFFFF').setFontWeight('bold');
      for(var i=1;i<=h.length;i++) sheet.setColumnWidth(i,150);
    }
    return sheet;
  }
  
  function submitApprovalRequest(data){
    ensureApprovalSheet();
    var sheet = getSheet('Approval Requests');
    var member = getCurrentMember();
    if(!member) throw new Error(t('err_access_denied'));
    
    var typeDef = WORKFLOW_TYPES[data.type];
    if(!typeDef) throw new Error('نوع الطلب غير معروف');
    
    var row = [
      generateId('APR'),
      typeDef.name,
      member[1],
      now(),
      data.targetSheet || '',
      data.targetId || '',
      JSON.stringify(data.details || {}),
      'Pending',
      '',
      '',
      data.notes || ''
    ];
    
    sheet.appendRow(row);
    
    // Notify approvers
    var approvers = getApproversList(typeDef.approvers);
    approvers.forEach(function(email){
      try{
        GmailApp.sendEmail(email, '⚡ طلب اعتماد: ' + typeDef.name, 
          'الطالب: ' + member[1] + '\nالتفاصيل: ' + (data.details ? JSON.stringify(data.details) : '') +
          '\n\nافتح PHINOX للاعتماد أو الرفض.');
      }catch(e){ /* ignore email errors */ }
    });
    
    logActivity(member, 'طلب اعتماد', 'Approval Requests', row[0], '', typeDef.name);
    showToast('تم إرسال طلب الاعتماد: ' + row[0]);
    return row[0];
  }
  
  function getApproversList(roles){
    var members = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
    var emails = [];
    for(var i=1;i<members.length;i++){
      if(roles.indexOf(members[i][2]) > -1 && members[i][3]){
        emails.push(String(members[i][3]).trim());
      }
    }
    return emails;
  }
  
  function getPendingApprovalRequests(){
    ensureApprovalSheet();
    var sheet = getSheet('Approval Requests');
    var data = sheet.getDataRange().getValues();
    var result = [];
    for(var i=1;i<data.length;i++){
      if(data[i][APPROVAL_COL.STATUS] === 'Pending'){
        result.push({
          id: data[i][APPROVAL_COL.ID],
          type: data[i][APPROVAL_COL.TYPE],
          requester: data[i][APPROVAL_COL.REQUESTER],
          date: formatDateStr(data[i][APPROVAL_COL.REQUEST_DATE]),
          targetSheet: data[i][APPROVAL_COL.TARGET_SHEET],
          targetId: data[i][APPROVAL_COL.TARGET_ID],
          details: data[i][APPROVAL_COL.DETAILS]
        });
      }
    }
    return result;
  }
  
  function approveRequest(data){
    return processApproval(data, 'Approved', 'تم الاعتماد');
  }
  
  function rejectRequest(data){
    return processApproval(data, 'Rejected', 'تم الرفض');
  }
  
  function processApproval(data, status, actionText){
    var member = getCurrentMember();
    if(!member) throw new Error(t('err_access_denied'));
    
    var sheet = getSheet('Approval Requests');
    var allData = sheet.getDataRange().getValues();
    var found = false;
    var requestType = '';
    var details = {};
    
    for(var i=1;i<allData.length;i++){
      if(allData[i][APPROVAL_COL.ID] === data.requestId){
        // Check if user is authorized approver
        var typeKey = Object.keys(WORKFLOW_TYPES).find(function(k){
          return WORKFLOW_TYPES[k].name === allData[i][APPROVAL_COL.TYPE];
        });
        if(!typeKey || WORKFLOW_TYPES[typeKey].approvers.indexOf(member[2]) === -1){
          throw new Error('ليس لديك صلاحية ' + actionText + ' هذا الطلب');
        }
        
        allData[i][APPROVAL_COL.STATUS] = status;
        allData[i][APPROVAL_COL.APPROVER] = member[1];
        allData[i][APPROVAL_COL.APPROVAL_DATE] = now();
        allData[i][APPROVAL_COL.NOTES] = data.notes || '';
        
        requestType = allData[i][APPROVAL_COL.TYPE];
        try{ details = JSON.parse(allData[i][APPROVAL_COL.DETAILS]); }catch(e){}
        
        sheet.getRange(i+1, 1, 1, allData[i].length).setValues([allData[i]]);
        found = true;
        break;
      }
    }
    
    if(!found) throw new Error('الطلب غير موجود');
    
    // Auto-execute if configured
    var typeDef = Object.values(WORKFLOW_TYPES).find(function(t){ return t.name === requestType; });
    if(typeDef && typeDef.autoExecute && status === 'Approved'){
      executeApprovedAction(requestType, details);
    }
    
    logActivity(member, actionText, 'Approval Requests', data.requestId, 'Pending', status);
    showToast(actionText + ' بنجاح');
    return {success: true, message: actionText};
  }
  
  function executeApprovedAction(typeName, details){
    try{
      if(typeName === WORKFLOW_TYPES.EXPENSE_APPROVAL.name && details.amount){
        addExpense({
          type: details.expenseType || 'مصروف',
          supplier: details.supplier || '',
          description: details.description || 'مصروف معتمد',
          amount: details.amount,
          notes: 'معتمد تلقائياً: ' + (details.requestId || '')
        });
      }
      else if(typeName === WORKFLOW_TYPES.TASK_CANCEL.name && details.taskId){
        var tSheet = getSheet(APP.SHEETS.TASKS);
        var tData = tSheet.getDataRange().getValues();
        for(var i=1;i<tData.length;i++){
          if(tData[i][0] === details.taskId){
            tData[i][6] = 'Cancelled';
            tSheet.getRange(i+1, 1, 1, tData[i].length).setValues([tData[i]]);
            break;
          }
        }
      }
    }catch(e){
      Logger.log('Auto-execute failed: ' + e);
    }
  }
  
  /* ───────────────────────────────────────────
     2. SOFT DELETE ENGINE
     ─────────────────────────────────────────── */
  
  const ARCHIVE_COL = {
    ID:0, ORIGINAL_SHEET:1, ORIGINAL_DATA:2, DELETED_BY:3, DELETED_AT:4, RESTORED_AT:5, PURGE_AFTER:6
  };
  
  function ensureArchiveSheet(){
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('Archive');
    if(!sheet){
      sheet = ss.insertSheet('Archive');
      var h = ['Archive ID','Original Sheet','Data (JSON)','Deleted By','Deleted At','Restored At','Purge After'];
      sheet.getRange(1,1,1,h.length).setValues([h])
        .setBackground(APP.COLORS.HEADER).setFontColor('#FFFFFF').setFontWeight('bold');
      for(var i=1;i<=h.length;i++) sheet.setColumnWidth(i,160);
    }
    return sheet;
  }
  
  function softDeleteRecord(data){
    var member = getCurrentMember();
    if(!member) throw new Error(t('err_access_denied'));
    
    var sheet = getSheet(data.sheet);
    var allData = sheet.getDataRange().getValues();
    var foundRow = -1;
    var recordData = null;
    
    for(var i=1;i<allData.length;i++){
      if(String(allData[i][0]).trim() === String(data.id).trim()){
        foundRow = i + 1;
        recordData = allData[i];
        break;
      }
    }
    
    if(foundRow < 0) throw new Error('السجل غير موجود');
    
    // Save to archive
    ensureArchiveSheet();
    var archive = getSheet('Archive');
    var purgeDate = new Date();
    purgeDate.setDate(purgeDate.getDate() + 30); // Auto purge after 30 days
    
    archive.appendRow([
      generateId('ARC'),
      data.sheet,
      JSON.stringify(recordData),
      member[1],
      now(),
      '',
      Utilities.formatDate(purgeDate, APP.INFO.TIMEZONE, 'yyyy-MM-dd')
    ]);
    
    // Delete from original
    sheet.deleteRow(foundRow);
    
    logActivity(member, 'حذف ناعم', data.sheet, data.id, '', 'محفوظ في Archive');
    showToast('تم الحذف الناعم — يمكن الاسترجاع خلال 30 يوم');
    return {success: true};
  }
  
  function restoreRecord(archiveId){
    var member = getCurrentMember();
    if(!member || member[2] !== 'CEO') throw new Error('فقط CEO يستطيع الاسترجاع');
    
    var archive = getSheet('Archive');
    var aData = archive.getDataRange().getValues();
    var found = false;
    
    for(var i=1;i<aData.length;i++){
      if(aData[i][ARCHIVE_COL.ID] === archiveId && !aData[i][ARCHIVE_COL.RESTORED_AT]){
        var originalSheet = String(aData[i][ARCHIVE_COL.ORIGINAL_SHEET]);
        var recordData = JSON.parse(aData[i][ARCHIVE_COL.ORIGINAL_DATA]);
        
        var sheet = getSheet(originalSheet);
        sheet.appendRow(recordData);
        
        aData[i][ARCHIVE_COL.RESTORED_AT] = now();
        archive.getRange(i+1, 1, 1, aData[i].length).setValues([aData[i]]);
        
        found = true;
        logActivity(member, 'استرجاع سجل', originalSheet, archiveId, '', 'مسترجع من Archive');
        showToast('تم الاسترجاع بنجاح');
        break;
      }
    }
    
    if(!found) throw new Error('السجل غير موجود أو تم استرجاعه مسبقاً');
    return {success: true};
  }
  
  function getArchivedRecords(){
    ensureArchiveSheet();
    var archive = getSheet('Archive');
    var data = archive.getDataRange().getValues();
    var result = [];
    for(var i=1;i<data.length;i++){
      if(!data[i][ARCHIVE_COL.RESTORED_AT]){
        result.push({
          id: data[i][ARCHIVE_COL.ID],
          sheet: data[i][ARCHIVE_COL.ORIGINAL_SHEET],
          deletedBy: data[i][ARCHIVE_COL.DELETED_BY],
          deletedAt: formatDateStr(data[i][ARCHIVE_COL.DELETED_AT]),
          purgeAfter: data[i][ARCHIVE_COL.PURGE_AFTER]
        });
      }
    }
    return result;
  }
  
  function purgeOldArchives(){
    var archive = getSheet('Archive');
    var data = archive.getDataRange().getValues();
    var today = new Date();
    var deletedCount = 0;
    
    for(var i=data.length-1;i>=1;i--){
      var purgeDate = data[i][ARCHIVE_COL.PURGE_AFTER] ? new Date(data[i][ARCHIVE_COL.PURGE_AFTER]) : null;
      var restored = data[i][ARCHIVE_COL.RESTORED_AT];
      
      if(!restored && purgeDate && purgeDate < today){
        archive.deleteRow(i+1);
        deletedCount++;
      }
    }
    
    Logger.log('Purged ' + deletedCount + ' old archives');
    return deletedCount;
  }
  
  /* ───────────────────────────────────────────
     3. FIELD-LEVEL PERMISSIONS
     ─────────────────────────────────────────── */
  
  const FIELD_VISIBILITY = {
    CEO: {all: true},
    Partner: {
      Members: ['Member ID','Full Name','Role','Email','Phone','Status','Join Date','KPI Score','Tasks Completed','Tasks Late','Avg Quality','Notes'],
      Finance: ['Transaction ID','Date','Type','Category','Description','Amount','Balance'],
      Inventory: ['Item ID','Item Name','Category','Variant','Color','Size','Barcode','Quantity','Unit','Minimum Stock','Warehouse','Supplier','Cost','Price','Updated At'],
      Orders: ['Order ID','Customer','Phone','Email','Date','Status','Items Count','Amount','Payment Status','Payment Method','Shipping Address','Tracking Number','Shipping Date','Delivery Date','Notes','Return Status','Return Reason','Return Date'],
      Shareholders: ['Name','Email','Shares','Ownership','Inv Value','Current Value','Profit','Loss']
    },
    Finance: {
      Members: ['Member ID','Full Name','Role','Email','Phone','Status','Join Date'],
      Finance: ['Transaction ID','Date','Type','Category','Description','Amount','Balance'],
      Inventory: ['Item ID','Item Name','Category','Variant','Color','Size','Barcode','Quantity','Unit','Minimum Stock','Warehouse','Supplier','Price','Updated At'],
      Orders: ['Order ID','Customer','Date','Status','Items Count','Amount','Payment Status','Payment Method'],
      Shareholders: ['Name','Email','Shares','Ownership','Current Value']
    },
    Operations: {
      Members: ['Member ID','Full Name','Role','Email','Phone','Status'],
      Inventory: ['Item ID','Item Name','Category','Variant','Color','Size','Barcode','Quantity','Unit','Minimum Stock','Warehouse','Supplier','Cost','Price','Updated At'],
      Orders: ['Order ID','Customer','Phone','Email','Date','Status','Items Count','Amount','Shipping Address','Tracking Number','Shipping Date','Delivery Date','Notes'],
      Suppliers: ['Supplier ID','Name','Contact','Email','Phone','Category','Rating','Status','Total Orders','Total Spend','Last Order','Payment Terms','Notes']
    },
    Marketing: {
      Members: ['Member ID','Full Name','Role','Email'],
      Tasks: ['Task ID','Title','Category','Assigned To','Priority','Difficulty','Status','Start Date','Due Date','Completion %','Quality','Impact','Evidence','Reviewer','Review Notes','Task Score','Task Weight','Weighted Score','Days Late','Created At','Updated At'],
      Orders: ['Order ID','Customer','Date','Status','Items Count','Amount']
    },
    Designer: {
      Members: ['Member ID','Full Name','Role','Email'],
      Tasks: ['Task ID','Title','Category','Assigned To','Priority','Difficulty','Status','Start Date','Due Date','Completion %','Quality','Impact','Evidence','Reviewer','Review Notes','Task Score','Task Weight','Weighted Score','Days Late','Created At','Updated At'],
      Inventory: ['Item ID','Item Name','Category','Variant','Color','Size','Barcode','Quantity','Updated At']
    },
    'Customer Service': {
      Members: ['Member ID','Full Name','Role','Email','Phone'],
      Orders: ['Order ID','Customer','Phone','Email','Date','Status','Items Count','Amount','Payment Status','Shipping Address','Tracking Number','Delivery Date','Notes','Return Status','Return Reason'],
      Tasks: ['Task ID','Title','Category','Assigned To','Priority','Status','Due Date']
    }
  };
  
  function getVisibleFieldsForRole(role, sheetName){
    if(!role || !FIELD_VISIBILITY[role]) return null; // All visible if no restrictions
    if(FIELD_VISIBILITY[role].all) return null; // CEO sees all
    return FIELD_VISIBILITY[role][sheetName] || null;
  }
  
  function filterDataByFieldPermission(role, sheetName, headers, rowData){
    var allowed = getVisibleFieldsForRole(role, sheetName);
    if(!allowed) return {headers: headers, row: rowData}; // All visible
    
    var filteredHeaders = [];
    var filteredRow = [];
    for(var i=0;i<headers.length;i++){
      if(allowed.indexOf(String(headers[i]).trim()) > -1){
        filteredHeaders.push(headers[i]);
        filteredRow.push(rowData[i]);
      }
    }
    return {headers: filteredHeaders, row: filteredRow};
  }
  
  /* ───────────────────────────────────────────
     4. BACKUP AUTOMATION
     ─────────────────────────────────────────── */
  
  function createSystemBackup(){
    var ss = getSpreadsheet();
    var ssId = ss.getId();
    var ssName = ss.getName();
    var timestamp = Utilities.formatDate(new Date(), APP.INFO.TIMEZONE, 'yyyy-MM-dd_HH-mm');
    var backupName = ssName + '_BACKUP_' + timestamp;
    
    try{
      // Copy spreadsheet
      var backupFile = DriveApp.getFileById(ssId).makeCopy(backupName);
      var backupUrl = backupFile.getUrl();
      
      // Move to backups folder (create if not exists)
      var folderName = 'PHINOX_Backups';
      var folders = DriveApp.getRootFolder().getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.getRootFolder().createFolder(folderName);
      folder.addFile(backupFile);
      DriveApp.getRootFolder().removeFile(backupFile);
      
      // Log backup
      var logSheet = getSheet('Audit Log');
      if(logSheet){
        logSheet.appendRow([
          generateId('BKP'),
          now(),
          'System',
          'Backup Created',
      'System',
      backupName,
      '',
      backupUrl
        ]);
      }
      
      Logger.log('Backup created: ' + backupName);
      showToast('تم إنشاء نسخة احتياطية: ' + backupName);
      return {success: true, url: backupUrl, name: backupName};
    }catch(e){
      Logger.log('Backup failed: ' + e);
      throw new Error('فشل إنشاء النسخة الاحتياطية: ' + e.message);
    }
  }
  
  function scheduleDailyBackup(){
    // Remove existing backup triggers
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t){
      if(t.getHandlerFunction() === 'createSystemBackup'){
        ScriptApp.deleteTrigger(t);
      }
    });
    
    // Create daily trigger at 3 AM
    ScriptApp.newTrigger('createSystemBackup')
      .timeBased()
      .everyDays(1)
      .atHour(3)
      .nearMinute(0)
      .create();
    
    Logger.log('Daily backup scheduled at 3:00 AM');
    showToast('تم جدولة النسخ الاحتياطي اليومي (3:00 صباحاً)');
  }
  
  function getBackupStatus(){
    var folderName = 'PHINOX_Backups';
    var folders = DriveApp.getRootFolder().getFoldersByName(folderName);
    if(!folders.hasNext()) return {lastBackup: null, count: 0, totalSize: 0};
    
    var folder = folders.next();
    var files = folder.getFiles();
    var backups = [];
    var totalSize = 0;
    
    while(files.hasNext()){
      var f = files.next();
      backups.push({name: f.getName(), date: f.getLastUpdated(), size: f.getSize(), url: f.getUrl()});
      totalSize += f.getSize();
    }
    
    backups.sort(function(a,b){ return b.date - a.date; });
    
    return {
      lastBackup: backups.length > 0 ? Utilities.formatDate(backups[0].date, APP.INFO.TIMEZONE, 'dd/MM/yyyy HH:mm') : null,
      count: backups.length,
      totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
      recent: backups.slice(0, 5)
    };
  }