/**
 * ============================================================
 * PHINOX Business Operating System
 * Sales.gs - Mini ERP: Sales & Invoices
 * ============================================================
 */

const SALE_COL = {
  INVOICE: 0, DATE: 1, CUSTOMER: 2, DESCRIPTION: 3,
  AMOUNT: 4, PAYMENT: 5, NOTES: 6
};

function ensureSalesColumns(){
  const sheet = getSheet(APP.SHEETS.SALES);
  const required = ["Invoice", "Date", "Customer", "Description", "Amount", "Payment", "Notes"];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Invoice"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const h = sheet.getRange(1, 1, 1, required.length);
      h.setValues([required]);
      h.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 160);
    }
  }
}

function addSale(data){
  ensureSalesColumns();
  const cfg = getMiniERPConfig();
  const sheet = getSheet(APP.SHEETS.SALES);
  const row = [
    data.invoice || generateId("INV"),
    data.date || now(),
    data.customer || "",
    data.description || "",
    toNumber(data.amount),
    data.payment || MINI_ERP.PAYMENT_METHODS[0],
    data.notes || ""
  ];
  sheet.appendRow(row);
  
  // Auto-log as Income in Finance if linked
  try{
    addTransaction({
      type: TXN_TYPE.INCOME,
      category: "Sales",
      description: "فاتورة مبيعات: " + row[SALE_COL.INVOICE] + " - " + row[SALE_COL.CUSTOMER],
      amount: row[SALE_COL.AMOUNT],
      date: row[SALE_COL.DATE]
    });
  }catch(e){
    log("Auto-finance link skipped: " + e);
  }
  
  logActivity(getCurrentMember(), "فاتورة مبيعات", APP.SHEETS.SALES, row[SALE_COL.INVOICE], "", row[SALE_COL.AMOUNT]);
  showToast("تم حفظ الفاتورة: " + row[SALE_COL.INVOICE]);
  return row[SALE_COL.INVOICE];
}

function getSales(){
  ensureSalesColumns();
  const sheet = getSheet(APP.SHEETS.SALES);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getSale(invoiceId){
  return getSales().find(function(s){ return s[SALE_COL.INVOICE] === invoiceId; }) || null;
}

function totalSales(start, end){
  var sales = getSales();
  if(start && end){
    var s = new Date(start), e = new Date(end);
    sales = sales.filter(function(r){
      var d = new Date(r[SALE_COL.DATE]);
      return d >= s && d <= e;
    });
  }
  return sales.reduce(function(sum, r){ return sum + toNumber(r[SALE_COL.AMOUNT]); }, 0);
}

function salesByMonth(){
  var map = {};
  getSales().forEach(function(r){
    var key = toMonthKey(new Date(r[SALE_COL.DATE]));
    if(!key) return;
    map[key] = (map[key] || 0) + toNumber(r[SALE_COL.AMOUNT]);
  });
  return Object.keys(map).sort().map(function(k){ return [k, map[k]]; });
}

function refreshSalesDashboard(){
  const cfg = getMiniERPConfig();
  const total = totalSales();
  const count = getSales().length;
  return [
    ["إجمالي المبيعات", formatCurrency(total, cfg.currency)],
    ["عدد الفواتير", count],
    ["متوسط الفاتورة", formatCurrency(total / (count || 1), cfg.currency)]
  ];
}