/**
 * Marketing Service
 * Business logic for Marketing Spend data
 * Phase 7C - PHINOX BOS v5
 */

const MktService = (function() {
  'use strict';

  function _now() { return new Date(); }
  function _toNumber(v, def) { var n = Number(v); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
  function _generateId() { return 'MKT-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }
  function _clamp(num, min, max) { return Math.min(Math.max(num, min), max); }

  function _validateRecord(data, isUpdate) {
    var schema = {};
    var fields = isUpdate ? Object.keys(data) : Object.keys(MktSchema.VALIDATION);
    fields.forEach(function(f) {
      if (MktSchema.VALIDATION[f]) schema[f] = MktSchema.VALIDATION[f];
    });
    if (!isUpdate) {
      var defaults = MktSchema.getDefaultRecord();
      Object.keys(defaults).forEach(function(k) {
        if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
      });
    }
    return Validator.validate(data, schema, 'MktService');
  }

  function _normalizeRecord(data) {
    var record = {};

    if (data.date) {
      var d = new Date(data.date);
      if (!isNaN(d.getTime())) record.date = d.toISOString().split('T')[0];
      else record.date = data.date;
    }

    var numericFields = ['spend','impressions','reach','clicks','leads','conversions','attributedRevenue','creativeCost','agencyCost','otherCost'];
    numericFields.forEach(function(f) {
      if (data[f] !== undefined && data[f] !== '') {
        var n = Number(String(data[f]).replace(/,/g, ''));
        record[f] = isNaN(n) ? 0 : _round(n, 2);
      }
    });

    var stringFields = ['platform','channel','campaignId','campaignName','currency','notes'];
    stringFields.forEach(function(f) {
      if (data[f] !== undefined) record[f] = String(data[f]).trim();
    });

    return record;
  }

  // ============ CRUD ============

  function createRecord(data) {
    var record = Utils.clone(data);
    if (!record.id) record.id = _generateId();
    record = _normalizeRecord(record);
    _validateRecord(record, false);
    var created = MktRepository.create(record);
    Logger.info('MktService', 'Marketing record created', { id: created.id, platform: created.platform, spend: created.spend });
    return created.id;
  }

  function getRecord(id) { return id ? MktRepository.findById(id) : null; }
  function getRecords(options) { return MktRepository.findAll(options); }

  function updateRecord(id, updates) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'MktService');
    var existing = MktRepository.findById(id);
    if (!existing) throw ErrorHandler.notFound('Marketing record', id, 'MktService');
    var data = Utils.clone(updates);
    delete data.id; delete data.createdAt; delete data.createdBy;
    data = _normalizeRecord(data);
    if (Object.keys(data).length > 0) _validateRecord(data, true);
    var updated = MktRepository.update(id, data);
    Logger.info('MktService', 'Marketing record updated', { id: id });
    return updated;
  }

  function deleteRecord(id) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'MktService');
    MktRepository.delete(id);
    Logger.info('MktService', 'Marketing record deleted', { id: id });
    return true;
  }

  // ============ AGGREGATION ============

  function getTotalSpend(startDate, endDate) {
    return _round(MktRepository.sumByDateRange(startDate, endDate, 'spend'), 2);
  }
  function getTotalImpressions(startDate, endDate) {
    return Math.round(MktRepository.sumByDateRange(startDate, endDate, 'impressions'));
  }
  function getTotalReach(startDate, endDate) {
    return Math.round(MktRepository.sumByDateRange(startDate, endDate, 'reach'));
  }
  function getTotalClicks(startDate, endDate) {
    return Math.round(MktRepository.sumByDateRange(startDate, endDate, 'clicks'));
  }
  function getTotalLeads(startDate, endDate) {
    return Math.round(MktRepository.sumByDateRange(startDate, endDate, 'leads'));
  }
  function getTotalConversions(startDate, endDate) {
    return Math.round(MktRepository.sumByDateRange(startDate, endDate, 'conversions'));
  }
  function getTotalAttributedRevenue(startDate, endDate) {
    return _round(MktRepository.sumByDateRange(startDate, endDate, 'attributedRevenue'), 2);
  }
  function getTotalCreativeCost(startDate, endDate) {
    return _round(MktRepository.sumByDateRange(startDate, endDate, 'creativeCost'), 2);
  }
  function getTotalAgencyCost(startDate, endDate) {
    return _round(MktRepository.sumByDateRange(startDate, endDate, 'agencyCost'), 2);
  }
  function getTotalOtherCost(startDate, endDate) {
    return _round(MktRepository.sumByDateRange(startDate, endDate, 'otherCost'), 2);
  }
  function getTotalCost(startDate, endDate) {
    return _round(
      getTotalSpend(startDate, endDate) +
      getTotalCreativeCost(startDate, endDate) +
      getTotalAgencyCost(startDate, endDate) +
      getTotalOtherCost(startDate, endDate), 2);
  }
  function getTotalAcquisitionCost(startDate, endDate) {
    return getTotalCost(startDate, endDate);
  }

  // ============ CSV IMPORT ============

  function _parseCsvLine(line) {
    var result = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function _parseCsv(csvText) {
    var lines = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
    if (lines.length < 2) throw new Error('CSV must have header and at least one data row');
    var headers = _parseCsvLine(lines[0]).map(function(h) { return h.trim().toLowerCase().replace(/\s+/g, ''); });
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var values = _parseCsvLine(lines[i]);
      var row = {};
      headers.forEach(function(h, idx) {
        row[h] = values[idx] !== undefined ? values[idx].trim() : '';
      });
      rows.push(row);
    }
    return { headers: headers, rows: rows };
  }

  function _mapCsvRow(row, headers) {
    var mapped = {};
    var headerMap = {
      'date': ['date','day','timestamp','time'],
      'platform': ['platform','source','network','channel'],
      'channel': ['channel','medium','placement'],
      'campaignid': ['campaignid','campaign_id','campaign','campid'],
      'campaignname': ['campaignname','campaign_name','name'],
      'currency': ['currency','curr'],
      'spend': ['spend','cost','amount','adspend','ad_spend','spend_egp'],
      'impressions': ['impressions','imps','impr'],
      'reach': ['reach','uniqueimpressions'],
      'clicks': ['clicks','click'],
      'leads': ['leads','lead','leadcount'],
      'conversions': ['conversions','conversions','conv','conversion'],
      'attributedrevenue': ['attributedrevenue','attributed_revenue','revenue','rev','sales'],
      'creativecost': ['creativecost','creative_cost','creative'],
      'agencycost': ['agencycost','agency_cost','agency'],
      'othercost': ['othercost','other_cost','other'],
      'notes': ['notes','note','comment','description']
    };

    Object.keys(headerMap).forEach(function(field) {
      headerMap[field].forEach(function(alias) {
        if (row[alias] !== undefined && row[alias] !== '' && mapped[field] === undefined) {
          mapped[field] = row[alias];
        }
      });
    });

    return mapped;
  }

  function importFromCsv(csvText) {
    var parsed = _parseCsv(csvText);
    var imported = 0;
    var rejected = [];

    parsed.rows.forEach(function(row, idx) {
      try {
        var mapped = _mapCsvRow(row, parsed.headers);
        if (!mapped.date) throw new Error('Date is required');
        if (!mapped.platform) throw new Error('Platform is required');
        createRecord(mapped);
        imported++;
      } catch (e) {
        rejected.push({ row: idx + 2, error: e.message });
      }
    });

    Logger.info('MktService', 'CSV import complete', { imported: imported, rejected: rejected.length });
    return { imported: imported, rejected: rejected, total: parsed.rows.length };
  }

  // ============ SHEET ENSURE ============

  function ensureSheetExists() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(MktSchema.SHEET_NAME);
    if (sheet) return true;
    sheet = ss.insertSheet(MktSchema.SHEET_NAME);
    sheet.appendRow(MktSchema.getHeaders());
    var headerRange = sheet.getRange(1, 1, 1, MktSchema.getHeaders().length);
    headerRange.setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff').setHorizontalAlignment('center');
    MktSchema.getWidths().forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
    sheet.setFrozenRows(1);
    Logger.info('MktService', 'Sheet created', { name: MktSchema.SHEET_NAME });
    return true;
  }

  return {
    createRecord: createRecord,
    getRecord: getRecord,
    getRecords: getRecords,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    getTotalSpend: getTotalSpend,
    getTotalImpressions: getTotalImpressions,
    getTotalReach: getTotalReach,
    getTotalClicks: getTotalClicks,
    getTotalLeads: getTotalLeads,
    getTotalConversions: getTotalConversions,
    getTotalAttributedRevenue: getTotalAttributedRevenue,
    getTotalCreativeCost: getTotalCreativeCost,
    getTotalAgencyCost: getTotalAgencyCost,
    getTotalOtherCost: getTotalOtherCost,
    getTotalCost: getTotalCost,
    getTotalAcquisitionCost: getTotalAcquisitionCost,
    importFromCsv: importFromCsv,
    ensureSheetExists: ensureSheetExists
  };
})();
