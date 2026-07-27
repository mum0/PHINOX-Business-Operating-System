/**
 * ============================================================
 * PHINOX Business Operating System
 * Suppliers.gs - Part 1
 * إدارة الموردين والبيانات الأساسية
 * ============================================================
 */

const SUP_COL = {
  SUPPLIER_ID: 0, COMPANY: 1, CONTACT: 2, PHONE: 3, EMAIL: 4,
  MATERIAL: 5, LEAD_TIME: 6, RATING: 7, PAYMENT_TERMS: 8,
  ADDRESS: 9, STATUS: 10, TOTAL_ORDERS: 11, TOTAL_SPENT: 12,
  AVG_DELIVERY_DAYS: 13, NOTES: 14, CREATED_AT: 15, UPDATED_AT: 16
};

const PURCHASE_HISTORY_SHEET = "Purchase History";

const SUPPLIER_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked"
};

function ensureSuppliersColumns(){
  const sheet = getSheet(APP.SHEETS.SUPPLIERS);
  const required = [
    "Supplier ID", "Company", "Contact", "Phone", "Email", "Material",
    "Lead Time", "Rating", "Payment Terms", "Address", "Status",
    "Total Orders", "Total Spent", "Avg Delivery Days", "Notes",
    "Created At", "Updated At"
  ];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Supplier ID"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const header = sheet.getRange(1, 1, 1, required.length);
      header.setValues([required]);
      header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 140);
    }
  }
}

function addSupplier(supplier){
  ensureSuppliersColumns();
  if(!isValidEmail(supplier.email || "")) throw new Error(t("val_invalid_email"));
  const sheet = getSheet(APP.SHEETS.SUPPLIERS);
  const row = [
    generateId("SUP"), supplier.company || "", supplier.contact || "",
    supplier.phone || "", supplier.email || "", supplier.material || "",
    toNumber(supplier.leadTime), clamp(toNumber(supplier.rating), 0, 5),
    supplier.paymentTerms || "Net 30", supplier.address || "",
    SUPPLIER_STATUS.ACTIVE, 0, 0, 0, supplier.notes || "", now(), now()
  ];
  sheet.appendRow(row);
  logActivity(getCurrentMember(), t("sup_add"), APP.SHEETS.SUPPLIERS, row[SUP_COL.SUPPLIER_ID], "", row[SUP_COL.COMPANY]);
  return row[SUP_COL.SUPPLIER_ID];
}

function getSuppliers(){
  ensureSuppliersColumns();
  const sheet = getSheet(APP.SHEETS.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getSupplier(supplierId){
  const suppliers = getSuppliers();
  for(const s of suppliers){ if(s[SUP_COL.SUPPLIER_ID] === supplierId) return s; }
  return null;
}

function getSupplierByCompany(company){
  const suppliers = getSuppliers();
  for(const s of suppliers){ if(s[SUP_COL.COMPANY] === company) return s; }
  return null;
}

function updateSupplier(supplierId, updates){
  const sheet = getSheet(APP.SHEETS.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][SUP_COL.SUPPLIER_ID] === supplierId){
      const row = data[i];
      const oldCompany = row[SUP_COL.COMPANY];
      const map = {
        company: SUP_COL.COMPANY, contact: SUP_COL.CONTACT, phone: SUP_COL.PHONE,
        email: SUP_COL.EMAIL, material: SUP_COL.MATERIAL, leadTime: SUP_COL.LEAD_TIME,
        rating: SUP_COL.RATING, paymentTerms: SUP_COL.PAYMENT_TERMS,
        address: SUP_COL.ADDRESS, status: SUP_COL.STATUS, notes: SUP_COL.NOTES
      };
      Object.keys(updates).forEach(key => { if(map[key] !== undefined) row[map[key]] = updates[key]; });
      if(updates.rating !== undefined) row[SUP_COL.RATING] = clamp(toNumber(updates.rating), 0, 5);
      row[SUP_COL.UPDATED_AT] = now();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      logActivity(getCurrentMember(), t("sup_update"), APP.SHEETS.SUPPLIERS, supplierId, oldCompany, row[SUP_COL.COMPANY]);
      return true;
    }
  }
  return false;
}

function deleteSupplier(supplierId){
  const sheet = getSheet(APP.SHEETS.SUPPLIERS);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][SUP_COL.SUPPLIER_ID] === supplierId){
      sheet.deleteRow(i + 1);
      logActivity(getCurrentMember(), t("sup_delete"), APP.SHEETS.SUPPLIERS, supplierId, "", "");
      return true;
    }
  }
  return false;
}

function activateSupplier(supplierId){ return updateSupplier(supplierId, {status: SUPPLIER_STATUS.ACTIVE}); }
function deactivateSupplier(supplierId){ return updateSupplier(supplierId, {status: SUPPLIER_STATUS.INACTIVE}); }
function blockSupplier(supplierId){ return updateSupplier(supplierId, {status: SUPPLIER_STATUS.BLOCKED}); }

function activeSuppliers(){ return getSuppliers().filter(s => s[SUP_COL.STATUS] === SUPPLIER_STATUS.ACTIVE); }
function totalSuppliers(){ return getSuppliers().length; }
function totalActiveSuppliers(){ return activeSuppliers().length; }

function averageSupplierRating(){
  const suppliers = activeSuppliers();
  if(suppliers.length === 0) return 0;
  let total = 0;
  suppliers.forEach(s => { total += toNumber(s[SUP_COL.RATING]); });
  return round(total / suppliers.length, 1);
}

function averageLeadTime(){
  const suppliers = activeSuppliers();
  if(suppliers.length === 0) return 0;
  let total = 0;
  suppliers.forEach(s => { total += toNumber(s[SUP_COL.LEAD_TIME]); });
  return round(total / suppliers.length);
}/**
 * ============================================================
 * PHINOX Business Operating System
 * Suppliers.gs - Part 2
 * سجل المشتريات وتاريخ التعامل
 * ============================================================
 */

const PUR_COL = {
  PURCHASE_ID: 0, SUPPLIER_ID: 1, ITEM_ID: 2, ITEM_NAME: 3,
  QUANTITY: 4, UNIT_COST: 5, TOTAL_COST: 6, ORDER_DATE: 7,
  DELIVERY_DATE: 8, STATUS: 9, NOTES: 10
};

const PURCHASE_STATUS = {
  ORDERED: "Ordered",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned"
};

function ensurePurchaseHistorySheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(PURCHASE_HISTORY_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(PURCHASE_HISTORY_SHEET);
    const headers = [
      "Purchase ID", "Supplier ID", "Item ID", "Item Name", "Quantity",
      "Unit Cost", "Total Cost", "Order Date", "Delivery Date", "Status", "Notes"
    ];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 140);
  }
  return sheet;
}

function logPurchase(supplierId, purchase){
  ensurePurchaseHistorySheet();
  const sheet = getSpreadsheet().getSheetByName(PURCHASE_HISTORY_SHEET);
  const qty = toNumber(purchase.quantity);
  const unitCost = toNumber(purchase.unitCost);
  const row = [
    generateId("PUR"), supplierId, purchase.itemId || "", purchase.itemName || "",
    qty, unitCost, round(qty * unitCost, 2), purchase.orderDate || now(),
    purchase.deliveryDate || "", purchase.status || PURCHASE_STATUS.ORDERED, purchase.notes || ""
  ];
  sheet.appendRow(row);
  recalculateSupplierStats(supplierId);
  return row[PUR_COL.PURCHASE_ID];
}

function getPurchaseHistory(){
  ensurePurchaseHistorySheet();
  const sheet = getSpreadsheet().getSheetByName(PURCHASE_HISTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getSupplierPurchases(supplierId){
  return getPurchaseHistory().filter(p => p[PUR_COL.SUPPLIER_ID] === supplierId);
}

function updatePurchaseStatus(purchaseId, status, deliveryDate){
  const sheet = getSpreadsheet().getSheetByName(PURCHASE_HISTORY_SHEET);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][PUR_COL.PURCHASE_ID] === purchaseId){
      const row = data[i];
      row[PUR_COL.STATUS] = status;
      if(deliveryDate) row[PUR_COL.DELIVERY_DATE] = deliveryDate;
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      recalculateSupplierStats(row[PUR_COL.SUPPLIER_ID]);
      return true;
    }
  }
  return false;
}

function getSupplierTotalSpent(supplierId){
  const purchases = getSupplierPurchases(supplierId);
  let total = 0;
  purchases.forEach(p => { if(p[PUR_COL.STATUS] !== PURCHASE_STATUS.CANCELLED) total += toNumber(p[PUR_COL.TOTAL_COST]); });
  return round(total, 2);
}

function getSupplierOrderCount(supplierId){
  return getSupplierPurchases(supplierId).filter(p => p[PUR_COL.STATUS] !== PURCHASE_STATUS.CANCELLED).length;
}

function getSupplierActualDeliveryDays(supplierId){
  const purchases = getSupplierPurchases(supplierId).filter(p =>
    p[PUR_COL.STATUS] === PURCHASE_STATUS.DELIVERED && p[PUR_COL.DELIVERY_DATE]
  );
  if(purchases.length === 0) return 0;
  let totalDays = 0;
  purchases.forEach(p => {
    const order = new Date(p[PUR_COL.ORDER_DATE]);
    const delivery = new Date(p[PUR_COL.DELIVERY_DATE]);
    totalDays += Math.floor((delivery - order) / (1000 * 60 * 60 * 24));
  });
  return round(totalDays / purchases.length);
}

function recalculateSupplierStats(supplierId){
  const supplier = getSupplier(supplierId);
  if(!supplier) return;
  const totalOrders = getSupplierOrderCount(supplierId);
  const totalSpent = getSupplierTotalSpent(supplierId);
  const avgDelivery = getSupplierActualDeliveryDays(supplierId);
  updateSupplier(supplierId, {totalOrders: totalOrders, totalSpent: totalSpent, avgDeliveryDays: avgDelivery});
}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Suppliers.gs - Part 3
 * مؤشرات الأداء ولوحة التحكم
 * ============================================================
 */

function getSupplierKPIs(supplierId){
  const supplier = getSupplier(supplierId);
  if(!supplier) return null;
  const purchases = getSupplierPurchases(supplierId);
  const total = purchases.length;
  const delivered = purchases.filter(p => p[PUR_COL.STATUS] === PURCHASE_STATUS.DELIVERED).length;
  const cancelled = purchases.filter(p => p[PUR_COL.STATUS] === PURCHASE_STATUS.CANCELLED).length;
  const returned = purchases.filter(p => p[PUR_COL.STATUS] === PURCHASE_STATUS.RETURNED).length;
  const onTime = purchases.filter(p => {
    if(p[PUR_COL.STATUS] !== PURCHASE_STATUS.DELIVERED || !p[PUR_COL.DELIVERY_DATE]) return false;
    const order = new Date(p[PUR_COL.ORDER_DATE]);
    const delivery = new Date(p[PUR_COL.DELIVERY_DATE]);
    const expected = new Date(order);
    expected.setDate(order.getDate() + toNumber(supplier[SUP_COL.LEAD_TIME]));
    return delivery <= expected;
  }).length;
  const deliveryRate = total > 0 ? round(delivered / total * 100) : 0;
  const onTimeRate = delivered > 0 ? round(onTime / delivered * 100) : 0;
  const returnRate = total > 0 ? round(returned / total * 100) : 0;
  const cancelRate = total > 0 ? round(cancelled / total * 100) : 0;
  return {
    supplierId: supplierId, company: supplier[SUP_COL.COMPANY], totalOrders: total,
    deliveryRate: deliveryRate, onTimeRate: onTimeRate, returnRate: returnRate,
    cancelRate: cancelRate, avgDeliveryDays: getSupplierActualDeliveryDays(supplierId),
    leadTime: toNumber(supplier[SUP_COL.LEAD_TIME]), totalSpent: getSupplierTotalSpent(supplierId),
    rating: toNumber(supplier[SUP_COL.RATING]),
    reliabilityScore: round((deliveryRate * 0.4) + (onTimeRate * 0.4) + ((100 - returnRate) * 0.2))
  };
}

function getSupplierRanking(){
  const suppliers = activeSuppliers();
  const ranked = [];
  suppliers.forEach(s => { ranked.push(getSupplierKPIs(s[SUP_COL.SUPPLIER_ID])); });
  ranked.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  return ranked;
}

function topSuppliers(limit){ return getSupplierRanking().slice(0, limit || 5); }

function topSuppliersBySpend(limit){
  const suppliers = activeSuppliers();
  const list = [];
  suppliers.forEach(s => {
    list.push({
      supplierId: s[SUP_COL.SUPPLIER_ID], company: s[SUP_COL.COMPANY],
      totalSpent: getSupplierTotalSpent(s[SUP_COL.SUPPLIER_ID])
    });
  });
  list.sort((a, b) => b.totalSpent - a.totalSpent);
  return list.slice(0, limit || 5);
}

function getSuppliersSummary(){
  return {
    totalSuppliers: totalSuppliers(), activeSuppliers: totalActiveSuppliers(),
    averageRating: averageSupplierRating(), averageLeadTime: averageLeadTime(),
    totalPurchaseValue: getTotalPurchaseValue()
  };
}

function getTotalPurchaseValue(){
  const history = getPurchaseHistory();
  let total = 0;
  history.forEach(p => { if(p[PUR_COL.STATUS] !== PURCHASE_STATUS.CANCELLED) total += toNumber(p[PUR_COL.TOTAL_COST]); });
  return round(total, 2);
}

function buildSuppliersDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const summary = getSuppliersSummary();
  dashboard.appendRow([]);
  dashboard.appendRow([t("sup_summary_title"), ""]);
  dashboard.appendRow([t("sup_total"), summary.totalSuppliers]);
  dashboard.appendRow([t("sup_active"), summary.activeSuppliers]);
  dashboard.appendRow([t("sup_avg_rating"), summary.averageRating]);
  dashboard.appendRow([t("sup_avg_lead"), summary.averageLeadTime]);
  dashboard.appendRow([t("sup_total_purchases"), summary.totalPurchaseValue]);
  const top = topSuppliers(3);
  if(top.length > 0){
    dashboard.appendRow([]);
    dashboard.appendRow([t("sup_top"), ""]);
    top.forEach(s => { dashboard.appendRow([s.company, s.reliabilityScore]); });
  }
}

function refreshSuppliers(){
  ensureSuppliersColumns();
  const suppliers = getSuppliers();
  suppliers.forEach(s => { recalculateSupplierStats(s[SUP_COL.SUPPLIER_ID]); });
  buildSuppliersDashboard();
}