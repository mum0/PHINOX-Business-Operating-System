
# PHINOX BOS — PHASE 3C + 3D PREPARATION REPORT
## Source-of-Truth Audit + Implementation Plan + Stage Specifications

**Date:** 2026-08-15
**Source:** GitHub v5-enterprise branch (fresh fetch)
**Status:** READ-ONLY AUDIT — NO FILES MODIFIED

---

# PART 1: ROADMAP SOURCE-OF-TRUTH CHECK

## 1.1 Official Phase 3D Definition

**Source:** `ai/PHASE_3_ARCHITECTURE_DECISION_RECORD.md` (v5-enterprise)

| Attribute | Official Value |
|-----------|---------------|
| **Name** | Phase 3D — Inventory UI |
| **Goal** | Add movement history, BOM editor, cost breakdown to UI |
| **Files Modified** | `UI_Index.html`, `UI_Server.js` |
| **Functions Added** | `uiGetStockMovements()`, `uiAdjustStock()`, `uiGetBOM()`, `uiCreateBOM()`, `uiUpdateBOM()`, `uiDeleteBOM()`, `uiGetProductMargin()` |
| **Permissions** | `inventory:read`, `inventory:write`, `inventory:adjust`, `inventory:manage_bom`, `inventory:view_cost` |
| **Dependencies** | PHASE 3A, 3B, 3C |
| **Risk** | UI_Index.html grows larger (already 239KB) |

## 1.2 Phase Sequence (Official Roadmap)

| Phase | Name | Status | Dependencies |
|-------|------|--------|-------------|
| 3A | Inventory Data Integrity | NOT IMPLEMENTED in repo | None |
| 3B | Stock Movement History | ✅ IMPLEMENTED in repo | 3A |
| 3C | Product Costing / BOM | NOT IMPLEMENTED in repo | 3A, 3B |
| **3D** | **Inventory UI** | **NOT IMPLEMENTED in repo** | **3A, 3B, 3C** |
| 3E | Finance / COGS Integration Verification | NOT IMPLEMENTED | 3A–3D |
| 3F | Testing | NOT IMPLEMENTED | 3A–3E |

## 1.3 Sub-Phases Preceding 3D

All of 3A, 3B, 3C must be CLOSED / VERIFIED before 3D can begin.

---

# PART 2: PHASE 3C IMPLEMENTATION PLAN

## 2.1 Current State

| Item | Status |
|------|--------|
| Stage Specification | ✅ READY (`PHASE_3C_STAGE_SPECIFICATION.md`) |
| Implementation Authorization | ⏳ PENDING (blocked by 3A gate) |
| Files Created | ❌ NONE (not authorized) |

## 2.2 Files to Modify (2 files)

### 10_Setup.js
**Changes:**
- Add `_getBOMConfig()` → `{ headers: BOMSchema.getSheetHeaders(), widths: [22, 15, 25, 35, 10, 20, 20, 25] }`
- Add `_getBOMAItemConfig()` → `{ headers: BOMAItemSchema.getSheetHeaders(), widths: [22, 22, 15, 12, 10, 12, 30, 10, 20, 20, 25] }`
- Add `createSheet(ss, 'BOM', _getBOMConfig())` in `run()`
- Add `createSheet(ss, 'BOM_ITEM', _getBOMAItemConfig())` in `run()`
- Add reset logic for BOM and BOM_ITEM sheets in `reset()`

**Risk:** Low — follows existing pattern exactly

### 13_Permissions.js
**Changes:**
- Add `INVENTORY_BOM_READ: "inventory:bom_read"`
- Add `INVENTORY_BOM_MANAGE: "inventory:bom_manage"`
- Add to CEO matrix: both permissions
- Add to Partner matrix: both permissions
- Add to Operations matrix: both permissions
- Add to Finance matrix: INVENTORY_BOM_READ only
- Add sheet mappings in `getSheetPermission()`:
  - `'BOM': { read: BOM_READ, write: BOM_MANAGE, delete: BOM_MANAGE }`
  - `'BOM_ITEM': { read: BOM_READ, write: BOM_MANAGE, delete: BOM_MANAGE }`

**Risk:** Low — follows existing pattern

## 2.3 New Files Required (6 files)

| # | File | Columns | Purpose | Loads After |
|---|------|---------|---------|-------------|
| 69 | `BOMSchema.js` | 8 | BOM Header schema | 24 (InventorySchema) |
| 70 | `BOMAItemSchema.js` | 11 | BOM Line Item schema | 24, 69 |
| 71 | `BOMRepository.js` | — | Data access for BOM | 06, 69 |
| 72 | `BOMAItemRepository.js` | — | Data access for BOM Items | 06, 70 |
| 73 | `BOMService.js` | — | Business logic + Cost Calculation + Margin | 24, 25, 26, 13, 69–72 |
| 74 | `BOMTest.js` | — | Unit + E2E tests | 73, 28 |

## 2.4 Schemas

### BOM Header (8 columns)
```
id, finishedProductSku, name, description, active, createdAt, updatedAt, createdBy
```

### BOM Item (11 columns)
```
id, bomId, componentSku, quantityRequired, unit, wastagePercent, notes, active, createdAt, updatedAt, createdBy
```

## 2.5 Service API

### BOM CRUD
- `createBOM(data)` → id
- `getBOM(id)` → object
- `getBOMByFinishedProductSku(sku)` → object or null
- `updateBOM(id, updates)` → updated object
- `deleteBOM(id)` → soft delete (active=false)

### BOM Item CRUD
- `addBOMItem(bomId, data)` → id
- `getBOMItems(bomId)` → paginated list
- `updateBOMItem(id, updates)` → updated object
- `removeBOMItem(id)` → soft delete

### Cost Calculation
- `calculateBOMCost(bomId)` → { totalMaterialCost, totalCost }
  - Formula: `effectiveQty = qtyRequired × (1 + wastagePercent/100)`
  - `componentCost = effectiveQty × Inventory.cost`
  - `totalMaterialCost = Σ(componentCosts)`
- `calculateUnitCost(productId)` → { unitCost, source, bomId? }
- `updateCostFromBOM(productId)` → explicit opt-in cost update

### Gross Margin
- `calculateGrossMargin(productId)` → { sellingPrice, currentCost, grossProfit, grossMarginPercent, source, bomId? }

## 2.6 Validation Rules

| # | Rule | Enforcement |
|---|------|-------------|
| 1 | At most one active BOM per SKU | `findByFinishedProductSku()` + conflict check |
| 2 | Finished product must exist in Inventory | `InventoryService.getItemBySku()` |
| 3 | Finished product type must be FINISHED_GOOD (or empty) | Type validation |
| 4 | Component must exist in Inventory | `InventoryService.getItemBySku()` |
| 5 | Component cannot be FINISHED_GOOD | Business rule for clothing store |
| 6 | No self-reference | `componentSku !== finishedProductSku` |
| 7 | No circular BOM | Recursive check with depth limit |
| 8 | No duplicate active components | Per-BOM duplicate check |
| 9 | Quantity > 0 | Validation schema |
| 10 | Wastage 0–100% | Validation schema |

## 2.7 Permission Matrix

| Role | BOM_READ | BOM_MANAGE |
|------|----------|------------|
| CEO | ✅ | ✅ |
| Partner | ✅ | ✅ |
| Operations | ✅ | ✅ |
| Finance | ✅ | ❌ |
| Marketing | ❌ | ❌ |
| Designer | ❌ | ❌ |
| Customer Service | ❌ | ❌ |

## 2.8 COGS Interaction (CRITICAL)

| Data | Behavior | Reason |
|------|----------|--------|
| Order.unitCost snapshots | **IMMUTABLE** | Captured at order creation |
| Sale.cogs | **IMMUTABLE** | Computed at sale creation |
| Finance ledger entries | **IMMUTABLE** | Posted once |
| Inventory.cost (future) | **Mutable via opt-in** | `updateCostFromBOM()` explicit call |

**No automatic cost updates.** BOM calculation does NOT auto-update inventory cost.

## 2.9 Tests Required

### Unit Tests (testBOMModule)
1. BOMSchema: 8 fields, correct columns
2. BOMAItemSchema: 11 fields, correct columns
3. TYPE enum exists in InventorySchema (Phase 3A dependency)
4. Repository methods exist
5. Service methods exist
6. Permissions exist

### E2E Tests (testBOME2E)
1. Create typed inventory (FG, RM, COMP)
2. Invalid type rejected
3. Backward compat: no type → defaults to FINISHED_GOOD
4. Create BOM for FG
5. Duplicate active BOM rejected
6. FG validation for finished product
7. Add components
8. Invalid component type rejected
9. Invalid quantity rejected
10. Invalid wastage rejected
11. Duplicate component rejected
12. Self-reference rejected
13. Circular BOM rejected
14. BOM item update
15. BOM soft delete
16. BOM cost calculation
17. Wastage verified
18. Multiple components summed
19. Unit cost calculation
20. Update cost from BOM
21. Gross margin calculation
22. Zero selling price safety
23. Unauthorized access blocked
24. Historical order unitCost unchanged
25. Historical sale COGS unchanged
26. Backward compatibility

## 2.10 Locked Files (NO MODIFICATION)

```
27_StockMovementSchema.js      29_StockMovementRepository.js
30_StockMovementService.js      32_StockMovementTest.js
29_OrderSchema.js               30_OrderRepository.js
31_OrderService.js              32_OrderController.js
33_OrderTest.js                 34_SaleSchema.js
35_SaleRepository.js            36_SaleService.js
37_SaleController.js            38_SaleTest.js
39_FinanceSchema.js             40_FinanceRepository.js
41_FinanceService.js            42_FinanceController.js
43_FinanceTest.js
```

## 2.11 Rollback Considerations

| Scenario | Rollback Action |
|----------|-----------------|
| BOM cost incorrect | Delete BOM sheets, revert to manual cost entry |
| Permission issues | Remove BOM_READ/BOM_MANAGE from matrix |
| Performance issues | Disable BOM cost calculation, use manual cost only |
| Data corruption | BOM and BOM_ITEM sheets can be deleted and recreated |

## 2.12 Dependency Gate

**Phase 3C CANNOT start until:**
- ✅ Phase 3A is CLOSED / VERIFIED (all 5 checklist items)
- ⏳ Phase 3B is LOCKED / VERIFIED (already true)

---

# PART 3: PHASE 3D STAGE SPECIFICATION

## 3.1 Objective (Official from Roadmap)

**Phase 3D — Inventory UI**

Add movement history, BOM editor, and cost breakdown views to the existing PHINOX BOS web UI.

## 3.2 Scope

### IN SCOPE
- Stock movement history page/modal in UI_Index.html
- BOM editor page/modal in UI_Index.html
- Product cost breakdown display in UI_Index.html
- UI_Server.js endpoints for movement, BOM, and margin APIs
- Integration with existing inventory table

### OUT OF SCOPE
- Complete UI redesign
- Mobile-responsive redesign
- New authentication flows
- Real-time updates (WebSockets)
- Export/print functionality

## 3.3 Dependencies

| Dependency | Status | Required For |
|------------|--------|-------------|
| Phase 3A (type field) | ⏳ PENDING | Type-based filtering in UI |
| Phase 3B (StockMovement) | ✅ VERIFIED | Movement history display |
| Phase 3C (BOM service) | ⏳ PENDING | BOM editor, cost breakdown |
| UI_Server.js | ✅ EXISTS | New endpoint additions |
| UI_Index.html | ✅ EXISTS (239KB) | New sections/modals |

## 3.4 Source-of-Truth Audit Findings

### UI_Server.js (25,452 bytes)
**Current Inventory APIs:**
- `uiGetInventory(options)` → `InventoryService.getItems()`
- `uiGetInventoryStats()` → totals, low stock, out of stock, value, retail value
- `uiCreateInventoryItem(data)` → `InventoryService.createItem()`
- `openAddInventoryModal()` → HTML form with: SKU, Name, Category, Quantity, Cost, Price
- `submitAddInventory()` → parses form, calls `uiCreateInventoryItem()`

**Missing (to be added in 3D):**
- `uiGetStockMovements(sku, options)` → StockMovementService.getMovementsBySku()
- `uiAdjustStock(sku, qty, reason)` → InventoryService.adjustStock()
- `uiGetBOM(sku)` → BOMService.getBOMByFinishedProductSku()
- `uiCreateBOM(data)` → BOMService.createBOM()
- `uiUpdateBOM(id, data)` → BOMService.updateBOM()
- `uiDeleteBOM(id)` → BOMService.deleteBOM()
- `uiGetProductMargin(sku)` → BOMService.calculateGrossMargin()

**Critical Finding:**
- `openAddInventoryModal()` does NOT include `type` field in the form
- `openAddInventoryModal()` does NOT include `size`, `color`, `location`, `reorderLevel` fields
- The form only collects: SKU, Name, Category, Quantity, Cost, Price
- This means items created via UI default to: size='', color='', location='', reorderLevel=10, type='FINISHED_GOOD'
- **This is acceptable** — `getDefaultItem()` provides these defaults

### UI_Index.html (239,072 bytes)
**Current Inventory Table Columns:**
- SKU, Name, Category, Qty, Reserved, Available, Cost, Price, Status

**Missing (to be added in 3D):**
- Type column in inventory table
- Movement history section/page
- BOM editor modal/page
- Cost breakdown modal (showing material costs, wastage, total)
- Gross margin display per product
- Stock adjustment button/modal

**Critical Finding:**
- UI_Index.html is already 239KB — adding new sections will increase size
- No modular loading mechanism exists
- All HTML/JS/CSS is in a single file

## 3.5 Existing Files to Modify (2 files)

### UI_Server.js
**Add functions:**
```javascript
function uiGetStockMovements(sku, options) {
  try {
    var movements = StockMovementService.getMovementsBySku(sku, options || { limit: 1000 });
    return { success: true, data: movements };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiAdjustStock(data) {
  try {
    var result = InventoryService.adjustStock(data.sku, data.qty, data.reason, data.notes);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetBOM(sku) {
  try {
    var bom = BOMService.getBOMByFinishedProductSku(sku);
    return { success: true, data: bom };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiCreateBOM(data) {
  try {
    var id = BOMService.createBOM(data);
    return { success: true, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiUpdateBOM(id, data) {
  try {
    var updated = BOMService.updateBOM(id, data);
    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiDeleteBOM(id) {
  try {
    BOMService.deleteBOM(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function uiGetProductMargin(sku) {
  try {
    // Need productId from SKU first
    var item = InventoryService.getItemBySku(sku);
    if (!item) throw new Error('Item not found: ' + sku);
    var margin = BOMService.calculateGrossMargin(item.id);
    return { success: true, data: margin };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

### UI_Index.html
**Add sections:**
1. **Inventory table enhancement**: Add "Type" column to existing inventory table
2. **Movement history modal**: New modal showing stock movement log for selected SKU
3. **BOM editor modal**: New modal for creating/editing BOM for selected finished product
4. **Cost breakdown modal**: New modal showing material costs, wastage, total cost, margin
5. **Stock adjustment button**: Button in inventory row actions to open adjustment modal

**Pattern to follow:** Existing modal pattern (`openModal()`, `closeModal()`, `callServer()`)

## 3.6 New Files Required

**NONE.** Phase 3D only modifies existing UI files. No new .js or .html files.

## 3.7 Data Model (UI Layer)

### Movement History Display
```
Date | Type | Quantity | Before | After | Reason | Reference | User
```

### BOM Editor Display
```
Product: [SKU - Name]
Components:
  - SKU | Name | Qty Required | Unit | Wastage % | Unit Cost | Line Cost
Total Material Cost: [sum]
```

### Cost Breakdown Display
```
Selling Price: [price]
Current Cost: [cost]
  - Material: [materialCost]
Gross Profit: [profit]
Gross Margin: [margin%]
Source: [BOM / INVENTORY]
```

## 3.8 Business Rules (UI Layer)

1. **Only FINISHED_GOOD items** show "Create BOM" button
2. **Only items with BOM** show "View Cost Breakdown" button
3. **Movement history** is read-only (no edit/delete buttons)
4. **Stock adjustment** requires `inventory:adjust` permission
5. **BOM editing** requires `inventory:manage_bom` permission
6. **Cost viewing** requires `inventory:view_cost` permission

## 3.9 Service/API Impact

| API | Impact |
|-----|--------|
| InventoryService.getItems() | No change — UI consumes existing API |
| StockMovementService.getMovementsBySku() | No change — UI consumes existing API |
| BOMService.* | No change — UI consumes existing API |
| InventoryService.adjustStock() | No change — UI calls existing API |

## 3.10 Permissions

| Permission | UI Action | Required For |
|------------|-----------|-------------|
| `inventory:read` | View inventory, view movements | All users with inventory access |
| `inventory:write` | Create inventory items | Operations, CEO, Partner |
| `inventory:adjust` | Adjust stock button | Operations, CEO, Partner |
| `inventory:manage_bom` | Create/edit/delete BOM | Operations, CEO, Partner |
| `inventory:view_cost` | View cost breakdown, margin | Finance, Operations, CEO, Partner |

**Note:** `inventory:adjust`, `inventory:manage_bom`, `inventory:view_cost` are Phase 3B/3C permissions that must exist before 3D.

## 3.11 Setup Impact

**NONE.** Setup.js changes are done in 3A/3C. Phase 3D is pure UI layer.

## 3.12 Tests Required

### UI Tests (cannot run in GAS editor easily)
1. Inventory table shows Type column
2. Movement history modal opens and displays data
3. BOM editor modal opens and allows CRUD
4. Cost breakdown modal shows correct calculations
5. Stock adjustment modal works
6. Permission-based button visibility (hide buttons for unauthorized users)

### Integration Tests
1. `uiGetStockMovements()` returns correct data structure
2. `uiAdjustStock()` calls InventoryService correctly
3. `uiGetBOM()` returns BOM data
4. `uiCreateBOM()` creates BOM successfully
5. `uiGetProductMargin()` returns margin data

## 3.13 Backward Compatibility

| Aspect | Status |
|--------|--------|
| Existing inventory table | ✅ Preserved — Type column added, existing columns unchanged |
| Existing modals | ✅ Preserved — New modals are additive |
| Existing API endpoints | ✅ Preserved — New endpoints are additive |
| Existing UI flows | ✅ Preserved — No navigation changes |

## 3.14 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| UI_Index.html exceeds GAS size limit | Medium | High (cannot deploy) | Keep additions minimal; consider splitting into multiple HTML files in future |
| UI_Server.js function count exceeds GAS limit | Low | High | GAS limit is 500 functions; current count is ~50, plenty of room |
| New UI sections break existing layout | Low | Medium | Test in GAS editor before deployment |
| Permission checks missing in UI | Medium | High | All buttons check permissions before showing; server-side validation is primary defense |
| Client-side JavaScript errors | Medium | Medium | Follow existing patterns; test all new functions |

## 3.15 Locked Files

```
27_StockMovementSchema.js      29_StockMovementRepository.js
30_StockMovementService.js      32_StockMovementTest.js
29_OrderSchema.js               30_OrderRepository.js
31_OrderService.js              32_OrderController.js
33_OrderTest.js                 34_SaleSchema.js
35_SaleRepository.js            36_SaleService.js
37_SaleController.js            38_SaleTest.js
39_FinanceSchema.js             40_FinanceRepository.js
41_FinanceService.js            42_FinanceController.js
43_FinanceTest.js
24_InventorySchema.js           25_InventoryRepository.js
26_InventoryService.js          27_InventoryController.js
28_InventoryTest.js
```

**Note:** Locked files can be READ by UI_Server.js (they are dependencies), but not MODIFIED.

## 3.16 Out-of-Scope Items

| Item | Reason | Future Phase |
|------|--------|-------------|
| Complete UI redesign | Not required for 3D | Future |
| Mobile-responsive design | Not required for 3D | Future |
| Real-time stock updates | No WebSocket support in GAS | Future |
| Inventory forecasting UI | Requires ML/data analysis | Future |
| Supplier management UI | Separate feature | Future |
| Purchase order UI | Separate feature | Future |

## 3.17 Approval Gate

### BEFORE Phase 3D Implementation

- [ ] Phase 3A is CLOSED / VERIFIED
- [ ] Phase 3B is LOCKED / VERIFIED (already true)
- [ ] Phase 3C is CLOSED / VERIFIED
- [ ] This Stage Specification is approved
- [ ] UI design approach confirmed (modal vs page)

### AFTER Phase 3D Implementation

- [ ] All new UI sections render correctly in GAS editor
- [ ] Inventory table shows Type column
- [ ] Movement history modal displays data
- [ ] BOM editor allows CRUD operations
- [ ] Cost breakdown shows correct calculations
- [ ] Stock adjustment works end-to-end
- [ ] Permission-based visibility works
- [ ] Existing UI sections unaffected
- [ ] UI_Index.html deploys successfully

---

# PART 4: SUMMARY

## 4.1 Current Phase Status

| Phase | Status | Blocked By |
|-------|--------|-----------|
| 3A | IMPLEMENTATION PREPARED / VERIFICATION PENDING | User upload/verification |
| 3B | LOCKED / VERIFIED | — |
| 3C | STAGE SPECIFICATION READY / IMPLEMENTATION NOT AUTHORIZED | 3A closure |
| 3D | STAGE SPECIFICATION READY / IMPLEMENTATION NOT AUTHORIZED | 3A, 3B, 3C closure |
| 3E | NOT STARTED | 3A–3D closure |
| 3F | NOT STARTED | 3A–3E closure |

## 4.2 Files Expected to be Modified (All Phases)

| Phase | Files Modified | Files Created |
|-------|---------------|---------------|
| 3A | 24_InventorySchema.js, 26_InventoryService.js, 28_InventoryTest.js | None |
| 3B | None (already in repo) | None (already in repo) |
| 3C | 10_Setup.js, 13_Permissions.js | 69–74 (6 files) |
| 3D | UI_Server.js, UI_Index.html | None |
| 3E | None (verification only) | Test script |
| 3F | 14_PermissionsTest.js | Extended test files |

## 4.3 Total New Files (3C only)

- 69_BOMSchema.js
- 70_BOMAItemSchema.js
- 71_BOMRepository.js
- 72_BOMAItemRepository.js
- 73_BOMService.js
- 74_BOMTest.js

## 4.4 Total Modified Files (3C + 3D)

- 10_Setup.js (3C)
- 13_Permissions.js (3C)
- UI_Server.js (3D)
- UI_Index.html (3D)

## 4.5 Locked Files (All Phases)

All Order, Sale, Finance, StockMovement schema/repository/service/controller/test files.

## 4.6 Dependencies

```
3A (type field)
  ↓
3B (StockMovement) — ALREADY DONE
  ↓
3C (BOM + Costing)
  ↓
3D (Inventory UI)
  ↓
3E (COGS Verification)
  ↓
3F (Testing)
```

## 4.7 Final Verdict

**Phase 3C Stage Specification:** ✅ READY — Awaiting 3A closure + your explicit approval
**Phase 3D Stage Specification:** ✅ READY — Awaiting 3A, 3B, 3C closure + your explicit approval

**NO IMPLEMENTATION AUTHORIZED.**

**STOP.**
