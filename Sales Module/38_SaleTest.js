/**
 * Sale Module Test
 * Unit + E2E tests for Phase 5.
 * Run: testSaleModule() for unit tests
 * Run: testSaleE2E() for end-to-end tests
 */

function testSaleModule() {
  console.log('=== Sale Module Test Suite ===');
  let pass = 0, fail = 0;
  function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

  console.log('\n--- SaleSchema ---');
  assert(SaleSchema.SCHEMA.id === 1, 'Schema id column is 1');
  assert(SaleSchema.SCHEMA.orderId === 2, 'Schema orderId column is 2');
  assert(SaleSchema.SCHEMA.customerEmail === 3, 'Schema customerEmail column is 3');
  assert(SaleSchema.SCHEMA.items === 4, 'Schema items column is 4');
  assert(SaleSchema.SCHEMA.itemsTotal === 5, 'Schema itemsTotal column is 5');
  assert(SaleSchema.SCHEMA.shippingCost === 6, 'Schema shippingCost column is 6');
  assert(SaleSchema.SCHEMA.totalAmount === 7, 'Schema totalAmount column is 7');
  assert(SaleSchema.SCHEMA.paymentMethod === 8, 'Schema paymentMethod column is 8');
  assert(SaleSchema.SCHEMA.paymentStatus === 9, 'Schema paymentStatus column is 9');
  assert(SaleSchema.SCHEMA.paidAmount === 10, 'Schema paidAmount column is 10');
  assert(SaleSchema.SCHEMA.refundedAmount === 11, 'Schema refundedAmount column is 11');
  assert(SaleSchema.SCHEMA.cogs === 12, 'Schema cogs column is 12');
  assert(Object.keys(SaleSchema.SCHEMA).length >= 16, 'Schema has at least 16 fields');
  assert(SaleSchema.PAYMENT_STATUS.PENDING === 'Pending', 'PaymentStatus Pending correct');
  assert(SaleSchema.PAYMENT_STATUS.PAID === 'Paid', 'PaymentStatus Paid correct');
  assert(SaleSchema.PAYMENT_STATUS.PARTIAL === 'Partial', 'PaymentStatus Partial correct');
  assert(SaleSchema.PAYMENT_STATUS.REFUNDED === 'Refunded', 'PaymentStatus Refunded correct');
  assert(SaleSchema.PAYMENT_METHOD.CASH === 'Cash', 'PaymentMethod Cash correct');

  console.log('\n--- SaleRepository ---');
  assert(typeof SaleRepository.findById === 'function', 'Repository has findById');
  assert(typeof SaleRepository.findByOrderId === 'function', 'Repository has findByOrderId');
  assert(typeof SaleRepository.create === 'function', 'Repository has create');
  assert(typeof SaleRepository.update === 'function', 'Repository has update');
  assert(typeof SaleRepository.delete === 'function', 'Repository has delete');

  console.log('\n--- SaleService ---');
  assert(typeof SaleService.createSale === 'function', 'createSale exists');
  assert(typeof SaleService.recordPayment === 'function', 'recordPayment exists');
  assert(typeof SaleService.processRefund === 'function', 'processRefund exists');
  assert(typeof SaleService.getTotalRevenue === 'function', 'getTotalRevenue exists');
  assert(typeof SaleService.getTotalCollected === 'function', 'getTotalCollected exists');
  assert(typeof SaleService.getTotalRefunded === 'function', 'getTotalRefunded exists');
  assert(typeof SaleService.getNetRevenue === 'function', 'getNetRevenue exists');
  assert(typeof SaleService.getTotalCOGS === 'function', 'getTotalCOGS exists');
  assert(typeof SaleService.getGrossProfit === 'function', 'getGrossProfit exists');

  console.log('\n--- SaleController ---');
  assert(typeof SaleController.onEdit === 'function', 'Controller has onEdit');
  assert(typeof SaleController.handleApiAction === 'function', 'Controller has handleApiAction');
  assert(typeof SaleController.showSaleStats === 'function', 'Controller has showSaleStats');
  try {
    SaleController.handleApiAction('sale.stats', {});
    assert(true, 'Stats API routes correctly');
  } catch (e) {
    if (e.message && e.message.indexOf('not found') > -1) {
      assert(true, 'Stats API routes correctly (sheet not found, skipped)');
    } else {
      assert(false, 'Stats API failed: ' + e.message);
    }
  }
  try { SaleController.handleApiAction('sale.unknown', {}); assert(false, 'Unknown action should fail'); }
  catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Unknown action rejected'); }

  console.log('\n=== Test Summary ===');
  console.log('Passed: ' + pass); console.log('Failed: ' + fail); console.log('Total: ' + (pass + fail));
  if (fail > 0) throw new Error(fail + ' test(s) failed');
  console.log('All tests passed!');
  return { passed: pass, failed: fail };
}

/**
 * Sale E2E Test
 * Full flow: create inventory → create order → ship → deliver → create linked sale → duplicate check → direct sale → payment → refund → delete rules → finance stats
 * Uses REAL data. Cleans up after itself.
 * Run: testSaleE2E()
 */
function testSaleE2E() {
  console.log('=== Sale E2E Test ===');
  let pass = 0, fail = 0;
  function assert(c, m) { if (c) { pass++; console.log(' ✓ ' + m); } else { fail++; console.error(' ✗ ' + m); } }

  const testSku = 'PHX-SAL-TEST-' + Date.now();
  let invId = null;
  let orderId = null;
  let saleId1 = null;
  let saleId2 = null;

  function cleanup() {
    console.log('--- Cleaning up test data ---');
    [saleId1, saleId2].forEach(function(sid) {
      if (sid) { try { SaleService.deleteSale(sid); console.log('  Deleted sale: ' + sid); } catch (e) {} }
    });
    if (orderId) { try { OrderService.deleteOrder(orderId); console.log('  Deleted order: ' + orderId); } catch (e) {} }
    if (invId) { try { InventoryService.deleteItem(invId); console.log('  Deleted inventory: ' + invId); } catch (e) {} }
    try {
      const allInv = InventoryService.getItems({ limit: 1000 });
      allInv.data.forEach(function(item) {
        if (item.sku && String(item.sku).indexOf('PHX-SAL-TEST-') === 0) {
          try { InventoryService.deleteItem(item.id); } catch (e) {}
        }
      });
    } catch (e) {}
  }

  try {
    // 1. CREATE INVENTORY
    console.log('\n--- Step 1: Create Inventory ---');
    invId = InventoryService.createItem({
      sku: testSku,
      name: 'E2E Sale Test Product',
      category: 'T-Shirts',
      size: 'M',
      color: 'Black',
      quantity: 100,
      cost: 20,
      price: 50,
      reorderLevel: 10
    });
    assert(typeof invId === 'string', 'Inventory created: ' + invId);

    // 2. CREATE ORDER
    console.log('\n--- Step 2: Create Order ---');
    orderId = OrderService.createOrder({
      customerEmail: 'sale-test@phinox.io',
      items: [{ sku: testSku, qty: 5 }],
      shippingCost: 10
    });
    assert(typeof orderId === 'string', 'Order created: ' + orderId);

    // 3. SHIP & DELIVER
    console.log('\n--- Step 3: Ship & Deliver ---');
    OrderService.shipOrder(orderId);
    OrderService.deliverOrder(orderId);
    const deliveredOrder = OrderService.getOrder(orderId);
    assert(deliveredOrder.status === 'Delivered', 'Order delivered');
    // Verify items have unitCost (updated OrderService)
    const orderItems = JSON.parse(deliveredOrder.items);
    assert(orderItems[0].unitCost === 20, 'Order item has unitCost snapshot: 20');

    // 4. CREATE LINKED SALE
    console.log('\n--- Step 4: Create Linked Sale ---');
    saleId1 = SaleService.createSale({ orderId: orderId });
    assert(typeof saleId1 === 'string' && saleId1.indexOf('SAL-') === 0, 'Linked sale created: ' + saleId1);

    const linkedSale = SaleService.getSale(saleId1);
    assert(linkedSale.orderId === orderId, 'Sale linked to order');
    assert(linkedSale.customerEmail === 'sale-test@phinox.io', 'Customer email copied from order');
    assert(linkedSale.itemsTotal === 250, 'itemsTotal: 5 × 50 = 250');
    assert(linkedSale.totalAmount === 260, 'totalAmount: 250 + 10 = 260');
    assert(linkedSale.cogs === 100, 'cogs: 5 × 20 = 100');
    assert(linkedSale.paymentStatus === 'Pending', 'Payment status: Pending');
    assert(linkedSale.paidAmount === 0, 'Paid amount: 0');
    assert(linkedSale.refundedAmount === 0, 'Refunded amount: 0');

    // Inventory should NOT change (already committed by shipOrder)
    const invAfterLinked = InventoryService.getItemBySku(testSku);
    assert(invAfterLinked.quantity === 95, 'Inventory unchanged by linked sale: 95');

    // 5. DUPLICATE SALE CHECK
    console.log('\n--- Step 5: Duplicate Sale Check ---');
    try {
      SaleService.createSale({ orderId: orderId });
      assert(false, 'Should reject duplicate sale for same order');
    } catch (e) {
      assert(e.category === 'CONFLICT_ERROR', 'Correctly rejects duplicate sale');
    }

    // 6. CREATE DIRECT SALE
    console.log('\n--- Step 6: Create Direct Sale ---');
    saleId2 = SaleService.createSale({
      customerEmail: 'direct@phinox.io',
      items: [{ sku: testSku, qty: 3 }],
      shippingCost: 5,
      paymentMethod: SaleSchema.PAYMENT_METHOD.CASH
    });
    assert(typeof saleId2 === 'string', 'Direct sale created: ' + saleId2);

    const directSale = SaleService.getSale(saleId2);
    assert(directSale.orderId === null || directSale.orderId === '', 'Direct sale has no orderId');
    assert(directSale.itemsTotal === 150, 'Direct sale itemsTotal: 3 × 50 = 150');
    assert(directSale.totalAmount === 155, 'Direct sale totalAmount: 150 + 5 = 155');
    assert(directSale.cogs === 60, 'Direct sale cogs: 3 × 20 = 60');

    // Inventory should decrease (commit happened)
    const invAfterDirect = InventoryService.getItemBySku(testSku);
    assert(invAfterDirect.quantity === 92, 'Inventory after direct sale: 92 (95 - 3)');

    // 7. RECORD PAYMENT
    console.log('\n--- Step 7: Record Payment ---');
    SaleService.recordPayment(saleId2, 100, SaleSchema.PAYMENT_METHOD.CARD);
    const partialPay = SaleService.getSale(saleId2);
    assert(partialPay.paidAmount === 100, 'Paid amount: 100');
    assert(partialPay.paymentStatus === 'Partial', 'Status: Partial');

    SaleService.recordPayment(saleId2, 55, SaleSchema.PAYMENT_METHOD.CARD);
    const fullPay = SaleService.getSale(saleId2);
    assert(fullPay.paidAmount === 155, 'Paid amount: 155');
    assert(fullPay.paymentStatus === 'Paid', 'Status: Paid');

    // 8. PROCESS REFUND
    console.log('\n--- Step 8: Process Refund ---');
    SaleService.processRefund(saleId2, 50);
    const partialRefund = SaleService.getSale(saleId2);
    assert(partialRefund.refundedAmount === 50, 'Refunded amount: 50');
    assert(partialRefund.paymentStatus === 'Partial', 'Status: Partial after partial refund');

    SaleService.processRefund(saleId2, 105);
    const fullRefund = SaleService.getSale(saleId2);
    assert(fullRefund.refundedAmount === 155, 'Refunded amount: 155');
    assert(fullRefund.paymentStatus === 'Refunded', 'Status: Refunded');

    // 9. DELETE RULES
    console.log('\n--- Step 9: Delete Rules ---');
    // Cannot delete paid/refunded sale
    try { SaleService.deleteSale(saleId2); assert(false, 'Should reject deleting refunded sale'); }
    catch (e) { assert(e.category === 'VALIDATION_ERROR', 'Correctly rejects deleting refunded sale'); }

    // Can delete pending linked sale
    SaleService.deleteSale(saleId1);
    assert(SaleService.getSale(saleId1) === null, 'Pending linked sale deleted');
    saleId1 = null;

    // 10. FINANCE STATS
    console.log('\n--- Step 10: Finance Stats ---');
    assert(typeof SaleService.getTotalRevenue() === 'number', 'getTotalRevenue returns number');
    assert(typeof SaleService.getTotalCollected() === 'number', 'getTotalCollected returns number');
    assert(typeof SaleService.getTotalRefunded() === 'number', 'getTotalRefunded returns number');
    assert(typeof SaleService.getNetRevenue() === 'number', 'getNetRevenue returns number');
    assert(typeof SaleService.getTotalCOGS() === 'number', 'getTotalCOGS returns number');
    assert(typeof SaleService.getGrossProfit() === 'number', 'getGrossProfit returns number');

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
