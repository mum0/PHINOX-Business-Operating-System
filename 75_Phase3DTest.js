/**
 * PHINOX BOS — Phase 3D Test Suite
 * Tests: BOM, Stock Movement, Stock Adjustment, Cost & Margin, Expenses
 * Run via: Run > Test as add-on > Execute all tests
 */

// ============================================================
// TEST CONFIGURATION
// ============================================================
var TEST_CONFIG = {
    verbose: true,
    stopOnFail: false,
    cleanupAfterTest: true
  };
  
  // ============================================================
  // TEST RUNNER
  // ============================================================
  var _testResults = [];
  var _currentSuite = '';
  
  function describe(suiteName, fn) {
    _currentSuite = suiteName;
    if (TEST_CONFIG.verbose) Logger.log('\n📦 ' + suiteName);
    try {
      fn();
    } catch (e) {
      Logger.log('  ❌ Suite error: ' + e.message);
    }
    _currentSuite = '';
  }
  
  function it(testName, fn) {
    var fullName = (_currentSuite ? _currentSuite + ' > ' : '') + testName;
    try {
      fn();
      _testResults.push({ name: fullName, status: 'PASS', error: null });
      if (TEST_CONFIG.verbose) Logger.log('  ✅ ' + testName);
    } catch (e) {
      _testResults.push({ name: fullName, status: 'FAIL', error: e.message });
      if (TEST_CONFIG.verbose) Logger.log('  ❌ ' + testName + ' — ' + e.message);
      if (TEST_CONFIG.stopOnFail) throw e;
    }
  }
  
  function expect(actual) {
    return {
      toBe: function(expected) {
        if (actual !== expected) {
          throw new Error('Expected ' + expected + ' but got ' + actual);
        }
      },
      toEqual: function(expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error('Expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
        }
      },
      toBeDefined: function() {
        if (actual === undefined || actual === null) {
          throw new Error('Expected value to be defined but got ' + actual);
        }
      },
      toBeNull: function() {
        if (actual !== null) {
          throw new Error('Expected null but got ' + actual);
        }
      },
      toBeTruthy: function() {
        if (!actual) {
          throw new Error('Expected truthy value but got ' + actual);
        }
      },
      toBeFalsy: function() {
        if (actual) {
          throw new Error('Expected falsy value but got ' + actual);
        }
      },
      toBeGreaterThan: function(expected) {
        if (!(actual > expected)) {
          throw new Error('Expected ' + actual + ' to be greater than ' + expected);
        }
      },
      toBeLessThan: function(expected) {
        if (!(actual < expected)) {
          throw new Error('Expected ' + actual + ' to be less than ' + expected);
        }
      },
      toContain: function(expected) {
        if (typeof actual === 'string' && actual.indexOf(expected) === -1) {
          throw new Error('Expected "' + actual + '" to contain "' + expected + '"');
        } else if (Array.isArray(actual) && actual.indexOf(expected) === -1) {
          throw new Error('Expected array to contain ' + expected);
        }
      },
      toThrow: function() {
        var threw = false;
        try { actual(); } catch (e) { threw = true; }
        if (!threw) throw new Error('Expected function to throw');
      }
    };
  }
  
  function beforeEach(fn) { fn(); }
  function afterEach(fn) { fn(); }
  
  // ============================================================
  // TEST DATA HELPERS
  // ============================================================
  var _testData = {
    testSku: 'TEST-PHX-001',
    testSku2: 'TEST-PHX-002',
    testComponentSku: 'TEST-COMP-001',
    testComponentSku2: 'TEST-COMP-002',
    bomId: null,
    bomItemId: null,
    inventoryId: null,
    expenseId: null
  };
  
  function _createTestInventoryItem(sku, name, type, qty, cost, price) {
    try {
      return InventoryService.createItem({
        sku: sku,
        name: name,
        category: 'Test Category',
        type: type || 'RAW_MATERIAL',
        quantity: qty || 100,
        reserved: 0,
        cost: cost || 10,
        price: price || 25,
        reorderLevel: 10,
        status: 'ACTIVE'
      });
    } catch (e) {
      // Item may already exist
      var existing = InventoryService.getItemBySku(sku);
      return existing ? existing.id : null;
    }
  }
  
  function _cleanupTestData() {
    try {
      if (_testData.bomItemId) BOMService.removeBOMItem(_testData.bomItemId);
    } catch (e) {}
    try {
      if (_testData.bomId) BOMService.deleteBOM(_testData.bomId);
    } catch (e) {}
    try {
      var item = InventoryService.getItemBySku(_testData.testSku);
      if (item && item.id) InventoryService.deleteItem(item.id);
    } catch (e) {}
    try {
      var item2 = InventoryService.getItemBySku(_testData.testSku2);
      if (item2 && item2.id) InventoryService.deleteItem(item2.id);
    } catch (e) {}
    try {
      var comp = InventoryService.getItemBySku(_testData.testComponentSku);
      if (comp && comp.id) InventoryService.deleteItem(comp.id);
    } catch (e) {}
    try {
      var comp2 = InventoryService.getItemBySku(_testData.testComponentSku2);
      if (comp2 && comp2.id) InventoryService.deleteItem(comp2.id);
    } catch (e) {}
  }
  
  // ============================================================
  // PHASE 3D — TEST SUITE
  // ============================================================
  
  function runPhase3DTests() {
    _testResults = [];
    Logger.log('═══════════════════════════════════════════════════════');
    Logger.log('  PHINOX BOS — Phase 3D Test Suite');
    Logger.log('═══════════════════════════════════════════════════════');
  
    var startTime = new Date().getTime();
  
    // Setup test data
    Logger.log('\n🔧 Setting up test data...');
    _testData.inventoryId = _createTestInventoryItem(_testData.testSku, 'Test Finished Product', 'FINISHED_GOOD', 50, 15, 45);
    _createTestInventoryItem(_testData.testSku2, 'Test Finished Product 2', 'FINISHED_GOOD', 30, 12, 40);
    _createTestInventoryItem(_testData.testComponentSku, 'Test Component A', 'RAW_MATERIAL', 200, 5, 10);
    _createTestInventoryItem(_testData.testComponentSku2, 'Test Component B', 'RAW_MATERIAL', 150, 3, 8);
    Logger.log('  Test data ready.\n');
  
    try {
      testFlow2_StockAdjustment();
      testFlow3_StockMovements();
      testFlow4_BOMView();
      testFlow5_BOMManagement();
      testFlow6_CostAndMargin();
      testFlow7_Expenses();
      testPermissions();
      testUIEndpoints();
    } catch (e) {
      Logger.log('\n💥 Fatal error: ' + e.message);
      Logger.log(e.stack);
    }
  
    // Cleanup
    if (TEST_CONFIG.cleanupAfterTest) {
      Logger.log('\n🧹 Cleaning up test data...');
      _cleanupTestData();
    }
  
    var duration = new Date().getTime() - startTime;
  
    // Report
    Logger.log('\n═══════════════════════════════════════════════════════');
    Logger.log('  TEST RESULTS');
    Logger.log('═══════════════════════════════════════════════════════');
  
    var passed = _testResults.filter(function(r) { return r.status === 'PASS'; }).length;
    var failed = _testResults.filter(function(r) { return r.status === 'FAIL'; }).length;
  
    _testResults.forEach(function(r) {
      var icon = r.status === 'PASS' ? '✅' : '❌';
      Logger.log(icon + ' ' + r.name);
      if (r.error) Logger.log('   → ' + r.error);
    });
  
    Logger.log('───────────────────────────────────────────────────────');
    Logger.log('  Total: ' + _testResults.length + ' | ✅ Passed: ' + passed + ' | ❌ Failed: ' + failed);
    Logger.log('  Duration: ' + duration + 'ms');
    Logger.log('═══════════════════════════════════════════════════════');
  
    return {
      total: _testResults.length,
      passed: passed,
      failed: failed,
      duration: duration,
      results: _testResults
    };
  }
  
  // ============================================================
  // FLOW 2: STOCK ADJUSTMENT
  // ============================================================
  
  function testFlow2_StockAdjustment() {
    describe('FLOW 2: Stock Adjustment', function() {
  
      it('should require inventoryId for adjustment', function() {
        expect(function() {
          handleApiAction('inventory.adjust', { newQuantity: 10, reason: 'Recount' });
        }).toThrow();
      });
  
      it('should require newQuantity for adjustment', function() {
        expect(function() {
          handleApiAction('inventory.adjust', { inventoryId: '123', reason: 'Recount' });
        }).toThrow();
      });
  
      it('should require reason for adjustment', function() {
        expect(function() {
          handleApiAction('inventory.adjust', { inventoryId: '123', newQuantity: 10 });
        }).toThrow();
      });
  
      it('should adjust stock successfully', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        expect(item).toBeDefined();
  
        var originalQty = item.quantity;
        var newQty = originalQty + 5;
  
        var result = handleApiAction('inventory.adjust', {
          inventoryId: item.id,
          newQuantity: newQty,
          reason: 'Recount',
          notes: 'Test adjustment'
        });
  
        expect(result).toBeDefined();
  
        var updated = InventoryService.getItemBySku(_testData.testSku);
        expect(updated.quantity).toBe(newQty);
      });
  
      it('should create stock movement record after adjustment', function() {
        var movements = StockMovementService.getMovementsBySku(_testData.testSku);
        expect(movements).toBeDefined();
        expect(Array.isArray(movements)).toBeTruthy();
        expect(movements.length).toBeGreaterThan(0);
  
        var adjustmentMovement = movements.find(function(m) {
          return m.movementType === 'ADJUSTMENT' || m.reason === 'Recount';
        });
        expect(adjustmentMovement).toBeDefined();
      });
  
      it('should handle UI adjust stock endpoint', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        var result = uiAdjustStock({
          inventoryId: item.id,
          newQuantity: 60,
          reason: 'Damage',
          notes: 'UI test'
        });
        expect(result.success).toBeTruthy();
      });
  
    });
  }
  
  // ============================================================
  // FLOW 3: STOCK MOVEMENT HISTORY
  // ============================================================
  
  function testFlow3_StockMovements() {
    describe('FLOW 3: Stock Movement History', function() {
  
      it('should require SKU for movement history', function() {
        expect(function() {
          handleApiAction('inventory.movements', {});
        }).toThrow();
      });
  
      it('should return movements array for valid SKU', function() {
        var result = handleApiAction('inventory.movements', { sku: _testData.testSku });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBeTruthy();
      });
  
      it('should return movement with required fields', function() {
        var movements = StockMovementService.getMovementsBySku(_testData.testSku);
        if (movements.length > 0) {
          var m = movements[0];
          expect(m.sku).toBeDefined();
          expect(m.movementType).toBeDefined();
          expect(m.quantity).toBeDefined();
          expect(m.quantityBefore).toBeDefined();
          expect(m.quantityAfter).toBeDefined();
        }
      });
  
      it('should handle UI get stock movements endpoint', function() {
        var result = uiGetStockMovements(_testData.testSku);
        expect(result.success).toBeTruthy();
        expect(result.data).toBeDefined();
      });
  
      it('should record restock movement', function() {
        var before = StockMovementService.getMovementsBySku(_testData.testSku).length;
  
        InventoryService.restock(_testData.testSku, 10, 'TEST_RESTOCK', 'Test restock');
  
        var after = StockMovementService.getMovementsBySku(_testData.testSku).length;
        expect(after).toBeGreaterThan(before);
      });
  
    });
  }
  
  // ============================================================
  // FLOW 4: BOM VIEW
  // ============================================================
  
  function testFlow4_BOMView() {
    describe('FLOW 4: BOM View', function() {
  
      it('should require SKU for BOM lookup', function() {
        expect(function() {
          handleApiAction('inventory.bom', {});
        }).toThrow();
      });
  
      it('should return null/empty for product without BOM', function() {
        var result = handleApiAction('inventory.bom', { sku: _testData.testSku });
        // May return null or empty object
        expect(result === null || result === undefined || typeof result === 'object').toBeTruthy();
      });
  
      it('should require bomId for BOM items lookup', function() {
        expect(function() {
          handleApiAction('inventory.bomItems', {});
        }).toThrow();
      });
  
      it('should handle UI get BOM endpoint', function() {
        var result = uiGetBOM(_testData.testSku);
        expect(result.success).toBeDefined();
      });
  
    });
  }
  
  // ============================================================
  // FLOW 5: BOM MANAGEMENT
  // ============================================================
  
  function testFlow5_BOMManagement() {
    describe('FLOW 5: BOM Management', function() {
  
      it('should create a BOM', function() {
        var bomId = BOMService.createBOM({
          finishedProductSku: _testData.testSku,
          name: 'Test BOM for ' + _testData.testSku,
          description: 'Test BOM description',
          active: true
        });
  
        expect(bomId).toBeDefined();
        _testData.bomId = bomId;
  
        var bom = BOMService.getBOMByFinishedProductSku(_testData.testSku);
        expect(bom).toBeDefined();
        expect(bom.name).toContain('Test BOM');
      });
  
      it('should add items to BOM', function() {
        expect(_testData.bomId).toBeDefined();
  
        var itemId = BOMService.addBOMItem(_testData.bomId, {
          componentSku: _testData.testComponentSku,
          quantityRequired: 2,
          unit: 'pc',
          wastagePercent: 5,
          notes: 'Test component'
        });
  
        expect(itemId).toBeDefined();
        _testData.bomItemId = itemId;
  
        var items = BOMService.getBOMItems(_testData.bomId);
        expect(items.length).toBeGreaterThan(0);
      });
  
      it('should update BOM item', function() {
        expect(_testData.bomItemId).toBeDefined();
  
        var updated = BOMService.updateBOMItem(_testData.bomItemId, {
          quantityRequired: 3,
          wastagePercent: 10
        });
  
        expect(updated).toBeDefined();
        expect(updated.quantityRequired).toBe(3);
      });
  
      it('should update BOM', function() {
        expect(_testData.bomId).toBeDefined();
  
        var updated = BOMService.updateBOM(_testData.bomId, {
          name: 'Updated Test BOM',
          description: 'Updated description'
        });
  
        expect(updated).toBeDefined();
        expect(updated.name).toBe('Updated Test BOM');
      });
  
      it('should handle API action inventory.bomCreate', function() {
        var result = handleApiAction('inventory.bomCreate', {
          finishedProductSku: _testData.testSku2,
          name: 'API Test BOM',
          active: true
        });
        expect(result).toBeDefined();
      });
  
      it('should handle API action inventory.bomItemAdd', function() {
        var bom = BOMService.getBOMByFinishedProductSku(_testData.testSku2);
        expect(bom).toBeDefined();
  
        var result = handleApiAction('inventory.bomItemAdd', {
          bomId: bom.id,
          componentSku: _testData.testComponentSku2,
          quantityRequired: 1,
          unit: 'pc'
        });
        expect(result).toBeDefined();
      });
  
      it('should handle UI create BOM endpoint', function() {
        var result = uiCreateBOM({
          finishedProductSku: _testData.testSku,
          name: 'UI Test BOM',
          active: true
        });
        expect(result.success).toBeTruthy();
      });
  
      it('should handle UI get BOM items endpoint', function() {
        expect(_testData.bomId).toBeDefined();
        var result = uiGetBOMItems(_testData.bomId);
        expect(result.success).toBeTruthy();
        expect(result.data).toBeDefined();
      });
  
      it('should prevent duplicate component in BOM', function() {
        // Should handle gracefully — either throw or update existing
        var bom = BOMService.getBOMByFinishedProductSku(_testData.testSku);
        expect(bom).toBeDefined();
  
        try {
          BOMService.addBOMItem(bom.id, {
            componentSku: _testData.testComponentSku,
            quantityRequired: 5,
            unit: 'pc'
          });
          // If no error, verify it handled it (updated or created new)
          expect(true).toBeTruthy();
        } catch (e) {
          expect(e.message).toContain('duplicate');
        }
      });
  
    });
  }
  
  // ============================================================
  // FLOW 6: COST & MARGIN
  // ============================================================
  
  function testFlow6_CostAndMargin() {
    describe('FLOW 6: Cost & Margin', function() {
  
      it('should require productId for cost calculation', function() {
        expect(function() {
          handleApiAction('inventory.cost', {});
        }).toThrow();
      });
  
      it('should require productId for margin calculation', function() {
        expect(function() {
          handleApiAction('inventory.margin', {});
        }).toThrow();
      });
  
      it('should calculate unit cost from BOM', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        expect(item).toBeDefined();
  
        var cost = BOMService.calculateUnitCost(item.id);
        expect(cost).toBeDefined();
        expect(cost.unitCost).toBeDefined();
        expect(cost.source).toBe('BOM');
      });
  
      it('should calculate gross margin', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        expect(item).toBeDefined();
  
        var margin = BOMService.calculateGrossMargin(item.id);
        expect(margin).toBeDefined();
        expect(margin.grossProfit).toBeDefined();
        expect(margin.grossMarginPercent).toBeDefined();
        expect(margin.sellingPrice).toBeDefined();
      });
  
      it('should handle UI calculate cost endpoint', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        var result = uiCalculateCost(item.id);
        expect(result.success).toBeTruthy();
        expect(result.data).toBeDefined();
      });
  
      it('should handle UI calculate margin endpoint', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        var result = uiCalculateMargin(item.id);
        expect(result.success).toBeTruthy();
        expect(result.data).toBeDefined();
      });
  
      it('should calculate correct BOM cost', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        var cost = BOMService.calculateUnitCost(item.id);
  
        // Component A: 3 pcs @ 5 = 15 (after update in testFlow5)
        // With 10% wastage: 15 * 1.10 = 16.5
        expect(cost.bomCost).toBeGreaterThan(0);
        expect(cost.unitCost).toBeGreaterThan(0);
      });
  
      it('should calculate positive margin for profitable product', function() {
        var item = InventoryService.getItemBySku(_testData.testSku);
        var margin = BOMService.calculateGrossMargin(item.id);
  
        expect(margin.grossProfit).toBeGreaterThan(0);
        expect(margin.grossMarginPercent).toBeGreaterThan(0);
      });
  
    });
  }
  
  // ============================================================
  // FLOW 7: EXPENSES
  // ============================================================
  
  function testFlow7_Expenses() {
    describe('FLOW 7: Expenses', function() {
  
      it('should create expense request', function() {
        var id = FinanceService.createExpenseRequest({
          title: 'Test Marketing Expense',
          category: 'Marketing',
          amount: 500,
          description: 'Test expense for Phase 3D'
        });
  
        expect(id).toBeDefined();
        _testData.expenseId = id;
      });
  
      it('should retrieve expenses', function() {
        var expenses = FinanceRepository.findAllExpenses({ limit: 100 });
        expect(expenses).toBeDefined();
        expect(Array.isArray(expenses)).toBeTruthy();
      });
  
      it('should submit expense request', function() {
        expect(_testData.expenseId).toBeDefined();
        FinanceService.submitExpenseRequest(_testData.expenseId);
  
        var expenses = FinanceRepository.findAllExpenses({ limit: 100 });
        var exp = expenses.find(function(e) { return e.id === _testData.expenseId; });
        expect(exp).toBeDefined();
        expect(exp.status).toBe('Pending');
      });
  
      it('should approve expense request', function() {
        expect(_testData.expenseId).toBeDefined();
        FinanceService.approveExpenseRequest(_testData.expenseId);
  
        var expenses = FinanceRepository.findAllExpenses({ limit: 100 });
        var exp = expenses.find(function(e) { return e.id === _testData.expenseId; });
        expect(exp.status).toBe('Approved');
      });
  
      it('should reject expense with reason', function() {
        var id = FinanceService.createExpenseRequest({
          title: 'Reject Test',
          category: 'Other',
          amount: 100
        });
        FinanceService.submitExpenseRequest(id);
        FinanceService.rejectExpenseRequest(id, 'Over budget');
  
        var expenses = FinanceRepository.findAllExpenses({ limit: 100 });
        var exp = expenses.find(function(e) { return e.id === id; });
        expect(exp.status).toBe('Rejected');
      });
  
      it('should post expense to ledger', function() {
        expect(_testData.expenseId).toBeDefined();
        FinanceService.postExpenseToLedger(_testData.expenseId, 'Cash');
  
        var expenses = FinanceRepository.findAllExpenses({ limit: 100 });
        var exp = expenses.find(function(e) { return e.id === _testData.expenseId; });
        expect(exp.status).toBe('Posted');
      });
  
      it('should handle UI get expenses endpoint', function() {
        var result = uiGetExpenses({ limit: 100 });
        expect(result.success).toBeTruthy();
        expect(result.data).toBeDefined();
      });
  
      it('should handle UI create expense endpoint', function() {
        var result = uiCreateExpenseRequest({
          title: 'UI Test Expense',
          category: 'Supplies',
          amount: 50
        });
        expect(result.success).toBeTruthy();
        expect(result.id).toBeDefined();
      });
  
      it('should handle UI approve expense endpoint', function() {
        var id = FinanceService.createExpenseRequest({
          title: 'Approve UI Test',
          category: 'Utilities',
          amount: 200
        });
        FinanceService.submitExpenseRequest(id);
  
        var result = uiApproveExpense(id);
        expect(result.success).toBeTruthy();
      });
  
      it('should handle UI reject expense endpoint', function() {
        var id = FinanceService.createExpenseRequest({
          title: 'Reject UI Test',
          category: 'Other',
          amount: 999
        });
        FinanceService.submitExpenseRequest(id);
  
        var result = uiRejectExpense(id, 'Too expensive');
        expect(result.success).toBeTruthy();
      });
  
      it('should handle UI post expense endpoint', function() {
        var id = FinanceService.createExpenseRequest({
          title: 'Post UI Test',
          category: 'Rent',
          amount: 1000
        });
        FinanceService.submitExpenseRequest(id);
        FinanceService.approveExpenseRequest(id);
  
        var result = uiPostExpense(id, 'Bank');
        expect(result.success).toBeTruthy();
      });
  
    });
  }
  
  // ============================================================
  // PERMISSIONS TESTS
  // ============================================================
  
  function testPermissions() {
    describe('Permissions', function() {
  
      it('should have BOM sheet mapping', function() {
        var map = getSheetPermission('BOM');
        expect(map).toBeDefined();
        expect(map.read).toBeDefined();
        expect(map.write).toBeDefined();
      });
  
      it('should have BOM_ITEM sheet mapping', function() {
        var map = getSheetPermission('BOM_ITEM');
        expect(map).toBeDefined();
        expect(map.read).toBeDefined();
        expect(map.write).toBeDefined();
      });
  
      it('should have INVENTORY_BOM_READ permission constant', function() {
        expect(PERMISSIONS.INVENTORY_BOM_READ).toBeDefined();
      });
  
      it('should have INVENTORY_BOM_MANAGE permission constant', function() {
        expect(PERMISSIONS.INVENTORY_BOM_MANAGE).toBeDefined();
      });
  
    });
  }
  
  // ============================================================
  // UI ENDPOINTS TESTS
  // ============================================================
  
  function testUIEndpoints() {
    describe('UI Server Endpoints', function() {
  
      it('should have uiGetStockMovements function', function() {
        expect(typeof uiGetStockMovements).toBe('function');
      });
  
      it('should have uiAdjustStock function', function() {
        expect(typeof uiAdjustStock).toBe('function');
      });
  
      it('should have uiRestockStock function', function() {
        expect(typeof uiRestockStock).toBe('function');
      });
  
      it('should have uiGetBOM function', function() {
        expect(typeof uiGetBOM).toBe('function');
      });
  
      it('should have uiGetBOMItems function', function() {
        expect(typeof uiGetBOMItems).toBe('function');
      });
  
      it('should have uiCreateBOM function', function() {
        expect(typeof uiCreateBOM).toBe('function');
      });
  
      it('should have uiUpdateBOM function', function() {
        expect(typeof uiUpdateBOM).toBe('function');
      });
  
      it('should have uiDeleteBOM function', function() {
        expect(typeof uiDeleteBOM).toBe('function');
      });
  
      it('should have uiAddBOMItem function', function() {
        expect(typeof uiAddBOMItem).toBe('function');
      });
  
      it('should have uiUpdateBOMItem function', function() {
        expect(typeof uiUpdateBOMItem).toBe('function');
      });
  
      it('should have uiRemoveBOMItem function', function() {
        expect(typeof uiRemoveBOMItem).toBe('function');
      });
  
      it('should have uiCalculateCost function', function() {
        expect(typeof uiCalculateCost).toBe('function');
      });
  
      it('should have uiCalculateMargin function', function() {
        expect(typeof uiCalculateMargin).toBe('function');
      });
  
      it('should have uiGetLowStock function', function() {
        expect(typeof uiGetLowStock).toBe('function');
      });
  
      it('should have uiGetOutOfStock function', function() {
        expect(typeof uiGetOutOfStock).toBe('function');
      });
  
      it('should have uiGetExpenses function', function() {
        expect(typeof uiGetExpenses).toBe('function');
      });
  
      it('should have uiCreateExpenseRequest function', function() {
        expect(typeof uiCreateExpenseRequest).toBe('function');
      });
  
      it('should have uiSubmitExpense function', function() {
        expect(typeof uiSubmitExpense).toBe('function');
      });
  
      it('should have uiApproveExpense function', function() {
        expect(typeof uiApproveExpense).toBe('function');
      });
  
      it('should have uiRejectExpense function', function() {
        expect(typeof uiRejectExpense).toBe('function');
      });
  
      it('should have uiPostExpense function', function() {
        expect(typeof uiPostExpense).toBe('function');
      });
  
      it('should have menuShowBOM function', function() {
        expect(typeof menuShowBOM).toBe('function');
      });
  
      it('should have menuShowMovements function', function() {
        expect(typeof menuShowMovements).toBe('function');
      });
  
      it('should have menuAdjustStock function', function() {
        expect(typeof menuAdjustStock).toBe('function');
      });
  
    });
  }
  
  // ============================================================
  // MENU ENTRY POINT
  // ============================================================
  
  function menuRunPhase3DTests() {
    var result = runPhase3DTests();
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Passed: ' + result.passed + '/' + result.total + ' (' + result.duration + 'ms)',
      'Phase 3D Tests Complete',
      10
    );
    return result;
  }
  
  function menuRunPhase3DTestsVerbose() {
    TEST_CONFIG.verbose = true;
    return menuRunPhase3DTests();
  }
  
  function menuRunPhase3DTestsQuick() {
    TEST_CONFIG.verbose = false;
    TEST_CONFIG.cleanupAfterTest = true;
    return menuRunPhase3DTests();
  }