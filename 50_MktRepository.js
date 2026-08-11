/**
 * Marketing Repository
 * Data access for Marketing Spend sheet
 * Phase 7C - PHINOX BOS v5
 */

const MktRepository = (function() {
  'use strict';

  if (typeof MktSchema === 'undefined') {
    throw new Error('MktSchema must be loaded before MktRepository');
  }

  var repo = BaseRepository.create(
    MktSchema.SHEET_NAME,
    MktSchema.SCHEMA,
    { eventName: 'marketing:spend' }
  );

  function _toNumber(v) { var n = Number(v); return isNaN(n) ? 0 : n; }

  function findByDateRange(startDate, endDate) {
    var s = new Date(startDate), e = new Date(endDate);
    return repo.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(r) {
        var d = new Date(r.date);
        return d >= s && d <= e;
      }
    });
  }

  function findByPlatform(platform) {
    return repo.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(r) { return r.platform === platform; }
    });
  }

  function findByCampaign(campaignId) {
    return repo.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(r) { return r.campaignId === campaignId; }
    });
  }

  function findByDateRangeAndPlatform(startDate, endDate, platform) {
    var s = new Date(startDate), e = new Date(endDate);
    return repo.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(r) {
        var d = new Date(r.date);
        return d >= s && d <= e && r.platform === platform;
      }
    });
  }

  function sumByDateRange(startDate, endDate, field) {
    var result = findByDateRange(startDate, endDate);
    return result.data.reduce(function(acc, r) {
      return acc + _toNumber(r[field]);
    }, 0);
  }

  function getLatestBeforeDate(date, field) {
    var target = new Date(date);
    var result = repo.findAll({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(r) {
        var d = new Date(r.date);
        return d <= target;
      }
    });
    if (!result.data.length) return null;
    var sorted = result.data.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    return sorted[0];
  }

  return {
    create: function(data) { return repo.create(data); },
    findById: function(id) { return repo.findById(id); },
    findAll: function(options) { return repo.findAll(options); },
    findByDateRange: findByDateRange,
    findByPlatform: findByPlatform,
    findByCampaign: findByCampaign,
    findByDateRangeAndPlatform: findByDateRangeAndPlatform,
    sumByDateRange: sumByDateRange,
    getLatestBeforeDate: getLatestBeforeDate,
    update: function(id, updates) { return repo.update(id, updates); },
    delete: function(id) { return repo.delete(id); },
    count: function() { return repo.count(); }
  };
})();
