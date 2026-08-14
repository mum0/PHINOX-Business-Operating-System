/**
 * Stock Movement Repository
 * Data access layer for StockMovement. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 */

const StockMovementRepository = (function() {
  'use strict';

  if (typeof StockMovementSchema === 'undefined') {
    throw new Error('StockMovementSchema must be loaded before StockMovementRepository');
  }

  const repo = BaseRepository.create(
    'StockMovement', StockMovementSchema.SCHEMA, { eventName: 'stockMovement' }
  );

  return {
    findById: function(id) { return repo.findById(id); },
    findByInventoryId: function(inventoryId) {
      return repo.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(item) { return item.inventoryId === inventoryId; } });
    },
    findBySku: function(sku) {
      return repo.findAll({ limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(item) { return item.sku === sku; } });
    },
    findAll: function(options) { return repo.findAll(options); },
    findOne: function(predicate) { return repo.findOne(predicate); },
    create: function(data) { return repo.create(data); },
    update: function(id, updates) { return repo.update(id, updates); },
    delete: function(id) { return repo.delete(id); },
    count: function() { return repo.count(); },
    buildIndex: function() { return repo.buildIndex(); }
  };
})();
