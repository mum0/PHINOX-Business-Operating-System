/**
 * ============================================================
 * PHINOX Business Operating System
 * Inventory.gs
 * Product & Variant Engine + Stock Movement + Alerts
 * ============================================================
 */

// ── Column mapping (17 columns, matches Setup.js) ──
const INV_COL = {
  ITEM_ID: 0, ITEM_NAME: 1, CATEGORY: 2, VARIANT: 3, COLOR: 4, SIZE: 5,
  BARCODE: 6, QUANTITY: 7, MIN_STOCK: 8, COST: 9, PRICE: 10, WAREHOUSE: 11,
  SUPPLIER: 12, UPDATED_AT: 13, NOTES: 14, STATUS: 15, LOCATION: 16
};

const STOCK_MOVEMENT_SHEET = "Stock Movements";
const STOCK_MOVE_TYPE = { IN: "Stock In", OUT: "Stock Out", ADJUST: "Adjustment", TRANSFER: "Transfer" };

// ═══════════════════════════════════════════════════════════════
// PART 1 — Product CRUD
// ═══════════════════════════════════════════════════════════════

function ensureInventoryColumns(){
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const required = [
    "Item ID", "Item Name", "Category", "Variant", "Color", "Size",
    "Barcode", "Quantity", "Min Stock", "Cost", "Price", "Warehouse",
    "Supplier", "Updated At", "Notes", "Status", "Location"
  ];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Item ID"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const header = sheet.getRange(1, 1, 1, required.length);
      header.setValues([required]);
      styleHeader(header, APP.COLORS.HEADER, "#FFFFFF");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 130);
    }
  }
}

function addProduct(product){
  ensureInventoryColumns();
  const sheet = getSheet(APP.SHEETS.INVENTORY);
  const row = [
    generateId("INV"), product.name || "", product.category || "", product.variant || "",
    product.color || "", product.size || "", product.barcode || generateBarcode(),
    toNumber(product.quantity), toNumber(product.minStock), toNumber(product.cost),
    toNumber(product.price), product.warehouse || "Main", product.supplier || "",
    now(), product.notes || "", "Active", product.location || ""
  ];
  sheet.appendRow(row);
  logActivity(getCurrentMember(), "Inventory - Add", APP.SHEETS.INVENTORY, row[INV_COL.ITEM_ID], "", row[INV_COL.ITEM_NAME]);
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
        quantity: INV_COL.QUANTITY, minStock: INV_COL.MIN_STOCK,
        warehouse: INV_COL.WAREHOUSE, supplier: INV_COL.SUPPLIER,
        cost: INV_COL.COST, price: INV_COL.PRICE, notes: INV_COL.NOTES,
        status: INV_COL.STATUS, location: INV_COL.LOCATION
      };
      Object.keys(updates).forEach(function(key){
        if(map[key] !== undefined) row[map[key]] = updates[key];
      });
      row[INV_COL.UPDATED_AT] = now();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      logActivity(getCurrentMember(), "Inventory - Update", APP.SHEETS.INVENTORY, itemId, oldName, row[INV_COL.ITEM_NAME]);
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
      // Soft delete instead of hard delete
      softDeleteRecord(APP.SHEETS.INVENTORY, i + 1, "Product", itemId);
      logActivity(getCurrentMember(), "Inventory - Delete", APP.SHEETS.INVENTORY, itemId, "", "");
      return true;
    }
  }
  return false;
}

function totalProducts(){ return getProducts().length; }

function totalStockQuantity(){
  const products = getProducts();
  let total = 0;
  products.forEach(function(p){ total += toNumber(p[INV_COL.QUANTITY]); });
  return total;
}

function totalStockValue(){
  const products = getProducts();
  let total = 0;
  products.forEach(function(p){ total += toNumber(p[INV_COL.QUANTITY]) * toNumber(p[INV_COL.COST]); });
  return round(total);
}

function getProductsByCategory(category){ return getProducts().filter(function(p){ return p[INV_COL.CATEGORY] === category; }); }
function getProductsByWarehouse(warehouse){ return getProducts().filter(function(p){ return p[INV_COL.WAREHOUSE] === warehouse; }); }
function getProductVariants(itemName){ return getProducts().filter(function(p){ return p[INV_COL.ITEM_NAME] === itemName; }); }

// ═══════════════════════════════════════════════════════════════
// PART 2 — Stock Movement & Warehouse Engine
// ═══════════════════════════════════════════════════════════════

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
    styleHeader(header, APP.COLORS.HEADER, "#FFFFFF");
    for(let i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 140);
  }
  return sheet;
}

function logStockMovement(itemId, type, quantity, reason, reference){
  const sheet = getStockMovementSheet();
  const product = getProduct(itemId);
  const itemName = product ? product[INV_COL.ITEM_NAME] : "";
  const warehouse = product ? product[INV_COL.WAREHOUSE] : "";
  const user = getCurrentMember ? getCurrentMember() : null;
  const userName = user ? (user[1] || "System") : "System";
  sheet.appendRow([
    generateId("MOV"), itemId, itemName, type, quantity,
    warehouse, reason || "", reference || "", now(), userName
  ]);
}

function addStock(itemId, quantity, reason){
  quantity = toNumber(quantity);
  if(quantity <= 0) throw new Error("Invalid amount");
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const current = toNumber(product[INV_COL.QUANTITY]);
  updateProduct(itemId, {quantity: current + quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.IN, quantity, reason, "");
  return current + quantity;
}

function removeStock(itemId, quantity, reason){
  quantity = toNumber(quantity);
  if(quantity <= 0) throw new Error("Invalid amount");
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const current = toNumber(product[INV_COL.QUANTITY]);
  if(current < quantity) throw new Error("Insufficient stock");
  updateProduct(itemId, {quantity: current - quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.OUT, quantity, reason, "");
  return current - quantity;
}

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
 * Transfer stock between warehouses
 * FIXED: No longer creates duplicate products. Checks destination first.
 */
function transferStock(itemId, quantity, toWarehouse){
  quantity = toNumber(quantity);
  const product = getProduct(itemId);
  if(!product) throw new Error("Product not found");
  const current = toNumber(product[INV_COL.QUANTITY]);
  if(current < quantity) throw new Error("Insufficient stock");
  const fromWarehouse = product[INV_COL.WAREHOUSE];

  // Check if same product already exists in destination warehouse
  const destProducts = getProducts().filter(function(p){
    return p[INV_COL.ITEM_NAME] === product[INV_COL.ITEM_NAME] &&
           p[INV_COL.VARIANT] === product[INV_COL.VARIANT] &&
           p[INV_COL.COLOR] === product[INV_COL.COLOR] &&
           p[INV_COL.SIZE] === product[INV_COL.SIZE] &&
           p[INV_COL.WAREHOUSE] === toWarehouse;
  });

  if(current === quantity){
    // Transferring ALL stock — just update warehouse
    updateProduct(itemId, {warehouse: toWarehouse});
    logStockMovement(itemId, STOCK_MOVE_TYPE.TRANSFER, quantity, "Moved to " + toWarehouse, "");
    return itemId;
  }

  // Partial transfer — reduce source
  updateProduct(itemId, {quantity: current - quantity});
  logStockMovement(itemId, STOCK_MOVE_TYPE.OUT, quantity, "Transfer to " + toWarehouse, "");

  if(destProducts.length > 0){
    // Add quantity to existing product in destination
    const dest = destProducts[0];
    const destQty = toNumber(dest[INV_COL.QUANTITY]);
    updateProduct(dest[INV_COL.ITEM_ID], {quantity: destQty + quantity});
    logStockMovement(dest[INV_COL.ITEM_ID], STOCK_MOVE_TYPE.IN, quantity, "Transfer from " + fromWarehouse, "");
    return dest[INV_COL.ITEM_ID];
  } else {
    // Create new entry for destination (same barcode)
    const newId = addProduct({
      name: product[INV_COL.ITEM_NAME], category: product[INV_COL.CATEGORY],
      variant: product[INV_COL.VARIANT], color: product[INV_COL.COLOR],
      size: product[INV_COL.SIZE], barcode: product[INV_COL.BARCODE], 
      quantity: quantity,
      minStock: product[INV_COL.MIN_STOCK],
      warehouse: toWarehouse, supplier: product[INV_COL.SUPPLIER],
      cost: product[INV_COL.COST], price: product[INV_COL.PRICE]
    });
    logStockMovement(newId, STOCK_MOVE_TYPE.IN, quantity, "Transfer from " + fromWarehouse, "");
    return newId;
  }
}

function getStockMovements(){
  const sheet = getStockMovementSheet();
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getProductMovements(itemId){
  return getStockMovements().filter(function(m){ return m[1] === itemId; });
}

function getWarehouses(){
  const products = getProducts();
  const set = new Set();
  products.forEach(function(p){
    const w = p[INV_COL.WAREHOUSE];
    if(!isEmpty(w)) set.add(w);
  });
  return Array.from(set);
}

function getWarehouseStock(warehouse){
  return getProducts().filter(function(p){ return p[INV_COL.WAREHOUSE] === warehouse; });
}

function getWarehouseValue(warehouse){
  const items = getWarehouseStock(warehouse);
  let total = 0;
  items.forEach(function(p){ total += toNumber(p[INV_COL.QUANTITY]) * toNumber(p[INV_COL.COST]); });
  return round(total);
}

// ═══════════════════════════════════════════════════════════════
// PART 3 — Alerts, Barcodes & Dashboard
// ═══════════════════════════════════════════════════════════════

function generateBarcode(){
  const prefix = "777";
  const random = Math.floor(Math.random() * 9000000) + 1000000;
  return prefix + random;
}

function isValidBarcode(barcode){
  return /^[0-9]{10,13}$/.test(String(barcode));
}

function getLowStockItems(){
  return getProducts().filter(function(p){
    const qty = toNumber(p[INV_COL.QUANTITY]);
    const min = toNumber(p[INV_COL.MIN_STOCK]);
    return min > 0 && qty <= min;
  });
}

function getOutOfStockItems(){
  return getProducts().filter(function(p){ return toNumber(p[INV_COL.QUANTITY]) === 0; });
}

function checkLowStockAlerts(){
  const low = getLowStockItems();
  low.forEach(function(p){
    if(typeof createNotification === "function"){
      createNotification(
        "Inventory", "System", "Low Stock Alert",
        p[INV_COL.ITEM_NAME] + " (" + p[INV_COL.VARIANT] + ") — Qty: " + p[INV_COL.QUANTITY]
      );
    }
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

/**
 * Build inventory dashboard — writes to dedicated section
 * FIXED: Clears old inventory metrics first to avoid data chaos
 */
function buildInventoryDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const summary = getInventorySummary();

  // Find and clear old inventory section
  const data = dashboard.getDataRange().getValues();
  let startRow = -1;
  for(let i = 0; i < data.length; i++){
    if(data[i][0] === "=== INVENTORY ==="){ startRow = i + 1; break; }
  }

  const rows = [
    ["=== INVENTORY ===", ""],
    ["Total Products", summary.totalProducts],
    ["Total Quantity", summary.totalQuantity],
    ["Total Value", summary.totalValue],
    ["Warehouses", summary.warehouses],
    ["Low Stock", summary.lowStock],
    ["Out of Stock", summary.outOfStock],
    ["Updated", now()]
  ];

  if(startRow > 0){
    // Clear old section (8 rows max)
    dashboard.getRange(startRow, 1, 8, 2).clearContent();
    dashboard.getRange(startRow, 1, rows.length, 2).setValues(rows);
  } else {
    dashboard.appendRow([]);
    appendRows(APP.SHEETS.DASHBOARD, rows);
  }
}

function refreshInventory(){
  ensureInventoryColumns();
  checkLowStockAlerts();
  buildInventoryDashboard();
}