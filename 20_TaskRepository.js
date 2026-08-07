/**
 * Task Repository
 * Data access layer for Tasks. Extends BaseRepository.
 * NO business logic. NO SpreadsheetApp outside BaseRepository.
 */

const TaskRepository = (function() {
    'use strict';
    
    const instance = BaseRepository.create(
      CONFIG.SHEETS.TASKS,
      TaskSchema.SCHEMA,
      {
        idField: 'id',
        timestamps: true,
        audit: true,
        eventName: 'task'
      }
    );
    
    return instance;
  })();