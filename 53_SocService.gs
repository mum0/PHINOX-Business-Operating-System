/**
 * Social Media Service
 * Business logic for Social Media Performance data
 * Phase 7C - PHINOX BOS v5
 */

const SocService = (function() {
  'use strict';

  function _now() { return new Date(); }
  function _toNumber(v, def) { var n = Number(v); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
  function _generateId() { return 'SOC-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

  function _validateRecord(data, isUpdate) {
    var schema = {};
    var fields = isUpdate ? Object.keys(data) : Object.keys(SocSchema.VALIDATION);
    fields.forEach(function(f) {
      if (SocSchema.VALIDATION[f]) schema[f] = SocSchema.VALIDATION[f];
    });
    if (!isUpdate) {
      var defaults = SocSchema.getDefaultRecord();
      Object.keys(defaults).forEach(function(k) {
        if (data[k] === undefined || data[k] === null || data[k] === '') data[k] = defaults[k];
      });
    }
    return Validator.validate(data, schema, 'SocService');
  }

  function _normalizeRecord(data) {
    var record = {};

    if (data.date) {
      var d = new Date(data.date);
      if (!isNaN(d.getTime())) record.date = d.toISOString().split('T')[0];
      else record.date = data.date;
    }

    var numericFields = ['followers','followerGrowth','reach','impressions','engagements','likes','comments','shares','saves','videoViews','watchTime','profileVisits','linkClicks','leads','purchases','attributedRevenue'];
    numericFields.forEach(function(f) {
      if (data[f] !== undefined && data[f] !== '') {
        var n = Number(String(data[f]).replace(/,/g, ''));
        record[f] = isNaN(n) ? 0 : _round(n, 2);
      }
    });

    var stringFields = ['platform','notes'];
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
    var created = SocRepository.create(record);
    Logger.info('SocService', 'Social record created', { id: created.id, platform: created.platform, followers: created.followers });
    return created.id;
  }

  function getRecord(id) { return id ? SocRepository.findById(id) : null; }
  function getRecords(options) { return SocRepository.findAll(options); }

  function updateRecord(id, updates) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'SocService');
    var existing = SocRepository.findById(id);
    if (!existing) throw ErrorHandler.notFound('Social record', id, 'SocService');
    var data = Utils.clone(updates);
    delete data.id; delete data.createdAt; delete data.createdBy;
    data = _normalizeRecord(data);
    if (Object.keys(data).length > 0) _validateRecord(data, true);
    var updated = SocRepository.update(id, data);
    Logger.info('SocService', 'Social record updated', { id: id });
    return updated;
  }

  function deleteRecord(id) {
    if (!id) throw ErrorHandler.validation('ID required', {}, 'SocService');
    SocRepository.delete(id);
    Logger.info('SocService', 'Social record deleted', { id: id });
    return true;
  }

  // ============ AGGREGATION ============

  function getTotalReach(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'reach'));
  }
  function getTotalImpressions(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'impressions'));
  }
  function getTotalEngagements(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'engagements'));
  }
  function getTotalLikes(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'likes'));
  }
  function getTotalComments(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'comments'));
  }
  function getTotalShares(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'shares'));
  }
  function getTotalSaves(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'saves'));
  }
  function getTotalVideoViews(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'videoViews'));
  }
  function getTotalWatchTime(startDate, endDate) {
    return _round(SocRepository.sumByDateRange(startDate, endDate, 'watchTime'), 2);
  }
  function getTotalProfileVisits(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'profileVisits'));
  }
  function getTotalLinkClicks(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'linkClicks'));
  }
  function getTotalLeads(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'leads'));
  }
  function getTotalPurchases(startDate, endDate) {
    return Math.round(SocRepository.sumByDateRange(startDate, endDate, 'purchases'));
  }
  function getTotalAttributedRevenue(startDate, endDate) {
    return _round(SocRepository.sumByDateRange(startDate, endDate, 'attributedRevenue'), 2);
  }

  // Point-in-time: latest followers value within or before period
  function getFollowersAtDate(date) {
    var record = SocRepository.getLatestBeforeDate(date, 'followers');
    return record ? _toNumber(record.followers) : 0;
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
      'date': ['date','day','timestamp'],
      'platform': ['platform','source','network'],
      'followers': ['followers','follower_count','followercount'],
      'followergrowth': ['followergrowth','follower_growth','growth'],
      'reach': ['reach','organicreach','organic_reach'],
      'impressions': ['impressions','organicimpressions','organic_impressions'],
      'engagements': ['engagements','engagement','totalengagements'],
      'likes': ['likes','like'],
      'comments': ['comments','comment'],
      'shares': ['shares','share'],
      'saves': ['saves','save'],
      'videoviews': ['videoviews','video_views','views'],
      'watchtime': ['watchtime','watch_time','totalwatchtime'],
      'profilevisits': ['profilevisits','profile_visits','visits'],
      'linkclicks': ['linkclicks','link_clicks','clicks'],
      'leads': ['leads','lead'],
      'purchases': ['purchases','purchase','socialpurchases'],
      'attributedrevenue': ['attributedrevenue','attributed_revenue','revenue','sales'],
      'notes': ['notes','note','description']
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

    Logger.info('SocService', 'CSV import complete', { imported: imported, rejected: rejected.length });
    return { imported: imported, rejected: rejected, total: parsed.rows.length };
  }

  // ============ SHEET ENSURE ============

  function ensureSheetExists() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SocSchema.SHEET_NAME);
    if (sheet) return true;
    sheet = ss.insertSheet(SocSchema.SHEET_NAME);
    sheet.appendRow(SocSchema.getHeaders());
    var headerRange = sheet.getRange(1, 1, 1, SocSchema.getHeaders().length);
    headerRange.setFontWeight('bold').setBackground('#1a237e').setFontColor('#ffffff').setHorizontalAlignment('center');
    SocSchema.getWidths().forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });
    sheet.setFrozenRows(1);
    Logger.info('SocService', 'Sheet created', { name: SocSchema.SHEET_NAME });
    return true;
  }

  return {
    createRecord: createRecord,
    getRecord: getRecord,
    getRecords: getRecords,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord,
    getTotalReach: getTotalReach,
    getTotalImpressions: getTotalImpressions,
    getTotalEngagements: getTotalEngagements,
    getTotalLikes: getTotalLikes,
    getTotalComments: getTotalComments,
    getTotalShares: getTotalShares,
    getTotalSaves: getTotalSaves,
    getTotalVideoViews: getTotalVideoViews,
    getTotalWatchTime: getTotalWatchTime,
    getTotalProfileVisits: getTotalProfileVisits,
    getTotalLinkClicks: getTotalLinkClicks,
    getTotalLeads: getTotalLeads,
    getTotalPurchases: getTotalPurchases,
    getTotalAttributedRevenue: getTotalAttributedRevenue,
    getFollowersAtDate: getFollowersAtDate,
    importFromCsv: importFromCsv,
    ensureSheetExists: ensureSheetExists
  };
})();
