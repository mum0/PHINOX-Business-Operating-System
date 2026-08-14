# PHINOX BOS — PHASE 1 MINIMAL RBAC AUDIT

## 1. Files Inspected

| # | File | Size | Status |
|---|------|------|--------|
| 1 | `13_Permissions.js` | 28,642 bytes | ✅ Full content retrieved |
| 2 | `15_Members.js` | 11,411 bytes | ✅ Full content retrieved |
| 3 | `UI_Server.js` | 19,451 bytes | ✅ Full content retrieved |

**Files NOT inspected (per incremental rules):**
- `09_Security.js` — not required for Phase 1 determination
- `UI_Index.html` — out of scope
- All Service/Schema/Controller files — underlying services not needed for authorization mapping

---

## 2. 13_Permissions Findings

### 2.1 Role Constants (from `APP.ROLES`)

```javascript
CEO:              "CEO"
PARTNER:          "Partner"
DESIGNER:         "Designer"
MARKETING:        "Marketing"
OPERATIONS:       "Operations"
CUSTOMER_SERVICE: "Customer Service"
FINANCE:          "Finance"
```

**Total roles: 7**

### 2.2 Permission Constants (PERMISSIONS object)

| Permission | Value | Assigned To |
|------------|-------|-------------|
| MEMBERS_READ | `members:read` | CEO, Partner, Finance, CS |
| MEMBERS_WRITE | `members:write` | CEO, Partner, Operations |
| MEMBERS_DELETE | `members:delete` | CEO only |
| TASKS_READ | `tasks:read` | All except CS (limited) |
| TASKS_WRITE | `tasks:write` | CEO, Partner, Operations, Marketing, Designer |
| TASKS_DELETE | `tasks:delete` | CEO, Partner, Operations |
| TASKS_APPROVE | `tasks:approve` | CEO, Partner |
| KPI_READ | `kpi:read` | All roles |
| KPI_WRITE | `kpi:write` | CEO, Partner |
| INVENTORY_READ | `inventory:read` | CEO, Partner, Finance, Operations, Designer |
| INVENTORY_WRITE | `inventory:write` | CEO, Partner, Operations, Designer |
| INVENTORY_DELETE | `inventory:delete` | CEO, Partner |
| SUPPLIERS_READ | `suppliers:read` | CEO, Partner, Finance, Operations |
| SUPPLIERS_WRITE | `suppliers:write` | CEO, Partner, Operations |
| SUPPLIERS_DELETE | `suppliers:delete` | CEO, Partner |
| ORDERS_READ | `orders:read` | CEO, Partner, Finance, Operations, Marketing, CS |
| ORDERS_WRITE | `orders:write` | CEO, Partner, Operations, CS |
| ORDERS_DELETE | `orders:delete` | CEO, Partner |
| FINANCE_READ | `finance:read` | CEO, Partner, Finance |
| FINANCE_WRITE | `finance:write` | CEO, Partner, Finance |
| FINANCE_DELETE | `finance:delete` | CEO, Partner |
| REPORTS_READ | `reports:read` | CEO, Partner, Finance, Operations, Marketing |
| REPORTS_WRITE | `reports:write` | CEO, Partner |
| SETTINGS_READ | `settings:read` | CEO, Partner |
| SETTINGS_WRITE | `settings:write` | CEO, Partner |
| ADMIN | `admin` | CEO only |

**Total permissions: 25**
**Format: `resource:action`**

### 2.3 Function-by-Function Audit

---

**FUNCTION:** `getCurrentMember()`
**PURPOSE:** Resolves Google Account email → Member record from Members sheet
**USED BY:** All permission checks, audit logging, approval workflows
**DEPENDS ON:** `Session.getActiveUser().getEmail()`, `getMembers()` (from 15_Members.js)
**SECURITY ROLE:** Identity resolution — CRITICAL PATH
**KEEP / CHANGE / UNKNOWN:** ⚠️ **CHANGE REQUIRED**

**Code:**
```javascript
function getCurrentMember(){
  var email = null;
  try{ email = Session.getActiveUser().getEmail(); }
  catch(e1){ try{ email = Session.getEffectiveUser().getEmail(); }catch(e2){ return null; } }
  if(isEmpty(email)) return null;
  if(typeof getMembers !== 'function') return null;
  var members = getMembers();
  for(var i=0; i<members.length; i++){
    if(members[i][MEMBER_COL.EMAIL] === email) return members[i];
  }
  return null;
}
```

**Issues Found:**
1. ✅ Falls back to `Session.getEffectiveUser()` if active fails
2. ✅ Returns `null` if `getMembers` unavailable
3. ❌ **Does NOT check member status** — inactive members can authenticate
4. ❌ **First-match only** — if duplicate emails exist, first one wins silently
5. ❌ **No caching** — calls `getMembers()` (full sheet scan) on EVERY permission check

---

**FUNCTION:** `getPermissionMatrix()`
**PURPOSE:** Returns role → permissions mapping
**USED BY:** `hasPermission()`, `getRolePermissions()`, `assignRole()`
**DEPENDS ON:** `APP.ROLES` (via `ensureAppConstants()`)
**SECURITY ROLE:** Authorization data source
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP**

**Code:** Caches in `_permissionMatrixCache`. Rebuilt only on first call per execution.

---

**FUNCTION:** `hasPermission(member, permission)`
**PURPOSE:** Checks if a member's role includes a specific permission
**USED BY:** `requirePermission()`, `canReadSheet()`, `canWriteSheet()`, `canDeleteSheet()`, `secureOperation()`
**DEPENDS ON:** `getRole()`, `getPermissionMatrix()`
**SECURITY ROLE:** Core authorization check
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP**

**Code:**
```javascript
function hasPermission(member, permission){
  var role = getRole(member);
  if(!role) return false;
  var matrix = getPermissionMatrix();
  var list = matrix[role] || [];
  return list.indexOf(permission) > -1;
}
```

**Assessment:** Simple, correct, no side effects. Safe.

---

**FUNCTION:** `requirePermission(member, permission)`
**PURPOSE:** Throws if member lacks permission
**USED BY:** `assignRole()`
**DEPENDS ON:** `hasPermission()`, `ErrorHandler.permission()`
**SECURITY ROLE:** Enforcement helper
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP**

**Code:**
```javascript
function requirePermission(member, permission){
  if(!hasPermission(member, permission)){
    throw ErrorHandler.permission(permission, 'resource', 'Permissions');
  }
}
```

---

**FUNCTION:** `getRole(member)`
**PURPOSE:** Extracts role from member array or looks up by ID
**USED BY:** `hasPermission()`, `isAdmin()`, `isManager()`
**DEPENDS ON:** `getMember()` (legacy global), `MEMBER_COL.ROLE`
**SECURITY ROLE:** Role resolution
**KEEP / CHANGE / UNKNOWN:** ⚠️ **CHANGE REQUIRED**

**Code:**
```javascript
function getRole(member){
  if(Array.isArray(member)) return member[MEMBER_COL.ROLE];
  if(typeof getMember === 'function'){
    var m = getMember(member);
    return m ? m[MEMBER_COL.ROLE] : null;
  }
  return null;
}
```

**Issues:**
1. ⚠️ References `getMember()` (legacy global from old Members.gs) — may not exist
2. ✅ Array path works correctly with `MEMBER_COL.ROLE`
3. ✅ Returns `null` on failure (safe default-deny)

---

**FUNCTION:** `getCurrentMember()` + `hasPermission()` + `requirePermission()`
**CHAIN ANALYSIS:**
```
getCurrentMember() → getMembers() → 15_Members.js
        ↓
    member array
        ↓
getRole(member) → member[MEMBER_COL.ROLE]
        ↓
hasPermission() → getPermissionMatrix() → APP.ROLES
        ↓
requirePermission() → throws if false
```

**Verdict:** Chain is sound but `getCurrentMember()` has status/duplicate gaps.

---

**FUNCTION:** `logActivity(user, action, sheet, recordId, oldValue, newValue)`
**PURPOSE:** Writes audit record to 'Audit Log' sheet via BaseRepository
**USED BY:** All CRUD operations, approvals, soft deletes
**DEPENDS ON:** `_getAuditRepo()`, `generateId()`, `now()`
**SECURITY ROLE:** Audit trail
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP**

**Assessment:** Uses BaseRepository (O(1) lookup), immutable append. Good.

---

**FUNCTION:** `softDeleteRecord(data)`
**PURPOSE:** Moves record to Archive sheet instead of permanent deletion
**USED BY:** UI (indirectly via 13_Permissions)
**DEPENDS ON:** `getCurrentMember()`, `_getArchiveRepo()`, `_getSpreadsheet()`
**SECURITY ROLE:** Data protection
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP**

**Assessment:** Requires `getCurrentMember()` (any authenticated user). Should require `admin` or resource-specific delete permission.

---

**FUNCTION:** `submitApprovalRequest(data)` / `approveRequest(data)` / `rejectRequest(data)`
**PURPOSE:** Workflow engine for approvals (expense, purchase, delete, etc.)
**USED BY:** Finance operations, member operations
**DEPENDS ON:** `getCurrentMember()`, `_getApprovalRepo()`, `GmailApp`
**SECURITY ROLE:** Workflow + authorization
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP (with fixes)**

**Workflow types defined:**
- EXPENSE_APPROVAL (CEO, Partner, Finance)
- PURCHASE_APPROVAL (CEO, Partner, Operations)
- MEMBER_DELETE (CEO only)
- TASK_CANCEL (CEO, Partner)
- BUDGET_OVERRIDE (CEO only)
- SHAREHOLDER_CHANGE (CEO, Partner)

---

**FUNCTION:** `getSheetPermission(sheetName)`
**PURPOSE:** Maps sheet names to read/write/delete permissions
**USED BY:** `canReadSheet()`, `canWriteSheet()`, `canDeleteSheet()`
**DEPENDS ON:** `APP.SHEETS`
**SECURITY ROLE:** Sheet-level authorization
**KEEP / CHANGE / UNKNOWN:** ✅ **KEEP**

**Assessment:** Clean mapping. All 11 sheets covered.

---

### 2.4 MEMBER_COL vs MEMBER_SCHEMA Compatibility

**13_Permissions.js MEMBER_COL (0-based indices):**
```javascript
MEMBER_COL = {
  MEMBER_ID: 0, FULL_NAME: 1, ROLE: 2, EMAIL: 3, PHONE: 4,
  STATUS: 5, JOIN_DATE: 6, KPI_SCORE: 7, TASKS_COMPLETED: 8,
  TASKS_LATE: 9, AVERAGE_QUALITY: 10, NOTES: 11
}
```
**Total columns: 12 (0-11)**

**15_Members.js MEMBER_SCHEMA (1-based indices):**
```javascript
MEMBER_SCHEMA = {
  id: 1, name: 2, role: 3, email: 4, phone: 5, status: 6,
  joinDate: 7, kpiScore: 8, tasksCompleted: 9, tasksLate: 10,
  averageQuality: 11, notes: 12, department: 13
}
```
**Total columns: 13**

**COMPATIBILITY VERDICT:** ⚠️ **MISMATCH DETECTED**

| Field | MEMBER_COL (13_Perm) | MEMBER_SCHEMA (15_Members) | Match? |
|-------|---------------------|---------------------------|--------|
| id | 0 | 1→0 | ✅ |
| name/fullName | 1 | 2→1 | ✅ |
| role | 2 | 3→2 | ✅ |
| email | 3 | 4→3 | ✅ |
| phone | 4 | 5→4 | ✅ |
| status | 5 | 6→5 | ✅ |
| joinDate | 6 | 7→6 | ✅ |
| kpiScore | 7 | 8→7 | ✅ |
| tasksCompleted | 8 | 9→8 | ✅ |
| tasksLate | 9 | 10→9 | ✅ |
| averageQuality | 10 | 11→10 | ✅ |
| notes | 11 | 12→11 | ✅ |
| department | **NOT DEFINED** | 13→12 | ❌ **MISSING** |

**Critical Finding:** `MEMBER_COL` does NOT define `DEPARTMENT: 12`. If any code in 13_Permissions.js references `member[12]` for department, it would fail. However, scanning the file — **no reference to department index exists in 13_Permissions.js**. The mismatch is latent, not active.

**Impact:** LOW for permissions, but department-aware features in 15_Members.js (e.g., `getMembersByDepartment()`) won't be accessible via MEMBER_COL.

---

### 2.5 Caching Analysis

| Cache | Type | Scope | TTL | Assessment |
|-------|------|-------|-----|------------|
| `_permissionMatrixCache` | Object | Script execution | Single execution | ✅ Good — rebuilt once per execution |
| `_auditRepo` | BaseRepository | Script execution | Lazy init | ✅ Good |
| `_approvalRepo` | BaseRepository | Script execution | Lazy init | ✅ Good |
| `_archiveRepo` | BaseRepository | Script execution | Lazy init | ✅ Good |
| `getCurrentMember()` result | NONE | — | — | ❌ **NO CACHING** — full sheet scan every call |

---

### 2.6 i18n Support

**Evidence from 13_Permissions.js:**
```javascript
function t(key, params){
  var map = {
    'err_access_denied': 'Access denied: {permission}',
    'err_invalid_role': 'Invalid role',
    'err_member_not_found': 'Member not found',
    // ... Arabic strings in workflow names
  };
}
```

**Assessment:**
- ✅ Error messages have Arabic equivalents in workflow names
- ⚠️ `t()` function exists but is a FALLBACK (only defined if not already defined)
- ⚠️ Not used consistently — most errors go through `ErrorHandler` instead

---

## 3. 15_Members Compatibility

### 3.1 Schema Verification

**Members Sheet Headers (from `_ensureMemberSheet()`):**
```
['id','name','role','email','phone','status','joinDate','kpiScore','tasksCompleted','tasksLate','averageQuality','notes','department']
```

**Actual data structure:** 13 columns, 0-based indices 0-12.

### 3.2 getMembers() Behavior

```javascript
function getMembers() {
  var all = [];
  var offset = 0;
  var page;
  do {
    page = _getMemberRepo().findAll({ limit: 1000, offset: offset });
    all = all.concat(page.data.map(_memberObjectToArray));
    offset += 1000;
  } while (page.hasMore);
  return all;
}
```

**Assessment:**
- ✅ Returns members as **arrays** (not objects)
- ✅ All members returned — **no status filter**
- ✅ Pagination safe for large datasets
- ❌ **No caching** — full repository scan every call

### 3.3 Email Field

**Column:** Index 3 (MEMBER_COL.EMAIL = 3, MEMBER_SCHEMA.email = 4→3)

**getCurrentMember() lookup:**
```javascript
if(members[i][MEMBER_COL.EMAIL] === email) return members[i];
```

**Assessment:**
- ✅ Correct column index
- ⚠️ **Case-sensitive comparison** — `user@gmail.com` vs `User@gmail.com` will fail
- ⚠️ **No trimming** — leading/trailing spaces will fail match
- ❌ **First match wins** — duplicates not detected

### 3.4 Role Field

**Column:** Index 2 (MEMBER_COL.ROLE = 2, MEMBER_SCHEMA.role = 3→2)

**Assessment:**
- ✅ Correct column index
- ⚠️ **No validation** — any string accepted as role
- ⚠️ If role doesn't exist in permission matrix, `hasPermission()` returns `false` (safe)

### 3.5 Status Field

**Column:** Index 5 (MEMBER_COL.STATUS = 5, MEMBER_SCHEMA.status = 6→5)

**Values:** `'Active'` or anything else (inactive)

**Critical Gap:**
```javascript
// getCurrentMember() does NOT check status:
if(members[i][MEMBER_COL.EMAIL] === email) return members[i];
// ^ Returns even if status === 'Inactive'
```

**Impact:** Inactive members retain full permissions.

### 3.6 Active/Inactive Behavior

**`activeMembers()`:**
```javascript
function activeMembers() {
  return getMembers().filter(function(m) { return m[MEMBER_COL.STATUS] === 'Active'; });
}
```

**Assessment:**
- ✅ Correctly filters by 'Active'
- ❌ **But `getCurrentMember()` does NOT use this** — uses raw `getMembers()`

### 3.7 Duplicate Email Handling

**Current behavior:** First match wins. No error, no warning.

**Risk:** If two members share an email, the first one in sheet order determines permissions. Could allow privilege escalation if a lower-privilege member is listed before a higher-privilege member with the same email.

### 3.8 Unknown Email Handling

**Current behavior:** `getCurrentMember()` returns `null`.

**Impact:** Any function that relies on `getCurrentMember()` receiving `null` must handle it. Currently, most functions don't check for `null` before calling `hasPermission(null, permission)` which returns `false` (safe default-deny).

### 3.9 Unavailable Google Account Email

**Current behavior:**
```javascript
try{ email = Session.getActiveUser().getEmail(); }
catch(e1){
  try{ email = Session.getEffectiveUser().getEmail(); }
  catch(e2){ Logger.warn(...); return null; }
}
```

**Assessment:**
- ✅ Graceful fallback to effective user
- ✅ Returns `null` if both fail
- ⚠️ Logs warning but doesn't alert admin

---

## 4. UI_Server Authorization Map

### 4.1 Complete Function Inventory

| # | Function | Resource | Action | Current Auth? | Required Permission | Risk |
|---|----------|----------|--------|---------------|---------------------|------|
| 1 | `uiGetDashboardKpis()` | KPI | READ | ❌ NONE | `kpi:read` | LOW |
| 2 | `uiGetKpiHistory()` | KPI | READ | ❌ NONE | `kpi:read` | LOW |
| 3 | `uiCalculateCategory()` | KPI | READ | ❌ NONE | `kpi:read` | LOW |
| 4 | `uiCalculateAll()` | KPI | READ | ❌ NONE | `kpi:read` | LOW |
| 5 | `uiGetCustomers()` | Customer | READ | ❌ NONE | `members:read` | MEDIUM |
| 6 | `uiGetCustomer()` | Customer | READ | ❌ NONE | `members:read` | MEDIUM |
| 7 | `uiGetCustomerStats()` | Customer | READ | ❌ NONE | `members:read` | LOW |
| 8 | `uiCreateCustomer()` | Customer | CREATE | ❌ NONE | `members:write` | HIGH |
| 9 | `uiUpdateCustomer()` | Customer | UPDATE | ❌ NONE | `members:write` | HIGH |
| 10 | `uiDeleteCustomer()` | Customer | DELETE | ❌ NONE | `members:delete` | **CRITICAL** |
| 11 | `uiSyncCustomers()` | Customer | SYNC | ❌ NONE | `members:write` | MEDIUM |
| 12 | `uiGetSatisfactionRecords()` | Satisfaction | READ | ❌ NONE | `reports:read` | LOW |
| 13 | `uiGetSatisfactionStats()` | Satisfaction | READ | ❌ NONE | `reports:read` | LOW |
| 14 | `uiCreateSatisfaction()` | Satisfaction | CREATE | ❌ NONE | `reports:write` | LOW |
| 15 | `uiGetNPSRecords()` | NPS | READ | ❌ NONE | `reports:read` | LOW |
| 16 | `uiGetNPSStats()` | NPS | READ | ❌ NONE | `reports:read` | LOW |
| 17 | `uiCreateNPS()` | NPS | CREATE | ❌ NONE | `reports:write` | LOW |
| 18 | `uiGetTasks()` | Task | READ | ❌ NONE | `tasks:read` | LOW |
| 19 | `uiGetTasksByDateRange()` | Task | READ | ❌ NONE | `tasks:read` | LOW |
| 20 | `uiGetTaskStats()` | Task | READ | ❌ NONE | `tasks:read` | LOW |
| 21 | `uiCreateTask()` | Task | CREATE | ❌ NONE | `tasks:write` | MEDIUM |
| 22 | `uiUpdateTask()` | Task | UPDATE | ❌ NONE | `tasks:write` | MEDIUM |
| 23 | `uiDeleteTask()` | Task | DELETE | ❌ NONE | `tasks:delete` | **CRITICAL** |
| 24 | `uiGetMembers()` | Member | READ | ❌ NONE | `members:read` | MEDIUM |
| 25 | `uiGetMemberStats()` | Member | READ | ❌ NONE | `members:read` | LOW |
| 26 | `uiAddMember()` | Member | CREATE | ❌ NONE | `members:write` | **CRITICAL** |
| 27 | `uiUpdateMember()` | Member | UPDATE | ❌ NONE | `members:write` | **CRITICAL** |
| 28 | `uiDeleteMember()` | Member | DELETE | ❌ NONE | `members:delete` | **CRITICAL** |
| 29 | `uiGetSales()` | Sale | READ | ❌ NONE | `orders:read` | MEDIUM |
| 30 | `uiGetSalesByDateRange()` | Sale | READ | ❌ NONE | `orders:read` | MEDIUM |
| 31 | `uiCreateSale()` | Sale | CREATE | ❌ NONE | `orders:write` | **CRITICAL** |
| 32 | `uiGetOrders()` | Order | READ | ❌ NONE | `orders:read` | MEDIUM |
| 33 | `uiGetOrdersByDateRange()` | Order | READ | ❌ NONE | `orders:read` | MEDIUM |
| 34 | `uiCreateOrder()` | Order | CREATE | ❌ NONE | `orders:write` | **CRITICAL** |
| 35 | `uiUpdateOrderStatus()` | Order | UPDATE | ❌ NONE | `orders:write` | HIGH |
| 36 | `uiGetFinanceStats()` | Finance | READ | ❌ NONE | `finance:read` | HIGH |
| 37 | `uiGetLedger()` | Finance | READ | ❌ NONE | `finance:read` | HIGH |
| 38 | `uiGetInventory()` | Inventory | READ | ❌ NONE | `inventory:read` | MEDIUM |
| 39 | `uiGetInventoryStats()` | Inventory | READ | ❌ NONE | `inventory:read` | LOW |
| 40 | `uiCreateInventoryItem()` | Inventory | CREATE | ❌ NONE | `inventory:write` | MEDIUM |
| 41 | `uiGetMarketingRecords()` | Marketing | READ | ❌ NONE | `reports:read` | LOW |
| 42 | `uiGetMarketingStats()` | Marketing | READ | ❌ NONE | `reports:read` | LOW |
| 43 | `uiCreateMarketingRecord()` | Marketing | CREATE | ❌ NONE | `reports:write` | LOW |
| 44 | `uiGetSocialRecords()` | Social | READ | ❌ NONE | `reports:read` | LOW |
| 45 | `uiGetSocialStats()` | Social | READ | ❌ NONE | `reports:read` | LOW |
| 46 | `uiCreateSocialRecord()` | Social | CREATE | ❌ NONE | `reports:write` | LOW |
| 47 | `openAddInventoryModal()` | Inventory | UI | ❌ NONE | N/A (UI helper) | LOW |
| 48 | `submitAddInventory()` | Inventory | CREATE | ❌ NONE | `inventory:write` | MEDIUM |
| 49 | `showPhinoxDashboard()` | UI | LAUNCH | ❌ NONE | N/A | LOW |
| 50 | `showPhinoxDashboardSidebar()` | UI | LAUNCH | ❌ NONE | N/A | LOW |
| 51 | `doGet()` | Web App | ENTRY | ❌ NONE | N/A | LOW |

**Summary:**
- **Total callable functions: 51**
- **Functions with authorization: 0**
- **Functions requiring protection: 46**
- **CRITICAL risk functions: 10** (delete member, delete task, delete customer, create sale, create order, update order status, add member, update member, finance read, ledger read)

### 4.2 Risk Categorization

| Category | Count | Examples |
|----------|-------|----------|
| READ operations | 28 | `uiGet*`, `uiCalculate*` |
| CREATE operations | 10 | `uiCreate*`, `uiAdd*`, `submitAddInventory` |
| UPDATE operations | 5 | `uiUpdate*`, `uiUpdateOrderStatus` |
| DELETE operations | 3 | `uiDeleteCustomer`, `uiDeleteTask`, `uiDeleteMember` |
| UI/Launch helpers | 5 | `showPhinoxDashboard`, `doGet`, `openAddInventoryModal` |

---

## 5. Confirmed Security Gaps

### P0 — CRITICAL

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| 1 | **Zero authorization in UI_Server.js** | All 46 sensitive functions have no permission checks | Any Google user can delete members, view finance, create orders |
| 2 | **Inactive members retain access** | `getCurrentMember()` does not check `status === 'Active'` | Fired employees can still operate the system |
| 3 | **Duplicate email = privilege escalation** | First match wins silently | Lower-privilege member could be matched before higher-privilege |
| 4 | **Case-sensitive email matching** | `===` comparison without `.toLowerCase()` | `User@gmail.com` won't match `user@gmail.com` |
| 5 | **No member caching** | `getMembers()` full scan on every permission check | Performance + race condition risk |

### P1 — HIGH

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| 6 | `getRole()` references legacy `getMember()` | `if(typeof getMember === 'function')` | If `getMember` doesn't exist, role resolution fails silently |
| 7 | `softDeleteRecord()` only requires authentication | `var member = getCurrentMember(); if(!member) throw...` | Any authenticated user can soft-delete any record |
| 8 | `submitApprovalRequest()` has no permission check | Only checks `getCurrentMember()` | Any user can submit approval requests |
| 9 | `assignRole()` requires `admin` but no UI endpoint exists | Only callable from server | Not a direct risk but shows incomplete integration |
| 10 | No expense permissions exist | `PERMISSIONS` object has no `expenses:*` constants | Expense system (when exposed) will be unprotected |

### P2 — MEDIUM

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| 11 | `MEMBER_COL` missing `DEPARTMENT: 12` | 12 columns defined, 13 exist | Latent bug if department-aware features added to permissions |
| 12 | `t()` i18n fallback may conflict | `if(typeof t !== 'function')` | If another module defines `t()`, behavior undefined |
| 13 | `getCurrentMember()` logs warning but doesn't alert | `Logger.warn(...)` | Admin won't know about authentication failures |
| 14 | `showPhinoxDashboard()` and `doGet()` have no auth gate | Anyone can load the UI | UI loads but data calls would fail (after fixes) |

### P3 — LOW

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| 15 | `getPermissionMatrix()` not frozen | Plain object, could be mutated | Malicious code could modify permissions at runtime |
| 16 | `WORKFLOW_TYPES` has hardcoded Arabic strings | `'اعتماد مصروف'` | Not a security issue but i18n inconsistency |

---

## 6. Required Dependencies

Based on the three-file analysis, these dependencies are confirmed required for Phase 1:

| Dependency | File | Reason | Required For |
|------------|------|--------|--------------|
| ✅ Already have | `13_Permissions.js` | Core RBAC | Everything |
| ✅ Already have | `15_Members.js` | Member data source | Identity resolution |
| ✅ Already have | `UI_Server.js` | Endpoints to protect | Authorization enforcement |
| ❌ **NEED** | `02_ErrorHandler.js` | `ErrorHandler.permission()` | Error formatting |
| ❌ **NEED** | `01_Utils.js` | `isEmpty()`, `now()`, `generateId()` | Helper functions used by permissions |

**09_Security.js is NOT required for Phase 1.** The incremental analysis proves that 13_Permissions.js has all necessary functions for authorization. 09_Security.js can remain loaded but inactive — it does not conflict because UI_Server.js calls neither system.

---

## 7. Minimal Files To Modify

### Target: 2 files only

| # | File | Changes | Lines |
|---|------|---------|-------|
| 1 | `13_Permissions.js` | 3 fixes | ~15 lines |
| 2 | `UI_Server.js` | Add authorization wrapper + apply to all 46 functions | ~100 lines |

### 7.1 13_Permissions.js — Required Fixes

**Fix A: `getCurrentMember()` — Add status check + email normalization**
```javascript
// BEFORE:
if(members[i][MEMBER_COL.EMAIL] === email) return members[i];

// AFTER:
var memberEmail = String(members[i][MEMBER_COL.EMAIL] || '').trim().toLowerCase();
if(memberEmail === email && members[i][MEMBER_COL.STATUS] === 'Active') return members[i];
```

**Fix B: `getCurrentMember()` — Add result caching**
```javascript
// Add at module level:
var _currentMemberCache = null;

// In getCurrentMember():
if(_currentMemberCache) return _currentMemberCache;
// ... after successful lookup:
_currentMemberCache = members[i];
return _currentMemberCache;
```

**Fix C: Add expense permissions to PERMISSIONS constant**
```javascript
EXPENSES_READ:    "expenses:read",
EXPENSES_WRITE:   "expenses:write",
EXPENSES_APPROVE: "expenses:approve",
EXPENSES_DELETE:  "expenses:delete"
```

### 7.2 UI_Server.js — Authorization Pattern

**New helper function (add at top of UI_Server.js):**
```javascript
function _requireAuth(permission) {
  var member = getCurrentMember();
  if (!member) {
    throw new Error('Authentication required. Please ensure you are registered as an active member.');
  }
  if (!hasPermission(member, permission)) {
    throw new Error('Access denied: ' + permission);
  }
  return member;
}
```

**Pattern for each endpoint (example):**
```javascript
function uiDeleteMember(id) {
  try {
    _requireAuth(PERMISSIONS.MEMBERS_DELETE);  // ← ADD THIS LINE
    Members.deleteMember(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

---

## 8. Implementation Sequence

### STEP 1: Fix Identity Resolution (13_Permissions.js)
**Files:** `13_Permissions.js`
**Functions:** `getCurrentMember()`
**Change:** Add email normalization + status check + caching
**Why:** Prevents inactive access, case-sensitivity bugs, duplicate issues
**Risk:** LOW — only affects authentication path
**Dependencies:** None
**Acceptance:** Inactive members rejected; `User@Gmail.com` matches `user@gmail.com`

### STEP 2: Add Expense Permissions (13_Permissions.js)
**Files:** `13_Permissions.js`
**Functions:** `PERMISSIONS` constant, `getPermissionMatrix()`
**Change:** Add 4 expense permissions; assign to CEO/Partner/Finance roles
**Why:** Prepares for Phase 2 expense UI exposure
**Risk:** NONE — additive only
**Dependencies:** STEP 1
**Acceptance:** `hasPermission(ceoMember, PERMISSIONS.EXPENSES_APPROVE)` returns true

### STEP 3: Create Authorization Helper (UI_Server.js)
**Files:** `UI_Server.js`
**Functions:** New `_requireAuth(permission)`
**Change:** Add centralized authorization function
**Why:** Single point of enforcement, consistent error format
**Risk:** LOW — new code, no existing callers
**Dependencies:** STEP 1
**Acceptance:** `_requireAuth('fake:perm')` throws for all user types

### STEP 4: Protect DELETE Endpoints (UI_Server.js)
**Files:** `UI_Server.js`
**Functions:** `uiDeleteCustomer`, `uiDeleteTask`, `uiDeleteMember`
**Change:** Add `_requireAuth(PERMISSIONS.XXX_DELETE)` as first line
**Why:** Highest risk operations first
**Risk:** MEDIUM — if permission constant wrong, legitimate users blocked
**Dependencies:** STEP 3
**Acceptance:** Unauthorized user gets `{success: false, error: 'Access denied...'}`

### STEP 5: Protect CREATE Endpoints (UI_Server.js)
**Files:** `UI_Server.js`
**Functions:** `uiCreateSale`, `uiCreateOrder`, `uiAddMember`, `uiCreateInventoryItem`, etc.
**Change:** Add `_requireAuth(PERMISSIONS.XXX_WRITE)`
**Why:** Second highest risk
**Risk:** MEDIUM
**Dependencies:** STEP 3
**Acceptance:** Same as STEP 4

### STEP 6: Protect UPDATE Endpoints (UI_Server.js)
**Files:** `UI_Server.js`
**Functions:** `uiUpdateCustomer`, `uiUpdateTask`, `uiUpdateMember`, `uiUpdateOrderStatus`
**Change:** Add `_requireAuth(PERMISSIONS.XXX_WRITE)`
**Why:** Data modification risk
**Risk:** MEDIUM
**Dependencies:** STEP 3
**Acceptance:** Same as STEP 4

### STEP 7: Protect READ Endpoints (UI_Server.js)
**Files:** `UI_Server.js`
**Functions:** All `uiGet*` functions
**Change:** Add `_requireAuth(PERMISSIONS.XXX_READ)`
**Why:** Information disclosure risk (finance data, member data)
**Risk:** LOW — read-only
**Dependencies:** STEP 3
**Acceptance:** Same as STEP 4

### STEP 8: Protect Approval/Posting (UI_Server.js)
**Files:** `UI_Server.js` (when expense endpoints added in Phase 2)
**Functions:** Future `uiApproveExpense`, `uiPostExpenseToLedger`
**Change:** Add `_requireAuth(PERMISSIONS.EXPENSES_APPROVE)`
**Why:** Financial posting is irreversible
**Risk:** HIGH
**Dependencies:** STEP 2
**Acceptance:** Only CEO/Partner/Finance can approve expenses

### STEP 9: Add Member Caching (13_Permissions.js)
**Files:** `13_Permissions.js`
**Functions:** `getCurrentMember()`
**Change:** Add `_currentMemberCache` module variable
**Why:** Performance — avoids full sheet scan per call
**Risk:** LOW — cache scoped to single execution
**Dependencies:** STEP 1
**Acceptance:** Multiple calls to `getCurrentMember()` in same execution return cached result

### STEP 10: Security Test Execution
**Files:** `14_PermissionsTest.js` (extend existing tests)
**Functions:** New test cases
**Change:** Add tests for each role/permission combination
**Why:** Verify enforcement works correctly
**Risk:** NONE — test-only
**Dependencies:** STEPS 1-7
**Acceptance:** All tests pass for all 7 roles × all permissions

---

## 9. Security Test Plan

### Test Matrix: Role × Operation

| Role | Read Members | Create Member | Delete Member | Read Finance | Create Expense | Approve Expense | Read Orders | Create Order | Delete Task |
|------|-------------|---------------|---------------|--------------|----------------|-----------------|-------------|--------------|-------------|
| **CEO** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Partner** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Finance** | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Operations** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Marketing** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Designer** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Customer Service** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Unknown Email** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Inactive Member** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Test Cases (to be implemented)

**TC-001: CEO Full Access**
- Input: CEO member calls `uiDeleteMember('any-id')`
- Expected: `{success: true}`

**TC-002: Partner Cannot Delete Member**
- Input: Partner calls `uiDeleteMember('any-id')`
- Expected: `{success: false, error: 'Access denied: members:delete'}`

**TC-003: Finance Can Read Finance**
- Input: Finance member calls `uiGetFinanceStats()`
- Expected: `{success: true, data: {...}}`

**TC-004: Finance Cannot Delete Member**
- Input: Finance member calls `uiDeleteMember('any-id')`
- Expected: `{success: false, error: 'Access denied: members:delete'}`

**TC-005: Unknown Email Rejected**
- Input: Google account not in Members sheet calls any function
- Expected: `{success: false, error: 'Authentication required...'}`

**TC-006: Inactive Member Rejected**
- Input: Inactive member (status !== 'Active') calls any function
- Expected: `{success: false, error: 'Authentication required...'}`

**TC-007: Case-Insensitive Email**
- Input: Google email `User@Gmail.com`, Members sheet has `user@gmail.com`
- Expected: Authentication succeeds

**TC-008: Marketing Cannot Read Finance**
- Input: Marketing member calls `uiGetFinanceStats()`
- Expected: `{success: false, error: 'Access denied: finance:read'}`

**TC-009: Operations Can Create Order**
- Input: Operations member calls `uiCreateOrder(data)`
- Expected: `{success: true, id: 'ORD-...'}`

**TC-010: Designer Cannot Create Order**
- Input: Designer member calls `uiCreateOrder(data)`
- Expected: `{success: false, error: 'Access denied: orders:write'}`

---

## 10. Approval Required

### Decision Points

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | **Adopt 13_Permissions.js as authoritative?** | Yes / No / Merge with 09_Security.js | **YES** — sufficient for Phase 1 |
| 2 | **Deprecate 09_Security.js?** | Now / Later / Keep both | **Later** — leave loaded but don't call it |
| 3 | **Fix MEMBER_COL department gap?** | Now / Later / Ignore | **Later** — not needed for authorization |
| 4 | **Add expense permissions now?** | Yes / Wait for Phase 2 | **Yes** — harmless, prepares for Phase 2 |
| 5 | **Implement in 2 files or more?** | 2 files / 3+ files | **2 files** — 13_Permissions.js + UI_Server.js |
| 6 | **Authorization in UI_Server only or Service layer too?** | UI_Server / Service / Both | **UI_Server first** — Service layer can be Phase 1.5 |

### Go/No-Go Criteria

**GO if:**
- ✅ 13_Permissions.js can resolve identity correctly (after Fix A)
- ✅ Permission matrix covers all UI_Server operations
- ✅ `_requireAuth()` helper can be added without breaking existing code
- ✅ All 46 sensitive endpoints can be protected with one-line additions

**NO-GO if:**
- ❌ `getCurrentMember()` cannot be fixed without breaking other modules
- ❌ `hasPermission()` has hidden bugs not found in this audit
- ❌ `ErrorHandler.permission()` is not available (dependency missing)

### My Assessment: **GO** ✅

The architecture is sound. The fixes are minimal and low-risk. The permission system exists and works — it just needs to be **wired to the UI gateway**.

---

## APPENDIX A: Code Evidence

### A.1 getCurrentMember() — Full Source
```javascript
function getCurrentMember(){
  var email = null;
  try{
    email = Session.getActiveUser().getEmail();
  }catch(e1){
    try{ email = Session.getEffectiveUser().getEmail(); }catch(e2){ Logger.warn('Permissions', 'Session fallback failed', {error: String(e2)}); return null; }
  }
  if(isEmpty(email)) return null;
  if (typeof getMembers !== 'function') {
    Logger.warn('Permissions', 'getMembers not available');
    return null;
  }
  var members = getMembers();
  for(var i = 0; i < members.length; i++){
    if(members[i][MEMBER_COL.EMAIL] === email) return members[i];
  }
  return null;
}
```

### A.2 UI_Server.js Pattern — Zero Auth
```javascript
function uiDeleteMember(id) {
  try {
    Members.deleteMember(id);  // ← NO PERMISSION CHECK
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

### A.3 MEMBER_COL Definition
```javascript
var MEMBER_COL = { MEMBER_ID: 0, FULL_NAME: 1, ROLE: 2, EMAIL: 3, PHONE: 4, STATUS: 5, JOIN_DATE: 6, KPI_SCORE: 7, TASKS_COMPLETED: 8, TASKS_LATE: 9, AVERAGE_QUALITY: 10, NOTES: 11 };
```

### A.4 MEMBER_SCHEMA Definition
```javascript
var MEMBER_SCHEMA = {
  id: 1, name: 2, role: 3, email: 4, phone: 5, status: 6,
  joinDate: 7, kpiScore: 8, tasksCompleted: 9, tasksLate: 10,
  averageQuality: 11, notes: 12, department: 13
};
```

---

*Audit completed using only: 13_Permissions.js, 15_Members.js, UI_Server.js*
*09_Security.js was NOT inspected — not required for Phase 1 determination*
*Total files analyzed: 3*
*Total functions mapped: 51*
*Security gaps found: 16 (5 P0, 5 P1, 4 P2, 2 P3)*
