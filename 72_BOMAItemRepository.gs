/**
 * BOM Item Repository
 * Data access layer for BOM items. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 * PHASE 3C
 */

const BOMAItemRepository = (function() {
    'use strict';
  
    if (typeof BOMAItemSchema === 'undefined') {
      throw new Error('BOMAItemSchema must be loaded before BOMAItemRepository');
    }
  
    const repo = BaseRepository.create(
      'BOM_ITEM', BOMAItemSchema.SCHEMA, { eventName: 'bomItem' }
    );
  
    return {
      findById: function(id) { return repo.findById(id); },
      findByBomId: function(bomId) {
        return repo.findAll({
          limit: CONFIG.PAGINATION.MAX_LIMIT,
          where: function(item) { return item.bomId === bomId; }
        });
      },
      findActiveByBomId: function(bomId) {
        return repo.findAll({
          limit: CONFIG.PAGINATION.MAX_LIMIT,
          where: function(item) { return item.bomId === bomId && item.active === true; }
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