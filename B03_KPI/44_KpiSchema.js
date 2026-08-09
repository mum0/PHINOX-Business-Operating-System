/**
 * KPI Schema
 * Business KPI Definitions, Periods, Categories, Validation
 * Phase 7B - PHINOX BOS v5
 */

const KpiSchema = (function() {
  'use strict';

  const RESULT_SCHEMA = Object.freeze({
    id: 1,
    kpiId: 2,
    name: 3,
    value: 4,
    period: 5,
    date: 6,
    sheet: 7,
    createdAt: 8
  });

  const PERIOD = Object.freeze({
    DAILY: 'Daily',
    WEEKLY: 'Weekly',
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly'
  });

  const CATEGORY = Object.freeze({
    FINANCE: 'Finance',
    SALES: 'Sales',
    INVENTORY: 'Inventory',
    OPERATIONS: 'Operations',
    MARKETING: 'Marketing',
    SOCIAL_MEDIA: 'Social Media'
  });

  const STATUS = Object.freeze({
    OK: 'OK',
    WARNING: 'Warning',
    CRITICAL: 'Critical',
    NO_TARGET: 'No Target',
    INSUFFICIENT_DATA: 'Insufficient Data'
  });

  const DEFINITIONS = Object.freeze({
    'FIN-01': {
      name: 'Revenue',
      category: CATEGORY.FINANCE,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Finance Ledger.amount WHERE type = Revenue)',
      description: 'Total accrual revenue for the period'
    },
    'FIN-02': {
      name: 'COGS',
      category: CATEGORY.FINANCE,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'ABS(SUM(Finance Ledger.amount WHERE type = COGS))',
      description: 'Cost of goods sold for the period'
    },
    'FIN-03': {
      name: 'Gross Profit',
      category: CATEGORY.FINANCE,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'Revenue - COGS',
      description: 'Gross profit before operating expenses'
    },
    'FIN-04': {
      name: 'Net Profit',
      category: CATEGORY.FINANCE,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'Gross Profit - Operating Expenses',
      description: 'Net profit after all expenses'
    },
    'FIN-05': {
      name: 'Gross Margin',
      category: CATEGORY.FINANCE,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(Revenue > 0, (Gross Profit / Revenue) * 100, 0)',
      description: 'Gross profit as percentage of revenue'
    },
    'FIN-06': {
      name: 'Net Margin',
      category: CATEGORY.FINANCE,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(Revenue > 0, (Net Profit / Revenue) * 100, 0)',
      description: 'Net profit as percentage of revenue'
    },
    'FIN-07': {
      name: 'Cash Balance',
      category: CATEGORY.FINANCE,
      unit: 'EGP',
      period: PERIOD.DAILY,
      formula: 'Cash In - ABS(Cash Out + Refund + Expense + Adjustment)',
      description: 'Net cash position as of date'
    },
    'FIN-08': {
      name: 'Net Cash Flow',
      category: CATEGORY.FINANCE,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'Cash In + Cash Out (Cash Out is negative)',
      description: 'Net cash movement for the period'
    },
    'FIN-09': {
      name: 'Revenue Growth',
      category: CATEGORY.FINANCE,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: '((Current Revenue - Previous Period Revenue) / Previous) * 100',
      description: 'Month-over-month revenue growth percentage'
    },
    'FIN-10': {
      name: 'Profit Growth',
      category: CATEGORY.FINANCE,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: '((Current Net Profit - Previous Period Net Profit) / Previous) * 100',
      description: 'Month-over-month net profit growth percentage'
    },
    'SALE-01': {
      name: 'Total Orders',
      category: CATEGORY.SALES,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'COUNT(Orders)',
      description: 'Total number of orders placed'
    },
    'SALE-02': {
      name: 'Completed Orders',
      category: CATEGORY.SALES,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: "COUNT(Orders WHERE status = 'Delivered')",
      description: 'Orders successfully delivered'
    },
    'SALE-03': {
      name: 'Order Conversion Rate',
      category: CATEGORY.SALES,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(Total Orders > 0, (Completed / Total) * 100, 0)',
      description: 'Percentage of orders converted to delivered'
    },
    'SALE-04': {
      name: 'Average Order Value',
      category: CATEGORY.SALES,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'IF(Total Orders > 0, SUM(totalAmount) / COUNT, 0)',
      description: 'Average monetary value per order'
    },
    'SALE-05': {
      name: 'Repeat Purchase Rate',
      category: CATEGORY.SALES,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(Total Customers > 0, (Repeat Customers / Total) * 100, 0)',
      description: 'Customers with more than one order'
    },
    'SALE-06': {
      name: 'Refund Rate',
      category: CATEGORY.SALES,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(Revenue > 0, (Total Refunded / Revenue) * 100, 0)',
      description: 'Refunds as percentage of revenue'
    },
    'SALE-07': {
      name: 'Cancellation Rate',
      category: CATEGORY.SALES,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: "IF(Total Orders > 0, (Cancelled / Total) * 100, 0)",
      description: 'Cancelled orders as percentage of total'
    },
    'INV-01': {
      name: 'Low Stock Items',
      category: CATEGORY.INVENTORY,
      unit: 'count',
      period: PERIOD.DAILY,
      formula: 'COUNT(Inventory WHERE quantity <= reorderLevel AND quantity > 0)',
      description: 'Items at or below reorder threshold'
    },
    'INV-02': {
      name: 'Out of Stock Items',
      category: CATEGORY.INVENTORY,
      unit: 'count',
      period: PERIOD.DAILY,
      formula: 'COUNT(Inventory WHERE quantity = 0)',
      description: 'Items with zero available quantity'
    },
    'INV-03': {
      name: 'Inventory Value (Cost)',
      category: CATEGORY.INVENTORY,
      unit: 'EGP',
      period: PERIOD.DAILY,
      formula: 'SUM(quantity * cost)',
      description: 'Total inventory value at cost basis'
    },
    'INV-04': {
      name: 'Inventory Retail Value',
      category: CATEGORY.INVENTORY,
      unit: 'EGP',
      period: PERIOD.DAILY,
      formula: 'SUM(quantity * price)',
      description: 'Total inventory value at retail price'
    },
    'INV-05': {
      name: 'Stock Availability Rate',
      category: CATEGORY.INVENTORY,
      unit: '%',
      period: PERIOD.DAILY,
      formula: 'IF(Total SKUs > 0, ((Total - Out of Stock) / Total) * 100, 0)',
      description: 'Percentage of SKUs currently in stock'
    },
    'OPS-01': {
      name: 'Active Members',
      category: CATEGORY.OPERATIONS,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: "COUNT(Members WHERE status = 'Active')",
      description: 'Currently active team members'
    },
    'OPS-02': {
      name: 'Team Size',
      category: CATEGORY.OPERATIONS,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'COUNT(Members)',
      description: 'Total number of team members'
    },
    'OPS-03': {
      name: 'Task Completion Rate',
      category: CATEGORY.OPERATIONS,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: "IF(Total Tasks > 0, (Approved / Total) * 100, 0)",
      description: 'Tasks approved as percentage of total'
    },
    'OPS-04': {
      name: 'Task Overdue Rate',
      category: CATEGORY.OPERATIONS,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(Total Tasks > 0, (Overdue / Total) * 100, 0)',
      description: 'Tasks past due date as percentage of total'
    },

    // ── MARKETING (18) ──
    'MKT-01': {
      name: 'Ad Spend',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Marketing Spend.spend)',
      description: 'Total advertising spend for the period'
    },
    'MKT-02': {
      name: 'Impressions',
      category: CATEGORY.MARKETING,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Marketing Spend.impressions)',
      description: 'Total ad impressions for the period'
    },
    'MKT-03': {
      name: 'Reach',
      category: CATEGORY.MARKETING,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Marketing Spend.reach)',
      description: 'Total ad reach for the period'
    },
    'MKT-04': {
      name: 'Clicks',
      category: CATEGORY.MARKETING,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Marketing Spend.clicks)',
      description: 'Total ad clicks for the period'
    },
    'MKT-05': {
      name: 'CTR',
      category: CATEGORY.MARKETING,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(impressions > 0, (clicks / impressions) * 100, 0)',
      description: 'Click-through rate'
    },
    'MKT-06': {
      name: 'CPC',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'IF(clicks > 0, spend / clicks, 0)',
      description: 'Cost per click'
    },
    'MKT-07': {
      name: 'CPM',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'IF(impressions > 0, (spend / impressions) * 1000, 0)',
      description: 'Cost per thousand impressions'
    },
    'MKT-08': {
      name: 'Leads',
      category: CATEGORY.MARKETING,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Marketing Spend.leads)',
      description: 'Total leads generated'
    },
    'MKT-09': {
      name: 'Conversions',
      category: CATEGORY.MARKETING,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Marketing Spend.conversions)',
      description: 'Total conversions attributed to ads'
    },
    'MKT-10': {
      name: 'Conversion Rate',
      category: CATEGORY.MARKETING,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(clicks > 0, (conversions / clicks) * 100, 0)',
      description: 'Conversions as percentage of clicks'
    },
    'MKT-11': {
      name: 'CPA',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'IF(conversions > 0, spend / conversions, 0)',
      description: 'Cost per acquisition (conversion)'
    },
    'MKT-12': {
      name: 'Cost per Lead',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'IF(leads > 0, spend / leads, 0)',
      description: 'Cost per lead'
    },
    'MKT-13': {
      name: 'ROAS',
      category: CATEGORY.MARKETING,
      unit: 'x',
      period: PERIOD.MONTHLY,
      formula: 'IF(spend > 0, attributedRevenue / spend, 0)',
      description: 'Return on ad spend (revenue per spend)'
    },
    'MKT-14': {
      name: 'ROI',
      category: CATEGORY.MARKETING,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(totalCost > 0, ((attributedRevenue - totalCost) / totalCost) * 100, 0)',
      description: 'Return on investment for marketing'
    },
    'MKT-15': {
      name: 'CAC',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'IF(newCustomers > 0, totalAcquisitionCost / newCustomers, 0)',
      description: 'Customer acquisition cost'
    },
    'MKT-16': {
      name: 'LTV',
      category: CATEGORY.MARKETING,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'Total Revenue (all time) / Total Unique Customers (all time)',
      description: 'Lifetime value (historical average customer value)'
    },
    'MKT-17': {
      name: 'LTV:CAC Ratio',
      category: CATEGORY.MARKETING,
      unit: 'x',
      period: PERIOD.MONTHLY,
      formula: 'IF(CAC > 0, LTV / CAC, 0)',
      description: 'LTV to CAC ratio'
    },
    'MKT-18': {
      name: 'Payback Period',
      category: CATEGORY.MARKETING,
      unit: 'months',
      period: PERIOD.MONTHLY,
      formula: 'IF(monthlyRevenuePerCustomer > 0, CAC / monthlyRevenuePerCustomer, 0)',
      description: 'Months to recover CAC'
    },

    // ── SOCIAL MEDIA (16) ──
    'SOC-01': {
      name: 'Followers',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.DAILY,
      formula: 'MAX(Social Media Performance.followers) at period end',
      description: 'Follower count at end of period (point-in-time)'
    },
    'SOC-02': {
      name: 'Follower Growth',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'followers(end) - followers(start)',
      description: 'Net follower growth for the period'
    },
    'SOC-03': {
      name: 'Organic Reach',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.reach)',
      description: 'Total organic reach for the period'
    },
    'SOC-04': {
      name: 'Organic Impressions',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.impressions)',
      description: 'Total organic impressions for the period'
    },
    'SOC-05': {
      name: 'Engagements',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.engagements)',
      description: 'Total engagements for the period'
    },
    'SOC-06': {
      name: 'Engagement Rate',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: '%',
      period: PERIOD.MONTHLY,
      formula: 'IF(reach > 0, (engagements / reach) * 100, 0)',
      description: 'Engagements as percentage of reach'
    },
    'SOC-07': {
      name: 'Likes',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.likes)',
      description: 'Total likes for the period'
    },
    'SOC-08': {
      name: 'Comments',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.comments)',
      description: 'Total comments for the period'
    },
    'SOC-09': {
      name: 'Shares',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.shares)',
      description: 'Total shares for the period'
    },
    'SOC-10': {
      name: 'Saves',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.saves)',
      description: 'Total saves for the period'
    },
    'SOC-11': {
      name: 'Video Views',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.videoViews)',
      description: 'Total video views for the period'
    },
    'SOC-12': {
      name: 'Profile Visits',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.profileVisits)',
      description: 'Total profile visits for the period'
    },
    'SOC-13': {
      name: 'Link Clicks',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.linkClicks)',
      description: 'Total link clicks for the period'
    },
    'SOC-14': {
      name: 'Social Leads',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.leads)',
      description: 'Total leads from social media'
    },
    'SOC-15': {
      name: 'Social Attributed Purchases',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'count',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.purchases)',
      description: 'Purchases attributed to social media'
    },
    'SOC-16': {
      name: 'Social Attributed Revenue',
      category: CATEGORY.SOCIAL_MEDIA,
      unit: 'EGP',
      period: PERIOD.MONTHLY,
      formula: 'SUM(Social Media Performance.attributedRevenue)',
      description: 'Revenue attributed to social media'
    }
  });

  const RESULT_VALIDATION = Object.freeze({
    kpiId: { required: true, type: 'string', minLength: 1, maxLength: 20 },
    name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
    value: { required: true, type: 'number' },
    period: { required: true, type: 'string', minLength: 1, maxLength: 20 },
    date: { required: true, type: 'string', minLength: 1, maxLength: 20 },
    sheet: { type: 'string', maxLength: 50 }
  });

  function _periodStart(periodType, refDate) {
    var d = refDate ? new Date(refDate) : new Date();
    var y = d.getFullYear();
    var m = d.getMonth();
    var day = d.getDate();

    switch (periodType) {
      case PERIOD.DAILY:
        return new Date(y, m, day);
      case PERIOD.WEEKLY:
        var dayOfWeek = d.getDay();
        return new Date(y, m, day - dayOfWeek);
      case PERIOD.MONTHLY:
        return new Date(y, m, 1);
      case PERIOD.QUARTERLY:
        var qStart = Math.floor(m / 3) * 3;
        return new Date(y, qStart, 1);
      case PERIOD.YEARLY:
        return new Date(y, 0, 1);
      default:
        return new Date(y, m, 1);
    }
  }

  function _periodEnd(periodType, refDate) {
    var start = _periodStart(periodType, refDate);
    var y = start.getFullYear();
    var m = start.getMonth();
    var d = start.getDate();

    switch (periodType) {
      case PERIOD.DAILY:
        return new Date(y, m, d, 23, 59, 59);
      case PERIOD.WEEKLY:
        return new Date(y, m, d + 6, 23, 59, 59);
      case PERIOD.MONTHLY:
        return new Date(y, m + 1, 0, 23, 59, 59);
      case PERIOD.QUARTERLY:
        return new Date(y, m + 3, 0, 23, 59, 59);
      case PERIOD.YEARLY:
        return new Date(y, 11, 31, 23, 59, 59);
      default:
        return new Date(y, m + 1, 0, 23, 59, 59);
    }
  }

  function _periodKey(periodType, refDate) {
    var start = _periodStart(periodType, refDate);
    var y = start.getFullYear();
    var m = start.getMonth() + 1;
    var d = start.getDate();

    switch (periodType) {
      case PERIOD.DAILY:
        return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
      case PERIOD.WEEKLY:
        var oneJan = new Date(y, 0, 1);
        var weekNum = Math.ceil((((start - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
        return y + '-W' + (weekNum < 10 ? '0' + weekNum : weekNum);
      case PERIOD.MONTHLY:
        return y + '-' + (m < 10 ? '0' + m : m);
      case PERIOD.QUARTERLY:
        var q = Math.floor((m - 1) / 3) + 1;
        return y + '-Q' + q;
      case PERIOD.YEARLY:
        return String(y);
      default:
        return y + '-' + (m < 10 ? '0' + m : m);
    }
  }

  function _formatDateIso(d) {
    if (!d) return '';
    var dt = new Date(d);
    var y = dt.getFullYear();
    var m = dt.getMonth() + 1;
    var day = dt.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  function getDefaultResult() {
    return {
      period: PERIOD.MONTHLY,
      sheet: 'KPI Results',
      value: 0
    };
  }

  function getDefinition(kpiId) {
    return DEFINITIONS[kpiId] || null;
  }

  function getAllDefinitions() {
    return Object.keys(DEFINITIONS).map(function(k) {
      var def = DEFINITIONS[k];
      return { kpiId: k, name: def.name, category: def.category, unit: def.unit, period: def.period };
    });
  }

  return {
    RESULT_SCHEMA: RESULT_SCHEMA,
    PERIOD: PERIOD,
    CATEGORY: CATEGORY,
    STATUS: STATUS,
    DEFINITIONS: DEFINITIONS,
    RESULT_VALIDATION: RESULT_VALIDATION,
    _periodStart: _periodStart,
    _periodEnd: _periodEnd,
    _periodKey: _periodKey,
    _formatDateIso: _formatDateIso,
    getDefaultResult: getDefaultResult,
    getDefinition: getDefinition,
    getAllDefinitions: getAllDefinitions
  };
})();
