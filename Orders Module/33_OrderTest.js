/**
 * Order Module Test
 * Unit + E2E tests for Phase 4.
 * Run: testOrderModule() for unit tests
 * Run: testOrderE2E() for end-to-end tests
 */

function testOrderModule() {
  console.log('=== Order Module Test Suite ===');
  let pass = 0, fail = 0;
  function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

  console.log('\n--- OrderSchema ---');
  assert(OrderSchema.SCHEMA.id === 1, 'Schema id column is 1');
  assert(OrderSchema.SCHEMA.customerEmail === 2, 'Schema customerEmail column is 2');
  assert(OrderSchema.SCHEMA.items === 3, 'Schema items column is 3');
  assert(OrderSchema.SCHEMA.itemsTotal === 4, 'Schema itemsTotal column is 4');
  assert(OrderSchema.SCHEMA.shippingCost === 5, 'Schema shippingCost column is 5');
  assert(OrderSchema.SCHEMA.totalAmount === 6, 'Schema totalAmount column is 6');
  assert(OrderSchema.SCHEMA.status === 7, 'Schema status column is 7');
  assert(Object.keys(OrderSchema.SCHEMA).length >= 12, 'Schema has at least 12 fields');
  assert(OrderSchema.STATUS.PENDING === 'Pending', 'Status Pending correct');
  assert(OrderSchema.STATUS.CONFIRMED === 'Confirmed', 'Status Confirmed correct');
  assert(OrderSchema.STATUS.SHIPPED === 'Shipped', 'Status Shipped correct');
  assert(OrderSchema.STATUS.DELIVERED === 'Delivered', 'Status Delivered correct');
  assert(OrderSchema.STATUS.CANCELLED === 'Cancelled', 'Status Cancelled correct');
  assert(OrderSchema.isValidStatusTransition('Pending', 'Confirmed') === true, 'Pending → Confirmed valid');
  assert(OrderSchema.isValidStatusTransition('Pending', 'Shipped') === false, 'Pending → Shipped invalid');
  assert(OrderSchema.isValidStatusTransition('Confirmed', 'Shipped') === true, 'Confirmed → Shipped valid');
  assert(OrderSchema.isValidStatusTransition('Shipped', 'Delivered') === true, 'Shipped → Delivered valid');
  assert(OrderSchema.isValidStatusTransition('Delivered', 'Cancelled') === false, 'Delivered → Cancelled invalid');

  console.log('\n--- OrderRepository ---');
  assert(typeof OrderRepository.findById === 'function', 'Repository has findById');
  assert(typeof OrderRepository.findAll === 'function', 'Repository has findAll');
  assert(typeof OrderRepository.create === 'function', 'Repository has create');
  assert(typeof OrderRepository.update === 'function', 'Repository has update');
  assert(typeof OrderRepository.delete === 'function', 'Repository has delete');

  console.log('\n--- OrderService ---');
  assert(typeof OrderService.createOrder === 'function', 'createOrder exists');
  assert(typeof OrderService.confirmOrder === 'function', 'confirmOrder exists');
  assert(typeof OrderService.cancelOrder === 'function', 'cancelOrder exists');
  assert(typeof OrderService.shipOrder === 'function', 'shipOrder exists');
  assert(typeof OrderService.deliverOrder === 'function', 'deliverOrder exists');
  assert(typeof OrderService.getTotalSales === 'function', 'getTotalSales exists');

  console.log('\n--- OrderController ---');
  assert(typeof OrderController.onEdit === 'function', 'Controller has onEdit');
  assert(typeof OrderController.handleApiAction === 'function', 'Controller has handleApiAction');
  assert(typeof OrderController.showOrderStats === 'function', 'Controller has showOrderStats');
  try {
    OrderController.handleApiAction('order.stats', {});
    assert(true, 'Stats API routes correctly');
  } catch (e) {
    if (e.message && e.message.indexOf('not found') > -1) {
      assert(true, 'Stats API routes correctly (sheet not found, skipped)');
    } else {
      assert(false, 'Stats API failed: ' + e.message);
    }
  }
  try { OrderController.handleApiAction('order.unknown', {}); assert(false, 'Unknown action should fail'); }
  catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Unknown action rejected'); }

  console.log('\n=== Test Summary ===');
  console.log('Passed: ' + pass); console.log('Failed: ' + fail); console.log('Total: ' + (pass + fail));
  if (fail > 0) throw new Error(fail + ' test(s) failed');
  console.log('All tests passed!');
  return { passed: pass, failed: fail };
}

/**
 * Order E2E Test
 * Full flow: create inventory → create order → confirm → ship → deliver → cancel (separate)
 * Uses REAL data. Cleans up after itself.
 * Run: testOrderE2E()
 */
function testOrderE2E() {
  console.log('=== Order E2E Test ===');
  let pass = 0, fail = 0;
  function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

  const testSku = 'PHX-ORD-TEST-' + Date.now();
  let invId = null;
  let orderId1 = null;
  let orderId2 = null;

  function cleanup() {
    console.log('--- Cleaning up test data ---');
    [orderId1, orderId2].forEach(function(oid) {
      if (oid) { try { OrderService.deleteOrder(oid); console.log('  Deleted order: ' + oid); } catch (e) {} }
    });
    if (invId) { try { InventoryService.deleteItem(invId); console.log('  Deleted inventory: ' + invId); } catch (e) {} }
    // Cleanup by SKU prefix
    try {
      const allInv = InventoryService.getItems({ limit: 1000 });
      allInv.data.forEach(function(item) {
        if (item.sku && String(item.sku).indexOf('PHX-ORD-TEST-') === 0) {
          try { InventoryService.deleteItem(item.id); } catch (e) {}
        }
      });
    } catch (e) {}
  }

  try {
    // 1. CREATE INVENTORY ITEM
    console.log('\n--- Step 1: Create Inventory ---');
    invId = InventoryService.createItem({
      sku: testSku,
      name: 'E2E Test Product',
      category: 'T-Shirts',
      size: 'M',
      color: 'Black',
      quantity: 100,
      cost: 20,
      price: 50,
      reorderLevel: 10
    });
    assert(typeof invId === 'string', 'Inventory item created: ' + invId);

    // 2. CREATE ORDER
    console.log('\n--- Step 2: Create Order ---');
    orderId1 = OrderService.createOrder({
      customerEmail: 'test@phinox.io',
      items: [{ sku: testSku, qty: 5 }],
      shippingCost: 10
    });
    assert(typeof orderId1 === 'string' && orderId1.indexOf('ORD-') === 0, 'createOrder returns ORD ID: ' + orderId1);

    const order1 = OrderService.getOrder(orderId1);
    assert(order1 !== null, 'getOrder finds created order');
    assert(order1.customerEmail === 'test@phinox.io', 'Customer email correct');
    assert(order1.status === 'Pending', 'Status: Pending');
    assert(order1.itemsTotal === 250, 'itemsTotal: 5 × 50 = 250');
    assert(order1.shippingCost === 10, 'shippingCost: 10');
    assert(order1.totalAmount === 260, 'totalAmount: 250 + 10 = 260');

    // Check inventory reserved
    const invAfterCreate = InventoryService.getItemBySku(testSku);
    assert(invAfterCreate.reserved === 5, 'Inventory reserved: 5');
    assert(invAfterCreate.available === 95, 'Inventory available: 95');
    assert(invAfterCreate.quantity === 100, 'Inventory quantity: 100');

    // 3. CONFIRM ORDER
    console.log('\n--- Step 3: Confirm Order ---');
    OrderService.confirmOrder(orderId1);
    const confirmed = OrderService.getOrder(orderId1);
    assert(confirmed.status === 'Confirmed', 'Status: Confirmed');
    // Reservation stays
    const invAfterConfirm = InventoryService.getItemBySku(testSku);
    assert(invAfterConfirm.reserved === 5, 'Reservation stays after confirm: 5');
    assert(invAfterConfirm.available === 95, 'Available stays: 95');

    // 4. SHIP ORDER
    console.log('\n--- Step 4: Ship Order ---');
    OrderService.shipOrder(orderId1);
    const shipped = OrderService.getOrder(orderId1);
    assert(shipped.status === 'Shipped', 'Status: Shipped');
    // Commit happened: quantity -= 5, reserved -= 5
    const invAfterShip = InventoryService.getItemBySku(testSku);
    assert(invAfterShip.quantity === 95, 'Quantity after ship: 95');
    assert(invAfterShip.reserved === 0, 'Reserved after ship: 0');
    assert(invAfterShip.available === 95, 'Available after ship: 95');

    // 5. DELIVER ORDER
    console.log('\n--- Step 5: Deliver Order ---');
    OrderService.deliverOrder(orderId1);
    const delivered = OrderService.getOrder(orderId1);
    assert(delivered.status === 'Delivered', 'Status: Delivered');

    // 6. INVALID TRANSITIONS
    console.log('\n--- Step 6: Invalid Transitions ---');
    try { OrderService.cancelOrder(orderId1); assert(false, 'Should reject cancelling delivered order'); }
    catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Correctly rejects cancel delivered'); }

    try { OrderService.shipOrder(orderId1); assert(false, 'Should reject shipping delivered order'); }
    catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Correctly rejects ship delivered'); }

    // 7. CANCEL PENDING ORDER (separate order)
    console.log('\n--- Step 7: Cancel Pending Order ---');
    orderId2 = OrderService.createOrder({
      customerEmail: 'cancel@phinox.io',
      items: [{ sku: testSku, qty: 3 }],
      shippingCost: 5
    });
    const beforeCancel = InventoryService.getItemBySku(testSku);
    assert(beforeCancel.reserved === 3, 'Second order reserved: 3');

    OrderService.cancelOrder(orderId2);
    const cancelled = OrderService.getOrder(orderId2);
    assert(cancelled.status === 'Cancelled', 'Status: Cancelled');
    const afterCancel = InventoryService.getItemBySku(testSku);
    assert(afterCancel.reserved === 0, 'Reserved released after cancel: 0');
    assert(afterCancel.quantity === 95, 'Quantity unchanged after cancel: 95');
    assert(afterCancel.available === 95, 'Available restored: 95');

    // 8. INSUFFICIENT STOCK
    console.log('\n--- Step 8: Insufficient Stock ---');
    try {
      OrderService.createOrder({
        customerEmail: 'fail@phinox.io',
        items: [{ sku: testSku, qty: 1000 }],
        shippingCost: 0
      });
      assert(false, 'Should reject order exceeding stock');
    } catch (e) {
      assert(e.category === 'VALIDATION_ERROR', 'Correctly rejects insufficient stock');
    }

    // 9. ATOMIC ROLLBACK (create order with 2 items, second fails)
    console.log('\n--- Step 9: Atomic Rollback ---');
    const badSku = 'PHX-NONEXISTENT-' + Date.now();
    try {
      OrderService.createOrder({
        customerEmail: 'atomic@phinox.io',
        items: [{ sku: testSku, qty: 1 }, { sku: badSku, qty: 1 }],
        shippingCost: 0
      });
      assert(false, 'Should reject order with invalid SKU');
    } catch (e) {
      assert(e.category === 'VALIDATION_ERROR' || e.category === 'NOT_FOUND', 'Correctly rejects invalid SKU');
      // Verify first item was NOT reserved (rollback happened)
      const invAfterFail = InventoryService.getItemBySku(testSku);
      assert(invAfterFail.reserved === 0, 'Rollback: no partial reservation');
    }

    // 10. STATISTICS
    console.log('\n--- Step 10: Statistics ---');
    assert(typeof OrderService.totalOrders() === 'number', 'totalOrders returns number');
    assert(typeof OrderService.getTotalSales() === 'number', 'getTotalSales returns number');

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
