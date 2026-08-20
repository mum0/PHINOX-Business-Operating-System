/**
 * ============================================================
 * PHINOX BOS — Permissions Module (Migrated v5.0)
 * Old File: Permissions.gs
 * Replaces: Direct sheet access → BaseRepository
 * Benefits: O(1) lookup, batch ops, standardized errors/logging
 * Breaking: None. All public APIs preserved.
 * Depends: Core Layer (Phase 1), old Members.js (until migrated)
 * ============================================================
 * PHASE 1 SECURITY FIXES (2026-08-14):
 * 1. getCurrentMember() now validates Active status
 * 2. getCurrentMember() normalizes emails (case-insensitive)
 * 3. getCurrentMember() detects duplicate emails safely
 * 4. Added EXPENSES_* permissions for Phase 2
 * ============================================================
 */

/* ───────────────────────────────────────────
 0. FALLBACK HELPERS (only if not defined by other modules)
 ─────────────────────────────────────────── */

 if (typeof now !== 'function') {
 function now() { return new Date().toISOString(); }
 }
 if (typeof isEmpty !== 'function') {
 function isEmpty(v) { return v === null || v === undefined || v === ''; }
 }
 if (typeof showToast !== 'function') {
 function showToast(msg) {
 try { SpreadsheetApp.getActiveSpreadsheet().toast(msg); } catch(e) {}
 }
 }
 if (typeof formatDateStr !== 'function') {
 function formatDateStr(d) {
 if (!d) return '';
 if (d instanceof Date) return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
 return String(d);
 }
 }
 if (typeof t !== 'function') {
 function t(key, params) {
 var map = {
 'err_access_denied': 'Access denied: {permission}',
 'err_invalid_role': 'Invalid role',
 'err_member_not_found': 'Member not found',
 'err_request_not_found': 'Request not found',
 'err_no_restore_permission': 'Only CEO can restore',
 'err_record_not_found': 'Record not found',
 'err_already_restored': 'Record already restored'
 };
 var msg = map[key] || key;
 if (params) { for (var k in params) msg = msg.replace('{'+k+'}', params[k]); }
 return msg;
 }
 }
 if (typeof generateId !== 'function') {
 function generateId(prefix) {
 return (prefix || 'ID') + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
 }
 }

 /* ───────────────────────────────────────────
 1. CONSTANTS (preserved exactly for backward compatibility)
 ─────────────────────────────────────────── */

 var MEMBER_COL = { MEMBER_ID: 0, FULL_NAME: 1, ROLE: 2, EMAIL: 3, PHONE: 4, STATUS: 5, JOIN_DATE: 6, KPI_SCORE: 7, TASKS_COMPLETED: 8, TASKS_LATE: 9, AVERAGE_QUALITY: 10, NOTES: 11 };
 var AUDIT_COL = { LOG_ID: 0, DATE: 1, USER: 2, ACTION: 3, SHEET: 4, RECORD_ID: 5, OLD_VALUE: 6, NEW_VALUE: 7 };

 var PERMISSIONS = {
    MEMBERS_READ: "members:read", MEMBERS_WRITE: "members:write", MEMBERS_DELETE: "members:delete",
    TASKS_READ: "tasks:read", TASKS_WRITE: "tasks:write", TASKS_DELETE: "tasks:delete", TASKS_APPROVE: "tasks:approve",
    KPI_READ: "kpi:read", KPI_WRITE: "kpi:write",
    INVENTORY_READ: "inventory:read", INVENTORY_WRITE: "inventory:write", INVENTORY_DELETE: "inventory:delete",
    // PHASE 3C: BOM Permissions
    INVENTORY_BOM_READ: "inventory:bom_read",
    INVENTORY_BOM_MANAGE: "inventory:bom_manage",
    SUPPLIERS_READ: "suppliers:read", SUPPLIERS_WRITE: "suppliers:write", SUPPLIERS_DELETE: "suppliers:delete",
    ORDERS_READ: "orders:read", ORDERS_WRITE: "orders:write", ORDERS_DELETE: "orders:delete",
    FINANCE_READ: "finance:read", FINANCE_WRITE: "finance:write", FINANCE_DELETE: "finance:delete",
    REPORTS_READ: "reports:read", REPORTS_WRITE: "reports:write",
    SETTINGS_READ: "settings:read", SETTINGS_WRITE: "settings:write",
    EXPENSES_READ: "expenses:read", EXPENSES_WRITE: "expenses:write", EXPENSES_APPROVE: "expenses:approve", EXPENSES_DELETE: "expenses:delete",
    ADMIN: "admin"
  };

 var WORKFLOW_TYPES = {
 EXPENSE_APPROVAL: {name: 'اعتماد مصروف', approvers: ['CEO','Partner','Finance'], autoExecute: true},
 PURCHASE_APPROVAL: {name: 'اعتماد مشتريات', approvers: ['CEO','Partner','Operations'], autoExecute: true},
 MEMBER_DELETE: {name: 'حذف عضو', approvers: ['CEO'], autoExecute: false},
 TASK_CANCEL: {name: 'إلغاء مهمة', approvers: ['CEO','Partner'], autoExecute: true},
 BUDGET_OVERRIDE: {name: 'تجاوز الميزانية', approvers: ['CEO'], autoExecute: false},
 SHAREHOLDER_CHANGE: {name: 'تعديل مساهم', approvers: ['CEO','Partner'], autoExecute: true}
 };

 var APPROVAL_COL = {
 ID:0, TYPE:1, REQUESTER:2, REQUEST_DATE:3, TARGET_SHEET:4, TARGET_ID:5,
 DETAILS:6, STATUS:7, APPROVER:8, APPROVAL_DATE:9, NOTES:10
 };

 var ARCHIVE_COL = {
 ID:0, ORIGINAL_SHEET:1, ORIGINAL_DATA:2, DELETED_BY:3, DELETED_AT:4, RESTORED_AT:5, PURGE_AFTER:6
 };

 /* ───────────────────────────────────────────
 2. SCHEMAS FOR BASE REPOSITORY
 ─────────────────────────────────────────── */

 var AUDIT_SCHEMA = {
 id: 1, date: 2, user: 3, action: 4, sheet: 5, recordId: 6, oldValue: 7, newValue: 8
 };

 var APPROVAL_SCHEMA = {
 id: 1, type: 2, requester: 3, date: 4, targetSheet: 5, targetId: 6,
 details: 7, status: 8, approver: 9, approvalDate: 10, notes: 11
 };

 var ARCHIVE_SCHEMA = {
 id: 1, originalSheet: 2, data: 3, deletedBy: 4, deletedAt: 5, restoredAt: 6, purgeAfter: 7
 };

 /* ───────────────────────────────────────────
 3. REPOSITORY INSTANCES (lazy initialization)
 ─────────────────────────────────────────── */

 var _auditRepo = null;
 var _approvalRepo = null;
 var _archiveRepo = null;

 function _getSpreadsheet() {
 return CONFIG.SPREADSHEET.ID
 ? SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID)
 : SpreadsheetApp.getActiveSpreadsheet();
 }

 function _ensureSheet(name, headers, widths) {
 var ss = _getSpreadsheet();
 var sheet = ss.getSheetByName(name);
 if (sheet) return sheet;
 sheet = ss.insertSheet(name);
 sheet.appendRow(headers);
 sheet.getRange(1, 1, 1, headers.length)
 .setFontWeight('bold')
 .setBackground('#1a237e')
 .setFontColor('#ffffff');
 if (widths) widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
 Logger.info('Permissions', 'Sheet created', { name: name });
 return sheet;
 }

 function _getAuditRepo() {
 if (!_auditRepo) {
 _ensureSheet('Audit Log',
 ['id','date','user','action','sheet','recordId','oldValue','newValue'],
 [22, 20, 25, 20, 15, 22, 30, 30]);
 _auditRepo = BaseRepository.create('Audit Log', AUDIT_SCHEMA, { eventName: 'audit' });
 }
 return _auditRepo;
 }

 function _getApprovalRepo() {
 if (!_approvalRepo) {
 _ensureSheet('Approval Requests',
 ['Request ID','Type','Requester','Date','Target Sheet','Target ID','Details','Status','Approver','Approval Date','Notes'],
 [22, 20, 20, 20, 15, 22, 30, 12, 20, 20, 30]);
 _approvalRepo = BaseRepository.create('Approval Requests', APPROVAL_SCHEMA, { eventName: 'approval' });
 }
 return _approvalRepo;
 }

 function _getArchiveRepo() {
 if (!_archiveRepo) {
 _ensureSheet('Archive',
 ['Archive ID','Original Sheet','Data (JSON)','Deleted By','Deleted At','Restored At','Purge After'],
 [22, 20, 40, 20, 20, 20, 20]);
 _archiveRepo = BaseRepository.create('Archive', ARCHIVE_SCHEMA, { eventName: 'archive' });
 }
 return _archiveRepo;
 }

 /* ───────────────────────────────────────────
 4. BACKWARD COMPATIBILITY: ensureAppConstants
 ─────────────────────────────────────────── */

function ensureAppConstants(){
 if(typeof APP === 'undefined') APP = {};
 if(!APP.ROLES){
 APP.ROLES = { CEO: "CEO", PARTNER: "Partner", DESIGNER: "Designer", MARKETING: "Marketing", OPERATIONS: "Operations", CUSTOMER_SERVICE: "Customer Service", FINANCE: "Finance" };
 }
 if(!APP.SHEETS){
 APP.SHEETS = {
 MEMBERS: "Members", TASKS: "Tasks", KPI: "KPI", INVENTORY: "Inventory",
 SUPPLIERS: "Suppliers", ORDERS: "Orders", FINANCE: "Finance",
 REPORTS: "Reports", SETTINGS: "Settings", DASHBOARD: "Dashboard", AUDIT: "Audit Log"
 };
 }
 if(!APP.SHEETS.AUDIT){ APP.SHEETS.AUDIT = "Audit Log"; }
 }

 /* ───────────────────────────────────────────
 5. PERMISSION MATRIX (preserved logic, added logging)
 ─────────────────────────────────────────── */

 var _permissionMatrixCache = null;

 function getPermissionMatrix(){
 if(_permissionMatrixCache !== null) return _permissionMatrixCache;
 ensureAppConstants();
 var matrix = {
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
 PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_WRITE, PERMISSIONS.EXPENSES_APPROVE, PERMISSIONS.EXPENSES_DELETE,
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
 PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE,
 PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_WRITE, PERMISSIONS.EXPENSES_APPROVE, PERMISSIONS.EXPENSES_DELETE
 ],
 [APP.ROLES.FINANCE]: [
 PERMISSIONS.FINANCE_READ, PERMISSIONS.FINANCE_WRITE, PERMISSIONS.REPORTS_READ,
 PERMISSIONS.ORDERS_READ, PERMISSIONS.INVENTORY_READ, PERMISSIONS.SUPPLIERS_READ, PERMISSIONS.KPI_READ,
 PERMISSIONS.EXPENSES_READ, PERMISSIONS.EXPENSES_WRITE, PERMISSIONS.EXPENSES_APPROVE
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
 Logger.debug('Permissions', 'Permission matrix loaded');
 return matrix;
 }

 /* ───────────────────────────────────────────
 6. CORE RBAC FUNCTIONS (preserved signatures)
 ─────────────────────────────────────────── */

 function getRole(member){
 if(Array.isArray(member)) return member[MEMBER_COL.ROLE];
 if (typeof getMember === 'function') {
 var m = getMember(member);
 return m ? m[MEMBER_COL.ROLE] : null;
 }
 return null;
 }

 function isAdmin(member){
 var role = getRole(member);
 return role === APP.ROLES.CEO || role === APP.ROLES.PARTNER;
 }

 function isManager(member){
 var role = getRole(member);
 return isAdmin(member) || role === APP.ROLES.OPERATIONS;
 }

 function isMemberLevel(member){
 var role = getRole(member);
 return role !== null && !isAdmin(member);
 }

 function hasPermission(member, permission){
 var role = getRole(member);
 if(!role) return false;
 var matrix = getPermissionMatrix();
 var list = matrix[role] || [];
 return list.indexOf(permission) > -1;
 }

 function hasAnyPermission(member, permissions){
 if(!Array.isArray(permissions)) return hasPermission(member, permissions);
 return permissions.some(function(p) { return hasPermission(member, p); });
 }

 function hasAllPermissions(member, permissions){
 if(!Array.isArray(permissions)) return hasPermission(member, permissions);
 return permissions.every(function(p) { return hasPermission(member, p); });
 }

 function requirePermission(member, permission){
 if(!hasPermission(member, permission)){
 throw ErrorHandler.permission(permission, 'resource', 'Permissions');
 }
 }

 function getRolePermissions(role){
 var matrix = getPermissionMatrix();
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
 throw ErrorHandler.validation('Invalid role', { role: newRole }, 'Permissions');
 }
 if (typeof getMemberById !== 'function' || typeof updateMember !== 'function') {
 throw ErrorHandler.system('Members module not loaded', {}, 'Permissions');
 }
 var member = getMemberById(memberId);
 if(!member){
 throw ErrorHandler.notFound('Member', memberId, 'Permissions');
 }
 var oldRole = member[MEMBER_COL.ROLE];
 updateMember(memberId, {role: newRole});
 logActivity(admin, "Assign Role", APP.SHEETS.MEMBERS, memberId, oldRole, newRole);
 return true;
 }

 /**
  * PHASE 1 FIX: getCurrentMember()
  *
  * Changes:
  * 1. Normalizes both current user email and stored member emails (trim + lowercase)
  * 2. Only returns members with status === 'Active'
  * 3. Detects duplicate emails and logs warning (returns null to prevent privilege escalation)
  * 4. Adds single-execution caching for performance
  * 5. Fails closed: any anomaly returns null (DENY, never ALLOW)
  */
 var _currentMemberCache = null;

 function getCurrentMember(){
 // Return cached result within same execution context
 if(_currentMemberCache !== null) return _currentMemberCache;

 var email = null;
 try{
 email = Session.getActiveUser().getEmail();
 }catch(e1){
 try{ email = Session.getEffectiveUser().getEmail(); }catch(e2){ Logger.warn('Permissions', 'Session fallback failed', {error: String(e2)}); return null; }
 }

 // Normalize: trim whitespace, lowercase
 email = String(email || '').trim().toLowerCase();
 if(isEmpty(email)) return null;

 if (typeof getMembers !== 'function') {
 Logger.warn('Permissions', 'getMembers not available');
 return null;
 }

 var members = getMembers();
 var matchedMember = null;
 var matchCount = 0;

 for(var i = 0; i < members.length; i++){
 var memberEmail = String(members[i][MEMBER_COL.EMAIL] || '').trim().toLowerCase();
 var memberStatus = String(members[i][MEMBER_COL.STATUS] || '').trim();

 if(memberEmail === email){
 matchCount++;
 // Only consider Active members
 if(memberStatus === 'Active'){
 matchedMember = members[i];
 }
 }
 }

 // SECURITY: Duplicate email anomaly — deny access to prevent privilege escalation
 if(matchCount > 1){
 Logger.error('Permissions', 'Duplicate email detected in Members sheet', { email: email, count: matchCount });
 _currentMemberCache = null;
 return null;
 }

 // SECURITY: No active match found — deny access
 if(!matchedMember){
 _currentMemberCache = null;
 return null;
 }

 // Cache for this execution context
 _currentMemberCache = matchedMember;
 return matchedMember;
 }

 function getSheetPermission(sheetName){
 var map = {
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
 var perm = getSheetPermission(sheetName);
 if(!perm) return false;
 return hasPermission(member, perm.read);
 }

 function canWriteSheet(member, sheetName){
 var perm = getSheetPermission(sheetName);
 if(!perm) return false;
 return hasPermission(member, perm.write);
 }

 function canDeleteSheet(member, sheetName){
 var perm = getSheetPermission(sheetName);
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

 /* ───────────────────────────────────────────
 7. AUDIT ENGINE (migrated to BaseRepository)
 ─────────────────────────────────────────── */

 function logActivity(user, action, sheet, recordId, oldValue, newValue){
 ensureAppConstants();
 var userName = typeof user === 'string' ? user : (user ? user[MEMBER_COL.FULL_NAME] : 'System');

 try {
 _getAuditRepo().create({
 id: generateId("LOG"),
 date: now(),
 user: userName,
 action: action,
 sheet: sheet || '',
 recordId: recordId || '',
 oldValue: oldValue !== undefined ? String(oldValue) : '',
 newValue: newValue !== undefined ? String(newValue) : ''
 });
 Logger.debug('Permissions', 'Activity logged', { action: action, user: userName });
 } catch (e) {
 Logger.error('Permissions', 'Failed to log activity', { error: e.message, action: action });
 }
 }

 function _auditObjectToArray(obj) {
 var arr = new Array(8).fill('');
 arr[AUDIT_COL.LOG_ID] = obj.id || '';
 arr[AUDIT_COL.DATE] = obj.date || '';
 arr[AUDIT_COL.USER] = obj.user || '';
 arr[AUDIT_COL.ACTION] = obj.action || '';
 arr[AUDIT_COL.SHEET] = obj.sheet || '';
 arr[AUDIT_COL.RECORD_ID] = obj.recordId || '';
 arr[AUDIT_COL.OLD_VALUE] = obj.oldValue || '';
 arr[AUDIT_COL.NEW_VALUE] = obj.newValue || '';
 return arr;
 }

 function getActivityLog(){
 ensureAppConstants();
 var repo = _getAuditRepo();
 var all = [];
 var offset = 0;
 var page;
 do {
 page = repo.findAll({ limit: 1000, offset: offset });
 all = all.concat(page.data.map(_auditObjectToArray));
 offset += 1000;
 } while (page.hasMore);
 return all;
 }

 function getActivityByUser(user){ return getActivityLog().filter(function(row) { return row[AUDIT_COL.USER] === user; }); }
 function getActivityBySheet(sheetName){ return getActivityLog().filter(function(row) { return row[AUDIT_COL.SHEET] === sheetName; }); }
 function getActivityByAction(action){ return getActivityLog().filter(function(row) { return row[AUDIT_COL.ACTION] === action; }); }
 function getRecentActivity(limit){
 var log = getActivityLog();
 if(log.length === 0) return [];
 return log.slice(-limit);
 }

 /* ───────────────────────────────────────────
 8. APPROVAL WORKFLOWS (migrated to BaseRepository)
 ─────────────────────────────────────────── */

 function getApproversList(roles){
 if (typeof getMembers !== 'function') return [];
 var members = getMembers();
 var emails = [];
 for(var i = 0; i < members.length; i++){
 if(roles.indexOf(members[i][MEMBER_COL.ROLE]) > -1 && members[i][MEMBER_COL.EMAIL]){
 emails.push(String(members[i][MEMBER_COL.EMAIL]).trim());
 }
 }
 return emails;
 }

 function submitApprovalRequest(data){
 var member = getCurrentMember();
 if(!member) throw ErrorHandler.permission('submit approval', 'approval', 'Permissions');

 var typeDef = WORKFLOW_TYPES[data.type];
 if(!typeDef) throw ErrorHandler.validation('Unknown workflow type', { type: data.type }, 'Permissions');

 var row = {
 id: generateId('APR'),
 type: typeDef.name,
 requester: member[MEMBER_COL.FULL_NAME],
 date: now(),
 targetSheet: data.targetSheet || '',
 targetId: data.targetId || '',
 details: JSON.stringify(data.details || {}),
 status: 'Pending',
 approver: '',
 approvalDate: '',
 notes: data.notes || ''
 };

 _getApprovalRepo().create(row);

 var approvers = getApproversList(typeDef.approvers);
 approvers.forEach(function(email){
 try{
 GmailApp.sendEmail(email, '⚡ طلب اعتماد: ' + typeDef.name,
 'الطالب: ' + member[MEMBER_COL.FULL_NAME] + '\nالتفاصيل: ' + (data.details ? JSON.stringify(data.details) : '') +
 '\n\nافتح PHINOX للاعتماد أو الرفض.');
 }catch(e){}
 });

 logActivity(member, 'طلب اعتماد', 'Approval Requests', row.id, '', typeDef.name);
 showToast('تم إرسال طلب الاعتماد: ' + row.id);
 return row.id;
 }

 function _approvalObjectToPublic(obj) {
 return {
 id: obj.id,
 type: obj.type,
 requester: obj.requester,
 date: formatDateStr(obj.date),
 targetSheet: obj.targetSheet,
 targetId: obj.targetId,
 details: obj.details
 };
 }

 function getPendingApprovalRequests(){
 var repo = _getApprovalRepo();
 var all = [];
 var offset = 0;
 var page;
 do {
 page = repo.findAll({ limit: 1000, offset: offset, where: function(r) { return r.status === 'Pending'; } });
 all = all.concat(page.data.map(_approvalObjectToPublic));
 offset += 1000;
 } while (page.hasMore);
 return all;
 }

 function approveRequest(data){
 return _processApproval(data, 'Approved', 'تم الاعتماد');
 }

 function rejectRequest(data){
 return _processApproval(data, 'Rejected', 'تم الرفض');
 }

 function _processApproval(data, status, actionText){
 var member = getCurrentMember();
 if(!member) throw ErrorHandler.permission('process approval', 'approval', 'Permissions');

 var repo = _getApprovalRepo();
 var request = repo.findById(data.requestId);
 if(!request) throw ErrorHandler.notFound('Approval Request', data.requestId, 'Permissions');

 var typeKey = Object.keys(WORKFLOW_TYPES).find(function(k){
 return WORKFLOW_TYPES[k].name === request.type;
 });
 if(!typeKey || WORKFLOW_TYPES[typeKey].approvers.indexOf(member[MEMBER_COL.ROLE]) === -1){
 throw ErrorHandler.permission(actionText, 'approval request', 'Permissions');
 }

 var details = {};
 try{ details = JSON.parse(request.details); }catch(e){}

 repo.update(data.requestId, {
 status: status,
 approver: member[MEMBER_COL.FULL_NAME],
 approvalDate: now(),
 notes: data.notes || ''
 });

 var typeDef = Object.values(WORKFLOW_TYPES).find(function(t){ return t.name === request.type; });
 if(typeDef && typeDef.autoExecute && status === 'Approved'){
 _executeApprovedAction(request.type, details);
 }

 logActivity(member, actionText, 'Approval Requests', data.requestId, 'Pending', status);
 showToast(actionText + ' بنجاح');
 return {success: true, message: actionText};
 }

 function _executeApprovedAction(typeName, details){
 try{
 if(typeName === WORKFLOW_TYPES.EXPENSE_APPROVAL.name && details.amount){
 if (typeof addExpense === 'function') {
 addExpense({
 type: details.expenseType || 'مصروف',
 supplier: details.supplier || '',
 description: details.description || 'مصروف معتمد',
 amount: details.amount,
 notes: 'معتمد تلقائياً: ' + (details.requestId || '')
 });
 }
 }
 else if(typeName === WORKFLOW_TYPES.TASK_CANCEL.name && details.taskId){
 var tSheet = _getSpreadsheet().getSheetByName(APP.SHEETS.TASKS || 'Tasks');
 if (tSheet) {
 var tData = tSheet.getDataRange().getValues();
 for(var i = 1; i < tData.length; i++){
 if(tData[i][0] === details.taskId){
 tData[i][6] = 'Cancelled';
 tSheet.getRange(i + 1, 1, 1, tData[i].length).setValues([tData[i]]);
 break;
 }
 }
 }
 }
 }catch(e){
 Logger.error('Permissions', 'Auto-execute failed', { error: e.message, type: typeName });
 }
 }

 /* ───────────────────────────────────────────
 9. SOFT DELETE / ARCHIVE (migrated to BaseRepository)
 ─────────────────────────────────────────── */

 function softDeleteRecord(data){
 var member = getCurrentMember();
 if(!member) throw ErrorHandler.permission('delete', 'record', 'Permissions');

 var sheet = _getSpreadsheet().getSheetByName(data.sheet);
 if (!sheet) throw ErrorHandler.notFound('Sheet', data.sheet, 'Permissions');

 var allData = sheet.getDataRange().getValues();
 var foundRow = -1;
 var recordData = null;

 for(var i = 1; i < allData.length; i++){
 if(String(allData[i][0]).trim() === String(data.id).trim()){
 foundRow = i + 1;
 recordData = allData[i];
 break;
 }
 }

 if(foundRow < 0) throw ErrorHandler.notFound('Record', data.id, 'Permissions');

 var purgeDate = new Date();
 purgeDate.setDate(purgeDate.getDate() + 30);

 _getArchiveRepo().create({
 id: generateId('ARC'),
 originalSheet: data.sheet,
 data: JSON.stringify(recordData),
 deletedBy: member[MEMBER_COL.FULL_NAME],
 deletedAt: now(),
 restoredAt: '',
 purgeAfter: Utilities.formatDate(purgeDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
 });

 sheet.deleteRow(foundRow);

 logActivity(member, 'حذف ناعم', data.sheet, data.id, '', 'محفوظ في Archive');
 showToast('تم الحذف الناعم — يمكن الاسترجاع خلال 30 يوم');
 return {success: true};
 }

 function restoreRecord(archiveId){
 var member = getCurrentMember();
 if(!member || member[MEMBER_COL.ROLE] !== 'CEO') {
 throw ErrorHandler.permission('restore', 'archive', 'Permissions');
 }

 var repo = _getArchiveRepo();
 var all = [];
 var offset = 0;
 var page;
 var record = null;

 do {
 page = repo.findAll({ limit: 1000, offset: offset });
 for (var i = 0; i < page.data.length; i++) {
 if (page.data[i].id === archiveId && !page.data[i].restoredAt) {
 record = page.data[i];
 break;
 }
 }
 offset += 1000;
 } while (!record && page.hasMore);

 if(!record) throw ErrorHandler.notFound('Archive record', archiveId, 'Permissions');

 var originalSheet = String(record.originalSheet);
 var recordData;
 try {
 recordData = JSON.parse(record.data);
 } catch (e) {
 throw ErrorHandler.system('Failed to parse archived data', { error: e.message }, 'Permissions');
 }

 var sheet = _getSpreadsheet().getSheetByName(originalSheet);
 if (!sheet) throw ErrorHandler.notFound('Sheet', originalSheet, 'Permissions');

 sheet.appendRow(recordData);

 repo.update(archiveId, { restoredAt: now() });

 logActivity(member, 'استرجاع سجل', originalSheet, archiveId, '', 'مسترجع من Archive');
 showToast('تم الاسترجاع بنجاح');
 return {success: true};
 }
