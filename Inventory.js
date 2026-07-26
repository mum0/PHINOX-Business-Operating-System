/**
 * عرض الواجهة الرسومية
 */
function showDashboardUI(){
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PHINOX Dashboard')
    .setWidth(1400)
    .setHeight(900);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
}

/**
 * تضمين ملفات HTML
 */
function include(filename){
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * دوال مساعدة للواجهة
 */
function getDashboardCards(){
  return [
    {label:'الأعضاء', value:totalMembers(), class:''},
    {label:'المهام', value:totalTasks(), class:''},
    {label:'المنجزة', value:completedTasks(), class:'success'},
    {label:'المتأخرة', value:getLateTasks().length, class:'danger'},
    {label:'متوسط KPI', value:teamAverageKPI(), class:''},
    {label:'الإنتاجية', value:averageProductivity()+'%', class:'success'}
  ];
}

function getTasksSummary(){
  return [
    ['قيد الانتظار', pendingReviewCount()],
    ['قيد التنفيذ', activeTasks()],
    ['المنجزة', completedTasks()],
    ['المتأخرة', getLateTasks().length],
    ['متوسط الدرجة', averageTaskScore()]
  ];
}

/**
 * ============================================================
 * PHINOX Business Operating System
 * Inventory.gs - Part 1
 * Product & Variant Engine
 * ============================================================
 */

/**
 * Inventory Column Map
 */
const INV_COL = {
  ITEM_ID: 0,
  ITEM_NAME: 1,
  CATEGORY: 2,
  VARIANT: 3,
  COLOR: 4,
  SIZE: 5,
  BARCODE: 6,
  QUANTITY: 7,
  UNIT: 8,
  MIN_STOCK: 9,
  WAREHOUSE: 10,
  SUPPLIER: 11,
  COST: 12,
  PRICE: 13,
  UPDATED_AT: 14
};

/**
 * Stock Movement Sheet Name
 */
const STOCK_MOVEMENT_SHEET = "Stock Movements";

/**
 * Movement Types
 */
const STOCK_MOVE_TYPE = {
  IN: "Stock In",
  OUT: "Stock Out",
  ADJUST: "Adjustment",
  TRANSFER: "Transfer"
};

/**
 * ضمان أعمدة المخزون
 */
function ensureInventoryColumns(){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const required = [
    "Item ID", "Item Name", "Category", "Variant", "Color", "Size",
    "Barcode", "Quantity", "Unit", "Minimum Stock", "Warehouse",
    "Supplier", "Cost", "Price", "Updated At"
  ];
  const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] || [];
  if(current.length < required.length || current[0] !== "Item ID"){
    sheet.clear();
    const header = sheet.getRange(1, 1, 1, required.length);
    header.setValues([required]);
    header.setBackground(APP.COLORS.HEADER)
          .setFontColor("#FFFFFF")
          .setFontWeight("bold");
    for(let i = 1; i <= required.length; i++){
      sheet.setColumnWidth(i, 140);
    }
  }
}

/**
 * إضافة منتج
 */
function addProduct(product){
  ensureInventoryColumns();
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const row = [
    generateId("INV"),
    product.name || "",
    product.category || "",
    product.variant || "",
    product.color || "",
    product.size || "",
    product.barcode || generateBarcode(),
    toNumber(product.quantity),
    product.unit || "pcs",
    toNumber(product.minStock),
    product.warehouse || "Main",
    product.supplier || "",
    toNumber(product.cost),
    toNumber(product.price),
    now()
  ];
  sheet.appendRow(row);
  logActivity(getCurrentMember(), "Add Product", APP.SHEETS.INVENTORY, row[INV_COL.ITEM_ID], "", row[INV_COL.ITEM_NAME]);
  return row[INV_COL.ITEM_ID];
}

/**
 * جميع المنتجات
 */
function getProducts(){
  ensureInventoryColumns();
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

/**
 * منتج بواسطة ID
 */
function getProduct(itemId){
  const products = getProducts();
  for(const p of products){
    if(p[INV_COL.ITEM_ID] === itemId){
      return p;
    }
  }
  return null;
}

/**
 * منتج بواسطة Barcode
 */
function getProductByBarcode(barcode){
  const products = getProducts();
  for(const p of products){
    if(p[INV_COL.BARCODE] === barcode){
      return p;
    }
  }
  return null;
}

/**
 * تحديث منتج
 */
function updateProduct(itemId, updates){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][INV_COL.ITEM_ID] === itemId){
      const row = data[i];
      const oldName = row[INV_COL.ITEM_NAME];
      const map = {
        name: INV_COL.ITEM_NAME,
        category: INV_COL.CATEGORY,
        variant: INV_COL.VARIANT,
        color: INV_COL.COLOR,
        size: INV_COL.SIZE,
        barcode: INV_COL.BARCODE,
        quantity: INV_COL.QUANTITY,
        unit: INV_COL.UNIT,
        minStock: INV_COL.MIN_STOCK,
        warehouse: INV_COL.WAREHOUSE,
        supplier: INV_COL.SUPPLIER,
        cost: INV_COL.COST,
        price: INV_COL.PRICE
      };
      Object.keys(updates).forEach(key => {
        if(map[key] !== undefined){
          row[map[key]] = updates[key];
        }
      });
      row[INV_COL.UPDATED_AT] = now();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      logActivity(getCurrentMember(), "Update Product", APP.SHEETS.INVENTORY, itemId, oldName, row[INV_COL.ITEM_NAME]);
      return true;
    }
  }
  return false;
}

/**
 * حذف منتج
 */
function deleteProduct(itemId){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][INV_COL.ITEM_ID] === itemId){
      sheet.deleteRow(i + 1);
      logActivity(getCurrentMember(), "Delete Product", APP.SHEETS.INVENTORY, itemId, "", "");
      return true;
    }
  }
  return false;
}

/**
 * إجمالي المنتجات
 */
function totalProducts(){
  return getProducts().length;
}

/**
 * إجمالي الكمية
 */
function totalStockQuantity(){
  const products = getProducts();
  let total = 0;
  products.forEach(p => {
    total += toNumber(p[INV_COL.QUANTITY]);
  });
  return total;
}

/**
 * قيمة المخزون
 */
function totalStockValue(){
  const products = getProducts();
  let total = 0;
  products.forEach(p => {
    total += toNumber(p[INV_COL.QUANTITY]) * toNumber(p[INV_COL.COST]);
  });
  return round(total);
}

/**
 * منتجات حسب الفئة
 */
function getProductsByCategory(category){
  return getProducts().filter(p => p[INV_COL.CATEGORY] === category);
}

/**
 * منتجات حسب المستودع
 */
function getProductsByWarehouse(warehouse){
  return getProducts().filter(p => p[INV_COL.WAREHOUSE] === warehouse);
}

/**
 * Variants لمنتج
 */
function getProductVariants(itemName){
  return getProducts().filter(p => p[INV_COL.ITEM_NAME] === itemName);
}

/**
 * ============================================================
 * Inventory.gs - Part 2
 * Stock Movement & Warehouse Engine
 * ============================================================
 */

/**
 * Stock Movement Sheet
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
    header.setBackground(APP.COLORS.HEADER)
          .setFontColor("#FFFFFF")
          .setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++){
      sheet.setColumnWidth(i, 140);
    }
  }
  return sheet;
}

/**
 * تسجيل حركة مخزون
 */
function logStockMovement(itemId, type, quantity, reason, reference){
  const sheet = getStockMovementSheet();
  const product = getProduct(itemId);
  const itemName = product ? product[INV_COL.ITEM_NAME] : "";
  const warehouse = product ? product[INV_COL.WAREHOUSE] : "";
  const user = getCurrentMember();
  const userName = user ? user[MEMBER_COL.FULL_NAME] : "System";
  sheet.appendRow([
    generateId("MOV"),
    itemId,
    itemName,
    type,
    quantity,
    warehouse,
    reason || "",
    reference || "",
    now(),
    userName
  ]);
}

/**
 * إضافة مخزون
 */
function addStock(itemId, quantity, reason){
  quantity = toNumber(quantity);
  if(quantity <= 0) throw new Error("Quantity must be positive");
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const current = toNumber(product[INV_COL.QUANTITY]);
  updateProduct(itemId, {quantity: current + quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.IN, quantity, reason, "");
  return current + quantity;
}

/**
 * خصم مخزون
 */
function removeStock(itemId, quantity, reason){
  quantity = toNumber(quantity);
  if(quantity <= 0) throw new Error("Quantity must be positive");
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const current = toNumber(product[INV_COL.QUANTITY]);
  if(current < quantity) throw new Error("Insufficient stock");
  updateProduct(itemId, {quantity: current - quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.OUT, quantity, reason, "");
  return current - quantity;
}

/**
 * تعديل مخزون
 */
function adjustStock(itemId, newQuantity, reason){
  newQuantity = toNumber(newQuantity);
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const oldQuantity = toNumber(product[INV_COL.QUANTITY]);
  updateProduct(itemId, {quantity: newQuantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.ADJUST, newQuantity - oldQuantity, reason, "");
  return newQuantity;
}

/**
 * نقل مخزون
 */
function transferStock(itemId, quantity, toWarehouse){
  quantity = toNumber(quantity);
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const current = toNumber(product[INV_COL.QUANTITY]);
  if(current < quantity) throw new Error("Insufficient stock");
  const fromWarehouse = product[INV_COL.WAREHOUSE];
  updateProduct(itemId, {quantity: current - quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.OUT, quantity, "Transfer to "+toWarehouse, "");
  const newId = addProduct({
    name: product[INV_COL.ITEM_NAME],
    category: product[INV_COL.CATEGORY],
    variant: product[INV_COL.VARIANT],
    color: product[INV_COL.COLOR],
    size: product[INV_COL.SIZE],
    barcode: generateBarcode(),
    quantity: quantity,
    unit: product[INV_COL.UNIT],
    minStock: product[INV_COL.MIN_STOCK],
    warehouse: toWarehouse,
    supplier: product[INV_COL.SUPPLIER],
    cost: product[INV_COL.COST],
    price: product[INV_COL.PRICE]
  });
  logStockMovement(newId, STOCK_MOVE_TYPE.IN, quantity, "Transfer from "+fromWarehouse, "");
  return newId;
}

/**
 * جميع الحركات
 */
function getStockMovements(){
  const sheet = getStockMovementSheet();
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

/**
 * حركات منتج
 */
function getProductMovements(itemId){
  return getStockMovements().filter(m => m[1] === itemId);
}

/**
 * المستودعات
 */
function getWarehouses(){
  const products = getProducts();
  const set = new Set();
  products.forEach(p => {
    const w = p[INV_COL.WAREHOUSE];
    if(!isEmpty(w)){
      set.add(w);
    }
  });
  return Array.from(set);
}

/**
 * مخزون مستودع
 */
function getWarehouseStock(warehouse){
  return getProducts().filter(p => p[INV_COL.WAREHOUSE] === warehouse);
}

/**
 * قيمة مستودع
 */
function getWarehouseValue(warehouse){
  const items = getWarehouseStock(warehouse);
  let total = 0;
  items.forEach(p => {
    total += toNumber(p[INV_COL.QUANTITY]) * toNumber(p[INV_COL.COST]);
  });
  return round(total);
}

/**
 * ============================================================
 * Inventory.gs - Part 3
 * Alerts, Barcodes & Dashboard
 * ============================================================
 */

/**
 * توليد Barcode
 */
function generateBarcode(){
  const prefix = "777";
  const random = Math.floor(Math.random() * 9000000) + 1000000;
  return prefix + random;
}

/**
 * التحقق من Barcode
 */
function isValidBarcode(barcode){
  return /^[0-9]{10,13}$/.test(String(barcode));
}

/**
 * منتجات منخفضة المخزون
 */
function getLowStockItems(){
  return getProducts().filter(p => {
    const qty = toNumber(p[INV_COL.QUANTITY]);
    const min = toNumber(p[INV_COL.MIN_STOCK]);
    return min > 0 && qty <= min;
  });
}

/**
 * نفذ من المخزون
 */
function getOutOfStockItems(){
  return getProducts().filter(p => toNumber(p[INV_COL.QUANTITY]) === 0);
}

/**
 * فحص التنبيهات
 */
function checkLowStockAlerts(){
  const low = getLowStockItems();
  low.forEach(p => {
    createNotification(
      "Inventory",
      "System",
      "Low Stock Alert",
      p[INV_COL.ITEM_NAME]+" ("+p[INV_COL.VARIANT]+") is low: "+p[INV_COL.QUANTITY]+" remaining."
    );
  });
  return low.length;
}

/**
 * ملخص المخزون
 */
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

/**
 * تحديث Dashboard المخزون
 */
function buildInventoryDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const summary = getInventorySummary();
  dashboard.appendRow([]);
  dashboard.appendRow(["Inventory Summary"]);
  dashboard.appendRow(["Total Products", summary.totalProducts]);
  dashboard.appendRow(["Total Quantity", summary.totalQuantity]);
  dashboard.appendRow(["Total Value", summary.totalValue]);
  dashboard.appendRow(["Warehouses", summary.warehouses]);
  dashboard.appendRow(["Low Stock Items", summary.lowStock]);
  dashboard.appendRow(["Out of Stock", summary.outOfStock]);
}

/**
 * تحديث كامل
 */
function refreshInventory(){
  ensureInventoryColumns();
  checkLowStockAlerts();
  buildInventoryDashboard();
}