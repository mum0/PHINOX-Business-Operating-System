/**
 * Finance Controller
 * UI layer for Finance Module
 * Phase 6 - PHINOX BOS v5
 */

const FinanceController = (function() {
    'use strict';
  
    function _htmlRow(cells) {
      return '<tr>' + cells.map(function(c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
    }
  
    function _htmlHeader(cells) {
      return '<tr>' + cells.map(function(c) { return '<th style="background:#1a237e;color:#fff;padding:8px;">' + c + '</th>'; }).join('') + '</tr>';
    }
  
    function _escapeHtml(str) {
      return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  
    // ─── STATS DASHBOARD ───
    function showFinanceStats() {
      var ui = SpreadsheetApp.getUi();
      var now = new Date();
      var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      var fmt = function(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); };
  
      var pnl = FinanceService.getProfitAndLoss(fmt(startOfMonth), fmt(now));
      var cashFlow = FinanceService.getCashFlow(fmt(startOfMonth), fmt(now));
      var cashBalance = FinanceService.getCashBalance('Cash', fmt(now));
      var outstanding = FinanceService.getOutstanding(fmt(now));
  
      var html = '<h2>💰 Finance Dashboard</h2>' +
        '<h3>Profit & Loss (MTD)</h3>' +
        '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">' +
        _htmlHeader(['Metric', 'Amount']) +
        _htmlRow(['Revenue', pnl.revenue.toFixed(2)]) +
        _htmlRow(['COGS', pnl.cogs.toFixed(2)]) +
        _htmlRow(['Gross Profit', pnl.grossProfit.toFixed(2)]) +
        _htmlRow(['Operating Expenses', pnl.operatingExpenses.toFixed(2)]) +
        _htmlRow(['Net Profit', pnl.netProfit.toFixed(2)]) +
        '</table>' +
        '<h3>Cash Flow (MTD)</h3>' +
        '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">' +
        _htmlHeader(['Metric', 'Amount']) +
        _htmlRow(['Cash In', cashFlow.cashIn.toFixed(2)]) +
        _htmlRow(['Cash Out', cashFlow.cashOut.toFixed(2)]) +
        _htmlRow(['Net Cash Flow', cashFlow.netCashFlow.toFixed(2)]) +
        '</table>' +
        '<h3>Position</h3>' +
        '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;">' +
        _htmlHeader(['Metric', 'Amount']) +
        _htmlRow(['Cash Balance', cashBalance.toFixed(2)]) +
        _htmlRow(['Outstanding Receivables', outstanding.toFixed(2)]) +
        '</table>' +
        '<p style="font-size:11px;color:#666;">PHINOX BOS v5.0</p>';
  
      ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(400).setHeight(500), 'Finance Dashboard');
    }
  
    // ─── LEDGER VIEWER ───
    function showLedger() {
      var ui = SpreadsheetApp.getUi();
      var result = FinanceService.getLedger({ limit: 100 });
      var rows = result.data;
  
      var html = '<h2>📒 General Ledger</h2>' +
        '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;width:100%;">' +
        _htmlHeader(['Date', 'Type', 'Category', 'Description', 'Amount', 'Account', 'Status', 'Related']) +
        rows.map(function(r) {
          return _htmlRow([
            _escapeHtml(r.date).split('T')[0],
            _escapeHtml(r.type),
            _escapeHtml(r.category),
            _escapeHtml(r.description),
            _toNumber(r.amount).toFixed(2),
            _escapeHtml(r.account),
            _escapeHtml(r.status),
            _escapeHtml(r.relatedType) + ' ' + _escapeHtml(r.relatedId)
          ]);
        }).join('') +
        '</table>' +
        '<p style="font-size:11px;color:#666;">Showing ' + rows.length + ' entries</p>';
  
      ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(800).setHeight(600), 'General Ledger');
    }
  
    // ─── EXPENSE FORM ───
    function showCreateExpenseForm() {
      var ui = SpreadsheetApp.getUi();
      var response = ui.prompt(
        'Create Expense Request',
        'Enter JSON: {"title":"Office Supplies","category":"Supplies","amount":50,"description":"Printer paper"}',
        ui.ButtonSet.OK_CANCEL
      );
  
      if (response.getSelectedButton() === ui.Button.OK) {
        try {
          var data = JSON.parse(response.getResponseText());
          var id = FinanceService.createExpenseRequest(data);
          ui.alert('Expense created: ' + id);
        } catch (e) {
          ui.alert('Error: ' + e.message);
        }
      }
    }
  
    // ─── APPROVE EXPENSE ───
    function showApproveExpense() {
      var ui = SpreadsheetApp.getUi();
      var response = ui.prompt('Approve Expense', 'Enter Expense ID:', ui.ButtonSet.OK_CANCEL);
      if (response.getSelectedButton() === ui.Button.OK) {
        try {
          var id = response.getResponseText().trim();
          FinanceService.approveExpenseRequest(id);
          ui.alert('Expense ' + id + ' approved.');
        } catch (e) {
          ui.alert('Error: ' + e.message);
        }
      }
    }
  
    // ─── POST EXPENSE TO LEDGER ───
    function showPostExpense() {
      var ui = SpreadsheetApp.getUi();
      var response = ui.prompt('Post Expense to Ledger', 'Enter Expense ID:', ui.ButtonSet.OK_CANCEL);
      if (response.getSelectedButton() === ui.Button.OK) {
        try {
          var id = response.getResponseText().trim();
          FinanceService.postExpenseToLedger(id);
          ui.alert('Expense ' + id + ' posted to ledger.');
        } catch (e) {
          ui.alert('Error: ' + e.message);
        }
      }
    }
  
    function _toNumber(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  
    return {
      showFinanceStats: showFinanceStats,
      showLedger: showLedger,
      showCreateExpenseForm: showCreateExpenseForm,
      showApproveExpense: showApproveExpense,
      showPostExpense: showPostExpense
    };
  })();