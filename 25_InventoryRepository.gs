/**
 * Inventory Repository
 * Data access layer for Inventory. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 */

const InventoryRepository = (function() {
    'use strict';
  
    if (typeof InventorySchema === 'undefined') {
      throw new Error('InventorySchema must be loaded before InventoryRepository');
    }
  
    const repo = BaseRepository.create(
      'Inventory',
      InventorySchema.SCHEMA,
      { eventName: 'inventory' }
    );
  
    return {
      findById: function(id) { return repo.findById(id); },
      findBySku: function(sku) {
        return repo.findOne(function(item) { return item.sku === sku; });
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