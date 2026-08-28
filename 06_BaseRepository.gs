/**
 * Base Repository
 * Abstracts Google Sheets as a relational store.
 * ONLY file that touches SpreadsheetApp.
 * 
 * Migration path: Replace this file with PostgreSQL adapter.
 */

const BaseRepository = (function() {
    'use strict';
    
    function Repository(sheetName, schema, options) {
      this.sheetName = sheetName;
      this.schema = schema;
      this.options = Object.assign({
        idField: 'id',
        timestamps: true,
        audit: true,
        eventName: null
      }, options || {});
      
      this._index = null;
      this._indexBuilt = false;
      
      Logger.debug('BaseRepository', 'Initialized for ' + sheetName);
    }
    
    // ============ INTERNAL ============
    
    Repository.prototype._getSpreadsheet = function() {
      if (CONFIG.SPREADSHEET.ID) {
        return SpreadsheetApp.openById(CONFIG.SPREADSHEET.ID);
      }
      return SpreadsheetApp.getActiveSpreadsheet();
    };
    
    Repository.prototype._getSheet = function() {
      const ss = this._getSpreadsheet();
      const sheet = ss.getSheetByName(this.sheetName);
      
      if (!sheet) {
        throw ErrorHandler.notFound('Sheet', this.sheetName, 'BaseRepository');
      }
      return sheet;
    };
    
    Repository.prototype.buildIndex = function() {
      if (this._indexBuilt) return this._index;
      
      const sheet = this._getSheet();
      const lastRow = sheet.getLastRow();
      
      if (lastRow < 2) {
        this._index = {};
        this._indexBuilt = true;
        return this._index;
      }
      
      const idCol = this.schema[this.options.idField];
      if (!idCol) {
        throw ErrorHandler.system(
          'ID field not found in schema: ' + this.options.idField,
          { schema: this.schema },
          'BaseRepository'
        );
      }
      
      const idRange = sheet.getRange(2, idCol, lastRow - 1, 1);
      const idValues = idRange.getValues();
      
      this._index = {};
      for (let i = 0; i < idValues.length; i++) {
        const id = idValues[i][0];
        if (id) {
          this._index[id] = i + 2;
        }
      }
      
      this._indexBuilt = true;
      Logger.debug('BaseRepository', 'Index built for ' + this.sheetName + ': ' + Object.keys(this._index).length + ' records');
      return this._index;
    };
    
    Repository.prototype._invalidateIndex = function() {
      this._index = null;
      this._indexBuilt = false;
    };
    
    Repository.prototype._rowToObject = function(rowArray) {
      const obj = {};
      Object.keys(this.schema).forEach(function(field) {
        const colIndex = this.schema[field] - 1;
        if (colIndex >= 0 && colIndex < rowArray.length) {
          obj[field] = rowArray[colIndex];
        }
      }, this);
      return obj;
    };
    
    Repository.prototype._objectToRow = function(obj) {
      const maxCol = Math.max.apply(null, Object.values(this.schema));
      const row = new Array(maxCol).fill('');
      
      Object.keys(this.schema).forEach(function(field) {
        const colIndex = this.schema[field] - 1;
        if (obj.hasOwnProperty(field)) {
          let value = obj[field];
          if (value instanceof Date) {
            value = value.toISOString();
          }
          row[colIndex] = value;
        }
      }, this);
      
      return row;
    };
    
    Repository.prototype._applyMeta = function(obj, isNew) {
      const now = new Date();
      
      if (this.options.timestamps) {
        if (isNew) obj.createdAt = now;
        obj.updatedAt = now;
      }
      
      if (this.options.audit && isNew) {
        try {
          obj.createdBy = Session.getActiveUser().getEmail();
        } catch (e) {
          obj.createdBy = 'system';
        }
      }
      
      return obj;
    };
    
    // ============ CRUD ============
    
    Repository.prototype.findById = function(id) {
      if (!id) return null;
      
      if (this._indexBuilt && this._index) {
        const rowNum = this._index[id];
        if (rowNum) {
          const sheet = this._getSheet();
          const rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
          return this._rowToObject(rowData);
        }
        return null;
      }
      
      this.buildIndex();
      return this.findById(id);
    };
    
    Repository.prototype.findAll = function(options) {
      options = options || {};
      const limit = Math.min(options.limit || CONFIG.PAGINATION.DEFAULT_LIMIT, CONFIG.PAGINATION.MAX_LIMIT);
      const offset = options.offset || 0;
      
      const sheet = this._getSheet();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      if (lastRow < 2) return { data: [], total: 0, limit: limit, offset: offset };
      
      const startRow = 2 + offset;
      const numRows = Math.min(limit, lastRow - startRow + 1);
      
      if (numRows <= 0) return { data: [], total: lastRow - 1, limit: limit, offset: offset };
      
      const range = sheet.getRange(startRow, 1, numRows, lastCol);
      const rows = range.getValues();
      
      let results = rows.map(function(row) { return this._rowToObject(row); }, this);
      
      if (options.where && typeof options.where === 'function') {
        results = results.filter(options.where);
      }
      
      return {
        data: results,
        total: lastRow - 1,
        limit: limit,
        offset: offset,
        hasMore: (offset + limit) < (lastRow - 1)
      };
    };
    
    Repository.prototype.findOne = function(predicate) {
      const result = this.findAll({ limit: 1000, where: predicate });
      return result.data.length > 0 ? result.data[0] : null;
    };
    
    Repository.prototype.create = function(data) {
      if (!data[this.options.idField]) {
        data[this.options.idField] = Utils.generateId();
      }
      
      const existing = this.findById(data[this.options.idField]);
      if (existing) {
        throw ErrorHandler.conflict(
          'Record already exists: ' + data[this.options.idField],
          { id: data[this.options.idField] },
          'BaseRepository'
        );
      }
      
      data = this._applyMeta(data, true);
      
      const sheet = this._getSheet();
      const row = this._objectToRow(data);
      sheet.appendRow(row);
      
      this._invalidateIndex();
      Logger.info('BaseRepository', 'Created in ' + this.sheetName, { id: data[this.options.idField] });
      
      if (this.options.eventName) {
        EventBus.emit(this.options.eventName + ':created', data);
      }
      
      return data;
    };
    
    Repository.prototype.update = function(id, updates) {
      if (!id) throw ErrorHandler.validation('ID required for update', {}, 'BaseRepository');
      
      this.buildIndex();
      const rowNum = this._index[id];
      
      if (!rowNum) {
        throw ErrorHandler.notFound(this.sheetName, id, 'BaseRepository');
      }
      
      const sheet = this._getSheet();
      const existingRow = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
      const existing = this._rowToObject(existingRow);
      
      var updated = Object.assign({}, existing, updates);
      updated[this.options.idField] = id;
      updated = this._applyMeta(updated, false);
      
      const newRow = this._objectToRow(updated);
      sheet.getRange(rowNum, 1, 1, newRow.length).setValues([newRow]);
      
      this._invalidateIndex();
      Logger.info('BaseRepository', 'Updated in ' + this.sheetName, { id: id });
      
      if (this.options.eventName) {
        EventBus.emit(this.options.eventName + ':updated', updated);
      }
      
      return updated;
    };
    
    Repository.prototype.delete = function(id) {
      if (!id) throw ErrorHandler.validation('ID required for delete', {}, 'BaseRepository');
      
      this.buildIndex();
      const rowNum = this._index[id];
      
      if (!rowNum) {
        throw ErrorHandler.notFound(this.sheetName, id, 'BaseRepository');
      }
      
      const sheet = this._getSheet();
      sheet.deleteRow(rowNum);
      
      this._invalidateIndex();
      Logger.info('BaseRepository', 'Deleted from ' + this.sheetName, { id: id });
      
      if (this.options.eventName) {
        EventBus.emit(this.options.eventName + ':deleted', { id: id });
      }
      
      return true;
    };
    
    // ============ BATCH ============
    
    Repository.prototype.batchCreate = function(records) {
      if (!Array.isArray(records) || records.length === 0) return [];
      
      const batchSize = CONFIG.PERFORMANCE.BATCH_SIZE;
      const created = [];
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const rows = [];
        
        batch.forEach(function(data) {
          if (!data[this.options.idField]) {
            data[this.options.idField] = Utils.generateId();
          }
          data = this._applyMeta(data, true);
          rows.push(this._objectToRow(data));
          created.push(data);
        }, this);
        
        const sheet = this._getSheet();
        const startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
      }
      
      this._invalidateIndex();
      Logger.info('BaseRepository', 'Batch created ' + created.length + ' in ' + this.sheetName);
      return created;
    };
    
    Repository.prototype.count = function() {
      const sheet = this._getSheet();
      return Math.max(0, sheet.getLastRow() - 1);
    };
    
    return {
      create: function(sheetName, schema, options) {
        return new Repository(sheetName, schema, options);
      }
    };
  })();