/**
 * ============================================================
 * PHINOX Business Operating System
 * Orders.gs - Part 1
 * إدارة طلبات العملاء والبيانات الأساسية
 * ============================================================
 */

const ORD_COL = {
  ORDER_ID: 0, CUSTOMER: 1, PHONE: 2, EMAIL: 3, DATE: 4, STATUS: 5,
  ITEMS_COUNT: 6, AMOUNT: 7, PAYMENT_STATUS: 8, PAYMENT_METHOD: 9,
  SHIPPING_ADDRESS: 10, TRACKING: 11, SHIPPING_DATE: 12, DELIVERY_DATE: 13,
  NOTES: 14, RETURN_STATUS: 15, RETURN_REASON: 16, RETURN_DATE: 17,
  CREATED_AT: 18, UPDATED_AT: 19
};

const ORDER_STATUS = {
  PENDING: "Pending", CONFIRMED: "Confirmed", PROCESSING: "Processing",
  SHIPPED: "Shipped", DELIVERED: "Delivered", CANCELLED: "Cancelled", RETURNED: "Returned"
};

const PAYMENT_STATUS = {
  PENDING: "Pending", PAID: "Paid", PARTIAL: "Partial",
  REFUNDED: "Refunded", FAILED: "Failed"
};

const RETURN_STATUS = {
  NONE: "None", REQUESTED: "Requested", APPROVED: "Approved",
  REJECTED: "Rejected", COMPLETED: "Completed"
};

const ORDER_ITEMS_SHEET = "Order Items";
const ORDER_TIMELINE_SHEET = "Order Timeline";

function ensureOrdersColumns(){
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const required = [
    "Order ID", "Customer", "Phone", "Email", "Date", "Status", "Items Count",
    "Amount", "Payment Status", "Payment Method", "Shipping Address", "Tracking Number",
    "Shipping Date", "Delivery Date", "Notes", "Return Status", "Return Reason",
    "Return Date", "Created At", "Updated At"
  ];
  const lastCol = sheet.getLastColumn();
  const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  if(current.length < required.length || current[0] !== "Order ID"){
    if(sheet.getLastRow() <= 1){
      sheet.clear();
      const header = sheet.getRange(1, 1, 1, required.length);
      header.setValues([required]);
      header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
      for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 140);
    }
  }
}

function addOrder(order){
  ensureOrdersColumns();
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const orderId = generateId("ORD");
  const items = order.items || [];
  const itemsCount = items.length;
  const amount = toNumber(order.amount) || 0;
  const row = [
    orderId, order.customer || "", order.phone || "", order.email || "",
    order.date || now(), order.status || ORDER_STATUS.PENDING, itemsCount, amount,
    order.paymentStatus || PAYMENT_STATUS.PENDING, order.paymentMethod || "",
    order.shippingAddress || "", order.tracking || "", order.shippingDate || "",
    order.deliveryDate || "", order.notes || "", RETURN_STATUS.NONE, "", "", now(), now()
  ];
  sheet.appendRow(row);
  if(itemsCount > 0){
    items.forEach(item => addOrderItem(orderId, item));
    const calculatedTotal = calculateOrderTotal(orderId);
    updateOrder(orderId, {amount: calculatedTotal});
  }
  logOrderTimeline(orderId, row[ORD_COL.STATUS], t("ord_created"));
  logActivity(getCurrentMember(), t("ord_add"), APP.SHEETS.ORDERS, orderId, "", row[ORD_COL.CUSTOMER]);
  return orderId;
}

function getOrders(){
  ensureOrdersColumns();
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function getOrder(orderId){
  const orders = getOrders();
  for(const o of orders){ if(o[ORD_COL.ORDER_ID] === orderId) return o; }
  return null;
}

function updateOrder(orderId, updates){
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][ORD_COL.ORDER_ID] === orderId){
      const row = data[i];
      const map = {
        customer: ORD_COL.CUSTOMER, phone: ORD_COL.PHONE, email: ORD_COL.EMAIL,
        date: ORD_COL.DATE, status: ORD_COL.STATUS, itemsCount: ORD_COL.ITEMS_COUNT,
        amount: ORD_COL.AMOUNT, paymentStatus: ORD_COL.PAYMENT_STATUS,
        paymentMethod: ORD_COL.PAYMENT_METHOD, shippingAddress: ORD_COL.SHIPPING_ADDRESS,
        tracking: ORD_COL.TRACKING, shippingDate: ORD_COL.SHIPPING_DATE,
        deliveryDate: ORD_COL.DELIVERY_DATE, notes: ORD_COL.NOTES,
        returnStatus: ORD_COL.RETURN_STATUS, returnReason: ORD_COL.RETURN_REASON,
        returnDate: ORD_COL.RETURN_DATE
      };
      Object.keys(updates).forEach(key => { if(map[key] !== undefined) row[map[key]] = updates[key]; });
      row[ORD_COL.UPDATED_AT] = now();
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      if(updates.status) logOrderTimeline(orderId, updates.status, updates.notes || "");
      logActivity(getCurrentMember(), t("ord_update"), APP.SHEETS.ORDERS, orderId, "", "");
      return true;
    }
  }
  return false;
}

function deleteOrder(orderId){
  const sheet = getSheet(APP.SHEETS.ORDERS);
  const data = sheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++){
    if(data[i][ORD_COL.ORDER_ID] === orderId){
      deleteOrderItems(orderId);
      deleteOrderTimeline(orderId);
      sheet.deleteRow(i + 1);
      logActivity(getCurrentMember(), t("ord_delete"), APP.SHEETS.ORDERS, orderId, "", "");
      return true;
    }
  }
  return false;
}

function getOrdersByStatus(status){ return getOrders().filter(o => o[ORD_COL.STATUS] === status); }
function getOrdersByCustomer(customer){ return getOrders().filter(o => o[ORD_COL.CUSTOMER] === customer); }
function getOrdersByDateRange(start, end){
  const s = new Date(start), e = new Date(end);
  return getOrders().filter(o => { const d = new Date(o[ORD_COL.DATE]); return d >= s && d <= e; });
}
function getPendingOrders(){ return getOrdersByStatus(ORDER_STATUS.PENDING); }
function getProcessingOrders(){ return getOrdersByStatus(ORDER_STATUS.PROCESSING); }
function getShippedOrders(){ return getOrdersByStatus(ORDER_STATUS.SHIPPED); }
function getDeliveredOrders(){ return getOrdersByStatus(ORDER_STATUS.DELIVERED); }
function getCancelledOrders(){ return getOrdersByStatus(ORDER_STATUS.CANCELLED); }
function getReturnedOrders(){ return getOrdersByStatus(ORDER_STATUS.RETURNED); }
function totalOrders(){ return getOrders().length; }
/**
 * ============================================================
 * PHINOX Business Operating System
 * Orders.gs - Part 2
 * بنود الطلب والمخزون
 * ============================================================
 */

const ORD_ITM_COL = {
  ENTRY_ID: 0, ORDER_ID: 1, PRODUCT_ID: 2, PRODUCT_NAME: 3, VARIANT: 4,
  COLOR: 5, SIZE: 6, QUANTITY: 7, UNIT_PRICE: 8, TOTAL_PRICE: 9, NOTES: 10
};

function ensureOrderItemsSheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(ORDER_ITEMS_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(ORDER_ITEMS_SHEET);
    const headers = [
      "Entry ID", "Order ID", "Product ID", "Product Name", "Variant",
      "Color", "Size", "Quantity", "Unit Price", "Total Price", "Notes"
    ];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 140);
  }
  return sheet;
}

function addOrderItem(orderId, item){
  ensureOrderItemsSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_ITEMS_SHEET);
  const qty = toNumber(item.quantity);
  const price = toNumber(item.unitPrice);
  const row = [
    generateId("ITM"), orderId, item.productId || "", item.productName || "",
    item.variant || "", item.color || "", item.size || "", qty, price,
    round(qty * price, 2), item.notes || ""
  ];
  sheet.appendRow(row);
  return row[ORD_ITM_COL.ENTRY_ID];
}

function getOrderItems(orderId){
  ensureOrderItemsSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_ITEMS_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.filter(r => r[ORD_ITM_COL.ORDER_ID] === orderId);
}

function deleteOrderItems(orderId){
  const sheet = getSpreadsheet().getSheetByName(ORDER_ITEMS_SHEET);
  if(!sheet) return;
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for(let i = 1; i < data.length; i++){ if(data[i][ORD_ITM_COL.ORDER_ID] === orderId) rowsToDelete.push(i + 1); }
  rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
}

function calculateOrderTotal(orderId){
  const items = getOrderItems(orderId);
  let total = 0;
  items.forEach(itm => { total += toNumber(itm[ORD_ITM_COL.TOTAL_PRICE]); });
  return round(total, 2);
}

function countOrderItems(orderId){ return getOrderItems(orderId).length; }

function confirmOrder(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  if(order[ORD_COL.STATUS] !== ORDER_STATUS.PENDING) throw new Error(t("ord_not_pending"));
  const items = getOrderItems(orderId);
  items.forEach(itm => {
    const pid = itm[ORD_ITM_COL.PRODUCT_ID];
    const qty = toNumber(itm[ORD_ITM_COL.QUANTITY]);
    if(pid) removeStock(pid, qty, t("ord_order") + ": " + orderId);
  });
  updateOrder(orderId, {status: ORDER_STATUS.CONFIRMED, itemsCount: items.length, amount: calculateOrderTotal(orderId)});
  return true;
}

function shipOrder(orderId, tracking, shippingDate){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  updateOrder(orderId, {status: ORDER_STATUS.SHIPPED, tracking: tracking || "", shippingDate: shippingDate || now()});
  return true;
}

function deliverOrder(orderId, deliveryDate){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  updateOrder(orderId, {status: ORDER_STATUS.DELIVERED, deliveryDate: deliveryDate || now(), paymentStatus: PAYMENT_STATUS.PAID});
  return true;
}

function cancelOrder(orderId, reason){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  if(order[ORD_COL.STATUS] === ORDER_STATUS.CANCELLED) throw new Error(t("ord_already_cancelled"));
  const items = getOrderItems(orderId);
  items.forEach(itm => {
    const pid = itm[ORD_ITM_COL.PRODUCT_ID];
    const qty = toNumber(itm[ORD_ITM_COL.QUANTITY]);
    if(pid) addStock(pid, qty, t("ord_cancel") + ": " + orderId);
  });
  updateOrder(orderId, {status: ORDER_STATUS.CANCELLED, notes: reason || t("ord_cancelled")});
  return true;
}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Orders.gs - Part 3
 * الإرجاع والخط الزمني والمؤشرات
 * ============================================================
 */

const ORD_TLN_COL = { ENTRY_ID: 0, ORDER_ID: 1, STATUS: 2, DATE: 3, USER: 4, NOTES: 5 };

function ensureOrderTimelineSheet(){
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(ORDER_TIMELINE_SHEET);
  if(!sheet){
    sheet = ss.insertSheet(ORDER_TIMELINE_SHEET);
    const headers = ["Entry ID", "Order ID", "Status", "Date", "User", "Notes"];
    const header = sheet.getRange(1, 1, 1, headers.length);
    header.setValues([headers]);
    header.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
    for(let i = 1; i <= headers.length; i++) sheet.setColumnWidth(i, 140);
  }
  return sheet;
}

function logOrderTimeline(orderId, status, notes){
  ensureOrderTimelineSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_TIMELINE_SHEET);
  const user = getCurrentMember();
  const userName = user ? user[MEMBER_COL.FULL_NAME] : "System";
  sheet.appendRow([generateId("TLN"), orderId, status, now(), userName, notes || ""]);
}

function getOrderTimeline(orderId){
  ensureOrderTimelineSheet();
  const sheet = getSpreadsheet().getSheetByName(ORDER_TIMELINE_SHEET);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.filter(r => r[ORD_TLN_COL.ORDER_ID] === orderId);
}

function deleteOrderTimeline(orderId){
  const sheet = getSpreadsheet().getSheetByName(ORDER_TIMELINE_SHEET);
  if(!sheet) return;
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  for(let i = 1; i < data.length; i++){ if(data[i][ORD_TLN_COL.ORDER_ID] === orderId) rowsToDelete.push(i + 1); }
  rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row));
}

function requestReturn(orderId, reason){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  if(order[ORD_COL.STATUS] !== ORDER_STATUS.DELIVERED) throw new Error(t("ord_not_delivered"));
  updateOrder(orderId, {returnStatus: RETURN_STATUS.REQUESTED, returnReason: reason || "", returnDate: now()});
  logOrderTimeline(orderId, "Return Requested", reason);
  return true;
}

function approveReturn(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  if(order[ORD_COL.RETURN_STATUS] !== RETURN_STATUS.REQUESTED) throw new Error(t("ord_no_return"));
  updateOrder(orderId, {returnStatus: RETURN_STATUS.APPROVED});
  logOrderTimeline(orderId, "Return Approved", "");
  return true;
}

function rejectReturn(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  if(order[ORD_COL.RETURN_STATUS] !== RETURN_STATUS.REQUESTED) throw new Error(t("ord_no_return"));
  updateOrder(orderId, {returnStatus: RETURN_STATUS.REJECTED});
  logOrderTimeline(orderId, "Return Rejected", "");
  return true;
}

function completeReturn(orderId){
  const order = getOrder(orderId);
  if(!order) throw new Error(t("err_order_not_found"));
  if(order[ORD_COL.RETURN_STATUS] !== RETURN_STATUS.APPROVED) throw new Error(t("ord_return_not_approved"));
  const items = getOrderItems(orderId);
  items.forEach(itm => {
    const pid = itm[ORD_ITM_COL.PRODUCT_ID];
    const qty = toNumber(itm[ORD_ITM_COL.QUANTITY]);
    if(pid) addStock(pid, qty, t("ord_return") + ": " + orderId);
  });
  updateOrder(orderId, {status: ORDER_STATUS.RETURNED, returnStatus: RETURN_STATUS.COMPLETED, paymentStatus: PAYMENT_STATUS.REFUNDED});
  logOrderTimeline(orderId, "Return Completed", "Stock restored");
  return true;
}

function totalRevenue(){
  const orders = getOrders().filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.DELIVERED && o[ORD_COL.PAYMENT_STATUS] === PAYMENT_STATUS.PAID);
  let total = 0;
  orders.forEach(o => { total += toNumber(o[ORD_COL.AMOUNT]); });
  return round(total, 2);
}

function totalPendingAmount(){
  const orders = getOrders().filter(o => o[ORD_COL.PAYMENT_STATUS] === PAYMENT_STATUS.PENDING);
  let total = 0;
  orders.forEach(o => { total += toNumber(o[ORD_COL.AMOUNT]); });
  return round(total, 2);
}

function averageOrderValue(){
  const orders = getOrders().filter(o => o[ORD_COL.STATUS] !== ORDER_STATUS.CANCELLED);
  if(orders.length === 0) return 0;
  let total = 0;
  orders.forEach(o => { total += toNumber(o[ORD_COL.AMOUNT]); });
  return round(total / orders.length, 2);
}

function getOrderKPIs(){
  const all = getOrders();
  const total = all.length;
  if(total === 0){
    return {
      totalOrders: 0, revenue: 0, averageValue: 0, conversionRate: 0,
      returnRate: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0
    };
  }
  const delivered = all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.DELIVERED).length;
  const returned = all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.RETURNED).length;
  const cancelled = all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.CANCELLED).length;
  return {
    totalOrders: total, revenue: totalRevenue(), averageValue: averageOrderValue(),
    conversionRate: round(delivered / total * 100), returnRate: round(returned / total * 100),
    cancellationRate: round(cancelled / total * 100),
    pending: all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.PENDING).length,
    processing: all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.PROCESSING).length,
    shipped: all.filter(o => o[ORD_COL.STATUS] === ORDER_STATUS.SHIPPED).length,
    delivered: delivered, cancelled: cancelled, returned: returned
  };
}

function buildOrdersDashboard(){
  const dashboard = getSheet(APP.SHEETS.DASHBOARD);
  const kpis = getOrderKPIs();
  dashboard.appendRow([]);
  dashboard.appendRow([t("ord_kpi_title"), ""]);
  dashboard.appendRow([t("ord_total"), kpis.totalOrders]);
  dashboard.appendRow([t("ord_revenue"), kpis.revenue]);
  dashboard.appendRow([t("ord_avg_value"), kpis.averageValue]);
  dashboard.appendRow([t("ord_conversion"), kpis.conversionRate + "%"]);
  dashboard.appendRow([t("ord_return_rate"), kpis.returnRate + "%"]);
  dashboard.appendRow([t("ord_cancel_rate"), kpis.cancellationRate + "%"]);
  dashboard.appendRow([]);
  dashboard.appendRow([t("ord_status_dist"), ""]);
  dashboard.appendRow([t("dash_waiting_review"), kpis.pending]);
  dashboard.appendRow([t("dash_in_progress"), kpis.processing]);
  dashboard.appendRow([t("ord_shipped"), kpis.shipped]);
  dashboard.appendRow([t("ord_delivered"), kpis.delivered]);
  dashboard.appendRow([t("dash_cancelled"), kpis.cancelled]);
  dashboard.appendRow([t("ord_returned"), kpis.returned]);
}

function refreshOrders(){
  ensureOrdersColumns();
  const orders = getOrders();
  orders.forEach(o => {
    const oid = o[ORD_COL.ORDER_ID];
    const count = countOrderItems(oid);
    const total = calculateOrderTotal(oid);
    if(count !== toNumber(o[ORD_COL.ITEMS_COUNT]) || total !== toNumber(o[ORD_COL.AMOUNT])){
      updateOrder(oid, {itemsCount: count, amount: total});
    }
  });
  buildOrdersDashboard();
}