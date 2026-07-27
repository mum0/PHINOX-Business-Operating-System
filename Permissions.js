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