# PHINOX BOS — PHASE 2 PRE-IMPLEMENTATION REPORT
## Finance / Expenses UI

---

## 1. EXISTING EXPENSE CAPABILITIES FOUND

### 1.1 Expense Schema (39_FinanceSchema.js)

```javascript
EXPENSE_SCHEMA = {
  id: 1, title: 2, category: 3, amount: 4, description: 5,
  status: 6, requestedBy: 7, approvedBy: 8,
  rejectionReason: 9, createdAt: 10, updatedAt: 11
}
```

**Fields:** id, title, category, amount, description, status, requestedBy, approvedBy, rejectionReason, createdAt, updatedAt

**Status values:** Draft, Pending, Approved, Posted, Rejected

### 1.2 Expense Service Functions (41_FinanceService.js)

| Function | Purpose | Status Flow |
|----------|---------|-------------|
| `createExpenseRequest(data)` | Create draft expense | → Draft |
| `submitExpenseRequest(id)` | Submit for approval | Draft → Pending |
| `approveExpenseRequest(id, approver)` | Approve expense | Pending → Approved |
| `rejectExpenseRequest(id, approver, reason)` | Reject expense | Pending → Rejected |
| `postExpenseToLedger(id)` | Post approved expense to ledger | Approved → Posted |
| `deleteExpenseRequest(id)` | Delete draft expense | Removes Draft |
| `getExpenseRequests(options)` | List expenses with filters | — |
| `getExpenseRequest(id)` | Get single expense | — |

### 1.3 Approval Thresholds

| Amount | Required Approver |
|--------|-------------------|
| ≤ 100 EGP | Manager+ (CEO, Partner, Operations) |
| ≤ 500 EGP | Finance+ (CEO, Partner, Finance) |
| ≤ 2,000 EGP | CEO or Partner |
| > 2,000 EGP | CEO + Partner (both) |

### 1.4 Ledger Integration

- `postExpenseToLedger()` creates an immutable ledger entry
- Uses idempotency key to prevent duplicate posting
- Ledger entry type: 'expense'
- Auto-linked to expense ID via `relatedId`
- Once posted, expense cannot be modified

### 1.5 Validation Rules

- Title: required, 3-100 chars
- Category: required, must be in EXPENSE_CATEGORIES
- Amount: required, positive number
- Description: optional, max 500 chars
- Status transitions validated (cannot skip states)

### 1.6 Audit Logging

- All state changes logged via `logActivity()`
- Approval/rejection records who and when
- Ledger posting is permanently recorded

---

## 2. EXISTING ENDPOINTS IN UI_Server.js

**Expense endpoints: ZERO**

No expense-related functions exist in UI_Server.js.

---

## 3. MISSING ENDPOINTS

| Endpoint | Permission | Backend Function |
|----------|------------|------------------|
| `uiGetExpenses(options)` | expenses:read | `FinanceService.getExpenseRequests(options)` |
| `uiGetExpense(id)` | expenses:read | `FinanceService.getExpenseRequest(id)` |
| `uiCreateExpense(data)` | expenses:write | `FinanceService.createExpenseRequest(data)` |
| `uiSubmitExpense(id)` | expenses:write | `FinanceService.submitExpenseRequest(id)` |
| `uiApproveExpense(id)` | expenses:approve | `FinanceService.approveExpenseRequest(id, memberName)` |
| `uiRejectExpense(id, reason)` | expenses:approve | `FinanceService.rejectExpenseRequest(id, memberName, reason)` |
| `uiPostExpense(id)` | expenses:approve | `FinanceService.postExpenseToLedger(id)` |
| `uiDeleteExpense(id)` | expenses:delete | `FinanceService.deleteExpenseRequest(id)` |

---

## 4. FILES TO MODIFY

| # | File | Change Type | Reason |
|---|------|-------------|--------|
| 1 | `UI_Server.js` | ADD 8 functions | Expose expense backend to UI |
| 2 | `UI_Index.html` | ADD page, sidebar, JS | Expense UI interface |
| 3 | `14_PermissionsTest.js` | ADD tests | Expense security validation |

**Files NOT modified:**
- `13_Permissions.js` — expense permissions already exist from Phase 1
- `39_FinanceSchema.js` — no defects found
- `41_FinanceService.js` — no defects found
- `09_Security.js` — still deprecated, untouched

---

## 5. EXACT FUNCTIONS TO ADD/CHANGE

### 5.1 UI_Server.js — New Functions (8)

```javascript
function uiGetExpenses(options)
function uiGetExpense(id)
function uiCreateExpense(data)
function uiSubmitExpense(id)
function uiApproveExpense(id)
function uiRejectExpense(id, reason)
function uiPostExpense(id)
function uiDeleteExpense(id)
```

### 5.2 UI_Index.html — New Sections

1. **AppState**: Add `expensesData: null`
2. **titles object**: Add `'expenses': 'Expenses'`
3. **loadPageData switch**: Add `case 'expenses': loadExpenses(dates); break;`
4. **Sidebar**: Add "Expenses" link under Finance
5. **page-expenses**: New HTML section with KPI cards, table, filters
6. **loadExpenses()**: Data loading function
7. **openAddExpenseModal()**: Modal for creating expense
8. **submitExpenseForm()**: Form submission handler
9. **expense workflow actions**: submit/approve/reject/post/delete handlers

### 5.3 14_PermissionsTest.js — New Tests (10)

EXP-001 through EXP-010

---

## 6. PERMISSION MAPPING

| Permission | Role Access | Endpoints |
|------------|-------------|-----------|
| `expenses:read` | CEO, Partner, Finance | uiGetExpenses, uiGetExpense |
| `expenses:write` | CEO, Partner, Finance | uiCreateExpense, uiSubmitExpense |
| `expenses:approve` | CEO, Partner, Finance | uiApproveExpense, uiRejectExpense, uiPostExpense |
| `expenses:delete` | CEO, Partner | uiDeleteExpense |

---

## 7. WORKFLOW MAPPING

```
┌─────────┐   create   ┌─────────┐   submit   ┌─────────┐
│  START  │ ─────────→ │  DRAFT  │ ─────────→ │ PENDING │
└─────────┘            └─────────┘            └────┬────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │ approve                │ reject                 │
                          ▼                        ▼                        │
                     ┌─────────┐             ┌─────────┐                   │
                     │APPROVED │             │REJECTED │                   │
                     └────┬────┘             └─────────┘                   │
                          │ post                                            │
                          ▼                                               │
                     ┌─────────┐                                          │
                     │ POSTED  │ ←────────────────────────────────────────┘
                     └─────────┘   (immutable, linked to ledger)
```

---

## 8. RISKS

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | UI_Index.html is 225KB — single-file architecture | 🟡 MEDIUM | Targeted insertions only, no rewrites |
| 2 | `submitAddInventory()` contains client-side code in server file | 🟡 MEDIUM | Do NOT replicate this pattern — keep UI logic in HTML |
| 3 | Expense categories hardcoded in Config — may not match UI dropdown | 🟡 LOW | Use same categories as FinanceService |
| 4 | No `date` field in expense schema — only createdAt | 🟡 LOW | Use createdAt for display, document limitation |
| 5 | `getCurrentMember()` caching may cause stale auth in long sessions | 🟢 LOW | Cache is per-execution only (GAS limitation) |

---

## 9. APPROVAL TO PROCEED

**Status: READY TO IMPLEMENT**

All dependencies verified:
- ✅ Backend expense workflow exists and is functional
- ✅ RBAC permissions exist from Phase 1
- ✅ `_requireAuth()` pattern established
- ✅ UI architecture understood (pages, sidebar, modals, tables, charts)
- ✅ No duplicate endpoints exist
- ✅ No defects in FinanceService prevent UI usage

