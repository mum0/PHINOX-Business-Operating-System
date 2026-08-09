/**
 * Order Repository
 * Data access layer for Orders. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 */

const OrderRepository = (function() {
  'use strict';

  if (typeof OrderSchema === 'undefined') {
    throw new Error('OrderSchema must be loaded before OrderRepository');
  }

  const repo = BaseRepository.create(
    'Orders',
    OrderSchema.SCHEMA,
    { eventName: 'order' }
  );

  return {
    findById: function(id) { return repo.findById(id); },
    findAll: function(options) { return repo.findAll(options); },
    findOne: function(predicate) { return repo.findOne(predicate); },
    create: function(data) { return repo.create(data); },
    update: function(id, updates) { return repo.update(id, updates); },
    delete: function(id) { return repo.delete(id); },
    count: function() { return repo.count(); },
    buildIndex: function() { return repo.buildIndex(); }
  };
})();
