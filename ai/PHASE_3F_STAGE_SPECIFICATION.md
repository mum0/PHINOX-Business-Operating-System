# PHASE 3F — STAGE SPECIFICATION
## Final Integration & Test Verification

**Source:** Conversation Archive + v5-enterprise Baseline Audit  
**Date:** 2026-08-15  
**Status:** STAGE SPECIFICATION READY / IMPLEMENTATION NOT AUTHORIZED  
**Action:** READ-ONLY AUDIT — NO FILES MODIFIED, NO FILES CREATED

---

## A. Objective

Execute comprehensive end-to-end integration verification across all Phase 3 sub-modules (3A→3E) to confirm:
1. All new fields, schemas, and APIs function correctly in integration
2. Historical data (COGS, Order snapshots, Ledger entries) remains immutable
3. No regression in existing functionality (Inventory, Orders, Sales, Finance, StockMovement)
4. Permission boundaries are enforced correctly
5. UI integration (Phase 3D) renders new fields and modals correctly
6. BOM → Cost → COGS → P&L chain produces mathematically consistent results

---

## B. Scope

### In Scope
- Integration test execution across module boundaries
- Regression test execution for existing functionality
- Backward compatibility verification for pre-3A inventory records
- COGS immutability verification after BOM cost updates
- Permission matrix verification for new BOM/UI endpoints
- UI rendering verification (type column, modals, cost breakdown)
- TestRunner orchestration validation
- Final closure checklist for Phase 3

### Out of Scope
- Any code changes (fixes, features, refactors)
- Any new file creation (including test files)
- Any schema modifications
- Any permission changes
- Any Setup.js modifications
- Performance/load testing (not mentioned in roadmap)
- Security penetration testing (not mentioned in roadmap)

---

## C. Dependencies

| Phase | Status | Dependency Nature |
|-------|--------|-------------------|
| 3A | IMPLEMENTATION PREPARED / VERIFICATION PENDING | Must be CLOSED/VERIFIED before 3F |
| 3B | LOCKED / VERIFIED | Required for stock movement regression |
| 3C | STAGE SPECIFICATION READY / NOT AUTHORIZED | Must be IMPLEMENTED + VERIFIED before 3F |
| 3D | STAGE SPECIFICATION READY / NOT AUTHORIZED | Must be IMPLEMENTED + VERIFIED before 3F |
| 3E | STAGE SPECIFICATION READY / NOT AUTHORIZED | Must be VERIFIED before 3F |

**Critical Path:** 3A → 3C → 3D → 3E → 3F

---

## D. Source-of-Truth Findings

### D.1 Repository File Inventory (Verified from Baseline)

| # | File | Status | Test Coverage |
|---|------|--------|---------------|
| 24 | InventorySchema.js | Modified (3A) | testInventoryModule() |
| 25 | InventoryRepository.js | Unchanged | Via InventoryTest |
| 26 | InventoryService.js | Modified (3A) | testInventoryE2E() |
| 27 | InventoryController.js | Unchanged | testInventoryModule() |
| 27 | StockMovementSchema.js | Locked (3B) | StockMovementTest.js |
| 28 | InventoryTest.js | Modified (3A) | 20+ assertions |
| 29 | OrderSchema.js | Locked | OrderTest.js |
| 29 | StockMovementRepository.js | Locked (3B) | StockMovementTest.js |
| 30 | OrderRepository.js | Locked | OrderTest.js |
| 30 | StockMovementService.js | Locked (3B) | StockMovementTest.js |
| 31 | OrderService.js | Locked | OrderTest.js |
| 32 | OrderController.js | Locked | OrderTest.js |
| 32 | StockMovementTest.js | Locked (3B) | Verified |
| 33 | OrderTest.js | Locked | Existing |
| 34 | SaleSchema.js | Locked | SaleTest.js |
| 35 | SaleRepository.js | Locked | SaleTest.js |
| 36 | SaleService.js | Locked | SaleTest.js |
| 37 | SaleController.js | Locked | SaleTest.js |
| 38 | SaleTest.js | Locked | E2E (cogs=100 verified) |
| 39 | FinanceSchema.js | Locked | FinanceTest.js |
| 40 | FinanceRepository.js | Locked | FinanceTest.js |
| 41 | FinanceService.js | Locked | FinanceTest.js |
| 42 | FinanceController.js | Locked | FinanceTest.js |
| 43 | FinanceTest.js | Locked | Ledger + P&L |
| 68 | TestRunner.js | Existing | Orchestration |
| — | UI_Server.js | Locked | Manual UI verification |
| — | UI_Index.html | Locked | Manual UI verification |

### D.2 Files NOT YET Existing (Blocked)

| File | Phase | Status |
|------|-------|--------|
| 69_BOMSchema.js | 3C | NOT CREATED |
| 70_BOMAItemSchema.js | 3C | NOT CREATED |
| 71_BOMRepository.js | 3C | NOT CREATED |
| 72_BOMAItemRepository.js | 3C | NOT CREATED |
| 73_BOMService.js | 3C | NOT CREATED |
| 74_BOMTest.js | 3C | NOT CREATED |

### D.3 Architecture Findings from Audit Trail

**Inventory Type (3A):**
- 19 fields → 20 fields (+ `type` at column 20)
- TYPE enum: RAW_MATERIAL, COMPONENT, FINISHED_GOOD, OTHER
- Default: FINISHED_GOOD
- Backward compatible: BaseRepository._rowToObject omits missing fields

**StockMovement (3B):**
- 13 fields, append-only
- No update/delete in public API
- Locked — no modifications allowed

**BOM + Costing (3C — Spec Only):**
- BOM: 8 fields (id, finishedProductSku, name, description, active, createdAt, updatedAt, createdBy)
- BOM_ITEM: 11 fields (id, bomId, componentSku, quantityRequired, unit, wastagePercent, notes, active, createdAt, updatedAt, createdBy)
- Cost formula: `effectiveQty = qty × (1 + wastage/100)`, `componentCost = effectiveQty × inv.cost`
- updateCostFromBOM() is opt-in only

**COGS Flow (Verified in 3E Audit):**
```
Inventory.cost (live)
    → Order.items[].unitCost (snapshot at order time)
    → Sale.cogs (computed at sale time from order snapshot or live cost)
    → EventBus.emit('sale:created')
    → FinanceService.postCOGS()
    → Ledger entry (idempotent, immutable)
    → P&L: Revenue − COGS = Gross Profit
```

**UI (3D — Spec Only):**
- UI_Server.js: 25,452 bytes, no movement/BOM/cost endpoints
- UI_Index.html: 239KB, no type column, no movement/BOM modals

---

## E. Existing Test Coverage

### E.1 Unit/Module Tests

| Test Function | File | Coverage |
|---------------|------|----------|
| testInventoryModule() | 28_InventoryTest.js | Schema (20 fields), TYPE enum, Repository API, Service API, Controller API |
| testInventoryE2E() | 28_InventoryTest.js | CRUD, stock ops, type CRUD, backward compat |
| (StockMovement tests) | 32_StockMovementTest.js | Append-only, movement recording |
| (Order tests) | 33_OrderTest.js | Order creation, unitCost snapshot |
| (Sale tests) | 38_SaleTest.js | Linked sale COGS, direct sale COGS |
| (Finance tests) | 43_FinanceTest.js | Ledger posting, P&L calculation |

### E.2 TestRunner.js

- Exists as file #68
- Expected to orchestrate all module tests
- No evidence of automated BOM test inclusion (since 74_BOMTest.js doesn't exist)

---

## F. Missing Test Coverage

### F.1 Missing Due to Phase 3C Not Implemented

| Missing Test | Reason |
|--------------|--------|
| BOM CRUD E2E | 69–74 files don't exist |
| BOM circular reference detection | 73_BOMService.js not created |
| BOM cost calculation accuracy | 73_BOMService.js not created |
| BOM → Inventory cost update | 73_BOMService.js not created |
| BOM component validation (type checking) | 73_BOMService.js not created |
| Gross margin calculation | 73_BOMService.js not created |

### F.2 Missing Integration Tests (Required for 3F)

| Missing Test | Boundary |
|--------------|----------|
| Inventory.type → BOM finishedProductSku validation | 3A → 3C |
| Inventory.type → BOM componentSku validation | 3A → 3C |
| BOM cost → Inventory.cost → Order.unitCost snapshot | 3C → 3A → Order |
| BOM cost update → Sale.cogs immutability | 3C → Sale |
| BOM cost update → Finance Ledger immutability | 3C → Finance |
| StockMovement → Inventory.quantity with typed items | 3B → 3A |
| UI type column rendering → InventorySchema.type | 3D → 3A |
| UI BOM modal → BOMService API | 3D → 3C |
| UI cost breakdown → BOMService.calculateBOMCost | 3D → 3C |
| Permission BOM_READ → BOMRepository access | Permissions → 3C |
| Permission BOM_MANAGE → BOMService mutation | Permissions → 3C |

### F.3 Missing Regression Tests

| Missing Test | Risk |
|--------------|------|
| Pre-3A inventory records (no type) → readable after 3A | Data migration |
| Pre-3A inventory records → updateable without type | Data migration |
| Existing orders → unitCost snapshots unchanged after 3C | Historical integrity |
| Existing sales → cogs unchanged after 3C | Historical integrity |
| Existing ledger entries → unchanged after 3C | Historical integrity |
| StockMovement append-only → still append-only after 3A | 3B regression |

---

## G. Integration Test Matrix

| Phase | Component | Existing Tests | Missing Tests | Required Verification |
|-------|-----------|----------------|---------------|----------------------|
| 3A | Inventory Type | ✓ Schema, CRUD, backward compat | ✗ Permission-specific type tests | testInventoryModule() + testInventoryE2E() |
| 3B | Stock Movement | ✓ Append-only, recording | ✗ Type-aware movement tests | StockMovementTest.js (unchanged) |
| 3C | BOM + Costing | ✗ None (files don't exist) | ✓ All BOM tests (26 E2E in spec) | 74_BOMTest.js (pending creation) |
| 3D | Inventory UI | ✗ None automated | ✓ UI rendering, modal functionality | Manual verification required |
| 3E | COGS Verification | ✓ Ledger, P&L, Sale COGS | ✗ Post-BOM COGS consistency | FinanceTest.js + manual verification |
| 3F | Final Integration | ✗ None | ✓ Cross-module integration | TestRunner full suite |

---

## H. Regression Test Matrix

| Module | Test | Frequency | Criticality |
|--------|------|-----------|-------------|
| Inventory | CRUD operations | Every release | HIGH |
| Inventory | Cost field integrity | Every release | HIGH |
| Inventory | Type field default (FINISHED_GOOD) | After 3A | HIGH |
| Inventory | Backward compatibility (no type) | After 3A | CRITICAL |
| StockMovement | adjustStock() | Every release | HIGH |
| StockMovement | returnStock() | Every release | HIGH |
| StockMovement | _recordMovement() | Every release | HIGH |
| StockMovement | Append-only guarantee | Every release | CRITICAL |
| Orders | createOrder() | Every release | HIGH |
| Orders | unitCost snapshot capture | After 3C | CRITICAL |
| Sales | createSale() linked | Every release | HIGH |
| Sales | createSale() direct | Every release | HIGH |
| Sales | COGS calculation | After 3C | CRITICAL |
| Sales | Historical COGS immutability | After 3C | CRITICAL |
| Finance | postCOGS() | Every release | HIGH |
| Finance | Ledger idempotency | Every release | CRITICAL |
| Finance | P&L calculation | After 3C | HIGH |
| Permissions | Role matrix enforcement | Every release | HIGH |
| UI | Inventory table rendering | After 3D | MEDIUM |
| UI | Modal functionality | After 3D | MEDIUM |

---

## I. Backward Compatibility

### Verified Behaviors (from 3A Spec)

| Scenario | Expected Behavior | Verification Method |
|----------|-------------------|---------------------|
| Record without `type` | Readable (BaseRepository omits missing fields) | testInventoryE2E Step 16 |
| Record without `type` | Defaults to FINISHED_GOOD on create | testInventoryE2E |
| Sheet with 19 columns | Works until Setup.run() expands to 20 | Manual verification |
| Existing Order.unitCost | Unchanged after Inventory.cost update | testBOME2E Step 25 (3C spec) |
| Existing Sale.cogs | Unchanged after Inventory.cost update | testBOME2E Step 26 (3C spec) |

### Risks

| Risk | Mitigation |
|------|------------|
| Old sheets with 19 columns may not display type | Run Setup.run() to expand |
| Existing inventory items without type | Default to FINISHED_GOOD on next update |

---

## J. Runtime Verification

### J.1 Previously Reported Baseline

From conversation archive (previously reported, NOT verified from current source):
- "81 KPIs"
- "8 Categories"
- "72 passed"
- "0 failed"

**Status:** EXPECTED / PREVIOUSLY REPORTED — Requires re-verification via TestRunner.

### J.2 Required Runtime Verification for 3F

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run TestRunner.js | All existing tests pass |
| 2 | Run testInventoryModule() | 20+ assertions pass |
| 3 | Run testInventoryE2E() | CRUD + type + backward compat pass |
| 4 | Run StockMovementTest.js | All 3B tests pass (unchanged) |
| 5 | Run OrderTest.js | Order creation + unitCost pass |
| 6 | Run SaleTest.js | Linked + direct COGS pass |
| 7 | Run FinanceTest.js | Ledger + P&L pass |
| 8 | Run 74_BOMTest.js (after 3C) | 26 E2E tests pass |
| 9 | Manual UI verification | Type column visible, modals functional |
| 10 | Cross-module integration | BOM → Cost → COGS → P&L chain correct |

---

## K. Acceptance Criteria

Phase 3F is accepted when ALL of the following are true:

1. **Phase 3A CLOSED/VERIFIED** — All 5 checklist items passed
2. **Phase 3C CLOSED/VERIFIED** — BOM files created, 74_BOMTest.js passes
3. **Phase 3D CLOSED/VERIFIED** — UI modifications deployed and manually verified
4. **Phase 3E CLOSED/VERIFIED** — COGS verification tests pass
5. **TestRunner.js** executes full suite with 0 failures
6. **Regression tests** confirm no breakage in Orders, Sales, Finance, StockMovement
7. **Backward compatibility** confirmed for pre-3A inventory records
8. **Permission matrix** verified for BOM_READ and BOM_MANAGE
9. **Historical immutability** confirmed: Order.unitCost, Sale.cogs, Ledger entries unchanged
10. **Integration chain** verified: BOM → Inventory.cost → Order.unitCost → Sale.cogs → Ledger → P&L

---

## L. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | Phase 3A verification fails | Medium | High | Fix 3A before proceeding |
| 2 | Phase 3C implementation delayed | Medium | High | 3F cannot start until 3C closed |
| 3 | BOM circular reference causes infinite loop | Low | High | Test _checkCircularBOM() with deep nesting |
| 4 | UI_Index.html (239KB) becomes unmaintainable | Medium | Medium | Consider modularization in future |
| 5 | Existing records without type cause UI display issues | Low | Medium | Ensure UI handles undefined type gracefully |
| 6 | Cost update from BOM overwrites manually set costs | Medium | High | updateCostFromBOM() is opt-in only |
| 7 | TestRunner timeout on full suite | Low | Medium | Run tests in batches if needed |

---

## M. Locked Files

The following files MUST NOT be modified during Phase 3F:

**Phase 3B (StockMovement):**
- 27_StockMovementSchema.js
- 29_StockMovementRepository.js
- 30_StockMovementService.js
- 32_StockMovementTest.js

**Order Module:**
- 29_OrderSchema.js
- 30_OrderRepository.js
- 31_OrderService.js
- 32_OrderController.js
- 33_OrderTest.js

**Sale Module:**
- 34_SaleSchema.js
- 35_SaleRepository.js
- 36_SaleService.js
- 37_SaleController.js
- 38_SaleTest.js

**Finance Module:**
- 39_FinanceSchema.js
- 40_FinanceRepository.js
- 41_FinanceService.js
- 42_FinanceController.js
- 43_FinanceTest.js

**Core Infrastructure:**
- 00_Config.js
- 01_Utils.js
- 02_ErrorHandler.js
- 04_Validator.js
- 05_EventBus.js
- 06_BaseRepository.js
- 09_Security.js

---

## N. Out of Scope

1. Performance optimization of UI_Index.html
2. Database migration scripts (GAS is sheet-based)
3. Multi-tenancy or multi-warehouse support
4. Advanced analytics beyond current KPIs
5. Mobile-responsive UI redesign
6. API rate limiting
7. Automated CI/CD pipeline
8. Load testing

---

## O. Final Closure Criteria

Phase 3 (overall) is CLOSED when:

| Sub-Phase | Status Required |
|-----------|-----------------|
| 3A | CLOSED / VERIFIED |
| 3B | LOCKED / VERIFIED |
| 3C | CLOSED / VERIFIED |
| 3D | CLOSED / VERIFIED |
| 3E | CLOSED / VERIFIED |
| 3F | CLOSED / VERIFIED |

**Final Deliverable:** All files uploaded to v5-enterprise branch, TestRunner passes, manual verification complete.

---

## P. Approval Gate

**Phase 3F Implementation is NOT AUTHORIZED until:**

1. ✅ Phase 3A = CLOSED / VERIFIED
2. ✅ Phase 3C = CLOSED / VERIFIED
3. ✅ Phase 3D = CLOSED / VERIFIED
4. ✅ Phase 3E = CLOSED / VERIFIED
5. ✅ User explicitly approves Phase 3F Stage Specification

**Next Action:** Await Phase 3A verification completion, then sequential closure of 3C → 3D → 3E → 3F.

---

## Appendix: File State Summary

| File | Current State | 3F Action |
|------|---------------|-----------|
| 24_InventorySchema.js | Modified (3A prepared) | Verify only |
| 26_InventoryService.js | Modified (3A prepared) | Verify only |
| 28_InventoryTest.js | Modified (3A prepared) | Verify only |
| 10_Setup.js | Unchanged (20-col fallback) | Verify only |
| 13_Permissions.js | Unchanged | Verify only |
| 69–74 BOM files | DO NOT EXIST | Blocked on 3C |
| UI_Server.js | Unchanged | Blocked on 3D |
| UI_Index.html | Unchanged | Blocked on 3D |
| All other files | Locked | No touch |

---

*End of Phase 3F Stage Specification*
