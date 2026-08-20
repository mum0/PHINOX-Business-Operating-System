/**
 * Inventory Test Suite
 * Unit + E2E tests for Inventory module.
 * Run: testInventoryModule() for unit tests
 * Run: testInventoryE2E() for end-to-end tests
 * PHASE 3A: Added type field assertions and backward compatibility tests.
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

  var testSku = 'PHX-E2E-' + Date.now();
  var itemId = null;

  function cleanup() {
    console.log('--- Cleaning up test data ---');
    if (itemId) {
      try {
        var item = InventoryService.getItem(itemId);
        if (item) {
          if (item.reserved > 0) InventoryService.releaseStock(item.sku, item.reserved);
          if (item.quantity > 0) InventoryService.adjustStock(itemId, 0, 'Test cleanup', 'Zeroing for deletion');
          InventoryService.deleteItem(itemId);
        }
      } catch (e) {}
    }
  }

  try {
    // Step 1: Create item WITH type (Phase 3A)
    console.log('\n--- Step 1: Create item with type ---');
    itemId = InventoryService.createItem({
      sku: testSku, name: 'E2E Test Hoodie', category: 'Hoodies', size: 'L', color: 'Black',
      quantity: 50, cost: 25, price: 55, reorderLevel: 10, location: 'Warehouse A',
      type: 'FINISHED_GOOD'  // Phase 3A
    });
    assert(typeof itemId === 'string' && itemId.indexOf('INV-') === 0, 'Item created with INV ID');

    // Step 2: Read back
    console.log('\n--- Step 2: Read back ---');
    var item = InventoryService.getItem(itemId);
    assert(item.sku === testSku, 'Read: SKU matches');
    assert(item.name === 'E2E Test Hoodie', 'Read: Name matches');
    assert(item.quantity === 50, 'Read: Quantity matches');
    assert(item.type === 'FINISHED_GOOD', 'Read: Type is FINISHED_GOOD (Phase 3A)');

    // Step 3: Update type
    console.log('\n--- Step 3: Update type ---');
    InventoryService.updateItem(itemId, { type: 'RAW_MATERIAL' });
    var updated = InventoryService.getItem(itemId);
    assert(updated.type === 'RAW_MATERIAL', 'Update: Type changed to RAW_MATERIAL (Phase 3A)');

    // Step 4: Reserve stock
    console.log('\n--- Step 4: Reserve stock ---');
    InventoryService.reserveStock(testSku, 10);
    var reserved = InventoryService.getItem(itemId);
    assert(reserved.reserved === 10, 'Reserve: Reserved is 10');
    assert(reserved.available === 40, 'Reserve: Available is 40');

    // Step 5: Release stock
    console.log('\n--- Step 5: Release stock ---');
    InventoryService.releaseStock(testSku, 5);
    var released = InventoryService.getItem(itemId);
    assert(released.reserved === 5, 'Release: Reserved is 5');
    assert(released.available === 45, 'Release: Available is 45');

    // Step 6: Commit stock
    console.log('\n--- Step 6: Commit stock ---');
    InventoryService.commitStock(testSku, 5);
    var committed = InventoryService.getItem(itemId);
    assert(committed.reserved === 0, 'Commit: Reserved is 0');
    assert(committed.quantity === 45, 'Commit: Quantity is 45');
    assert(committed.available === 45, 'Commit: Available is 45');

    // Step 7: Update non-stock fields
    console.log('\n--- Step 7: Update non-stock fields ---');
    InventoryService.updateItem(itemId, { price: 60, location: 'Warehouse B' });
    var updated2 = InventoryService.getItem(itemId);
    assert(updated2.price === 60, 'Update: Price changed');
    assert(updated2.location === 'Warehouse B', 'Update: Location changed');
    assert(updated2.quantity === 45, 'Update: Quantity unchanged (security boundary)');

    // Step 7c: Type update (Phase 3A)
    console.log('\n--- Step 7c: Type Update ---');
    InventoryService.updateItem(itemId, { type: 'RAW_MATERIAL' });
    var typeUpdated = InventoryService.getItem(itemId);
    assert(typeUpdated.type === 'RAW_MATERIAL', 'Update: type changed to RAW_MATERIAL');
    InventoryService.updateItem(itemId, { type: 'FINISHED_GOOD' }); // reset

    // Step 8: Adjust stock (Phase 3B)
    console.log('\n--- Step 8: Adjust stock (Phase 3B) ---');
    InventoryService.adjustStock(itemId, 100, 'Restock', 'E2E test restock');
    var adjusted = InventoryService.getItem(itemId);
    assert(adjusted.quantity === 100, 'Adjust: Quantity is 100');

    // Step 9: Return stock (Phase 3B)
    console.log('\n--- Step 9: Return stock (Phase 3B) ---');
    InventoryService.returnStock(itemId, 10, 'Customer return', 'E2E test return');
    var returned = InventoryService.getItem(itemId);
    assert(returned.quantity === 110, 'Return: Quantity is 110');

    // Step 10: Delete
    console.log('\n--- Step 10: Delete ---');
    InventoryService.deleteItem(itemId);
    var deleted = InventoryService.getItem(itemId);
    assert(deleted === null, 'Delete: Item is null');
    itemId = null;

    // Step 11: Stats
    console.log('\n--- Step 11: Stats ---');
    var stats = InventoryService.getInventoryStats();
    assert(typeof stats.totalItems === 'number', 'Stats: totalItems is number');
    assert(typeof stats.totalValue === 'number', 'Stats: totalValue is number');

    // Step 12: Backward compatibility (Phase 3A)
    console.log('\n--- Step 12: Backward Compatibility ---');
    var noTypeSku = 'PHX-NO-TYPE-' + Date.now();
    var noTypeId = InventoryService.createItem({
      sku: noTypeSku, name: 'No Type Item', category: 'Test',
      quantity: 1, cost: 1, price: 2
      // type omitted — should default to FINISHED_GOOD
    });
    var noTypeItem = InventoryService.getItem(noTypeId);
    assert(noTypeItem.type === 'FINISHED_GOOD', 'Omitted type defaults to FINISHED_GOOD');
    InventoryService.deleteItem(noTypeId);

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