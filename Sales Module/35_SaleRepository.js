/**
 * Sale Repository
 * Data access layer for Sales. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 */

const SaleRepository = (function() {
  'use strict';

  if (typeof SaleSchema === 'undefined') {
    throw new Error('SaleSchema must be loaded before SaleRepository');
  }

  const repo = BaseRepository.create(
    'Sales',
    SaleSchema.SCHEMA,
    { eventName: 'sale' }
  );

  return {
    findById: function(id) { return repo.findById(id); },
    findByOrderId: function(orderId) {
      return repo.findOne(function(sale) { return sale.orderId === orderId; });
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
