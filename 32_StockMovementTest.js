/**
 * Stock Movement Test
 * Unit + E2E tests for Phase 3B Stock Movement module.
 * Run: testStockMovementModule() for unit tests
 * Run: testStockMovementE2E() for end-to-end tests
 */

function testStockMovementModule() {
 console.log('=== Stock Movement Module Test Suite ===');
 let pass = 0, fail = 0;
 function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

 console.log('\n--- StockMovementSchema ---');
 assert(StockMovementSchema.SCHEMA.id === 1, 'Schema id column is 1');
 assert(StockMovementSchema.SCHEMA.inventoryId === 2, 'Schema inventoryId column is 2');
 assert(StockMovementSchema.SCHEMA.sku === 3, 'Schema sku column is 3');
 assert(StockMovementSchema.SCHEMA.movementType === 4, 'Schema movementType column is 4');
 assert(StockMovementSchema.SCHEMA.quantity === 5, 'Schema quantity column is 5');
 assert(StockMovementSchema.SCHEMA.quantityBefore === 6, 'Schema quantityBefore column is 6');
 assert(StockMovementSchema.SCHEMA.quantityAfter === 7, 'Schema quantityAfter column is 7');
 assert(StockMovementSchema.SCHEMA.reason === 8, 'Schema reason column is 8');
 assert(StockMovementSchema.SCHEMA.referenceType === 9, 'Schema referenceType column is 9');
 assert(StockMovementSchema.SCHEMA.referenceId === 10, 'Schema referenceId column is 10');
 assert(StockMovementSchema.SCHEMA.notes === 11, 'Schema notes column is 11');
 assert(StockMovementSchema.SCHEMA.createdAt === 12, 'Schema createdAt column is 12');
 assert(StockMovementSchema.SCHEMA.createdBy === 13, 'Schema createdBy column is 13');
 assert(Object.keys(StockMovementSchema.SCHEMA).length === 13, 'Schema has exactly 13 fields');

 const headers = StockMovementSchema.getSheetHeaders();
 assert(headers.length === 13, 'getSheetHeaders returns 13 headers');
 assert(headers[0] === 'id', 'Header 1 is id');
 assert(headers[1] === 'inventoryId', 'Header 2 is inventoryId');
 assert(headers[2] === 'sku', 'Header 3 is sku');
 assert(headers[12] === 'createdBy', 'Header 13 is createdBy');

 assert(StockMovementSchema.MOVEMENT_TYPES.RESERVE === 'RESERVE', 'Type RESERVE exists');
 assert(StockMovementSchema.MOVEMENT_TYPES.RELEASE === 'RELEASE', 'Type RELEASE exists');
 assert(StockMovementSchema.MOVEMENT_TYPES.COMMIT === 'COMMIT', 'Type COMMIT exists');
 assert(StockMovementSchema.MOVEMENT_TYPES.RESTOCK === 'RESTOCK', 'Type RESTOCK exists');
 assert(StockMovementSchema.MOVEMENT_TYPES.ADJUSTMENT === 'ADJUSTMENT', 'Type ADJUSTMENT exists');
 assert(StockMovementSchema.MOVEMENT_TYPES.CUSTOMER_RETURN === 'CUSTOMER_RETURN', 'Type CUSTOMER_RETURN exists');

 const defaults = StockMovementSchema.getDefaultMovement();
 assert(defaults.quantity === 0, 'Default quantity is 0');
 assert(defaults.reason === '', 'Default reason is empty');

 console.log('\n--- StockMovementRepository ---');
 assert(typeof StockMovementRepository.findById === 'function', 'Repository has findById');
 assert(typeof StockMovementRepository.findByInventoryId === 'function', 'Repository has findByInventoryId');
 assert(typeof StockMovementRepository.findBySku === 'function', 'Repository has findBySku');
 assert(typeof StockMovementRepository.create === 'function', 'Repository has create');
 assert(typeof StockMovementRepository.update === 'function', 'Repository has update (inherited)');
 assert(typeof StockMovementRepository.delete === 'function', 'Repository has delete (inherited)');

 console.log('\n--- StockMovementService ---');
 assert(typeof StockMovementService.recordMovement === 'function', 'Service has recordMovement');
 assert(typeof StockMovementService.getMovementsByInventoryId === 'function', 'Service has getMovementsByInventoryId');
 assert(typeof StockMovementService.getMovementsBySku === 'function', 'Service has getMovementsBySku');
 assert(typeof StockMovementService.getAllMovements === 'function', 'Service has getAllMovements');
 assert(typeof StockMovementService.reconcileMovements === 'function', 'Service has reconcileMovements');
 assert(typeof StockMovementService.updateMovement === 'undefined', 'No updateMovement exposed');
 assert(typeof StockMovementService.deleteMovement === 'undefined', 'No deleteMovement exposed');

 console.log('\n--- Reconciliation (static) ---');
 const recon = StockMovementService.reconcileMovements();
 assert(recon.status === 'CLEAN' || recon.status === 'RECONCILE_REQUIRED', 'reconcileMovements returns valid status');
 assert(typeof recon.count === 'number', 'reconcileMovements returns count');
 assert(Array.isArray(recon.items), 'reconcileMovements returns items array');
 assert(typeof recon.lastCheckedAt === 'string', 'reconcileMovements returns lastCheckedAt');

 console.log('\n=== Test Summary ===');
 console.log('Passed: ' + pass); console.log('Failed: ' + fail); console.log('Total: ' + (pass + fail));
 if (fail > 0) throw new Error(fail + ' test(s) failed');
 console.log('All module tests passed!');
 return { passed: pass, failed: fail };
}

function testStockMovementE2E() {
 console.log('=== Stock Movement E2E Test ===');
 let pass = 0, fail = 0;
 function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

 const testSku = 'PHX-TEST-MOV-' + Date.now();
 let itemId = null;
 let movementIds = [];

 function cleanup() {
 console.log('--- Cleaning up test data ---');
 movementIds.forEach(function(mid) { try { StockMovementRepository.delete(mid); } catch (e) {} });
 movementIds = [];
 if (itemId) {
 try {
 const item = InventoryService.getItem(itemId);
 if (item) {
 if (item.reserved > 0) InventoryService.releaseStock(item.sku, item.reserved);
 if (item.quantity > 0) InventoryService.adjustStock(itemId, 0, 'Test cleanup', 'Zeroing for deletion');
 InventoryService.deleteItem(itemId);
 }
 } catch (e) {}
 itemId = null;
 }
 try {
 const all = InventoryService.getItems({ limit: 1000 });
 all.data.forEach(function(item) {
 if (item.sku && String(item.sku).indexOf('PHX-TEST-MOV-') === 0) {
 try {
 if (item.reserved > 0) InventoryService.releaseStock(item.sku, item.reserved);
 if (item.quantity > 0) InventoryService.adjustStock(item.id, 0, 'Test cleanup', 'Zeroing for deletion');
 InventoryService.deleteItem(item.id);
 } catch (e) {}
 }
 });
 } catch (e) {}
 try {
 const movs = StockMovementRepository.findAll({ limit: 1000 });
 movs.data.forEach(function(m) {
 if (m.sku && String(m.sku).indexOf('PHX-TEST-MOV-') === 0) { try { StockMovementRepository.delete(m.id); } catch (e) {} }
 });
 } catch (e) {}
 }

 try {
 // 1. CREATE INVENTORY
 console.log('\n--- Step 1: Create Inventory ---');
 itemId = InventoryService.createItem({
 sku: testSku, name: 'E2E Movement Test Tee', category: 'T-Shirts',
 size: 'M', color: 'White', quantity: 100, cost: 15, price: 40,
 reorderLevel: 20, location: 'Warehouse B'
 });
 assert(typeof itemId === 'string' && itemId.indexOf('INV-') === 0, 'createItem returns INV ID');

 const initialMovs = StockMovementService.getMovementsByInventoryId(itemId);
 assert(initialMovs.data.length === 0, 'No movements for new item');

 // 2. ADJUSTMENT (+50)
 console.log('\n--- Step 2: Adjustment (+50) ---');
 InventoryService.adjustStock(itemId, 150, 'Physical recount', 'Found extra stock during audit');
 const afterAdjustUp = InventoryService.getItem(itemId);
 assert(afterAdjustUp.quantity === 150, 'Adjustment up: quantity = 150');
 assert(afterAdjustUp.available === 150, 'Adjustment up: available = 150');

 const movsUp = StockMovementService.getMovementsByInventoryId(itemId);
 assert(movsUp.data.length === 1, 'One movement after adjustment up');
 const movUp = movsUp.data[0];
 assert(movUp.movementType === 'ADJUSTMENT', 'Movement type is ADJUSTMENT');
 assert(movUp.quantity === 50, 'Movement quantity = 50 (delta)');
 assert(movUp.quantityBefore === 100, 'quantityBefore = 100');
 assert(movUp.quantityAfter === 150, 'quantityAfter = 150');
 assert(movUp.reason === 'Physical recount', 'Reason recorded');
 assert(movUp.sku === testSku, 'SKU matches');
 assert(movUp.inventoryId === itemId, 'inventoryId matches');
 assert(movUp.id.indexOf('MOV-') === 0, 'Movement ID has MOV- prefix');
 assert(typeof movUp.createdAt === 'string' && movUp.createdAt.length > 0, 'createdAt populated');
 assert(typeof movUp.createdBy === 'string' && movUp.createdBy.length > 0, 'createdBy populated');
 movementIds.push(movUp.id);

 // 3. ADJUSTMENT (-30)
 console.log('\n--- Step 3: Adjustment (-30) ---');
 InventoryService.adjustStock(itemId, 120, 'Damaged goods', 'Water damage in warehouse');
 const afterAdjustDown = InventoryService.getItem(itemId);
 assert(afterAdjustDown.quantity === 120, 'Adjustment down: quantity = 120');

 const movsDown = StockMovementService.getMovementsByInventoryId(itemId);
 assert(movsDown.data.length === 2, 'Two movements after adjustment down');
 const movDown = movsDown.data[1];
 assert(movDown.movementType === 'ADJUSTMENT', 'Second movement is ADJUSTMENT');
 assert(movDown.quantity === 30, 'Movement quantity = 30 (absolute delta)');
 assert(movDown.quantityBefore === 150, 'quantityBefore = 150');
 assert(movDown.quantityAfter === 120, 'quantityAfter = 120');
 movementIds.push(movDown.id);

 // 4. ADJUSTMENT VALIDATION
 console.log('\n--- Step 4: Adjustment Validation ---');
 try {
 InventoryService.adjustStock(itemId, 120, 'No change', '');
 assert(false, 'adjustStock should reject zero delta');
 } catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Zero delta rejected with VALIDATION_ERROR'); }

 InventoryService.reserveStock(testSku, 10);
 try {
 InventoryService.adjustStock(itemId, 5, 'Below reserved', '');
 assert(false, 'adjustStock should reject below reserved');
 } catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Below reserved rejected with VALIDATION_ERROR'); }
 InventoryService.releaseStock(testSku, 10);

 try {
 InventoryService.adjustStock(itemId, -5, 'Negative', '');
 assert(false, 'adjustStock should reject negative quantity');
 } catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Negative quantity rejected'); }

 try {
 InventoryService.adjustStock('INV-NONEXISTENT', 50, 'Test', '');
 assert(false, 'adjustStock should reject invalid inventory');
 } catch (e) { assert(e.category === 'NOT_FOUND', 'Invalid inventory rejected with NOT_FOUND'); }

 // 5. CUSTOMER RETURN
 console.log('\n--- Step 5: Customer Return ---');
 InventoryService.returnStock(itemId, 3, 'ORD-RET-001', 'Customer changed mind');
 const afterReturn = InventoryService.getItem(itemId);
 assert(afterReturn.quantity === 123, 'Return: quantity = 123');
 assert(afterReturn.available === 123, 'Return: available = 123');

 const movsReturn = StockMovementService.getMovementsByInventoryId(itemId);
 const movReturn = movsReturn.data[movsReturn.data.length - 1];
 assert(movReturn.movementType === 'CUSTOMER_RETURN', 'Movement type is CUSTOMER_RETURN');
 assert(movReturn.quantity === 3, 'Return quantity = 3');
 assert(movReturn.quantityBefore === 120, 'Return quantityBefore = 120');
 assert(movReturn.quantityAfter === 123, 'Return quantityAfter = 123');
 assert(movReturn.referenceType === 'Return', 'Return referenceType defaults to Return');
 assert(movReturn.referenceId === 'ORD-RET-001', 'Return referenceId recorded');
 movementIds.push(movReturn.id);

 try {
 InventoryService.returnStock('INV-NONEXISTENT', 5, '', '');
 assert(false, 'returnStock should reject invalid inventory');
 } catch (e) { assert(e.category === 'NOT_FOUND', 'Invalid inventory rejected with NOT_FOUND'); }
 try {
 InventoryService.returnStock(itemId, 0, '', '');
 assert(false, 'returnStock should reject zero quantity');
 } catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Zero return rejected'); }

 // 6. RESERVE → COMMIT → RELEASE
 console.log('\n--- Step 6: Reserve → Commit → Release ---');
 InventoryService.reserveStock(testSku, 20);
 const afterReserve = InventoryService.getItemBySku(testSku);
 assert(afterReserve.reserved === 20, 'Reserve: reserved = 20');
 assert(afterReserve.available === 103, 'Reserve: available = 103');
 assert(afterReserve.quantity === 123, 'Reserve: quantity unchanged = 123');

 const movsReserve = StockMovementService.getMovementsByInventoryId(itemId);
 const movReserve = movsReserve.data[movsReserve.data.length - 1];
 assert(movReserve.movementType === 'RESERVE', 'RESERVE movement exists');
 assert(movReserve.quantity === 20, 'RESERVE quantity = 20');
 assert(movReserve.quantityBefore === 123, 'RESERVE quantityBefore = 123');
 assert(movReserve.quantityAfter === 123, 'RESERVE quantityAfter = 123 (physical unchanged)');
 movementIds.push(movReserve.id);

 InventoryService.commitStock(testSku, 10);
 const afterCommit = InventoryService.getItemBySku(testSku);
 assert(afterCommit.quantity === 113, 'Commit: quantity = 113');
 assert(afterCommit.reserved === 10, 'Commit: reserved = 10');
 assert(afterCommit.available === 103, 'Commit: available = 103');

 const movsCommit = StockMovementService.getMovementsByInventoryId(itemId);
 const movCommit = movsCommit.data[movsCommit.data.length - 1];
 assert(movCommit.movementType === 'COMMIT', 'COMMIT movement exists');
 assert(movCommit.quantity === 10, 'COMMIT quantity = 10');
 assert(movCommit.quantityBefore === 123, 'COMMIT quantityBefore = 123');
 assert(movCommit.quantityAfter === 113, 'COMMIT quantityAfter = 113');
 movementIds.push(movCommit.id);

 InventoryService.releaseStock(testSku, 10);
 const afterRelease = InventoryService.getItemBySku(testSku);
 assert(afterRelease.reserved === 0, 'Release: reserved = 0');
 assert(afterRelease.available === 113, 'Release: available = 113');
 assert(afterRelease.quantity === 113, 'Release: quantity unchanged = 113');

 const movsRelease = StockMovementService.getMovementsByInventoryId(itemId);
 const movRelease2 = movsRelease.data[movsRelease.data.length - 1];
 assert(movRelease2.movementType === 'RELEASE', 'RELEASE movement exists');
 assert(movRelease2.quantity === 10, 'RELEASE quantity = 10');
 assert(movRelease2.quantityBefore === 113, 'RELEASE quantityBefore = 113');
 assert(movRelease2.quantityAfter === 113, 'RELEASE quantityAfter = 113 (physical unchanged)');
 movementIds.push(movRelease2.id);

 // 7. RESTOCK
 console.log('\n--- Step 7: Restock ---');
 InventoryService.restock(testSku, 15);
 const afterRestock = InventoryService.getItemBySku(testSku);
 assert(afterRestock.quantity === 128, 'Restock: quantity = 128');
 assert(afterRestock.available === 128, 'Restock: available = 128');

 const movsRestock = StockMovementService.getMovementsByInventoryId(itemId);
 const movRestock = movsRestock.data[movsRestock.data.length - 1];
 assert(movRestock.movementType === 'RESTOCK', 'RESTOCK movement exists');
 assert(movRestock.quantity === 15, 'RESTOCK quantity = 15');
 assert(movRestock.quantityBefore === 113, 'RESTOCK quantityBefore = 113');
 assert(movRestock.quantityAfter === 128, 'RESTOCK quantityAfter = 128');
 movementIds.push(movRestock.id);

 // 8. BACKWARD COMPATIBILITY
 console.log('\n--- Step 8: Backward Compatibility ---');
 const compatSku = 'PHX-TEST-COMPAT-' + Date.now();
 const compatId = InventoryService.createItem({
 sku: compatSku, name: 'Compat Test', category: 'Test', quantity: 50, cost: 10, price: 20
 });
 InventoryService.reserveStock(compatSku, 5);
 InventoryService.commitStock(compatSku, 3);
 InventoryService.releaseStock(compatSku, 2);
 InventoryService.restock(compatSku, 10);
 const compatItem = InventoryService.getItemBySku(compatSku);
 assert(compatItem.quantity === 55, 'Backward compat: quantity = 55');
 assert(compatItem.reserved === 0, 'Backward compat: reserved = 0');
 assert(compatItem.available === 55, 'Backward compat: available = 55');
 InventoryService.adjustStock(compatId, 0, 'Test cleanup', '');
 InventoryService.deleteItem(compatId);

 // 9. QUERY BY SKU
 console.log('\n--- Step 9: Query by SKU ---');
 const bySku = StockMovementService.getMovementsBySku(testSku);
 assert(bySku.data.length >= 7, 'getMovementsBySku returns all movements');

 // 10. QUERY ALL
 console.log('\n--- Step 10: Query All ---');
 const allMovs = StockMovementService.getAllMovements({ limit: 1000 });
 assert(allMovs.data.length >= bySku.data.length, 'getAllMovements includes test movements');

 // 11. COST INTEGRITY
 console.log('\n--- Step 11: Cost Integrity ---');
 const costItem = InventoryService.getItem(itemId);
 assert(costItem.cost === 15, 'Cost unchanged after all stock operations');
 assert(costItem.price === 40, 'Price unchanged after all stock operations');

 // 12. RECONCILIATION
 console.log('\n--- Step 12: Reconciliation ---');
 const recon = StockMovementService.reconcileMovements();
 assert(recon.status === 'CLEAN' || recon.status === 'RECONCILE_REQUIRED', 'Reconciliation returns valid status');
 assert(typeof recon.count === 'number', 'Reconciliation count is number');
 assert(Array.isArray(recon.items), 'Reconciliation items is array');

 // 13. IMMUTABILITY
 console.log('\n--- Step 13: Immutability ---');
 assert(typeof StockMovementService.updateMovement === 'undefined', 'No updateMovement in service API');
 assert(typeof StockMovementService.deleteMovement === 'undefined', 'No deleteMovement in service API');

 console.log('\n=== E2E Results: ' + pass + ' passed, ' + fail + ' failed ===');
 if (fail > 0) throw new Error(fail + ' E2E tests failed');
 return 'E2E: ' + pass + ' passed, ' + fail + ' failed';

 } catch (e) {
 console.error('E2E TEST FAILED: ' + e.message);
 cleanup();
 throw e;
 } finally {
 cleanup();
 }
}
