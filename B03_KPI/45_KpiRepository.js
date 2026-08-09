// @ts-nocheck
/**
 * KPI Repository
 * Data access for KPI Results sheet
 * Phase 7B - PHINOX BOS v5
 */

const KpiRepository = (function() {
  'use strict';

  if (typeof KpiSchema === 'undefined') {
    throw new Error('KpiSchema must be loaded before KpiRepository');
  }

  var repo = BaseRepository.create(
    CONFIG.SHEETS.KPI_RESULTS,
    KpiSchema.RESULT_SCHEMA,
    { eventName: 'kpi:result' }
  );

  // ─── NORMALIZE PERIOD VALUE ───
  // Google Sheets auto-converts date-like strings to Date objects.
  // This helper ensures consistent string comparison.
  function _normalizePeriod(periodValue) {
    if (!periodValue) return '';
    if (typeof periodValue === 'string') return periodValue;
    // If it's a Date object, format as yyyy-mm-dd
    var d = new Date(periodValue);
    if (!isNaN(d.getTime())) {
      var y = d.getFullYear();
      var m = d.getMonth() + 1;
      var day = d.getDate();
      return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
    }
    return String(periodValue);
  }

  // ─── FIND BY KPI ID AND PERIOD ───
  function findByKpiIdAndPeriod(kpiId, periodKey) {
    if (!kpiId || !periodKey) return null;
    return repo.findOne(function(entry) {
      return entry.kpiId === kpiId && _normalizePeriod(entry.period) === String(periodKey);
    });
  }

  function findByKpiId(kpiId, options) {
    if (!kpiId) return { data: [], total: 0 };
    var opts = options || {};
    var targetPeriod = opts.period ? String(opts.period) : null;
    opts.where = function(entry) {
      if (entry.kpiId !== kpiId) return false;
      if (targetPeriod && _normalizePeriod(entry.period) !== targetPeriod) return false;
      return true;
    };
    return repo.findAll(opts);
  }

  // ─── HISTORY ───
  function getHistory(kpiId, limit) {
    if (!kpiId) return [];
    var result = repo.findAll({
      limit: limit || 12,
      where: function(entry) { return entry.kpiId === kpiId; },
      sort: { date: 'desc' }
    });
    return result.data;
  }

  // ─── UPSERT ───
  function upsert(kpiId, periodKey, data) {
    if (!kpiId || !periodKey) throw new Error('kpiId and periodKey required for upsert');
    var existing = findByKpiIdAndPeriod(kpiId, periodKey);
    if (existing) {
      var updates = Utils.clone(data);
      delete updates.id;
      delete updates.createdAt;
      var updated = repo.update(existing.id, updates);
      Logger.info('KpiRepository', 'KPI result updated', { kpiId: kpiId, period: periodKey });
      return updated;
    } else {
      var created = repo.create(data);
      Logger.info('KpiRepository', 'KPI result created', { kpiId: kpiId, period: periodKey });
      return created;
    }
  }

  // ─── DELETE BY KPI ID (for cleanup/testing) ───
  function deleteByKpiId(kpiId) {
    if (!kpiId) return 0;
    var result = repo.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(entry) { return entry.kpiId === kpiId; }
    });
    var count = 0;
    result.data.forEach(function(entry) {
      try { repo.delete(entry.id); count++; } catch (e) {}
    });
    return count;
  }

  return {
    create: function(data) { return repo.create(data); },
    findById: function(id) { return repo.findById(id); },
    findByKpiIdAndPeriod: findByKpiIdAndPeriod,
    findByKpiId: findByKpiId,
    findAll: function(options) { return repo.findAll(options); },
    getHistory: getHistory,
    upsert: upsert,
    update: function(id, updates) { return repo.update(id, updates); },
    delete: function(id) { return repo.delete(id); },
    deleteByKpiId: deleteByKpiId,
    count: function() { return repo.count(); }
  };
})();
