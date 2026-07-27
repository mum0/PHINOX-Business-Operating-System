/**
 * ============================================================
 * PHINOX Business Operating System
 * Finance.gs - Part 1
 * إدارة المعاملات المالية والدفتر اليومي
 * ============================================================
 */

const FIN_COL = { TXN_ID: 0, DATE: 1, TYPE: 2, CATEGORY: 3, DESCRIPTION: 4, AMOUNT: 5, BALANCE: 6 };

const TXN_TYPE = { INCOME: "Income", EXPENSE: "Expense" };

const INCOME_CATEGORIES = ["Sales", "Refunds", "Investment", "Other Income"];
const EXPENSE_CATEGORIES = ["Inventory", "Salaries", "Marketing", "Operations", "Shipping", "Utilities", "Rent", "Other Expense"];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

function ensureFinanceColumns(){
  const sheet = getSheet(APP.SHEETS.FINANCE);
  const required = ["Transaction ID", "Date", "Type", "Category", "Description", "Amount", "Balance"];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Transaction ID"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const header = sheet.getRange(1, 1, 1, required.length);
      header.setValues([required]);
      header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 160);
    }
  }
}

function addTransaction(txn){
  ensureFinanceColumns();
  const sheet = getSheet(APP.SHEETS.FINANCE);
  const amount = Math.abs(toNumber(txn.amount));
  const type = txn.type === TXN_TYPE.EXPENSE ? TXN_TYPE.EXPENSE : TXN_TYPE.INCOME;
  if(!ALL_CATEGORIES.includes(txn.category)) throw new Error(t("fin_invalid_category") + ": " + txn.category);
  const row = [generateId("FIN"), txn.date || now(), type, txn.category, txn.description || "", amount, 0];
  sheet.appendRow(row);
  recalculateBalances();
  logActivity(getCurrentMember(), t("fin_txn"), APP.SHEETS.FINANCE, row[FIN_COL.TXN_ID], "", type + " " + amount + " " + APP.INFO.CURRENCY);
  return row[FIN_COL.TXN_ID];
}

function getTransactions(){
  ensureFinanceColumns();
  const sheet = getSheet(APP.SHEETS.FINANCE);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getTransaction(txnId){
  const txns = getTransactions();
  for(const t of txns){ if(t[FIN_COL.TXN_ID] === txnId) return t; }
  return null;
}

function getTransactionsByType(type){ return getTransactions().filter(t => t[FIN_COL.TYPE] === type); }
function getTransactionsByCategory(category){ return getTransactions().filter(t => t[FIN_COL.CATEGORY] === category); }

function getTransactionsByDateRange(start, end){
  const s = new Date(start), e = new Date(end);
  return getTransactions().filter(t => { const d = new Date(t[FIN_COL.DATE]); return d >= s && d <= e; });
}

function updateTransaction(txnId, updates){
  const sheet = getSheet(APP.SHEETS.FINANCE);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][FIN_COL.TXN_ID] === txnId){
      const row = data[i];
      const map = { date: FIN_COL.DATE, type: FIN_COL.TYPE, category: FIN_COL.CATEGORY, description: FIN_COL.DESCRIPTION, amount: FIN_COL.AMOUNT };
      Object.keys(updates).forEach(key => { if(map[key] !== undefined) row[map[key]] = updates[key]; });
      if(updates.amount !== undefined) row[FIN_COL.AMOUNT] = Math.abs(toNumber(updates.amount));
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      recalculateBalances();
      logActivity(getCurrentMember(), t("fin_txn_update"), APP.SHEETS.FINANCE, txnId, "", "");
      return true;
    }
  }
  return false;
}

function deleteTransaction(txnId){
  const sheet = getSheet(APP.SHEETS.FINANCE);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][FIN_COL.TXN_ID] === txnId){
      sheet.deleteRow(i + 1);
      recalculateBalances();
      logActivity(getCurrentMember(), t("fin_txn_delete"), APP.SHEETS.FINANCE, txnId, "", "");
      return true;
    }
  }
  return false;
}

function recalculateBalances(){
  const sheet = getSheet(APP.SHEETS.FINANCE);
  const lastRow = sheet.getLastRow();
  if(lastRow <= 1) return;
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let balance = 0;
  const balances = [];
  for(let i = 0; i < data.length; i++){
    const type = data[i][FIN_COL.TYPE];
    const amount = toNumber(data[i][FIN_COL.AMOUNT]);
    if(type === TXN_TYPE.INCOME) balance += amount; else balance -= amount;
    balances.push([round(balance, 2)]);
  }
  if(balances.length > 0) sheet.getRange(2, 7, balances.length, 1).setValues(balances);
}

function currentBalance(){
  const txns = getTransactions();
  if(txns.length === 0) return 0;
  return toNumber(txns[txns.length - 1][FIN_COL.BALANCE]);
}

function totalIncome(start, end){
  let txns = getTransactionsByType(TXN_TYPE.INCOME);
  if(start && end){
    const s = new Date(start), e = new Date(end);
    txns = txns.filter(t => { const d = new Date(t[FIN_COL.DATE]); return d >= s && d <= e; });
  }
  let total = 0;
  txns.forEach(t => { total += toNumber(t[FIN_COL.AMOUNT]); });
  return round(total, 2);
}

function totalExpenses(start, end){
  let txns = getTransactionsByType(TXN_TYPE.EXPENSE);
  if(start && end){
    const s = new Date(start), e = new Date(end);
    txns = txns.filter(t => { const d = new Date(t[FIN_COL.DATE]); return d >= s && d <= e; });
  }
  let total = 0;
  txns.forEach(t => { total += toNumber(t[FIN_COL.AMOUNT]); });
  return round(total, 2);
}

function netProfit(start, end){ return round(totalIncome(start, end) - totalExpenses(start, end), 2); }
function isProfitable(start, end){ return netProfit(start, end) > 0; }
/**
 * ============================================================
 * PHINOX Business Operating System
 * Finance.gs - Part 2
 * الميزانية والتدفق النقدي
 * ============================================================
 */

const BUDGET_SHEET = "Budget";
const BUD_COL = { BUDGET_ID: 0, CATEGORY: 1, TYPE: 2, MONTH: 3, YEAR: 4, BUDGETED: 5, ACTUAL: 6, VARIANCE: 7, CREATED_AT: 8 };

function ensureBudgetSheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(BUDGET_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(BUDGET_SHEET);
    const headers = ["Budget ID", "Category", "Type", "Month", "Year", "Budgeted", "Actual", "Variance", "Created At"];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 140);
  }
  return sheet;
}

function setBudget(category, type, month, year, amount){
  ensureBudgetSheet();
  if(!ALL_CATEGORIES.includes(category)) throw new Error(t("fin_invalid_category"));
  month = Number(month); year = Number(year);
  const sheet = getSpreadsheet().getSheetByName(BUDGET_SHEET);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][BUD_COL.CATEGORY] === category && Number(data[i][BUD_COL.MONTH]) === month && Number(data[i][BUD_COL.YEAR]) === year){
      const row = data[i];
      row[BUD_COL.BUDGETED] = toNumber(amount);
      row[BUD_COL.ACTUAL] = getActualForCategory(category, month, year);
      row[BUD_COL.VARIANCE] = round(row[BUD_COL.BUDGETED] - row[BUD_COL.ACTUAL], 2);
      row[BUD_COL.TYPE] = type;
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return row[BUD_COL.BUDGET_ID];
    }
  }
  const actual = getActualForCategory(category, month, year);
  const budgeted = toNumber(amount);
  const row = [generateId("BUD"), category, type, month, year, budgeted, actual, round(budgeted - actual, 2), now()];
  sheet.appendRow(row);
  return row[BUD_COL.BUDGET_ID];
}

function getActualForCategory(category, month, year){
  const txns = getTransactionsByCategory(category).filter(t => {
    const d = new Date(t[FIN_COL.DATE]);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
  let total = 0;
  txns.forEach(t => { total += toNumber(t[FIN_COL.AMOUNT]); });
  return round(total, 2);
}

function getBudgets(){
  ensureBudgetSheet();
  const sheet = getSpreadsheet().getSheetByName(BUDGET_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getMonthlyBudget(month, year){
  month = Number(month); year = Number(year);
  return getBudgets().filter(b => Number(b[BUD_COL.MONTH]) === month && Number(b[BUD_COL.YEAR]) === year);
}

function recalculateAllBudgets(){
  ensureBudgetSheet();
  const sheet = getSpreadsheet().getSheetByName(BUDGET_SHEET);
  const data = sheet.getDataRange().getValues();
  const updates = [];
  for(let i = 1; i < data.length; i++){
    const row = data[i];
    const actual = getActualForCategory(row[BUD_COL.CATEGORY], Number(row[BUD_COL.MONTH]), Number(row[BUD_COL.YEAR]));
    const variance = round(toNumber(row[BUD_COL.BUDGETED]) - actual, 2);
    if(row[BUD_COL.ACTUAL] !== actual || row[BUD_COL.VARIANCE] !== variance){
      row[BUD_COL.ACTUAL] = actual;
      row[BUD_COL.VARIANCE] = variance;
      updates.push({row: i + 1, values: row});
    }
  }
  updates.forEach(u => { sheet.getRange(u.row, 1, 1, u.values.length).setValues([u.values]); });
}

function checkBudgetAlerts(){
  const budgets = getBudgets();
  const alerts = [];
  budgets.forEach(b => {
    const actual = toNumber(b[BUD_COL.ACTUAL]);
    const budgeted = toNumber(b[BUD_COL.BUDGETED]);
    if(actual > budgeted){
      alerts.push({category: b[BUD_COL.CATEGORY], month: b[BUD_COL.MONTH], year: b[BUD_COL.YEAR], budgeted: budgeted, actual: actual, overBy: round(actual - budgeted, 2)});
      try{
        createNotification("Finance", "System", t("fin_budget_alert"), b[BUD_COL.CATEGORY] + " " + t("fin_over_budget") + " " + round(actual - budgeted, 2) + " " + APP.INFO.CURRENCY);
      }catch(e){ log("Notification skipped: " + e); }
    }
  });
  return alerts;
}

function getMonthlyCashFlow(year){
  const months = [];
  for(let m = 1; m <= 12; m++){
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0);
    const income = totalIncome(start, end);
    const expense = totalExpenses(start, end);
    months.push({month: m, income: income, expense: expense, net: round(income - expense, 2)});
  }
  return months;
}

function getCashFlow(start, end){
  const income = totalIncome(start, end);
  const expense = totalExpenses(start, end);
  return {period: {start: start, end: end}, inflow: income, outflow: expense, net: round(income - expense, 2)};
}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Finance.gs - Part 3
 * التقارير والمؤشرات ولوحة التحكم
 * ============================================================
 */

function generateMonthlyReport(month, year){
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const income = totalIncome(start, end);
  const expense = totalExpenses(start, end);
  const profit = netProfit(start, end);
  const budgets = getMonthlyBudget(month, year);
  let budgetVariance = 0;
  budgets.forEach(b => { budgetVariance += toNumber(b[BUD_COL.VARIANCE]); });
  return {
    month: month, year: year, income: income, expense: expense, profit: profit,
    profitMargin: income > 0 ? round(profit / income * 100, 2) : 0,
    budgets: budgets.length, budgetVariance: round(budgetVariance, 2),
    transactionCount: getTransactionsByDateRange(start, end).length
  };
}

function getFinancialKPIs(){
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 0);
  const income = totalIncome(monthStart, monthEnd);
  const expense = totalExpenses(monthStart, monthEnd);
  const profit = netProfit(monthStart, monthEnd);
  const allTxns = getTransactions();
  const totalAllIncome = totalIncome();
  const totalAllExpense = totalExpenses();
  const allProfit = netProfit();
  return {
    currentBalance: currentBalance(), monthlyIncome: income, monthlyExpense: expense, monthlyProfit: profit,
    monthlyProfitMargin: income > 0 ? round(profit / income * 100, 2) : 0,
    totalIncome: totalAllIncome, totalExpense: totalAllExpense, totalProfit: allProfit,
    expenseRatio: totalAllIncome > 0 ? round(totalAllExpense / totalAllIncome * 100, 2) : 0,
    transactionCount: allTxns.length,
    averageTransaction: allTxns.length > 0 ? round(totalAllIncome / allTxns.length, 2) : 0,
    burnRate: round(totalExpenses(new Date(now.getFullYear(), now.getMonth() - 3, 1), now) / 3, 2)
  };
}

function buildFinanceDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const kpis = getFinancialKPIs();
  dashboard.appendRow([]);
  dashboard.appendRow([t("fin_kpi_title"), ""]);
  dashboard.appendRow([t("fin_current_balance"), kpis.currentBalance]);
  dashboard.appendRow([t("fin_monthly_income"), kpis.monthlyIncome]);
  dashboard.appendRow([t("fin_monthly_expense"), kpis.monthlyExpense]);
  dashboard.appendRow([t("fin_monthly_profit"), kpis.monthlyProfit]);
  dashboard.appendRow([t("fin_profit_margin"), kpis.monthlyProfitMargin + "%"]);
  dashboard.appendRow([]);
  dashboard.appendRow([t("fin_total_income"), kpis.totalIncome]);
  dashboard.appendRow([t("fin_total_expense"), kpis.totalExpense]);
  dashboard.appendRow([t("fin_net_profit"), kpis.totalProfit]);
  dashboard.appendRow([t("fin_expense_ratio"), kpis.expenseRatio + "%"]);
  dashboard.appendRow([t("fin_burn_rate"), kpis.burnRate]);
}

function exportFinancialReport(){
  const now = new Date();
  return JSON.stringify({
    generatedAt: now, balance: currentBalance(), kpis: getFinancialKPIs(),
    monthlyFlow: getMonthlyCashFlow(now.getFullYear()),
    topIncomeCategories: getTopCategories(TXN_TYPE.INCOME, 5),
    topExpenseCategories: getTopCategories(TXN_TYPE.EXPENSE, 5)
  }, null, 2);
}

function getTopCategories(type, limit){
  const cats = type === TXN_TYPE.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const result = [];
  cats.forEach(cat => {
    const total = getTransactionsByCategory(cat).filter(t => t[FIN_COL.TYPE] === type).reduce((sum, t) => sum + toNumber(t[FIN_COL.AMOUNT]), 0);
    result.push({category: cat, total: round(total, 2)});
  });
  result.sort((a, b) => b.total - a.total);
  return result.slice(0, limit);
}

function refreshFinance(){
  ensureFinanceColumns();
  recalculateBalances();
  recalculateAllBudgets();
  checkBudgetAlerts();
  buildFinanceDashboard();
}