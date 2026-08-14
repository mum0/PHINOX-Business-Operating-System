# PHINOX BOS — PHASE 3 ARCHITECTURE DECISION RECORD
## Inventory + Product Costing + BOM

---

## A) FILES INSPECTED

| Priority | File | Size | Status |
|----------|------|------|--------|
| P0 | `24_InventorySchema.js` | ~2,500 bytes | ✅ Full content |
| P0 | `26_InventoryService.js` | ~8,500 bytes | ✅ Full content |
| P1 | `13_Permissions.js` | 26,421 bytes | ✅ Phase 1 output |
| P1 | `UI_Server.js` | 25,452 bytes | ✅ Phase 2 output |
| P1 | `UI_Index.html` | 239,072 bytes | ✅ Phase 2 output |
| P1 | `36_SaleService.js` | ~12,000 bytes | ✅ Full content (COGS flow) |
| P1 | `31_OrderService.js` | ~10,000 bytes | ✅ Full content (unitCost snapshot) |

**Files NOT inspected (per constraints):**
- `09_Security.js` — deprecated, not relevant
- `39_FinanceSchema.js` — already verified in Phase 2
- `41_FinanceService.js` — already verified in Phase 2
- Marketing/Social/Customer/NPS files — out of scope
- `25_InventoryRepository.js` — not needed (BaseRepository pattern confirmed)

---

## B) CURRENT INVENTORY CAPABILITIES

### B.1 Data Structure (24_InventorySchema.js)

```javascript
SCHEMA = {
  id: 1, sku: 2, name: 3, category: 4, size: 5, color: 6,
  quantity: 7, reserved: 8, available: 9, cost: 10, price: 11,
  location: 12, reorderLevel: 13, supplierId: 14, status: 15,
  notes: 16, createdAt: 17, updatedAt: 18, createdBy: 19
}
```

**19 fields total.**

### B.2 What Already Works

| # | Capability | Status | Evidence |
|---|------------|--------|----------|
| 1 | **Inventory CRUD** | ✅ EXISTS | `createItem`, `getItem`, `getItems`, `updateItem`, `deleteItem` |
| 2 | **SKU uniqueness** | ✅ EXISTS | `_checkSkuUnique()` validates SKU not duplicate |
| 3 | **Stock reservation** | ✅ EXISTS | `reserveStock(sku, qty)` — reserved += qty |
| 4 | **Stock release** | ✅ EXISTS | `releaseStock(sku, qty)` — reserved -= qty |
| 5 | **Stock commit (deduct)** | ✅ EXISTS | `commitStock(sku, qty)` — quantity -= qty, reserved -= qty |
| 6 | **Stock restock** | ✅ EXISTS | `restock(sku, qty)` — quantity += qty |
| 7 | **Available calculation** | ✅ EXISTS | `available = quantity - reserved` (auto-recalculated) |
| 8 | **Stock invariant** | ✅ EXISTS | `reserved <= quantity`, `available >= 0` |
| 9 | **Auto status** | ✅ EXISTS | `quantity === 0` → `Out of Stock` |
| 10 | **Low stock detection** | ✅ EXISTS | `getLowStockItems()` — available <= reorderLevel |
| 11 | **Out of stock detection** | ✅ EXISTS | `getOutOfStockItems()` — available === 0 |
| 12 | **Inventory value** | ✅ EXISTS | `getInventoryValue()` = Σ(quantity × cost) |
| 13 | **Retail value** | ✅ EXISTS | `getInventoryRetailValue()` = Σ(available × price) |
| 14 | **Category filtering** | ✅ EXISTS | `getItemsByCategory()` |
| 15 | **Status filtering** | ✅ EXISTS | `getItemsByStatus()` |
| 16 | **Discontinued protection** | ✅ EXISTS | Cannot reserve discontinued items |
| 17 | **Delete protection** | ✅ EXISTS | Cannot delete items with stock |
| 18 | **Order→Inventory link** | ✅ EXISTS | Order creation enriches items with `unitCost` from inventory |
| 19 | **COGS calculation** | ✅ EXISTS | SaleService: `COGS = Σ(qty × unitCost)` using snapshotted cost |
| 20 | **Ledger posting** | ✅ EXISTS | EventBus `sale:created` → FinanceService posts COGS to ledger |
| 21 | **Rollback on failure** | ✅ EXISTS | Order reservation failure rolls back reserved stock |
| 22 | **Direct sale stock commit** | ✅ EXISTS | Direct sales call `commitStock()` after checking available |
| 23 | **Sale delete restock** | ✅ EXISTS | Deleting pending direct sale calls `restock()` |

### B.3 Current COGS Flow (Verified from Code)

```
Order Creation
  ↓
InventoryService.getItemBySku(sku) → invItem.cost
  ↓
Order item enriched: { sku, qty, unitPrice, unitCost, totalPrice }
  ↓
Order items JSON stored in order record
  ↓
Order Shipped → commitStock() deducts from inventory
  ↓
Order Delivered
  ↓
Sale Created → parse order items → unitCost from order (NOT fresh inventory lookup)
  ↓
COGS = Σ(qty × unitCost)  [snapshotted at order creation time]
  ↓
Sale record stored with cogs field
  ↓
EventBus.emit('sale:created', { cogs: ... })
  ↓
FinanceService.postCOGS() → Ledger entry (immutable)
```

**Critical insight:** COGS uses the `unitCost` snapshotted at **order creation time**, not at sale time. This is correct accounting practice (historical cost), but it means:
- `invItem.cost` must be accurate BEFORE order creation
- Changing `cost` after order creation does NOT affect already-snapshotted COGS
- This is the desired behavior for historical accuracy

---

## C) MISSING CAPABILITIES

### C.1 Stock Movement History

| Missing | Impact | Evidence |
|---------|--------|----------|
| No movement log table | Cannot trace WHO changed stock, WHEN, WHY | `reserveStock()` only calls `updateItem()` + `Logger.info()` |
| No movement types enum | RESTOCK, SALE, RESERVE, RELEASE, COMMIT not tracked as movements | Only field updates, no history records |
| No previous/new quantity tracking | Cannot see stock change history | No `previousQty`, `resultingQty` stored |
| No adjustment function | Cannot record damage, loss, theft, recount | `adjustStock()` does NOT exist |
| No return function | Cannot process customer returns to inventory | `returnStock()` does NOT exist |

**Current stock ops only update fields:**
```javascript
// reserveStock() — NO history written
updateItem(item.id, { reserved: newReserved });
Logger.info('Stock reserved', { sku, qty, reserved, available });
// ^ Logger only, not persistent audit trail
```

### C.2 Product Costing / BOM

| Missing | Impact | Evidence |
|---------|--------|----------|
| No BOM schema | Cannot define components per product | No BOM-related fields in InventorySchema |
| No component/material tracking | Cannot track fabric, thread, labels separately | `cost` is single number |
| No labor cost | Cannot track cutting, sewing, finishing costs | No labor fields |
| No overhead allocation | Cannot allocate rent, utilities to products | No overhead fields |
| No cost calculation | `cost` is stored, not computed from components | `createItem()` accepts `cost` as input |
| No gross margin per product | Cannot see profitability per SKU | No margin calculation in service |
| No batch costing | Cannot calculate cost per unit from batch total | No batch fields |
| No raw material vs finished product separation | All items treated identically | No `type` field (Raw Material / Finished Good) |

**Current cost model:**
```javascript
// cost is just a number field
cost: { required: true, type: 'number', min: 0 }
// No validation that cost = materials + labor + overhead
```

### C.3 UI Gaps

| Missing | Current State |
|---------|---------------|
| Stock movement history page | ❌ None |
| BOM editor | ❌ None |
| Product cost breakdown view | ❌ Table shows only single "Cost" column |
| Stock adjustment UI | ❌ None |
| Return processing UI | ❌ None |
| Low stock alerts dashboard | ⚠️ KPI card exists but no proactive alerts |
| Gross margin per product | ❌ None |

### C.4 Permission Gaps

| Missing Permission | Current State | Needed For |
|-------------------|---------------|------------|
| `inventory:view_cost` | ❌ Does not exist | View product cost (separate from `inventory:read`) |
| `inventory:adjust` | ❌ Does not exist | Stock adjustments (damage, loss, recount) |
| `inventory:manage_bom` | ❌ Does not exist | BOM creation/editing |

---

## D) ARCHITECTURE DECISION

### D.1 What SHOULD Be Extended (Not Rebuilt)

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **InventorySchema** | EXTEND — add `type` field | Distinguish Raw Material vs Finished Good vs Service |
| **InventoryService** | EXTEND — add `adjustStock()`, `returnStock()` | Use existing `updateItem()` pattern, add movement logging |
| **InventoryRepository** | NO CHANGE | BaseRepository pattern sufficient |
| **SaleService COGS** | NO CHANGE | Current snapshotted COGS is correct accounting practice |
| **OrderService unitCost** | NO CHANGE | Snapshot at order creation is correct |
| **FinanceService ledger** | NO CHANGE | Immutable ledger pattern is correct |
| **EventBus integration** | NO CHANGE | `sale:created` → COGS posting works correctly |
| **13_Permissions.js** | EXTEND — add 3 permissions | `inventory:view_cost`, `inventory:adjust`, `inventory:manage_bom` |
| **UI_Server.js** | EXTEND — add endpoints | Movement history, adjustment, BOM APIs |
| **UI_Index.html** | EXTEND — add pages/sections | Movement history, BOM editor, cost breakdown |

### D.2 What Should NOT Be Rebuilt

| Component | Why Not Rebuild |
|-----------|-----------------|
| **COGS calculation engine** | Already works correctly via SaleService + EventBus |
| **Ledger posting** | Already works via FinanceService + EventBus |
| **Stock reservation system** | Already works for order workflow |
| **Inventory value calculation** | Already works: Σ(quantity × cost) |
| **Low stock detection** | Already works: available <= reorderLevel |
| **BaseRepository** | Already provides O(1) lookup, batch ops, events |

### D.3 What Must Be Created New

| Component | Reason |
|-----------|--------|
| **StockMovement schema** | No equivalent exists |
| **StockMovement service** | No equivalent exists |
| **BOM schema** | No equivalent exists |
| **BOM service** | No equivalent exists |
| **ProductCostCalculator** | Cost is currently stored, not calculated |

---

## E) PROPOSED MODELS

### E.1 Extended Inventory Schema

```javascript
// ADD to existing InventorySchema.SCHEMA:
type: 20  // 'Raw Material' | 'Finished Good' | 'Service'

// Existing fields preserved (backward compatible)
// type defaults to 'Finished Good' for existing items
```

### E.2 Stock Movement Schema (NEW)

```javascript
STOCK_MOVEMENT_SCHEMA = {
  id: 1,
  timestamp: 2,
  sku: 3,
  productId: 4,
  quantity: 5,          // positive = in, negative = out
  movementType: 6,      // 'RESTOCK' | 'SALE' | 'RESERVE' | 'RELEASE' | 
                        // 'COMMIT' | 'ADJUSTMENT' | 'RETURN' | 'CANCEL'
  referenceType: 7,     // 'ORDER' | 'SALE' | 'MANUAL' | 'SYSTEM'
  referenceId: 8,       // orderId, saleId, etc.
  previousQuantity: 9,
  resultingQuantity: 10,
  previousReserved: 11,
  resultingReserved: 12,
  notes: 13,
  createdBy: 14,
  createdAt: 15
}
```

**Rationale:**
- Every stock operation creates a movement record
- Previous/resulting quantities provide full traceability
- Reference links to source document (order, sale, manual adjustment)
- Immutable append-only (no updates, no deletes)

### E.3 BOM Schema (NEW)

```javascript
BOM_SCHEMA = {
  id: 1,
  productId: 2,         // links to Inventory item (Finished Good)
  version: 3,           // '1.0', '1.1' — allows versioning
  status: 4,            // 'Active' | 'Archived'
  totalMaterialCost: 5,
  totalLaborCost: 6,
  totalOverheadCost: 7,
  totalCost: 8,
  notes: 9,
  createdAt: 10,
  updatedAt: 11,
  createdBy: 12
}

BOM_ITEM_SCHEMA = {
  id: 1,
  bomId: 2,
  componentSku: 3,      // links to Inventory item (Raw Material)
  componentName: 4,
  quantity: 5,          // per unit of finished product
  unitCost: 6,          // cost at time of BOM creation
  wastagePercent: 7,    // e.g. 5% fabric wastage
  totalLineCost: 8,     // quantity × unitCost × (1 + wastagePercent)
  notes: 9
}
```

**Rationale:**
- BOM is separate from Inventory (one product → one active BOM)
- Versioning allows cost history tracking
- Component links to Inventory items (raw materials)
- Wastage factor for manufacturing realities
- `totalLineCost` pre-calculated for performance

### E.4 Product Cost Calculation

```javascript
// When BOM is active:
product.unitCost = bom.totalMaterialCost + bom.totalLaborCost + bom.totalOverheadCost

// When no BOM (backward compatibility):
product.unitCost = product.cost  // existing field

// Gross margin:
grossProfit = sellingPrice - unitCost
grossMarginPercent = (grossProfit / sellingPrice) × 100
```

### E.5 Finance Integration

**COGS flow remains unchanged:**
```
Order creation → snapshot unitCost from inventory
  ↓
Sale creation → COGS = Σ(qty × snapshotted unitCost)
  ↓
Ledger posting (immutable)
```

**What Phase 3 changes:**
- `inventory.cost` can now be calculated from BOM instead of manually entered
- When BOM is active, updating BOM component costs updates `inventory.cost`
- Historical sales use their snapshotted costs (unchanged)
- New sales use the updated cost (correct behavior)

**What Phase 3 does NOT change:**
- Does NOT modify SaleService COGS calculation
- Does NOT modify FinanceService ledger posting
- Does NOT modify EventBus integration
- Does NOT create duplicate ledger entries

---

## F) DATA INTEGRITY RISKS

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Existing `cost` field values may not match BOM-calculated costs | 🟡 MEDIUM | When BOM is first created for an existing product, warn user if BOM cost ≠ stored cost. Allow manual override. |
| 2 | Stock movement history is empty for past operations | 🟢 LOW | Expected. History starts from Phase 3 deployment. Cannot retroactively create movement records. |
| 3 | BOM component costs may become stale | 🟡 MEDIUM | Store `unitCost` in BOM_ITEM at BOM creation time. Update only when user explicitly recalculates. |
| 4 | Circular BOM references (Product A contains Product A) | 🔴 HIGH | Validate BOM: component SKU cannot equal parent product SKU. |
| 5 | Deleting raw material that is used in active BOM | 🔴 HIGH | Prevent deletion of inventory items referenced by active BOMs. |
| 6 | `type` field added to existing items | 🟡 LOW | Default all existing items to 'Finished Good'. Migration script needed. |

---

## G) MIGRATION RISKS

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Adding `type` column to Inventory sheet | Add column 20 with default 'Finished Good'. Use 10_Setup.js pattern. |
| 2 | Creating StockMovement sheet | New sheet, no migration needed. |
| 3 | Creating BOM and BOM_ITEM sheets | New sheets, no migration needed. |
| 4 | Existing API contracts | All existing endpoints remain unchanged. New endpoints are additive. |
| 5 | Existing UI | Inventory Dashboard page remains. New pages are additive. |
| 6 | Permission matrix | Add 3 new permissions. Existing permissions unchanged. |

---

## H) BACKWARD COMPATIBILITY

| Aspect | Status | Notes |
|--------|--------|-------|
| Inventory API contracts | ✅ PRESERVED | All existing `InventoryService` functions unchanged |
| Inventory schema | ✅ EXTENDED | Only `type` field added (column 20) |
| Sale/Order COGS | ✅ PRESERVED | No changes to SaleService or OrderService |
| Finance ledger | ✅ PRESERVED | No changes to FinanceService |
| UI endpoints | ✅ PRESERVED | Existing `uiGetInventory`, `uiCreateInventoryItem` unchanged |
| UI page | ✅ PRESERVED | Inventory Dashboard remains, new pages added |
| Permission constants | ✅ EXTENDED | 3 new constants added, existing 25 unchanged |

---

## I) EXACT IMPLEMENTATION SEQUENCE

### PHASE 3A — Inventory Data Integrity
**Goal:** Extend inventory schema with `type` field

| Item | Details |
|------|---------|
| **Files modified** | `24_InventorySchema.js` |
| **Files created** | None |
| **Functions added** | None |
| **Functions modified** | `SCHEMA` (add `type: 20`), `VALIDATION` (add type allowed values), `getDefaultItem()` (add type default) |
| **Permissions** | None new |
| **Dependencies** | None |
| **Risks** | Column index shift if other code hardcodes column 20 |
| **Rollback** | Remove `type` field from schema, validation, defaults |

### PHASE 3B — Stock Movement History
**Goal:** Create immutable stock movement tracking

| Item | Details |
|------|---------|
| **Files modified** | `26_InventoryService.js` |
| **Files created** | `24b_StockMovementSchema.js`, `25b_StockMovementRepository.js`, `26b_StockMovementService.js` |
| **Functions added** | `adjustStock(sku, qty, reason)`, `returnStock(sku, qty, reference)`, `getStockMovements(sku, options)`, `getStockMovementSummary(sku)` |
| **Functions modified** | `reserveStock()` (add movement log), `releaseStock()` (add movement log), `commitStock()` (add movement log), `restock()` (add movement log) |
| **Permissions** | `inventory:adjust` (new) |
| **Dependencies** | PHASE 3A |
| **Risks** | Movement logging adds latency to stock operations |
| **Rollback** | Disable movement logging, keep field updates only |

### PHASE 3C — Product Costing
**Goal:** Calculate product cost from BOM (when BOM exists)

| Item | Details |
|------|---------|
| **Files modified** | `26_InventoryService.js` (add `calculateUnitCost(productId)`), `13_Permissions.js` (add `inventory:view_cost`) |
| **Files created** | `24c_BOMSchema.js`, `25c_BOMRepository.js`, `26c_BOMService.js` |
| **Functions added** | `createBOM(data)`, `getBOM(productId)`, `updateBOM(id, data)`, `deleteBOM(id)`, `addBOMItem(bomId, data)`, `removeBOMItem(bomItemId)`, `calculateBOMCost(bomId)`, `getProductMargin(productId)` |
| **Functions modified** | `createItem()` (optional: auto-create empty BOM for Finished Goods), `updateItem()` (optional: recalculate cost if BOM active) |
| **Permissions** | `inventory:manage_bom` (new), `inventory:view_cost` (new) |
| **Dependencies** | PHASE 3A, 3B |
| **Risks** | BOM calculation may be slow for complex products |
| **Rollback** | Delete BOM sheets, revert to manual cost entry |

### PHASE 3D — Inventory UI
**Goal:** Add movement history, BOM editor, cost breakdown to UI

| Item | Details |
|------|---------|
| **Files modified** | `UI_Index.html` (add movement page, BOM modal, cost breakdown), `UI_Server.js` (add movement/BOM endpoints) |
| **Files created** | None |
| **Functions added** | `uiGetStockMovements()`, `uiAdjustStock()`, `uiGetBOM()`, `uiCreateBOM()`, `uiUpdateBOM()`, `uiDeleteBOM()`, `uiGetProductMargin()` |
| **Functions modified** | None existing |
| **Permissions** | `inventory:read`, `inventory:write`, `inventory:adjust`, `inventory:manage_bom`, `inventory:view_cost` |
| **Dependencies** | PHASE 3A, 3B, 3C |
| **Risks** | UI_Index.html grows larger (already 239KB) |
| **Rollback** | Remove new HTML sections and JS functions |

### PHASE 3E — Finance / COGS Integration Verification
**Goal:** Verify BOM-calculated costs flow correctly to COGS

| Item | Details |
|------|---------|
| **Files modified** | None (verification only) |
| **Files created** | Test script |
| **Functions added** | Integration test: create BOM → update cost → create order → verify snapshotted unitCost → create sale → verify COGS → verify ledger |
| **Functions modified** | None |
| **Permissions** | All inventory + finance permissions |
| **Dependencies** | PHASE 3A, 3B, 3C, 3D |
| **Risks** | Discovery that BOM cost doesn't propagate correctly |
| **Rollback** | N/A (verification phase) |

### PHASE 3F — Testing
**Goal:** Full test coverage for new functionality

| Item | Details |
|------|---------|
| **Files modified** | `14_PermissionsTest.js` |
| **Files created** | `28_InventoryTest.js` (extend existing), `28b_StockMovementTest.js`, `28c_BOMTest.js` |
| **Functions added** | Test functions for movement, BOM, costing |
| **Functions modified** | None |
| **Permissions** | All |
| **Dependencies** | All previous phases |
| **Risks** | Tests may fail in GAS editor due to sheet dependencies |
| **Rollback** | N/A (test-only) |

---

## J) FILES THAT WILL BE MODIFIED IN EACH STEP

### PHASE 3A
- `24_InventorySchema.js` — ADD `type` field

### PHASE 3B
- `26_InventoryService.js` — ADD movement logging to stock ops, ADD `adjustStock()`, `returnStock()`
- `13_Permissions.js` — ADD `inventory:adjust` permission

### PHASE 3C
- `26_InventoryService.js` — ADD `calculateUnitCost()`, `getProductMargin()`
- `13_Permissions.js` — ADD `inventory:view_cost`, `inventory:manage_bom`

### PHASE 3D
- `UI_Server.js` — ADD 7 endpoints (movements, BOM, margin)
- `UI_Index.html` — ADD movement page, BOM modal, cost breakdown

### PHASE 3E
- No file modifications (verification)

### PHASE 3F
- `14_PermissionsTest.js` — ADD tests

---

## K) SUMMARY

### What Already Exists (Do Not Rebuild)

| # | Component | Status |
|---|-----------|--------|
| 1 | Inventory CRUD with SKU uniqueness | ✅ |
| 2 | Stock reservation/release/commit/restock | ✅ |
| 3 | Available quantity calculation | ✅ |
| 4 | Stock invariants (reserved ≤ quantity) | ✅ |
| 5 | Auto status (Out of Stock) | ✅ |
| 6 | Low stock / out of stock detection | ✅ |
| 7 | Inventory value calculation | ✅ |
| 8 | Order→Inventory linking (unitCost snapshot) | ✅ |
| 9 | Sale COGS calculation | ✅ |
| 10 | EventBus→Finance ledger posting | ✅ |
| 11 | Rollback on reservation failure | ✅ |
| 12 | Direct sale stock commit | ✅ |
| 13 | BaseRepository (O(1) lookup, events) | ✅ |

### What Is Missing (Must Be Built)

| # | Component | Priority |
|---|-----------|----------|
| 1 | Stock movement history (immutable log) | P0 |
| 2 | Stock adjustment function | P0 |
| 3 | Stock return function | P1 |
| 4 | BOM schema and service | P1 |
| 5 | Product cost calculation from BOM | P1 |
| 6 | Gross margin per product | P2 |
| 7 | Raw material vs finished good separation | P2 |
| 8 | Inventory movement UI | P2 |
| 9 | BOM editor UI | P2 |
| 10 | Cost breakdown UI | P2 |

### What Is Extended (Not Rebuilt)

| # | Component | Change |
|---|-----------|--------|
| 1 | InventorySchema | ADD `type` field |
| 2 | InventoryService | ADD movement logging, adjust, return |
| 3 | 13_Permissions.js | ADD 3 permissions |
| 4 | UI_Server.js | ADD 7 endpoints |
| 5 | UI_Index.html | ADD pages/modals |

---

## L) EXPLICIT STOP

# ⏹️ STOP

**Phase 3 audit is complete. No code has been written. No files have been modified.**

**Awaiting approval to proceed with implementation.**

When approved, the recommended starting point is:

**PHASE 3A: Inventory Data Integrity**
- Add `type` field to `24_InventorySchema.js`
- This is the smallest, safest change with zero risk to existing functionality
- All subsequent phases depend on this field

---

*Audit completed: 2026-08-14*
*Files inspected: 7*
*Current capabilities verified: 23*
*Missing capabilities identified: 10*
*New schemas proposed: 3 (StockMovement, BOM, BOM_ITEM)*
*New permissions proposed: 3*
*Implementation phases: 6 (3A through 3F)*
