/**
 * ============================================================
 * PHINOX Business Operating System
 * Expenses.gs - Mini ERP: Expenses
 * ============================================================
 */

const EXP_COL = {
  DATE: 0, TYPE: 1, SUPPLIER: 2, DESCRIPTION: 3, AMOUNT: 4, NOTES: 5
};

function ensureExpensesColumns(){
  const sheet = getSheet(APP.SHEETS.EXPENSES);
  const required = ["Date", "Type", "Supplier", "Description", "Amount", "Notes"];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Date"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const h = sheet.getRange(1, 1, 1, required.length);
      h.setValues([required]);
      h.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 160);
    }
  }
}

function addExpense(data){
  ensureExpensesColumns();
  const sheet = getSheet(APP.SHEETS.EXPENSES);
  const row = [
    data.date || now(),
    data.type || MINI_ERP.EXPENSE_TYPES[0],
    data.supplier || "",
    data.description || "",
    toNumber(data.amount),
    data.notes || ""
  ];
  sheet.appendRow(row);
  
  // Auto-log as Expense in Finance if linked
  try{
    addTransaction({
      type: TXN_TYPE.EXPENSE,
      category: row[EXP_COL.TYPE] === "مشتريات" ? "Inventory" : "Operations",
      description: "مصروف: " + row[EXP_COL.DESCRIPTION] + " - " + row[EXP_COL.SUPPLIER],
      amount: row[EXP_COL.AMOUNT],
      date: row[EXP_COL.DATE]
    });
  }catch(e){
    log("Auto-finance link skipped: " + e);
  }
  
  logActivity(getCurrentMember(), "مصروف", APP.SHEETS.EXPENSES, "", "", row[EXP_COL.AMOUNT]);
  showToast("تم تسجيل المصروف");
  return true;
}

function getExpenses(){
  ensureExpensesColumns();
  const sheet = getSheet(APP.SHEETS.EXPENSES);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function totalExpensesMini(start, end){
  var exp = getExpenses();
  if(start && end){
    var s = new Date(start), e = new Date(end);
    exp = exp.filter(function(r){
      var d = new Date(r[EXP_COL.DATE]);
      return d >= s && d <= e;
    });
  }
  return exp.reduce(function(sum, r){ return sum + toNumber(r[EXP_COL.AMOUNT]); }, 0);
}

function expensesByType(){
  var map = {};
  getExpenses().forEach(function(r){
    var t = r[EXP_COL.TYPE] || "أخرى";
    map[t] = (map[t] || 0) + toNumber(r[EXP_COL.AMOUNT]);
  });
  return Object.keys(map).map(function(k){ return [k, map[k]]; });
}

function refreshExpensesDashboard(){
  const cfg = getMiniERPConfig();
  return [
    ["إجمالي المصروفات", formatCurrency(totalExpensesMini(), cfg.currency)],
    ["عدد العمليات", getExpenses().length]
  ];
}