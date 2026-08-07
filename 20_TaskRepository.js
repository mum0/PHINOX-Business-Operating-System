/**
 * Task Repository
 * Data access layer for Tasks. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 */

const TaskRepository = (function() {
  'use strict';

  // Ensure schema is loaded
  if (typeof TaskSchema === 'undefined') {
    throw new Error('TaskSchema must be loaded before TaskRepository');
  }

  const repo = BaseRepository.create(
    CONFIG.SHEETS.TASKS,
    TaskSchema.SCHEMA,
    { eventName: 'task' }
  );

  return {
    findById: function(id) {
      return repo.findById(id);
    },
    findAll: function(options) {
      return repo.findAll(options);
    },
    findOne: function(predicate) {
      return repo.findOne(predicate);
    },
    create: function(data) {
      return repo.create(data);
    },
    update: function(id, updates) {
      return repo.update(id, updates);
    },
    delete: function(id) {
      return repo.delete(id);
    },
    count: function() {
      return repo.count();
    },
    buildIndex: function() {
      return repo.buildIndex();
    }
  };
})();