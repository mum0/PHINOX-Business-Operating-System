/**
 * KPI Service
 * Phase 8C/D/E: 81 KPIs
 */

var KpiService = (function() {
  'use strict';

  var S = KpiSchema;
  var D = S.DEFINITIONS;

  function _now() { return new Date(); }
  function _toNumber(v, def) { var n = Number(v); return isNaN(n) ? (def !== undefined ? def : 0) : n; }
  function _round(num, d) { d = d || 2; return Math.round(num * Math.pow(10, d)) / Math.pow(10, d); }
  function _generateId() { return 'KPI-' + Math.random().toString(36).substr(2, 9).toUpperCase(); }

  function _getPeriodDates(periodType, refDate) {
    var start = S._periodStart(periodType, refDate);
    var end = S._periodEnd(periodType, refDate);
    return { start: S._formatDateIso(start), end: S._formatDateIso(end), key: S._periodKey(periodType, refDate) };
  }

  function _safeDivide(numerator, denominator, def) {
    def = def !== undefined ? def : 0;
    var num = _toNumber(numerator);
    var den = _toNumber(denominator);
    return den !== 0 ? _round(num / den, 4) : def;
  }

  function _safePercent(numerator, denominator) {
    return _round(_safeDivide(numerator, denominator, 0) * 100, 2);
  }

  function _countNewCustomers(startDate, endDate) {
    var s = new Date(startDate);
    var preResult = OrderService.getOrders({
      limit: CONFIG.PAGINATION.MAX_LIMIT,
      where: function(o) {
        var created = new Date(o.createdAt);
        return created < s;
      }
    });
    var preCustomers = {};
    var preOrders = preResult && preResult.data ? preResult.data : [];
    preOrders.forEach(function(o) {
      preCustomers[o.customerEmail || 'unknown'] = true;
    });

    var periodResult = OrderService.getOrdersByDateRange(startDate, endDate);
    var periodOrders = periodResult && periodResult.data ? periodResult.data : [];
    var newCustomers = {};
    periodOrders.forEach(function(o) {
      var email = o.customerEmail || 'unknown';
      if (!preCustomers[email]) newCustomers[email] = true;
    });
    return Object.keys(newCustomers).length;
  }

  function _countUniqueCustomersInPeriod(startDate, endDate) {
    var result = OrderService.getOrdersByDateRange(startDate, endDate);
    var orders = result && result.data ? result.data : [];
    var customers = {};
    orders.forEach(function(o) {
      customers[o.customerEmail || 'unknown'] = true;
    });
    return Object.keys(customers).length;
  }

  function _arr(result) {
    return result && result.data ? result.data : [];
  }

  function _stdDev(values) {
    if (!values || values.length < 2) return 0;
    var sum = values.reduce(function(a, b) { return a + b; }, 0);
    var avg = sum / values.length;
    var variance = values.reduce(function(a, b) { return a + Math.pow(b - avg, 2); }, 0) / values.length;
    return Math.sqrt(variance);
  }

  var FINANCE_CALCULATORS = {
    'FIN-01': function(dates) { return _round(FinanceService.getRevenue(dates.start, dates.end), 2); },
    'FIN-02': function(dates) { return _round(Math.abs(FinanceService.getCOGS(dates.start, dates.end)), 2); },
    'FIN-03': function(dates) { var pnl = FinanceService.getProfitAndLoss(dates.start, dates.end); return _round(pnl.grossProfit, 2); },
    'FIN-04': function(dates) { var pnl = FinanceService.getProfitAndLoss(dates.start, dates.end); return _round(pnl.netProfit, 2); },
    'FIN-05': function(dates) { var pnl = FinanceService.getProfitAndLoss(dates.start, dates.end); return _safePercent(pnl.grossProfit, pnl.revenue); },
    'FIN-06': function(dates) { var pnl = FinanceService.getProfitAndLoss(dates.start, dates.end); return _safePercent(pnl.netProfit, pnl.revenue); },
    'FIN-07': function(dates) { return _round(FinanceService.getCashBalance('Cash', dates.end), 2); },
    'FIN-08': function(dates) { var cf = FinanceService.getCashFlow(dates.start, dates.end); return _round(cf.netCashFlow, 2); },
    'FIN-09': function(dates) { return _round(FinanceService.getRevenueGrowth(dates.start, dates.end), 2); },
    'FIN-10': function(dates) { return _round(FinanceService.getProfitGrowth(dates.start, dates.end), 2); }
  };

  var SALES_CALCULATORS = {
    'SALE-01': function(dates) { return OrderService.totalOrdersByDateRange(dates.start, dates.end); },
    'SALE-02': function(dates) {
      var result = OrderService.getOrdersByStatusAndDateRange('Delivered', dates.start, dates.end);
      return result && result.data ? result.data.length : 0;
    },
    'SALE-03': function(dates) {
      var total = OrderService.totalOrdersByDateRange(dates.start, dates.end);
      var completed = CALCULATORS['SALE-02'](dates);
      return _safePercent(completed, total);
    },
    'SALE-04': function(dates) {
      var total = OrderService.totalOrdersByDateRange(dates.start, dates.end);
      var amount = OrderService.getTotalOrderAmountByDateRange(dates.start, dates.end);
      return total > 0 ? _round(amount / total, 2) : 0;
    },
    'SALE-05': function(dates) {
      var result = OrderService.getOrdersByDateRange(dates.start, dates.end);
      var orders = _arr(result);
      var counts = {};
      orders.forEach(function(o) {
        var email = o.customerEmail || 'unknown';
        counts[email] = (counts[email] || 0) + 1;
      });
      var totalCustomers = Object.keys(counts).length;
      var repeatCustomers = 0;
      Object.keys(counts).forEach(function(e) { if (counts[e] > 1) repeatCustomers++; });
      return _safePercent(repeatCustomers, totalCustomers);
    },
    'SALE-06': function(dates) {
      var revenue = FinanceService.getRevenue(dates.start, dates.end);
      var refunded = Math.abs(FinanceService.getRefunds(dates.start, dates.end));
      return _safePercent(refunded, revenue);
    },
    'SALE-07': function(dates) {
      var total = OrderService.totalOrdersByDateRange(dates.start, dates.end);
      var result = OrderService.getOrdersByStatusAndDateRange('Cancelled', dates.start, dates.end);
      var cancelled = result && result.data ? result.data.length : 0;
      return _safePercent(cancelled, total);
    }
  };

  var INVENTORY_CALCULATORS = {
    'INV-01': function() { return InventoryService.getLowStockItems().length; },
    'INV-02': function() { return InventoryService.getOutOfStockItems().length; },
    'INV-03': function() { return _round(InventoryService.getInventoryValue(), 2); },
    'INV-04': function() { return _round(InventoryService.getInventoryRetailValue(), 2); },
    'INV-05': function() {
      var total = InventoryService.totalItems();
      var oos = InventoryService.getOutOfStockItems().length;
      return _safePercent(total - oos, total);
    }
  };

  var OPERATIONS_CALCULATORS = {
    'OPS-01': function() { return Members.activeMembers().length; },
    'OPS-02': function() { return Members.totalMembers(); },
    'OPS-03': function(dates) {
      var s = new Date(dates.start), e = new Date(dates.end);
      var result = TaskService.getTasks({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(t) {
          var created = new Date(t.createdAt);
          return created >= s && created <= e;
        }
      });
      var tasks = _arr(result);
      var total = tasks.length;
      var approved = tasks.filter(function(t) { return t.status === 'Approved' || t.status === 'APPROVED'; }).length;
      return _safePercent(approved, total);
    },
    'OPS-04': function(dates) {
      var today = _now();
      var s = new Date(dates.start), e = new Date(dates.end);
      var result = TaskService.getTasks({
        limit: CONFIG.PAGINATION.MAX_LIMIT,
        where: function(t) {
          var created = new Date(t.createdAt);
          return created >= s && created <= e;
        }
      });
      var tasks = _arr(result);
      var total = tasks.length;
      var overdue = 0;
      tasks.forEach(function(t) {
        if (t.dueDate && new Date(t.dueDate) < today && t.status !== 'Approved' && t.status !== 'APPROVED' && t.status !== 'Cancelled' && t.status !== 'CANCELLED') {
          overdue++;
        }
      });
      return _safePercent(overdue, total);
    }
  };

  var MARKETING_CALCULATORS = {
    'MKT-01': function(dates) { return _round(MktService.getTotalSpend(dates.start, dates.end), 2); },
    'MKT-02': function(dates) { return Math.round(MktService.getTotalImpressions(dates.start, dates.end)); },
    'MKT-03': function(dates) { return Math.round(MktService.getTotalReach(dates.start, dates.end)); },
    'MKT-04': function(dates) { return Math.round(MktService.getTotalClicks(dates.start, dates.end)); },
    'MKT-05': function(dates) { return _safePercent(MktService.getTotalClicks(dates.start, dates.end), MktService.getTotalImpressions(dates.start, dates.end)); },
    'MKT-06': function(dates) {
      var spend = MktService.getTotalSpend(dates.start, dates.end);
      var clicks = MktService.getTotalClicks(dates.start, dates.end);
      return clicks > 0 ? _round(spend / clicks, 2) : 0;
    },
    'MKT-07': function(dates) {
      var spend = MktService.getTotalSpend(dates.start, dates.end);
      var impressions = MktService.getTotalImpressions(dates.start, dates.end);
      return impressions > 0 ? _round((spend / impressions) * 1000, 2) : 0;
    },
    'MKT-08': function(dates) { return Math.round(MktService.getTotalLeads(dates.start, dates.end)); },
    'MKT-09': function(dates) { return Math.round(MktService.getTotalConversions(dates.start, dates.end)); },
    'MKT-10': function(dates) { return _safePercent(MktService.getTotalConversions(dates.start, dates.end), MktService.getTotalClicks(dates.start, dates.end)); },
    'MKT-11': function(dates) {
      var spend = MktService.getTotalSpend(dates.start, dates.end);
      var conversions = MktService.getTotalConversions(dates.start, dates.end);
      return conversions > 0 ? _round(spend / conversions, 2) : 0;
    },
    'MKT-12': function(dates) {
      var spend = MktService.getTotalSpend(dates.start, dates.end);
      var leads = MktService.getTotalLeads(dates.start, dates.end);
      return leads > 0 ? _round(spend / leads, 2) : 0;
    },
    'MKT-13': function(dates) {
      var spend = MktService.getTotalSpend(dates.start, dates.end);
      var revenue = MktService.getTotalAttributedRevenue(dates.start, dates.end);
      return spend > 0 ? _round(revenue / spend, 2) : 0;
    },
    'MKT-14': function(dates) {
      var totalCost = MktService.getTotalCost(dates.start, dates.end);
      var revenue = MktService.getTotalAttributedRevenue(dates.start, dates.end);
      return totalCost > 0 ? _round(((revenue - totalCost) / totalCost) * 100, 2) : 0;
    },
    'MKT-15': function(dates) {
      var totalCost = MktService.getTotalAcquisitionCost(dates.start, dates.end);
      var newCustomers = _countNewCustomers(dates.start, dates.end);
      return newCustomers > 0 ? _round(totalCost / newCustomers, 2) : 0;
    },
    'MKT-16': function(dates) {
      var allOrders = OrderService.getOrdersByStatus('Delivered');
      var orders = allOrders && allOrders.data ? allOrders.data : [];
      var totalRevenue = orders.reduce(function(acc, o) { return acc + _toNumber(o.totalAmount); }, 0);
      var customers = {};
      orders.forEach(function(o) {
        var email = o.customerEmail || 'unknown';
        customers[email] = true;
      });
      var totalCustomers = Object.keys(customers).length;
      return totalCustomers > 0 ? _round(totalRevenue / totalCustomers, 2) : 0;
    },
    'MKT-17': function(dates) {
      var cac = CALCULATORS['MKT-15'](dates);
      var ltv = CALCULATORS['MKT-16'](dates);
      return cac > 0 ? _round(ltv / cac, 2) : 0;
    },
    'MKT-18': function(dates) {
      var cac = CALCULATORS['MKT-15'](dates);
      var revenue = FinanceService.getRevenue(dates.start, dates.end);
      var customers = _countUniqueCustomersInPeriod(dates.start, dates.end);
      var monthlyRevenuePerCustomer = customers > 0 ? revenue / customers : 0;
      return monthlyRevenuePerCustomer > 0 ? _round(cac / monthlyRevenuePerCustomer, 2) : 0;
    }
  };

  var SOCIAL_CALCULATORS = {
    'SOC-01': function(dates) { return Math.round(SocService.getFollowersAtDate(dates.end)); },
    'SOC-02': function(dates) {
      var startFollowers = SocService.getFollowersAtDate(dates.start);
      var endFollowers = SocService.getFollowersAtDate(dates.end);
      return Math.round(endFollowers - startFollowers);
    },
    'SOC-03': function(dates) { return Math.round(SocService.getTotalReach(dates.start, dates.end)); },
    'SOC-04': function(dates) { return Math.round(SocService.getTotalImpressions(dates.start, dates.end)); },
    'SOC-05': function(dates) { return Math.round(SocService.getTotalEngagements(dates.start, dates.end)); },
    'SOC-06': function(dates) { return _safePercent(SocService.getTotalEngagements(dates.start, dates.end), SocService.getTotalReach(dates.start, dates.end)); },
    'SOC-07': function(dates) { return Math.round(SocService.getTotalLikes(dates.start, dates.end)); },
    'SOC-08': function(dates) { return Math.round(SocService.getTotalComments(dates.start, dates.end)); },
    'SOC-09': function(dates) { return Math.round(SocService.getTotalShares(dates.start, dates.end)); },
    'SOC-10': function(dates) { return Math.round(SocService.getTotalSaves(dates.start, dates.end)); },
    'SOC-11': function(dates) { return Math.round(SocService.getTotalVideoViews(dates.start, dates.end)); },
    'SOC-12': function(dates) { return Math.round(SocService.getTotalProfileVisits(dates.start, dates.end)); },
    'SOC-13': function(dates) { return Math.round(SocService.getTotalLinkClicks(dates.start, dates.end)); },
    'SOC-14': function(dates) { return Math.round(SocService.getTotalLeads(dates.start, dates.end)); },
    'SOC-15': function(dates) { return Math.round(SocService.getTotalPurchases(dates.start, dates.end)); },
    'SOC-16': function(dates) { return _round(SocService.getTotalAttributedRevenue(dates.start, dates.end), 2); }
  };

  var PERFORMANCE_CALCULATORS = {
    'PERF-01': function(dates) {
      var result = TaskService.getCompletedTasksByDateRange(dates.start, dates.end);
      return result && result.data ? result.data.length : 0;
    },
    'PERF-02': function(dates) {
      var result = TaskService.getTasksByStatusAndDateRange('APPROVED', dates.start, dates.end);
      return result && result.data ? result.data.length : 0;
    },
    'PERF-03': function(dates) {
      var approved = CALCULATORS['PERF-02'](dates);
      var completed = CALCULATORS['PERF-01'](dates);
      return completed > 0 ? _round((approved / completed) * 100, 2) : 0;
    },
    'PERF-04': function(dates) {
      return TaskService.getAverageCompletionTime(dates.start, dates.end);
    },
    'PERF-05': function(dates) {
      return TaskService.getOnTimeRate(dates.start, dates.end);
    },
    'PERF-06': function(dates) {
      var result = TaskService.getOverdueTasks(dates.start, dates.end);
      var overdue = result && result.data ? result.data.length : 0;
      var allResult = TaskService.getTasksByDateRange(dates.start, dates.end);
      var all = allResult && allResult.data ? allResult.data.length : 0;
      return all > 0 ? _round((overdue / all) * 100, 2) : 0;
    },
    'PERF-07': function(dates) {
      var members = Members.activeMembers ? Members.activeMembers() : [];
      var activeCount = members.length;
      if (activeCount === 0) return 0;
      var totalLoad = 0;
      members.forEach(function(m) {
        var name = m[1];
        var stats = Members.getMemberTaskStats(name, dates.start, dates.end);
        totalLoad += stats.active || 0;
      });
      return _round((totalLoad / activeCount) * 100, 2);
    },
    'PERF-08': function(dates) {
      var members = Members.activeMembers ? Members.activeMembers() : [];
      if (members.length === 0) return 0;
      var totalEff = 0, count = 0;
      members.forEach(function(m) {
        var name = m[1];
        var stats = Members.getMemberTaskStats(name, dates.start, dates.end);
        if (stats.total > 0) {
          totalEff += (stats.completed / stats.total) * 100;
          count++;
        }
      });
      return count > 0 ? _round(totalEff / count, 2) : 0;
    },
    'PERF-09': function(dates) {
      var all = Members.getMembers ? Members.getMembers() : [];
      var depts = {};
      all.forEach(function(m) {
        var dept = m[12] || 'Unassigned';
        if (!depts[dept]) depts[dept] = { total: 0, completed: 0 };
        var name = m[1];
        var stats = Members.getMemberTaskStats(name, dates.start, dates.end);
        depts[dept].total += stats.total || 0;
        depts[dept].completed += stats.completed || 0;
      });
      var totalScore = 0, count = 0;
      Object.keys(depts).forEach(function(d) {
        if (depts[d].total > 0) {
          totalScore += (depts[d].completed / depts[d].total) * 100;
          count++;
        }
      });
      return count > 0 ? _round(totalScore / count, 2) : 0;
    },
    'PERF-10': function(dates) {
      return TaskService.getAverageQuality(dates.start, dates.end);
    },
    'PERF-11': function(dates) {
      var members = Members.activeMembers ? Members.activeMembers() : [];
      if (members.length < 2) return 0;
      var loads = [];
      members.forEach(function(m) {
        var name = m[1];
        var stats = Members.getMemberTaskStats(name, dates.start, dates.end);
        loads.push(stats.total || 0);
      });
      return _round(_stdDev(loads), 2);
    }
  };

  var CUSTOMER_CALCULATORS = {
    'CUST-01': function(dates) {
      var result = CustomerService.getCustomersByDateRange(dates.start, dates.end);
      return result && result.data ? result.data.length : 0;
    },
    'CUST-02': function(dates) { return CustomerService.getNewCustomers(dates.start, dates.end); },
    'CUST-03': function(dates) { return CustomerService.getReturningCustomers(dates.start, dates.end); },
    'CUST-04': function(dates) { return CustomerService.getRetentionRate(dates.start, dates.end); },
    'CUST-05': function(dates) { return CustomerService.getAverageLTV(dates.start, dates.end); },
    'CUST-06': function(dates) { return CustomerService.getAverageOrderFrequency(dates.start, dates.end); },
    'CUST-07': function(dates) {
      var spend = MktService.getTotalSpend(dates.start, dates.end);
      var newCust = CALCULATORS['CUST-02'](dates);
      return newCust > 0 ? _round(spend / newCust, 2) : 0;
    },
    'CUST-08': function(dates) { return SatisfactionService.getAverageScore(dates.start, dates.end); },
    'CUST-09': function(dates) { return NPSService.getNPS(dates.start, dates.end); },
    'CUST-10': function(dates) { return CustomerService.getChurnRate(dates.start, dates.end); }
  };

  function _assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (source.hasOwnProperty(key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }

  var CALCULATORS = _assign(
    {},
    FINANCE_CALCULATORS,
    SALES_CALCULATORS,
    INVENTORY_CALCULATORS,
    OPERATIONS_CALCULATORS,
    MARKETING_CALCULATORS,
    SOCIAL_CALCULATORS,
    PERFORMANCE_CALCULATORS,
    CUSTOMER_CALCULATORS
  );

  function calculateKpi(kpiId, periodType, refDate) {
    if (!kpiId) throw ErrorHandler.validation('kpiId is required', {}, 'KpiService');
    var def = S.getDefinition(kpiId);
    if (!def) throw ErrorHandler.notFound('KPI Definition', kpiId, 'KpiService');

    var pType = periodType || def.period || S.PERIOD.MONTHLY;
    var dates = _getPeriodDates(pType, refDate);
    var calcFn = CALCULATORS[kpiId];
    if (!calcFn) throw ErrorHandler.validation('No calculator for KPI ' + kpiId, {}, 'KpiService');

    var value;
    try {
      value = calcFn(dates);
    } catch (e) {
      Logger.error('KpiService', 'Calculator failed for ' + kpiId, { error: e.message });
      value = null;
    }

    if (value === null || value === undefined || isNaN(value)) value = 0;

    var record = {
      id: _generateId(),
      kpiId: kpiId,
      name: def.name,
      value: value,
      period: dates.key,
      date: dates.start,
      sheet: 'KPI Results',
      createdAt: _now()
    };
    Validator.validate(record, S.RESULT_VALIDATION, 'KpiService');
    var saved = KpiRepository.upsert(kpiId, dates.key, record);
    Logger.info('KpiService', 'KPI calculated', { kpiId: kpiId, period: dates.key, value: value });
    return saved;
  }

  function calculateAll(periodType, refDate) {
    var allDefs = S.getAllDefinitions();
    var results = [];
    var errors = [];
    allDefs.forEach(function(def) {
      try {
        var result = calculateKpi(def.kpiId, periodType || def.period, refDate);
        results.push({ kpiId: def.kpiId, status: 'ok', value: result.value });
      } catch (e) {
        Logger.error('KpiService', 'calculateAll failed for ' + def.kpiId, { error: e.message });
        errors.push({ kpiId: def.kpiId, status: 'error', message: e.message });
        results.push({ kpiId: def.kpiId, status: 'error', value: 0 });
      }
    });
    Logger.info('KpiService', 'calculateAll complete', { total: allDefs.length, success: results.length - errors.length, errors: errors.length });
    return { results: results, errors: errors };
  }

  function getDashboardKpis() {
    var now = _now();
    var monthKey = S._periodKey(S.PERIOD.MONTHLY, now);
    var dayKey = S._periodKey(S.PERIOD.DAILY, now);
    var allDefs = S.getAllDefinitions();
    var dashboard = {};
    allDefs.forEach(function(def) {
      var targetPeriod;
      if (def.period === S.PERIOD.DAILY) targetPeriod = dayKey;
      else if (def.period === S.PERIOD.WEEKLY) targetPeriod = S._periodKey(S.PERIOD.WEEKLY, now);
      else if (def.period === S.PERIOD.MONTHLY) targetPeriod = monthKey;
      else if (def.period === S.PERIOD.QUARTERLY) targetPeriod = S._periodKey(S.PERIOD.QUARTERLY, now);
      else if (def.period === S.PERIOD.YEARLY) targetPeriod = S._periodKey(S.PERIOD.YEARLY, now);
      else targetPeriod = monthKey;
      var existing = KpiRepository.findByKpiIdAndPeriod(def.kpiId, targetPeriod);
      dashboard[def.kpiId] = {
        name: def.name,
        category: def.category,
        unit: def.unit,
        value: existing ? _toNumber(existing.value) : 0,
        period: targetPeriod,
        calculatedAt: existing ? existing.createdAt : null
      };
    });
    return dashboard;
  }

  function getKpiHistory(kpiId, limit) {
    if (!kpiId) return [];
    return KpiRepository.getHistory(kpiId, limit || 12);
  }

  function calculateCategory(category, periodType, refDate) {
    var allDefs = S.getAllDefinitions();
    var filtered = allDefs.filter(function(d) { return d.category === category; });
    var results = [];
    filtered.forEach(function(def) {
      try {
        results.push(calculateKpi(def.kpiId, periodType || def.period, refDate));
      } catch (e) {
        Logger.error('KpiService', 'Category calc failed for ' + def.kpiId, { error: e.message });
      }
    });
    return results;
  }

  return {
    calculateKpi: calculateKpi,
    calculateAll: calculateAll,
    calculateCategory: calculateCategory,
    getDashboardKpis: getDashboardKpis,
    getKpiHistory: getKpiHistory,
    CALCULATORS: CALCULATORS
  };
})();