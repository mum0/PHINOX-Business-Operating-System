/**
 * ============================================================
 * PHINOX Business Operating System
 * Inventory.gs - Part 1
 * Product & Variant Engine
 * ============================================================
 */

const INV_COL = {
  ITEM_ID: 0, ITEM_NAME: 1, CATEGORY: 2, VARIANT: 3, COLOR: 4, SIZE: 5,
  BARCODE: 6, QUANTITY: 7, UNIT: 8, MIN_STOCK: 9, WAREHOUSE: 10,
  SUPPLIER: 11, COST: 12, PRICE: 13, UPDATED_AT: 14
};

const STOCK_MOVEMENT_SHEET = "Stock Movements";
const STOCK_MOVE_TYPE = { IN: "Stock In", OUT: "Stock Out", ADJUST: "Adjustment", TRANSFER: "Transfer" };

function ensureInventoryColumns(){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const required = [
    "Item ID", "Item Name", "Category", "Variant", "Color", "Size",
    "Barcode", "Quantity", "Unit", "Minimum Stock", "Warehouse",
    "Supplier", "Cost", "Price", "Updated At"
  ];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Item ID"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const header = sheet.getRange(1, 1, 1, required.length);
      header.setValues([required]);
      header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 140);
    }
  }
}

function addProduct(product){
  ensureInventoryColumns();
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const row = [
    generateId("INV"), product.name || "", product.category || "", product.variant || "",
    product.color || "", product.size || "", product.barcode || generateBarcode(),
    toNumber(product.quantity), product.unit || "pcs", toNumber(product.minStock),
    product.warehouse || "Main", product.supplier || "", toNumber(product.cost),
    toNumber(product.price), now()
  ];
  sheet.appendRow(row);
  logActivity(getCurrentMember(), t("notif_type_inventory") + " - Add", APP.SHEETS.INVENTORY, row[INV_COL.ITEM_ID], "", row[INV_COL.ITEM_NAME]);
  return row[INV_COL.ITEM_ID];
}

function getProducts(){
  ensureInventoryColumns();
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getProduct(itemId){
  const products = getProducts();
  for(const p of products){ if(p[INV_COL.ITEM_ID] === itemId) return p; }
  return null;
}

function getProductByBarcode(barcode){
  const products = getProducts();
  for(const p of products){ if(p[INV_COL.BARCODE] === barcode) return p; }
  return null;
}

function updateProduct(itemId, updates){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][INV_COL.ITEM_ID] === itemId){
      const row = data[i];
      const oldName = row[INV_COL.ITEM_NAME];
      const map = {
        name: INV_COL.ITEM_NAME, category: INV_COL.CATEGORY, variant: INV_COL.VARIANT,
        color: INV_COL.COLOR, size: INV_COL.SIZE, barcode: INV_COL.BARCODE,
        quantity: INV_COL.QUANTITY, unit: INV_COL.UNIT, minStock: INV_COL.MIN_STOCK,
        warehouse: INV_COL.WAREHOUSE, supplier: INV_COL.SUPPLIER, cost: INV_COL.COST, price: INV_COL.PRICE
      };
      Object.keys(updates).forEach(key => { if(map[key] !== undefined) row[map[key]] = updates[key]; });
      row[INV_COL.UPDATED_AT] = now();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      logActivity(getCurrentMember(), t("notif_type_inventory") + " - Update", APP.SHEETS.INVENTORY, itemId, oldName, row[INV_COL.ITEM_NAME]);
      return true;
    }
  }
  return false;
}

function deleteProduct(itemId){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][INV_COL.ITEM_ID] === itemId){
      sheet.deleteRow(i + 1);
      logActivity(getCurrentMember(), t("notif_type_inventory") + " - Delete", APP.SHEETS.INVENTORY, itemId, "", "");
      return true;
    }
  }
  return false;
}

function totalProducts(){ return getProducts().length; }

function totalStockQuantity(){
  const products = getProducts();
  let total = 0;
  products.forEach(p => { total += toNumber(p[INV_COL.QUANTITY]); });
  return total;
}

function totalStockValue(){
  const products = getProducts();
  let total = 0;
  products.forEach(p => { total += toNumber(p[INV_COL.QUANTITY]) * toNumber(p[INV_COL.COST]); });
  return round(total);
}

function getProductsByCategory(category){ return getProducts().filter(p => p[INV_COL.CATEGORY] === category); }
function getProductsByWarehouse(warehouse){ return getProducts().filter(p => p[INV_COL.WAREHOUSE] === warehouse); }
function getProductVariants(itemName){ return getProducts().filter(p => p[INV_COL.ITEM_NAME] === itemName); }
/**
 * ============================================================
 * PHINOX Business Operating System
 * Inventory.gs - Part 2
 * Stock Movement & Warehouse Engine
 * ============================================================
 */

function getStockMovementSheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(STOCK_MOVEMENT_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(STOCK_MOVEMENT_SHEET);
    const headers = [
      "Move ID", "Item ID", "Item Name", "Type", "Quantity",
      "Warehouse", "Reason", "Reference", "Date", "User"
    ];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 140);
  }
  return sheet;
}

function logStockMovement(itemId, type, quantity, reason, reference){
  const sheet = getStockMovementSheet();
  const product = getProduct(itemId);
  const itemName = product ? product[INV_COL.ITEM_NAME] : "";
  const warehouse = product ? product[INV_COL.WAREHOUSE] : "";
  const user = getCurrentMember();
  const userName = user ? user[MEMBER_COL.FULL_NAME] : "System";
  sheet.appendRow([
    generateId("MOV"), itemId, itemName, type, quantity,
    warehouse, reason || "", reference || "", now(), userName
  ]);
}

function addStock(itemId, quantity, reason){
  quantity = toNumber(quantity);
  if(quantity <= 0) throw new Error(t("err_invalid_amount"));
  const product = getProduct(itemId);
  if(!product) throw new Error(t("err_product_not_found"));
  const current = toNumber(product[INV_COL.QUANTITY]);
  updateProduct(itemId, {quantity: current + quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.IN, quantity, reason, "");
  return current + quantity;
}

function removeStock(itemId, quantity, reason){
  quantity = toNumber(quantity);
  if(quantity <= 0) throw new Error(t("err_invalid_amount"));
  const product = getProduct(itemId);
  if(!product) throw new Error(t("err_product_not_found"));
  const current = toNumber(product[INV_COL.QUANTITY]);
  if(current < quantity) throw new Error(t("err_insufficient_stock"));
  updateProduct(itemId, {quantity: current - quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.OUT, quantity, reason, "");
  return current - quantity;
}

function adjustStock(itemId, newQuantity, reason){
  newQuantity = toNumber(newQuantity);
  const product = getProduct(itemId);
  if(!product) throw new Error(t("err_product_not_found"));
  const oldQuantity = toNumber(product[INV_COL.QUANTITY]);
  updateProduct(itemId, {quantity: newQuantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.ADJUST, newQuantity - oldQuantity, reason, "");
  return newQuantity;
}

function transferStock(itemId, quantity, toWarehouse){
  quantity = toNumber(quantity);
  const product = getProduct(itemId);
  if(!product) throw new Error(t("err_product_not_found"));
  const current = toNumber(product[INV_COL.QUANTITY]);
  if(current < quantity) throw new Error(t("err_insufficient_stock"));
  const fromWarehouse = product[INV_COL.WAREHOUSE];
  updateProduct(itemId, {quantity: current - quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.OUT, quantity, "Transfer to "+toWarehouse, "");
  const newId = addProduct({
    name: product[INV_COL.ITEM_NAME], category: product[INV_COL.CATEGORY],
    variant: product[INV_COL.VARIANT], color: product[INV_COL.COLOR],
    size: product[INV_COL.SIZE], barcode: generateBarcode(), quantity: quantity,
    unit: product[INV_COL.UNIT], minStock: product[INV_COL.MIN_STOCK],
    warehouse: toWarehouse, supplier: product[INV_COL.SUPPLIER],
    cost: product[INV_COL.COST], price: product[INV_COL.PRICE]
  });
  logStockMovement(newId, STOCK_MOVE_TYPE.IN, quantity, "Transfer from "+fromWarehouse, "");
  return newId;
}

function getStockMovements(){
  const sheet = getStockMovementSheet();
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getProductMovements(itemId){
  return getStockMovements().filter(m => m[1] === itemId);
}

function getWarehouses(){
  const products = getProducts();
  const set = new Set();
  products.forEach(p => {
    const w = p[INV_COL.WAREHOUSE];
    if(!isEmpty(w)) set.add(w);
  });
  return Array.from(set);
}

function getWarehouseStock(warehouse){
  return getProducts().filter(p => p[INV_COL.WAREHOUSE] === warehouse);
}

function getWarehouseValue(warehouse){
  const items = getWarehouseStock(warehouse);
  let total = 0;
  items.forEach(p => { total += toNumber(p[INV_COL.QUANTITY]) * toNumber(p[INV_COL.COST]); });
  return round(total);
}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Inventory.gs - Part 3
 * Alerts, Barcodes & Dashboard
 * ============================================================
 */

function generateBarcode(){
  const prefix = "777";
  const random = Math.floor(Math.random() * 9000000) + 1000000;
  return prefix + random;
}

function isValidBarcode(barcode){
  return /^[0-9]{10,13}$/.test(String(barcode));
}

function getLowStockItems(){
  return getProducts().filter(p => {
    const qty = toNumber(p[INV_COL.QUANTITY]);
    const min = toNumber(p[INV_COL.MIN_STOCK]);
    return min > 0 && qty <= min;
  });
}

function getOutOfStockItems(){
  return getProducts().filter(p => toNumber(p[INV_COL.QUANTITY]) === 0);
}

function checkLowStockAlerts(){
  const low = getLowStockItems();
  low.forEach(p => {
    createNotification(
      t("notif_type_inventory"), "System", t("notif_low_stock"),
      t("inv_low_stock_alert", {
        name: p[INV_COL.ITEM_NAME],
        variant: p[INV_COL.VARIANT],
        qty: p[INV_COL.QUANTITY]
      })
    );
  });
  return low.length;
}

function getInventorySummary(){
  return {
    totalProducts: totalProducts(),
    totalQuantity: totalStockQuantity(),
    totalValue: totalStockValue(),
    warehouses: getWarehouses().length,
    lowStock: getLowStockItems().length,
    outOfStock: getOutOfStockItems().length
  };
}

function buildInventoryDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const summary = getInventorySummary();
  dashboard.appendRow([]);
  dashboard.appendRow([t("inv_summary_title"), ""]);
  dashboard.appendRow([t("inv_total_products"), summary.totalProducts]);
  dashboard.appendRow([t("inv_total_quantity"), summary.totalQuantity]);
  dashboard.appendRow([t("inv_total_value"), summary.totalValue]);
  dashboard.appendRow([t("inv_warehouses"), summary.warehouses]);
  dashboard.appendRow([t("inv_low_stock"), summary.lowStock]);
  dashboard.appendRow([t("inv_out_of_stock"), summary.outOfStock]);
}

function refreshInventory(){
  ensureInventoryColumns();
  checkLowStockAlerts();
  buildInventoryDashboard();
}