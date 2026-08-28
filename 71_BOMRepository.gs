/**
 * BOM Repository
 * Data access layer for BOM headers. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 * PHASE 3C
 */

const BOMRepository = (function() {
    'use strict';
  
    if (typeof BOMSchema === 'undefined') {
      throw new Error('BOMSchema must be loaded before BOMRepository');
    }
  
    const repo = BaseRepository.create(
      'BOM', BOMSchema.SCHEMA, { eventName: 'bom' }
    );
  
    return {
      findById: function(id) { return repo.findById(id); },
      findByFinishedProductSku: function(sku) {
        return repo.findOne(function(item) {
          return item.finishedProductSku === sku && item.active === true;
        });
      },
      findAllByFinishedProductSku: function(sku) {
        return repo.findAll({
          limit: CONFIG.PAGINATION.MAX_LIMIT,
          where: function(item) { return item.finishedProductSku === sku; }
        });
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