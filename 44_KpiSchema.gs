/**
 * KPI Schema
 * Phase 8C/D: 81 KPIs
 */
var KpiSchema = (function() {
  'use strict';

  const RESULT_SCHEMA = Object.freeze({ id: 1, kpiId: 2, name: 3, value: 4, period: 5, date: 6, sheet: 7, createdAt: 8 });
  const PERIOD = Object.freeze({ DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly' });
  const CATEGORY = Object.freeze({
    FINANCE: 'Finance', SALES: 'Sales', INVENTORY: 'Inventory', OPERATIONS: 'Operations',
    MARKETING: 'Marketing', SOCIAL_MEDIA: 'Social Media', PERFORMANCE: 'Performance', CUSTOMER: 'Customer'
  });
  const STATUS = Object.freeze({
    OK: 'OK', WARNING: 'Warning', CRITICAL: 'Critical', NO_TARGET: 'No Target', INSUFFICIENT_DATA: 'Insufficient Data'
  });

  function _def(name, category, unit, period, formula, description) {
    return { name: name, category: category, unit: unit, period: period, formula: formula, description: description };
  }

  var DEFINITIONS = {
    'FIN-01': _def('Revenue', CATEGORY.FINANCE, 'EGP', PERIOD.MONTHLY, 'SUM(Finance Ledger.amount WHERE type = Revenue)', 'Total accrual revenue for the period'),
    'FIN-02': _def('COGS', CATEGORY.FINANCE, 'EGP', PERIOD.MONTHLY, 'ABS(SUM(Finance Ledger.amount WHERE type = COGS))', 'Cost of goods sold for the period'),
    'FIN-03': _def('Gross Profit', CATEGORY.FINANCE, 'EGP', PERIOD.MONTHLY, 'Revenue - COGS', 'Gross profit before operating expenses'),
    'FIN-04': _def('Net Profit', CATEGORY.FINANCE, 'EGP', PERIOD.MONTHLY, 'Gross Profit - Operating Expenses', 'Net profit after all expenses'),
    'FIN-05': _def('Gross Margin', CATEGORY.FINANCE, '%', PERIOD.MONTHLY, 'IF(Revenue > 0, (Gross Profit / Revenue) * 100, 0)', 'Gross profit as percentage of revenue'),
    'FIN-06': _def('Net Margin', CATEGORY.FINANCE, '%', PERIOD.MONTHLY, 'IF(Revenue > 0, (Net Profit / Revenue) * 100, 0)', 'Net profit as percentage of revenue'),
    'FIN-07': _def('Cash Balance', CATEGORY.FINANCE, 'EGP', PERIOD.DAILY, 'Cash In - ABS(Cash Out + Refund + Expense + Adjustment)', 'Net cash position as of date'),
    'FIN-08': _def('Net Cash Flow', CATEGORY.FINANCE, 'EGP', PERIOD.MONTHLY, 'Cash In + Cash Out (Cash Out is negative)', 'Net cash movement for the period'),
    'FIN-09': _def('Revenue Growth', CATEGORY.FINANCE, '%', PERIOD.MONTHLY, '((Current Revenue - Previous Period Revenue) / Previous) * 100', 'Month-over-month revenue growth percentage'),
    'FIN-10': _def('Profit Growth', CATEGORY.FINANCE, '%', PERIOD.MONTHLY, '((Current Net Profit - Previous Period Net Profit) / Previous) * 100', 'Month-over-month net profit growth percentage'),

    'SALE-01': _def('Total Orders', CATEGORY.SALES, 'count', PERIOD.MONTHLY, 'COUNT(Orders)', 'Total number of orders placed'),
    'SALE-02': _def('Completed Orders', CATEGORY.SALES, 'count', PERIOD.MONTHLY, "COUNT(Orders WHERE status = 'Delivered')", 'Orders successfully delivered'),
    'SALE-03': _def('Order Conversion Rate', CATEGORY.SALES, '%', PERIOD.MONTHLY, 'IF(Total Orders > 0, (Completed / Total) * 100, 0)', 'Percentage of orders converted to delivered'),
    'SALE-04': _def('Average Order Value', CATEGORY.SALES, 'EGP', PERIOD.MONTHLY, 'IF(Total Orders > 0, SUM(totalAmount) / COUNT, 0)', 'Average monetary value per order'),
    'SALE-05': _def('Repeat Purchase Rate', CATEGORY.SALES, '%', PERIOD.MONTHLY, 'IF(Total Customers > 0, (Repeat Customers / Total) * 100, 0)', 'Customers with more than one order'),
    'SALE-06': _def('Refund Rate', CATEGORY.SALES, '%', PERIOD.MONTHLY, 'IF(Revenue > 0, (Total Refunded / Revenue) * 100, 0)', 'Refunds as percentage of revenue'),
    'SALE-07': _def('Cancellation Rate', CATEGORY.SALES, '%', PERIOD.MONTHLY, 'IF(Total Orders > 0, (Cancelled / Total) * 100, 0)', 'Cancelled orders as percentage of total'),

    'INV-01': _def('Low Stock Items', CATEGORY.INVENTORY, 'count', PERIOD.DAILY, 'COUNT(Inventory WHERE quantity <= reorderLevel AND quantity > 0)', 'Items at or below reorder threshold'),
    'INV-02': _def('Out of Stock Items', CATEGORY.INVENTORY, 'count', PERIOD.DAILY, 'COUNT(Inventory WHERE quantity = 0)', 'Items with zero available quantity'),
    'INV-03': _def('Inventory Value (Cost)', CATEGORY.INVENTORY, 'EGP', PERIOD.DAILY, 'SUM(quantity * cost)', 'Total inventory value at cost basis'),
    'INV-04': _def('Inventory Retail Value', CATEGORY.INVENTORY, 'EGP', PERIOD.DAILY, 'SUM(quantity * price)', 'Total inventory value at retail price'),
    'INV-05': _def('Stock Availability Rate', CATEGORY.INVENTORY, '%', PERIOD.DAILY, 'IF(Total SKUs > 0, ((Total - Out of Stock) / Total) * 100, 0)', 'Percentage of SKUs currently in stock'),

    'OPS-01': _def('Active Members', CATEGORY.OPERATIONS, 'count', PERIOD.MONTHLY, "COUNT(Members WHERE status = 'Active')", 'Currently active team members'),
    'OPS-02': _def('Team Size', CATEGORY.OPERATIONS, 'count', PERIOD.MONTHLY, 'COUNT(Members)', 'Total number of team members'),
    'OPS-03': _def('Task Completion Rate', CATEGORY.OPERATIONS, '%', PERIOD.MONTHLY, "IF(Total Tasks > 0, (Approved / Total) * 100, 0)", 'Tasks approved as percentage of total'),
    'OPS-04': _def('Task Overdue Rate', CATEGORY.OPERATIONS, '%', PERIOD.MONTHLY, 'IF(Total Tasks > 0, (Overdue / Total) * 100, 0)', 'Tasks past due date as percentage of total'),

    'MKT-01': _def('Ad Spend', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'SUM(Marketing Spend.spend)', 'Total advertising spend for the period'),
    'MKT-02': _def('Impressions', CATEGORY.MARKETING, 'count', PERIOD.MONTHLY, 'SUM(Marketing Spend.impressions)', 'Total ad impressions for the period'),
    'MKT-03': _def('Reach', CATEGORY.MARKETING, 'count', PERIOD.MONTHLY, 'SUM(Marketing Spend.reach)', 'Total ad reach for the period'),
    'MKT-04': _def('Clicks', CATEGORY.MARKETING, 'count', PERIOD.MONTHLY, 'SUM(Marketing Spend.clicks)', 'Total ad clicks for the period'),
    'MKT-05': _def('CTR', CATEGORY.MARKETING, '%', PERIOD.MONTHLY, 'IF(impressions > 0, (clicks / impressions) * 100, 0)', 'Click-through rate'),
    'MKT-06': _def('CPC', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'IF(clicks > 0, spend / clicks, 0)', 'Cost per click'),
    'MKT-07': _def('CPM', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'IF(impressions > 0, (spend / impressions) * 1000, 0)', 'Cost per thousand impressions'),
    'MKT-08': _def('Leads', CATEGORY.MARKETING, 'count', PERIOD.MONTHLY, 'SUM(Marketing Spend.leads)', 'Total leads generated'),
    'MKT-09': _def('Conversions', CATEGORY.MARKETING, 'count', PERIOD.MONTHLY, 'SUM(Marketing Spend.conversions)', 'Total conversions attributed to ads'),
    'MKT-10': _def('Conversion Rate', CATEGORY.MARKETING, '%', PERIOD.MONTHLY, 'IF(clicks > 0, (conversions / clicks) * 100, 0)', 'Conversions as percentage of clicks'),
    'MKT-11': _def('CPA', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'IF(conversions > 0, spend / conversions, 0)', 'Cost per acquisition (conversion)'),
    'MKT-12': _def('Cost per Lead', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'IF(leads > 0, spend / leads, 0)', 'Cost per lead'),
    'MKT-13': _def('ROAS', CATEGORY.MARKETING, 'x', PERIOD.MONTHLY, 'IF(spend > 0, attributedRevenue / spend, 0)', 'Return on ad spend'),
    'MKT-14': _def('ROI', CATEGORY.MARKETING, '%', PERIOD.MONTHLY, 'IF(totalCost > 0, ((attributedRevenue - totalCost) / totalCost) * 100, 0)', 'Return on investment for marketing'),
    'MKT-15': _def('CAC', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'IF(newCustomers > 0, totalAcquisitionCost / newCustomers, 0)', 'Customer acquisition cost'),
    'MKT-16': _def('LTV', CATEGORY.MARKETING, 'EGP', PERIOD.MONTHLY, 'Total Revenue / Total Unique Customers', 'Lifetime value'),
    'MKT-17': _def('LTV:CAC Ratio', CATEGORY.MARKETING, 'x', PERIOD.MONTHLY, 'IF(CAC > 0, LTV / CAC, 0)', 'Lifetime value to CAC ratio'),
    'MKT-18': _def('Payback Period', CATEGORY.MARKETING, 'months', PERIOD.MONTHLY, 'IF(monthlyProfitPerCustomer > 0, CAC / monthlyProfitPerCustomer, 0)', 'CAC payback period'),

    'SOC-01': _def('Followers', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'Followers at end of period', 'Total followers'),
    'SOC-02': _def('Follower Growth', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'End followers - Start followers', 'Change in follower count'),
    'SOC-03': _def('Reach (Organic)', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(Social Media Performance.reach)', 'Organic reach'),
    'SOC-04': _def('Impressions (Organic)', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(Social Media Performance.impressions)', 'Organic impressions'),
    'SOC-05': _def('Engagements', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(likes + comments + shares + saves)', 'Total engagements'),
    'SOC-06': _def('Engagement Rate', CATEGORY.SOCIAL_MEDIA, '%', PERIOD.DAILY, 'IF(impressions > 0, (engagements / impressions) * 100, 0)', 'Engagement rate'),
    'SOC-07': _def('Likes', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(likes)', 'Total likes'),
    'SOC-08': _def('Comments', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(comments)', 'Total comments'),
    'SOC-09': _def('Shares', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(shares)', 'Total shares'),
    'SOC-10': _def('Saves', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(saves)', 'Total saves'),
    'SOC-11': _def('Video Views', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(videoViews)', 'Total video views'),
    'SOC-12': _def('Profile Visits', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(profileVisits)', 'Total profile visits'),
    'SOC-13': _def('Link Clicks', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(linkClicks)', 'Total link clicks'),
    'SOC-14': _def('Social Leads', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(leads)', 'Total leads from social'),
    'SOC-15': _def('Social Attributed Purchases', CATEGORY.SOCIAL_MEDIA, 'count', PERIOD.DAILY, 'SUM(purchases)', 'Purchases attributed to social'),
    'SOC-16': _def('Social Attributed Revenue', CATEGORY.SOCIAL_MEDIA, 'EGP', PERIOD.DAILY, 'SUM(attributedRevenue)', 'Revenue attributed to social'),

    'PERF-01': _def('Tasks Completed', CATEGORY.PERFORMANCE, 'count', PERIOD.MONTHLY, 'Completed tasks in period', 'Total tasks completed in period'),
    'PERF-02': _def('Tasks Approved', CATEGORY.PERFORMANCE, 'count', PERIOD.MONTHLY, 'Approved tasks in period', 'Tasks approved in period'),
    'PERF-03': _def('Approval Rate', CATEGORY.PERFORMANCE, '%', PERIOD.MONTHLY, '(Approved / Completed) * 100', 'Percentage of completed tasks approved'),
    'PERF-04': _def('Avg Completion Time', CATEGORY.PERFORMANCE, 'days', PERIOD.MONTHLY, 'Average completion time', 'Average time from creation to completion'),
    'PERF-05': _def('On-Time Rate', CATEGORY.PERFORMANCE, '%', PERIOD.MONTHLY, '(On time / Completed) * 100', 'Percentage of tasks completed on or before due date'),
    'PERF-06': _def('Overdue Rate', CATEGORY.PERFORMANCE, '%', PERIOD.MONTHLY, '(Overdue / Total) * 100', 'Percentage of tasks overdue'),
    'PERF-07': _def('Member Utilization', CATEGORY.PERFORMANCE, '%', PERIOD.MONTHLY, 'Average load across members', 'Average task load per active member'),
    'PERF-08': _def('Member Efficiency Score', CATEGORY.PERFORMANCE, 'score', PERIOD.MONTHLY, 'Weighted efficiency per member', 'Weighted efficiency per member'),
    'PERF-09': _def('Department Performance', CATEGORY.PERFORMANCE, 'score', PERIOD.MONTHLY, 'Average performance by department', 'Average performance by department'),
    'PERF-10': _def('Task Quality Score', CATEGORY.PERFORMANCE, 'score', PERIOD.MONTHLY, 'Average quality rating', 'Average quality rating of tasks'),
    'PERF-11': _def('Workload Balance', CATEGORY.PERFORMANCE, 'index', PERIOD.MONTHLY, 'Std dev of task distribution', 'Standard deviation of task distribution across members'),

    'CUST-01': _def('Total Customers', CATEGORY.CUSTOMER, 'customers', PERIOD.MONTHLY, 'Unique customers', 'Total unique customers'),
    'CUST-02': _def('New Customers', CATEGORY.CUSTOMER, 'customers', PERIOD.MONTHLY, 'First-time customers', 'First-time customers in period'),
    'CUST-03': _def('Returning Customers', CATEGORY.CUSTOMER, 'customers', PERIOD.MONTHLY, 'Customers with >1 order', 'Customers with more than one order'),
    'CUST-04': _def('Retention Rate', CATEGORY.CUSTOMER, '%', PERIOD.MONTHLY, 'Returning / Total', 'Percentage of customers who returned'),
    'CUST-05': _def('Average Customer LTV', CATEGORY.CUSTOMER, 'EGP', PERIOD.MONTHLY, 'Average lifetime value', 'Average lifetime value per customer'),
    'CUST-06': _def('Order Frequency', CATEGORY.CUSTOMER, 'orders', PERIOD.MONTHLY, 'Orders per customer', 'Average orders per customer'),
    'CUST-07': _def('Customer Acquisition Cost', CATEGORY.CUSTOMER, 'EGP', PERIOD.MONTHLY, 'Marketing spend / new customers', 'Marketing spend divided by new customers'),
    'CUST-08': _def('Customer Satisfaction', CATEGORY.CUSTOMER, 'score', PERIOD.MONTHLY, 'Average score 1-10', 'Average satisfaction score (1-10)'),
    'CUST-09': _def('Net Promoter Score', CATEGORY.CUSTOMER, 'score', PERIOD.MONTHLY, 'Promoters% - Detractors%', 'NPS'),
    'CUST-10': _def('Churn Rate', CATEGORY.CUSTOMER, '%', PERIOD.MONTHLY, 'Churned / Total', 'Percentage of customers lost')
  };

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
    var y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    switch (periodType) {
      case PERIOD.DAILY: return new Date(y, m, day);
      case PERIOD.WEEKLY: return new Date(y, m, day - d.getDay());
      case PERIOD.MONTHLY: return new Date(y, m, 1);
      case PERIOD.QUARTERLY: return new Date(y, Math.floor(m / 3) * 3, 1);
      case PERIOD.YEARLY: return new Date(y, 0, 1);
      default: return new Date(y, m, 1);
    }
  }
  function _periodEnd(periodType, refDate) {
    var start = _periodStart(periodType, refDate);
    var y = start.getFullYear(), m = start.getMonth(), d = start.getDate();
    switch (periodType) {
      case PERIOD.DAILY: return new Date(y, m, d, 23, 59, 59);
      case PERIOD.WEEKLY: return new Date(y, m, d + 6, 23, 59, 59);
      case PERIOD.MONTHLY: return new Date(y, m + 1, 0, 23, 59, 59);
      case PERIOD.QUARTERLY: return new Date(y, m + 3, 0, 23, 59, 59);
      case PERIOD.YEARLY: return new Date(y, 11, 31, 23, 59, 59);
      default: return new Date(y, m + 1, 0, 23, 59, 59);
    }
  }
  function _periodKey(periodType, refDate) {
    var start = _periodStart(periodType, refDate);
    var y = start.getFullYear();
    var m = start.getMonth() + 1;
    var d = start.getDate();
    switch (periodType) {
      case PERIOD.DAILY: return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
      case PERIOD.WEEKLY:
        var oneJan = new Date(y, 0, 1);
        var weekNum = Math.ceil((((start - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
        return y + '-W' + (weekNum < 10 ? '0' + weekNum : weekNum);
      case PERIOD.MONTHLY: return y + '-' + (m < 10 ? '0' + m : m);
      case PERIOD.QUARTERLY: return y + '-Q' + (Math.floor((m - 1) / 3) + 1);
      case PERIOD.YEARLY: return String(y);
      default: return y + '-' + (m < 10 ? '0' + m : m);
    }
  }
  function _formatDateIso(d) {
    if (!d) return '';
    var dt = new Date(d);
    var y = dt.getFullYear(), m = dt.getMonth() + 1, day = dt.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function getDefaultResult() { return { period: PERIOD.MONTHLY, sheet: 'KPI Results', value: 0 }; }
  function getDefinition(kpiId) { return DEFINITIONS[kpiId] || null; }
  function getAllDefinitions() {
    return Object.keys(DEFINITIONS).map(function(k) {
      var def = DEFINITIONS[k];
      return { kpiId: k, name: def.name, category: def.category, unit: def.unit, period: def.period };
    });
  }
  console.log('KpiSchema loaded with ' + Object.keys(DEFINITIONS).length + ' KPIs');
  return { RESULT_SCHEMA: RESULT_SCHEMA, PERIOD: PERIOD, CATEGORY: CATEGORY, STATUS: STATUS, DEFINITIONS: DEFINITIONS, RESULT_VALIDATION: RESULT_VALIDATION, _periodStart: _periodStart, _periodEnd: _periodEnd, _periodKey: _periodKey, _formatDateIso: _formatDateIso, getDefaultResult: getDefaultResult, getDefinition: getDefinition, getAllDefinitions: getAllDefinitions };
})();