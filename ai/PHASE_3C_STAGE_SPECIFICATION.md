
# PHASE 3C — STAGE SPECIFICATION
## BOM + Product Costing

---

## 1. OBJECTIVE

Implement Bill of Materials (BOM) infrastructure to enable:
- Defining which components (raw materials + sub-components) make up a finished product
- Calculating product cost from component costs (material cost rollup)
- Computing gross margin: Selling Price − BOM-derived Cost
- Optionally updating Inventory.cost from BOM calculation (explicit opt-in)

This enables the P&L equation:
```
Revenue − COGS = Gross Profit
Gross Profit − Operating Expenses = Operating Profit
```
Where COGS for future sales can be derived from BOM-calculated unit costs.

---

## 2. SCOPE

### IN SCOPE
- BOM Header schema, repository, service
- BOM Item (line item) schema, repository, service
- BOM CRUD operations (create, read, update, deactivate)
- BOM Item CRUD operations
- Product cost calculation from BOM (material rollup with wastage)
- Gross margin calculation
- Explicit inventory cost update from BOM (opt-in)
- Permission controls for BOM management
- Setup.js integration for BOM sheets
- Tests for all BOM functionality

### OUT OF SCOPE
- Labor cost tracking (architecture does not support it)
- Overhead allocation (architecture does not support it)
- Multi-level BOM explosion with automatic sub-assembly resolution
- UI changes (Phase 3D)
- Automatic cost updates on component price changes (Phase 3E)
- Finance ledger integration beyond existing COGS flow

---

## 3. DEPENDENCIES

### Hard Dependencies (must exist)
| Module | File | Purpose |
|--------|------|---------|
| InventorySchema | 24_InventorySchema.js | TYPE enum, cost field, getSheetHeaders() |
| InventoryRepository | 25_InventoryRepository.js | SKU lookup for component validation |
| InventoryService | 26_InventoryService.js | getItemBySku(), updateItem() for cost sync |
| BaseRepository | 06_BaseRepository.js | Repository pattern |
| Validator | 04_Validator.js | Input validation |
| ErrorHandler | 02_ErrorHandler.js | Standardized errors |
| Utils | 01_Utils.js | safeStr, clone, generateId |
| Logger | 03_Logger.js | Logging |
| Permissions | 13_Permissions.js | RBAC checks |

### Soft Dependencies (read-only)
| Module | File | Purpose |
|--------|------|---------|
| OrderService | 31_OrderService.js | Understanding unitCost snapshot behavior |
| SaleService | 36_SaleService.js | Understanding COGS calculation |
| FinanceService | 41_FinanceService.js | Understanding P&L flow |

---

## 4. SOURCE-OF-TRUTH AUDIT FINDINGS

### 4.1 Inventory Cost Field (Column 10)
- **Current behavior**: `Inventory.cost` stores the CURRENT unit cost
- **Used by**: `getInventoryValue()` (quantity × cost), `getInventoryRetailValue()` (available × price)
- **Order snapshot**: `OrderService.createOrder()` captures `unitCost: _toNumber(invItem.cost)` at order creation time — this is HISTORICAL and immutable
- **Sale COGS**: `SaleService._calculateFinancials()` computes `cogs = sum(qty × unitCost)` where unitCost comes from order.items (historical) or live inventory (direct sales)
- **Finance ledger**: `postCOGS()` posts negative amount to ledger; `getProfitAndLoss()` computes Revenue − COGS = Gross Profit

### 4.2 Inventory Type Field (Column 20 — Phase 3A)
- **After Phase 3A**: `type` field distinguishes RAW_MATERIAL, COMPONENT, FINISHED_GOOD, OTHER
- **Default**: FINISHED_GOOD
- **Validation**: allowed values only
- **BOM relevance**: FINISHED_GOOD items can have BOMs; RAW_MATERIAL/COMPONENT items can be BOM components

### 4.3 StockMovement (Phase 3B — LOCKED)
- **Status**: Fully implemented, append-only, 13 columns
- **No changes required** for Phase 3C
- **Integration point**: None — StockMovement tracks quantity changes, not cost changes

### 4.4 Permission Matrix Gaps
- **Current**: No BOM-related permissions exist
- **Required**: `INVENTORY_BOM_READ` and `INVENTORY_BOM_MANAGE`
- **Assignment**: CEO/Partner/Operations get both; Finance gets READ only

### 4.5 Setup.js State
- **Current**: Has `_getInventoryConfig()` (20 columns) and `_getStockMovementConfig()` (13 columns)
- **Missing**: No BOM or BOM_ITEM sheet configuration
- **Required**: Add `_getBOMConfig()` and `_getBOMAItemConfig()` + sheet creation in `run()` and `reset()`

---

## 5. EXISTING FILES TO MODIFY

### 5.1 10_Setup.js
**Changes**:
- Add `_getBOMConfig()` function
- Add `_getBOMAItemConfig()` function
- Add `createSheet(ss, 'BOM', _getBOMConfig())` in `run()`
- Add `createSheet(ss, 'BOM_ITEM', _getBOMAItemConfig())` in `run()`
- Add corresponding reset logic in `reset()`

**Risk**: Low — follows existing pattern exactly

### 5.2 13_Permissions.js
**Changes**:
- Add to PERMISSIONS object:
  - `INVENTORY_BOM_READ: "inventory:bom_read"`
  - `INVENTORY_BOM_MANAGE: "inventory:bom_manage"`
- Add to permission matrix:
  - CEO: both
  - Partner: both
  - Operations: both
  - Finance: INVENTORY_BOM_READ only
- Add to `getSheetPermission()`:
  - `'BOM': { read: BOM_READ, write: BOM_MANAGE, delete: BOM_MANAGE }`
  - `'BOM_ITEM': { read: BOM_READ, write: BOM_MANAGE, delete: BOM_MANAGE }`

**Risk**: Low — follows existing pattern

---

## 6. NEW FILES REQUIRED

### 6.1 69_BOMSchema.js
**Purpose**: BOM Header schema
**Columns (8)**:
1. id
2. finishedProductSku
3. name
4. description
5. active
6. createdAt
7. updatedAt
8. createdBy

**Enums**: None (active is boolean)

**Validation**:
- finishedProductSku: required, string, 1-50 chars
- name: required, string, 1-200 chars
- description: string, max 2000
- active: boolean

**getSheetHeaders()**: Returns canonical 8-column array

### 6.2 70_BOMAItemSchema.js
**Purpose**: BOM Line Item schema
**Columns (11)**:
1. id
2. bomId
3. componentSku
4. quantityRequired
5. unit
6. wastagePercent
7. notes
8. active
9. createdAt
10. updatedAt
11. createdBy

**Validation**:
- bomId: required, string
- componentSku: required, string, 1-50 chars
- quantityRequired: required, number, min 0.01
- unit: string, max 20
- wastagePercent: number, min 0, max 100
- notes: string, max 2000
- active: boolean

**getSheetHeaders()**: Returns canonical 11-column array

### 6.3 71_BOMRepository.js
**Purpose**: BOM Header data access
**Pattern**: `BaseRepository.create('BOM', BOMSchema.SCHEMA, { eventName: 'bom' })`
**Methods**:
- findById, findByFinishedProductSku, findAllByFinishedProductSku, findAll, findOne, create, update, delete, count, buildIndex

### 6.4 72_BOMAItemRepository.js
**Purpose**: BOM Item data access
**Pattern**: `BaseRepository.create('BOM_ITEM', BOMAItemSchema.SCHEMA, { eventName: 'bomItem' })`
**Methods**:
- findById, findByBomId, findActiveByBomId, findAll, findOne, create, update, delete, count, buildIndex

### 6.5 73_BOMService.js
**Purpose**: Business logic layer

**Public API**:

#### BOM CRUD
- `createBOM(data)` → id
  - Validates finishedProductSku exists in Inventory
  - Validates finishedProductSku is FINISHED_GOOD (or empty type for backward compat)
  - Checks no active BOM already exists for this SKU
  - Generates BOM ID
- `getBOM(id)` → BOM object
- `getBOMByFinishedProductSku(sku)` → active BOM or null
- `updateBOM(id, updates)` → updated BOM
- `deleteBOM(id)` → soft delete (sets active=false)

#### BOM Item CRUD
- `addBOMItem(bomId, data)` → item id
  - Validates componentSku exists in Inventory
  - Validates componentSku is NOT a FINISHED_GOOD (prevents selling a finished good as a raw component — business rule for PHINOX clothing store)
  - Checks for circular BOM references
  - Checks no duplicate active component in same BOM
- `getBOMItems(bomId)` → { data: [], total, ... }
- `updateBOMItem(id, updates)` → updated item
- `removeBOMItem(id)` → soft delete (sets active=false)

#### Cost Calculation
- `calculateBOMCost(bomId)` → { totalMaterialCost, totalCost }
  - Formula: `effectiveQty = qtyRequired × (1 + wastagePercent/100)`
  - `componentCost = effectiveQty × currentInventory.cost`
  - `totalMaterialCost = sum(componentCosts)`
  - `totalCost = totalMaterialCost` (no labor/overhead)

- `calculateUnitCost(productId)` → { unitCost, source, bomId? }
  - If BOM exists: returns BOM-calculated cost
  - If no BOM: returns current Inventory.cost
  - Source: 'BOM' or 'INVENTORY'

- `updateCostFromBOM(productId)` → result
  - **EXPLICIT opt-in** — updates Inventory.cost with BOM-calculated cost
  - Requires INVENTORY_BOM_MANAGE permission
  - Logs the change

#### Gross Margin
- `calculateGrossMargin(productId)` → { sellingPrice, currentCost, grossProfit, grossMarginPercent, source, bomId? }
  - `grossProfit = sellingPrice − currentCost`
  - `grossMarginPercent = (grossProfit / sellingPrice) × 100`
  - If sellingPrice is 0: returns 0% margin (safe handling)

### 6.6 74_BOMTest.js
**Purpose**: Unit and E2E tests

**Test Inventory**:
1. Schema: 8 fields, correct columns
2. Item Schema: 11 fields, correct columns
3. Repository: all methods exist
4. Service: all methods exist

**E2E Tests**:
1. Create inventory items with types (FG, RM, COMP)
2. Create BOM for FG
3. Add components to BOM
4. Validate component type rejection (FINISHED_GOOD as component)
5. Validate duplicate component rejection
6. Validate self-reference rejection
7. Validate circular BOM rejection
8. Calculate BOM cost with wastage
9. Calculate unit cost
10. Update inventory cost from BOM
11. Calculate gross margin
12. Verify historical order unitCost unchanged
13. Verify historical sale COGS unchanged
14. Verify unauthorized access blocked
15. Backward compatibility: inventory without type

---

## 7. DATA SCHEMAS

### 7.1 BOM Header
```
id              : string  (BOM-XXXXXXXX)
finishedProductSku: string  (must match Inventory.sku)
name            : string  (e.g., "T-Shirt BOM")
description     : string
active          : boolean (default: true)
createdAt       : ISO date
updatedAt       : ISO date
createdBy       : string  (email)
```

### 7.2 BOM Item
```
id              : string  (BMI-XXXXXXXX)
bomId           : string  (references BOM.id)
componentSku    : string  (must match Inventory.sku)
quantityRequired: number  (e.g., 2.5)
unit            : string  (e.g., "pc", "m", "kg")
wastagePercent  : number  (e.g., 5.0 = 5%)
notes           : string
active          : boolean (default: true)
createdAt       : ISO date
updatedAt       : ISO date
createdBy       : string  (email)
```

### 7.3 Cost Calculation
```
effectiveQuantity = quantityRequired × (1 + wastagePercent / 100)
componentCost     = effectiveQuantity × Inventory.cost (of component)
totalMaterialCost = Σ(componentCost for all active items)
totalCost         = totalMaterialCost
```

---

## 8. REPOSITORY LAYER

### 8.1 BOMRepository
- Sheet name: `'BOM'`
- Schema: `BOMSchema.SCHEMA`
- Options: `{ eventName: 'bom' }`
- No custom methods beyond BaseRepository + `findByFinishedProductSku`

### 8.2 BOMAItemRepository
- Sheet name: `'BOM_ITEM'`
- Schema: `BOMAItemSchema.SCHEMA`
- Options: `{ eventName: 'bomItem' }`
- Custom methods: `findByBomId`, `findActiveByBomId`

---

## 9. SERVICE LAYER

### 9.1 Validation Rules
1. **At-most-one-active-BOM**: `findByFinishedProductSku()` + conflict check
2. **Finished product must exist**: `InventoryService.getItemBySku()` must return item
3. **Finished product type**: Must be FINISHED_GOOD or empty (backward compat)
4. **Component must exist**: `InventoryService.getItemBySku()` must return item
5. **Component type**: Must NOT be FINISHED_GOOD (business rule for clothing store)
6. **No self-reference**: componentSku !== finishedProductSku
7. **No circular BOM**: Recursive check up to reasonable depth
8. **No duplicate components**: One active entry per componentSku per BOM
9. **Quantity**: Must be > 0
10. **Wastage**: Must be 0–100

### 9.2 Permission Checks
- `createBOM`, `updateBOM`, `deleteBOM`, `addBOMItem`, `updateBOMItem`, `removeBOMItem`, `updateCostFromBOM`: require `INVENTORY_BOM_MANAGE`
- `getBOM`, `getBOMItems`, `calculateBOMCost`, `calculateUnitCost`, `calculateGrossMargin`: require `INVENTORY_BOM_READ`

### 9.3 Soft Delete
- BOMs and BOM items use `active: false` rather than hard delete
- This preserves historical BOMs for audit purposes

---

## 10. CONTROLLER/API IMPACT

### 10.1 InventoryController (27_InventoryController.js)
**Impact**: NONE
- Controller is passthrough — no hardcoded field names
- `inventory.create` and `inventory.update` pass params directly to Service
- If client sends `type`, it flows through; if not, `getDefaultItem()` provides default

### 10.2 UI_Server.js
**Impact**: NONE in Phase 3C
- No UI endpoints for BOM in this phase
- Phase 3D will add UI

---

## 11. PERMISSIONS

### 11.1 New Permissions
```javascript
INVENTORY_BOM_READ:   "inventory:bom_read"
INVENTORY_BOM_MANAGE: "inventory:bom_manage"
```

### 11.2 Role Assignment
| Role | BOM_READ | BOM_MANAGE |
|------|----------|------------|
| CEO | ✓ | ✓ |
| Partner | ✓ | ✓ |
| Operations | ✓ | ✓ |
| Finance | ✓ | ✗ |
| Marketing | ✗ | ✗ |
| Designer | ✗ | ✗ |
| Customer Service | ✗ | ✗ |

### 11.3 Sheet Permission Mapping
```javascript
'BOM':      { read: BOM_READ, write: BOM_MANAGE, delete: BOM_MANAGE }
'BOM_ITEM': { read: BOM_READ, write: BOM_MANAGE, delete: BOM_MANAGE }
```

---

## 12. SETUP/SHEET IMPACT

### 12.1 New Sheets
| Sheet | Columns | Purpose |
|-------|---------|---------|
| BOM | 8 | BOM headers |
| BOM_ITEM | 11 | BOM line items |

### 12.2 Setup.js Changes
- Add `_getBOMConfig()` → `{ headers: BOMSchema.getSheetHeaders(), widths: [...] }`
- Add `_getBOMAItemConfig()` → `{ headers: BOMAItemSchema.getSheetHeaders(), widths: [...] }`
- Add sheet creation in `run()`
- Add sheet reset in `reset()`

### 12.3 Existing Sheets
- **Inventory**: Already has 20-column fallback; Phase 3A adds `type` at column 20
- **StockMovement**: No changes
- **All other sheets**: No changes

---

## 13. VALIDATION RULES

### 13.1 BOM Header Validation
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| finishedProductSku | Yes | string | 1-50 chars, must exist in Inventory |
| name | Yes | string | 1-200 chars |
| description | No | string | max 2000 |
| active | No | boolean | default true |

### 13.2 BOM Item Validation
| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| bomId | Yes | string | must exist in BOM |
| componentSku | Yes | string | 1-50 chars, must exist in Inventory |
| quantityRequired | Yes | number | > 0 |
| unit | No | string | max 20 |
| wastagePercent | No | number | 0-100 |
| notes | No | string | max 2000 |
| active | No | boolean | default true |

### 13.3 Business Validation
1. At most one active BOM per finishedProductSku
2. Component cannot be the same as finished product (self-reference)
3. Component cannot be a FINISHED_GOOD (clothing store business rule)
4. No circular BOM references
5. No duplicate active components in same BOM

---

## 14. PRODUCT COSTING LOGIC

### 14.1 Cost Rollup
```
For each active BOM item:
  component = InventoryService.getItemBySku(item.componentSku)
  effectiveQty = item.quantityRequired × (1 + item.wastagePercent / 100)
  itemCost = effectiveQty × component.cost
  totalCost += itemCost
```

### 14.2 Unit Cost Derivation
```javascript
function calculateUnitCost(productId) {
  const invItem = InventoryService.getItem(productId);
  const bom = BOMRepository.findByFinishedProductSku(invItem.sku);
  if (!bom) {
    return { unitCost: invItem.cost, source: 'INVENTORY' };
  }
  const cost = calculateBOMCost(bom.id);
  return { unitCost: cost.totalCost, source: 'BOM', bomId: bom.id };
}
```

### 14.3 Cost Update (Explicit Opt-In)
```javascript
function updateCostFromBOM(productId) {
  // Requires INVENTORY_BOM_MANAGE permission
  const result = calculateUnitCost(productId);
  if (result.source === 'BOM') {
    InventoryService.updateItem(productId, { cost: result.unitCost });
    // Log the change
  }
  return result;
}
```

**Important**: This is NOT automatic. The user must explicitly call `updateCostFromBOM()`.

---

## 15. COGS INTERACTION

### 15.1 Historical Data (UNCHANGED)
| Data | Behavior | Reason |
|------|----------|--------|
| Order.unitCost snapshots | Immutable | Captured at order creation time |
| Sale.cogs | Immutable | Computed at sale creation time |
| Finance ledger COGS entries | Immutable | Posted once per sale |

### 15.2 Future Data
| Scenario | Cost Source |
|----------|-------------|
| Linked sale (from order) | Order.items[].unitCost (historical snapshot) |
| Direct sale (no order) | Current Inventory.cost at sale time |
| After updateCostFromBOM() | New BOM-derived cost becomes current Inventory.cost |

### 15.3 Impact Analysis
- Updating Inventory.cost via `updateCostFromBOM()` affects:
  - Future direct sales (they read live inventory cost)
  - `getInventoryValue()` (quantity × cost)
  - Future order unitCost snapshots (captured at order time)
- Does NOT affect:
  - Existing orders
  - Existing sales
  - Existing ledger entries

---

## 16. BACKWARD COMPATIBILITY

### 16.1 Inventory Records
- Records without `type` (pre-Phase 3A): remain valid, default to FINISHED_GOOD
- Records with `type` but no BOM: cost remains as manually entered

### 16.2 Orders
- Orders created before Phase 3C: unitCost snapshots unchanged
- New orders: will capture current inventory cost (which may be BOM-derived if updated)

### 16.3 Sales
- Sales created before Phase 3C: COGS unchanged
- New linked sales: use order's historical unitCost
- New direct sales: use current inventory cost

### 16.4 Finance
- Ledger entries: immutable, no changes
- P&L reports: reflect all sales including pre- and post-Phase 3C

---

## 17. TESTS REQUIRED

### 17.1 Unit Tests (testBOMModule)
1. BOMSchema has 8 fields, correct columns
2. BOMAItemSchema has 11 fields, correct columns
3. TYPE enum exists in InventorySchema (from Phase 3A)
4. BOMRepository methods exist
5. BOMAItemRepository methods exist
6. BOMService methods exist
7. Permissions exist (BOM_READ, BOM_MANAGE)

### 17.2 E2E Tests (testBOME2E)
1. Create typed inventory items (FG, RM, COMP)
2. Invalid inventory type rejected
3. Backward compatibility: item without type defaults to FINISHED_GOOD
4. Create BOM for finished product
5. Duplicate active BOM rejected
6. Finished product validation (must be FINISHED_GOOD)
7. Add components to BOM
8. Invalid component type rejected (FINISHED_GOOD as component)
9. Invalid quantity rejected (zero, negative)
10. Invalid wastage rejected (negative, >100)
11. Duplicate component rejected
12. Self-reference rejected
13. Circular BOM rejected
14. BOM item update
15. BOM soft delete (deactivation)
16. BOM cost calculation
17. Wastage inclusion verified
18. Multiple components summed correctly
19. Current product cost calculation
20. Update cost from BOM
21. Gross margin calculation
22. Zero selling price handled safely
23. Unauthorized BOM read/write/delete blocked
24. Historical order unitCost unchanged after cost update
25. Historical sale COGS unchanged after cost update
26. Backward compatibility: existing inventory without type remains valid

---

## 18. LOCKED FILES (NO MODIFICATION)

| File | Reason |
|------|--------|
| 27_StockMovementSchema.js | Phase 3B complete |
| 29_StockMovementRepository.js | Phase 3B complete |
| 30_StockMovementService.js | Phase 3B complete |
| 32_StockMovementTest.js | Phase 3B complete |
| 29_OrderSchema.js | Order contracts stable |
| 30_OrderRepository.js | Order contracts stable |
| 31_OrderService.js | Order contracts stable — unitCost snapshot behavior must not change |
| 32_OrderController.js | Order contracts stable |
| 33_OrderTest.js | Order contracts stable |
| 34_SaleSchema.js | Sale contracts stable |
| 35_SaleRepository.js | Sale contracts stable |
| 36_SaleService.js | Sale contracts stable — COGS calculation must not change |
| 37_SaleController.js | Sale contracts stable |
| 38_SaleTest.js | Sale contracts stable |
| 39_FinanceSchema.js | Finance contracts stable |
| 40_FinanceRepository.js | Finance contracts stable |
| 41_FinanceService.js | Finance contracts stable — ledger posting must not change |
| 42_FinanceController.js | Finance contracts stable |
| 43_FinanceTest.js | Finance contracts stable |

**Note**: 26_InventoryService.js stock operation functions (reserveStock, releaseStock, commitStock, restock, adjustStock, returnStock, _recordMovement) are LOCKED. Only type normalization in createItem/_updateItemRaw (from Phase 3A) is permitted.

---

## 19. OUT-OF-SCOPE ITEMS

| Item | Reason | Future Phase |
|------|--------|--------------|
| UI for BOM management | Phase 3D | 3D |
| Automatic cost updates on component price changes | Requires event listeners / scheduled job | 3E |
| Multi-level BOM explosion | Complexity beyond current need | 3E |
| Labor cost tracking | No labor data in architecture | Future |
| Overhead allocation | No overhead data in architecture | Future |
| BOM versioning | Not required for MVP | Future |
| BOM import/export | Not required for MVP | Future |
| Sub-assembly BOM resolution | Circular detection handles basic case | Future |

---

## 20. RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Circular BOM causes infinite loop | Medium | High (crash) | Recursive detection with depth limit |
| updateCostFromBOM changes future COGS unexpectedly | Medium | Medium (profit variance) | Explicit opt-in + logging |
| Existing sheets missing BOM columns | Low | Medium (crash) | Setup.run() creates sheets; manual append if needed |
| Component deleted from inventory but still in BOM | Medium | Low (cost calc fails) | Validate component exists at calculation time; return 0 cost with warning |
| BOM cost lower than manual cost → sudden margin jump | High | Low (expected behavior) | Documented behavior; user chooses when to update |
| File load order issues (BOMSchema before InventorySchema) | Low | High (crash) | File numbering ensures load order |

---

## 21. APPROVAL GATE

### BEFORE IMPLEMENTATION
The following must be confirmed:

- [ ] Phase 3A is CLOSED / VERIFIED (all 5 checklist items passed)
- [ ] This Stage Specification is approved
- [ ] Any questions about scope, risks, or dependencies are resolved

### AFTER IMPLEMENTATION
The following must be verified before closing Phase 3C:

- [ ] testBOMModule() passes
- [ ] testBOME2E() passes
- [ ] Setup.run() creates BOM and BOM_ITEM sheets
- [ ] BOM CRUD works end-to-end
- [ ] Cost calculation is accurate
- [ ] Gross margin calculation is accurate
- [ ] updateCostFromBOM() updates inventory cost correctly
- [ ] Historical order unitCost snapshots unchanged
- [ ] Historical sale COGS unchanged
- [ ] Phase 3B stock operations still work
- [ ] Permission checks work correctly
- [ ] Backward compatibility maintained

---

## 22. FILE NUMBERING

New files will use numbers 69-74 to ensure they load after all dependencies:

| File # | Name | Loads After |
|--------|------|-------------|
| 69 | BOMSchema.js | 24 (InventorySchema) |
| 70 | BOMAItemSchema.js | 24, 69 |
| 71 | BOMRepository.js | 06, 69 |
| 72 | BOMAItemRepository.js | 06, 70 |
| 73 | BOMService.js | 24, 25, 26, 13, 69, 70, 71, 72 |
| 74 | BOMTest.js | 73, 28 |

---

## 23. SUMMARY

| Aspect | Detail |
|--------|--------|
| **Objective** | BOM + Product Costing + Gross Margin |
| **Files Modified** | 10_Setup.js, 13_Permissions.js |
| **Files Created** | 69-74 (6 files) |
| **Sheets Added** | BOM, BOM_ITEM |
| **Permissions Added** | INVENTORY_BOM_READ, INVENTORY_BOM_MANAGE |
| **Locked Phases** | 3B (StockMovement) |
| **Locked Files** | All Order, Sale, Finance, StockMovement files |
| **Risk Level** | Medium (cost calculation affects future COGS) |
| **Backward Compat** | Full — historical data untouched |

---

**STATUS: SPECIFICATION COMPLETE — AWAITING APPROVAL**

**DO NOT PROCEED TO IMPLEMENTATION WITHOUT EXPLICIT APPROVAL.**
