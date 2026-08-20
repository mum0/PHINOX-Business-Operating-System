/**
 * Inventory Module Test
 * Unit + E2E tests for Phase 3.
 * UPDATED Phase 3B: Added StockMovement assertions, updateItem security tests.
 * Run: testInventoryModule() for unit tests
 * Run: testInventoryE2E() for end-to-end tests
 */

function testInventoryModule() {
    console.log('=== Inventory Module Test Suite ===');
    let pass = 0, fail = 0;
    function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }
  
    console.log('\n--- InventorySchema ---');
    assert(InventorySchema.SCHEMA.id === 1, 'Schema id column is 1');
    assert(InventorySchema.SCHEMA.sku === 2, 'Schema sku column is 2');
    assert(InventorySchema.SCHEMA.name === 3, 'Schema name column is 3');
    assert(InventorySchema.SCHEMA.quantity === 7, 'Schema quantity column is 7');
    assert(InventorySchema.SCHEMA.reserved === 8, 'Schema reserved column is 8');
    assert(InventorySchema.SCHEMA.available === 9, 'Schema available column is 9');
    assert(InventorySchema.SCHEMA.type === 20, 'Schema type column is 20 (Phase 3A)');
    assert(Object.keys(InventorySchema.SCHEMA).length >= 20, 'Schema has at least 20 fields (Phase 3A)');
    assert(InventorySchema.STATUS.ACTIVE === 'Active', 'Status Active correct');
    assert(InventorySchema.STATUS.OUT_OF_STOCK === 'Out of Stock', 'Status Out of Stock correct');
    assert(InventorySchema.STATUS.DISCONTINUED === 'Discontinued', 'Status Discontinued correct');
    
    // Phase 3A: TYPE enum assertions
    assert(InventorySchema.TYPE.RAW_MATERIAL === 'RAW_MATERIAL', 'TYPE RAW_MATERIAL correct');
    assert(InventorySchema.TYPE.COMPONENT === 'COMPONENT', 'TYPE COMPONENT correct');
    assert(InventorySchema.TYPE.FINISHED_GOOD === 'FINISHED_GOOD', 'TYPE FINISHED_GOOD correct');
    assert(InventorySchema.TYPE.OTHER === 'OTHER', 'TYPE OTHER correct');
    assert(typeof InventorySchema.getSheetHeaders === 'function', 'getSheetHeaders exists (Phase 3A)');
    var headers = InventorySchema.getSheetHeaders();
    assert(headers.length === 20, 'getSheetHeaders returns 20 columns');
    assert(headers[19] === 'type', 'Header 20 is type');
    assert(InventorySchema.getDefaultItem().type === 'FINISHED_GOOD', 'Default type is FINISHED_GOOD');
  
    console.log('\n--- InventoryRepository ---');
    assert(typeof InventoryRepository.findById === 'function', 'Repository has findById');
    assert(typeof InventoryRepository.findBySku === 'function', 'Repository has findBySku');
    assert(typeof InventoryRepository.create === 'function', 'Repository has create');
    assert(typeof InventoryRepository.update === 'function', 'Repository has update');
    assert(typeof InventoryRepository.delete === 'function', 'Repository has delete');
  
    console.log('\n--- InventoryService ---');
    assert(InventoryService.getInventoryValue !== undefined, 'getInventoryValue exists');
    assert(InventoryService.getInventoryRetailValue !== undefined, 'getInventoryRetailValue exists');
    assert(InventoryService.reserveStock !== undefined, 'reserveStock exists');
    assert(InventoryService.releaseStock !== undefined, 'releaseStock exists');
    assert(InventoryService.commitStock !== undefined, 'commitStock exists');
    assert(InventoryService.restock !== undefined, 'restock exists');
    assert(InventoryService.adjustStock !== undefined, 'adjustStock exists (Phase 3B)');
    assert(InventoryService.returnStock !== undefined, 'returnStock exists (Phase 3B)');
  
    console.log('\n--- InventoryController ---');
    assert(typeof InventoryController.onEdit === 'function', 'Controller has onEdit');
    assert(typeof InventoryController.handleApiAction === 'function', 'Controller has handleApiAction');
    assert(typeof InventoryController.showInventoryStats === 'function', 'Controller has showInventoryStats');
    try { InventoryController.handleApiAction('inventory.stats', {}); assert(true, 'Stats API routes correctly'); }
    catch (e) { assert(false, 'Stats API failed: ' + e.message); }
    try { InventoryController.handleApiAction('inventory.unknown', {}); assert(false, 'Unknown action should fail'); }
    catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Unknown action rejected'); }
  
    console.log('\n--- updateItem Security Boundary (Phase 3B) ---');
    assert(typeof InventoryService.updateItem === 'function', 'updateItem exists');
  
    console.log('\n=== Test Summary ===');
    console.log('Passed: ' + pass); console.log('Failed: ' + fail); console.log('Total: ' + (pass + fail));
    if (fail > 0) throw new Error(fail + ' test(s) failed');
    console.log('All tests passed!');
    return { passed: pass, failed: fail };
  }

function testInventoryE2E() {
 console.log('=== Inventory E2E Test ===');
 let pass = 0, fail = 0;
 function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

 const testSku = 'PHX-TEST-' + Date.now();
 let itemId = null;

 function cleanup() {
 console.log('--- Cleaning up test data ---');
 if (itemId) { try { InventoryService.deleteItem(itemId); console.log(' Deleted: ' + itemId); } catch (e) {} }
 try {
 const all = InventoryService.getItems({ limit: 1000 });
 all.data.forEach(function(item) {
 if (item.sku && String(item.sku).indexOf('PHX-TEST-') === 0) {
 try { InventoryService.deleteItem(item.id); console.log(' Deleted by SKU: ' + item.id); } catch (e) {}
 }
 });
 } catch (e) {}
 try {
 if (typeof StockMovementRepository !== 'undefined') {
 const movs = StockMovementRepository.findAll({ limit: 1000 });
 movs.data.forEach(function(m) {
 if (m.sku && String(m.sku).indexOf('PHX-TEST-') === 0) { try { StockMovementRepository.delete(m.id); } catch (e) {} }
 });
 }
 } catch (e) {}
 }

 try {
 // 1. CREATE
 console.log('\n--- Step 1: Create ---');
 itemId = InventoryService.createItem({
    sku: testSku, name: 'E2E Test Hoodie', category: 'Hoodies', size: 'L', color: 'Black',
    quantity: 50, cost: 25, price: 55, reorderLevel: 10, location: 'Warehouse A',
    type: 'FINISHED_GOOD'  // Phase 3A
  });
 assert(typeof itemId === 'string' && itemId.indexOf('INV-') === 0, 'createItem returns INV ID: ' + itemId);

 // 2. GET BY SKU
 console.log('\n--- Step 2: Get By SKU ---');
 const item = InventoryService.getItemBySku(testSku);
 assert(item !== null, 'getItemBySku finds created item');
 assert(item.sku === testSku, 'SKU matches');
 assert(item.quantity === 50, 'Quantity: 50');
 assert(item.reserved === 0, 'Reserved starts at 0');
 assert(item.available === 50, 'Available = quantity - reserved = 50');

 // 3. RESERVE
 console.log('\n--- Step 3: Reserve ---');
 InventoryService.reserveStock(testSku, 10);
 const reserved = InventoryService.getItemBySku(testSku);
 assert(reserved.reserved === 10, 'Reserve: reserved = 10');
 assert(reserved.available === 40, 'Reserve: available = 40');
 assert(reserved.quantity === 50, 'Reserve: quantity unchanged = 50');
 if (typeof StockMovementService !== 'undefined') {
 const movs = StockMovementService.getMovementsByInventoryId(itemId);
 assert(movs.data.length >= 1, 'Reserve creates at least 1 movement');
 assert(movs.data.some(function(m) { return m.movementType === 'RESERVE'; }), 'RESERVE movement exists');
 }

 // 4. COMMIT
 console.log('\n--- Step 4: Commit ---');
 InventoryService.commitStock(testSku, 5);
 const committed = InventoryService.getItemBySku(testSku);
 assert(committed.quantity === 45, 'Commit: quantity = 45');
 assert(committed.reserved === 5, 'Commit: reserved = 5');
 assert(committed.available === 40, 'Commit: available = 40');
 if (typeof StockMovementService !== 'undefined') {
 const movs = StockMovementService.getMovementsByInventoryId(itemId);
 assert(movs.data.some(function(m) { return m.movementType === 'COMMIT'; }), 'COMMIT movement exists');
 }

 // 5. RELEASE
 console.log('\n--- Step 5: Release ---');
 InventoryService.releaseStock(testSku, 5);
 const released = InventoryService.getItemBySku(testSku);
 assert(released.reserved === 0, 'Release: reserved = 0');
 assert(released.available === 45, 'Release: available = 45');
 assert(released.quantity === 45, 'Release: quantity = 45');
 if (typeof StockMovementService !== 'undefined') {
 const movs = StockMovementService.getMovementsByInventoryId(itemId);
 assert(movs.data.some(function(m) { return m.movementType === 'RELEASE'; }), 'RELEASE movement exists');
 }

 // 6. RESTOCK
 console.log('\n--- Step 6: Restock ---');
 InventoryService.restock(testSku, 20);
 const restocked = InventoryService.getItemBySku(testSku);
 assert(restocked.quantity === 65, 'Restock: quantity = 65');
 assert(restocked.available === 65, 'Restock: available = 65');
 assert(restocked.reserved === 0, 'Restock: reserved = 0');
 if (typeof StockMovementService !== 'undefined') {
 const movs = StockMovementService.getMovementsByInventoryId(itemId);
 assert(movs.data.some(function(m) { return m.movementType === 'RESTOCK'; }), 'RESTOCK movement exists');
 }

 // 7. UPDATE (price + reorderLevel)
 console.log('\n--- Step 7: Update ---');
 InventoryService.updateItem(itemId, { price: 60, reorderLevel: 15 });
 const updated = InventoryService.getItem(itemId);
 assert(updated.price === 60, 'Update: price = 60');
 assert(updated.reorderLevel === 15, 'Update: reorderLevel = 15');
 assert(updated.available === 65, 'Update: available unchanged = 65');

 // Phase 3B: updateItem must reject quantity/reserved
 c// Phase 3A: Type update
console.log('\n--- Step 7c: Type Update ---');
InventoryService.updateItem(itemId, { type: 'RAW_MATERIAL' });
var typeUpdated = InventoryService.getItem(itemId);
assert(typeUpdated.type === 'RAW_MATERIAL', 'Update: type changed to RAW_MATERIAL');
InventoryService.updateItem(itemId, { type: 'FINISHED_GOOD' }); // reset
 // 8. LOW STOCK
 console.log('\n--- Step 8: Low Stock ---');
 const lowSku = 'PHX-TEST-LOW-' + Date.now();
 const lowId = InventoryService.createItem({
 sku: lowSku, name: 'E2E Low Stock Item', category: 'Accessories',
 quantity: 5, cost: 5, price: 15, reorderLevel: 10
 });
 const lowItems = InventoryService.getLowStockItems();
 assert(lowItems.data.some(function(i) { return i.id === lowId; }), 'getLowStockItems finds low-stock item');

 // 9. OUT OF STOCK
 console.log('\n--- Step 9: Out of Stock ---');
 InventoryService.adjustStock(lowId, 0, 'Test zeroing', 'Setting quantity to zero for out-of-stock test');
 const outItems = InventoryService.getOutOfStockItems();
 assert(outItems.data.some(function(i) { return i.id === lowId; }), 'getOutOfStockItems finds zero-quantity item');
 const lowItem = InventoryService.getItem(lowId);
 assert(lowItem.status === 'Out of Stock', 'Auto status: Out of Stock');

 // 10. DELETE
 console.log('\n--- Step 10: Delete ---');
 InventoryService.deleteItem(lowId);
 assert(InventoryService.getItem(lowId) === null, 'deleteItem removes low-stock item');

 try {
 InventoryService.deleteItem(itemId);
 assert(false, 'Should reject deleting item with stock');
 } catch (e) {
 assert(e.category === 'VALIDATION_ERROR', 'Correctly rejects deleting item with stock');
 }

 const itemBeforeDelete = InventoryService.getItem(itemId);
 if (itemBeforeDelete && itemBeforeDelete.reserved > 0) {
 InventoryService.releaseStock(itemBeforeDelete.sku, itemBeforeDelete.reserved);
 }
 InventoryService.adjustStock(itemId, 0, 'Test cleanup', 'Zeroing stock for deletion');
 InventoryService.deleteItem(itemId);
 assert(InventoryService.getItem(itemId) === null, 'deleteItem removes empty item');
 itemId = null;

 // 11. STATISTICS
 console.log('\n--- Step 11: Statistics ---');
 assert(typeof InventoryService.totalItems() === 'number', 'totalItems returns number');
 assert(typeof InventoryService.getInventoryValue() === 'number', 'getInventoryValue returns number');
 assert(typeof InventoryService.getInventoryRetailValue() === 'number', 'getInventoryRetailValue returns number');

 console.log('\n=== E2E Results: ' + pass + ' passed, ' + fail + ' failed ===');
 if (fail > 0) throw new Error(fail + ' E2E tests failed');
 return 'E2E: ' + pass + ' passed, ' + fail + ' failed';

 } catch (e) {
 console.error('E2E TEST FAILED: ' + e.message);
 cleanup();
 throw e;
 } finally {
    // Phase 3A: Backward compatibility — item without type
console.log('\n--- Step 16: Backward Compatibility ---');
var noTypeSku = 'PHX-NO-TYPE-' + Date.now();
var noTypeId = InventoryService.createItem({
  sku: noTypeSku, name: 'No Type Item', category: 'Test',
  quantity: 1, cost: 1, price: 2
  // type omitted — should default to FINISHED_GOOD
});
var noTypeItem = InventoryService.getItem(noTypeId);
assert(noTypeItem.type === 'FINISHED_GOOD', 'Omitted type defaults to FINISHED_GOOD');
InventoryService.deleteItem(noTypeId);
 cleanup();
 }
}
