function test3C_LockedFilesSanity() {
    console.log('=== Phase 3C — Locked Files Sanity Check ===');
    var pass = 0, fail = 0;
    function assert(c, m) { 
      if (c) { pass++; console.log(' ✓ ' + m); } 
      else { fail++; console.error(' ✗ ' + m); } 
    }
  
    var sku = 'SANITY-3C-' + Date.now();
    var invId = InventoryService.createItem({
      sku: sku, name: 'Locked File Sanity', category: 'Test',
      quantity: 10, cost: 5, price: 10, type: 'FINISHED_GOOD'
    });
  
    try {
      // 27_StockMovementSchema + 30_StockMovementService
      console.log('\n--- StockMovement (3B) ---');
      InventoryService.adjustStock(invId, 20, 'Sanity', '3C check');
      var afterAdjust = InventoryService.getItem(invId);
      assert(afterAdjust.quantity === 20, 'adjustStock: quantity = 20');
  
      InventoryService.returnStock(invId, 5, 'Return', '3C check');
      var afterReturn = InventoryService.getItem(invId);
      assert(afterReturn.quantity === 25, 'returnStock: quantity = 25');
  
      // 31_OrderService — Order creation with unitCost snapshot
      console.log('\n--- OrderService (3B) ---');
      var orderId = OrderService.createOrder({
        customerEmail: 'sanity@phinox.com',
        items: [{ sku: sku, qty: 2 }],
        shippingCost: 0
      });
      var order = OrderService.getOrder(orderId);
      var orderItems = JSON.parse(order.items);
      assert(orderItems[0].unitCost === 5, 'Order: unitCost snapshot = 5 (inventory cost at order time)');
      assert(order.total === 20, 'Order: total = 20 (2 x 10)');
  
      // 36_SaleService — Sale with COGS
      console.log('\n--- SaleService (3B) ---');
      var saleId = SaleService.createSale({
        items: [{ sku: sku, qty: 1 }],
        shippingCost: 0
      });
      var sale = SaleService.getSale(saleId);
      assert(sale.cogs === 5, 'Sale: COGS = 5 (unitCost snapshot)');
      assert(sale.total === 10, 'Sale: total = 10');
  
      // 41_FinanceService — Ledger posting
      console.log('\n--- FinanceService (3B) ---');
      var ledger = FinanceService.getLedger({ limit: 10 });
      assert(ledger.data.length > 0, 'Finance: Ledger has entries');
      assert(typeof ledger.data[0].amount === 'number', 'Finance: Ledger entry has numeric amount');
  
      // Cleanup
      console.log('\n--- Cleanup ---');
      OrderRepository.delete(orderId);
      SaleRepository.delete(saleId);
      InventoryService.adjustStock(invId, 0, 'Cleanup', 'Zero for delete');
      InventoryService.deleteItem(invId);
  
      console.log('\n=== Locked Files Sanity: ' + pass + ' passed, ' + fail + ' failed ===');
      if (fail > 0) throw new Error(fail + ' sanity checks failed');
      return 'Sanity: ' + pass + ' passed, ' + fail + ' failed';
  
    } catch (e) {
      console.error('SANITY CHECK FAILED: ' + e.message);
      // Emergency cleanup
      try { InventoryService.adjustStock(invId, 0, 'Cleanup', 'Zero'); } catch(e2) {}
      try { InventoryService.deleteItem(invId); } catch(e2) {}
      throw e;
    }
  }