/**
 * ============================================================
 * PHINOX Business Operating System v2.0
 * HtmlAPI.gs — Server Bridge for HTML UI
 * ============================================================
 */

/**
 * فتح الـ Dashboard الرئيسي
 */
function showDashboardUI(){
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('PHINOX Dashboard')
    .setWidth(1450)
    .setHeight(950);
  SpreadsheetApp.getUi().showModalDialog(html, 'PHINOX Business Operating System');
}
  function doGet(e) {
    return HtmlService.createHtmlOutputFromFile('WebApp')
      .setTitle('PHINOX Business Operating System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  /**
   * تضمين ملف HTML فرعي
   */
  function include(filename){
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }
  
  /**
   * جلب كل بيانات Dashboard دفعة واحدة (للأداء)
   */
 /**
 * جلب بيانات Dashboard دفعة واحدة (محسّنة للأداء)
 * تقرأ كل Sheet مرة واحدة فقط
 */
function getDashboardData(){
  const startTime = Date.now();
  
  // 1. قراءة دفعة واحدة لكل Sheet
  const membersData = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
  const tasksData = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
  const invData = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
  const finData = getSheet(APP.SHEETS.FINANCE).getDataRange().getValues();
  const ordersData = getSheet(APP.SHEETS.ORDERS).getDataRange().getValues();
  
  membersData.shift(); // إزالة الهيدر
  tasksData.shift();
  invData.shift();
  finData.shift();
  ordersData.shift();
  
  // 2. حساب المهام في الذاكرة
  let completed = 0, active = 0, pending = 0, late = 0, totalScore = 0, scoreCount = 0;
  const nowTime = new Date().getTime();
  
  tasksData.forEach(function(row){
    const status = row[6];
    const score = Number(row[15]) || 0;
    const due = row[8] ? new Date(row[8]).getTime() : 0;
    
    if(status === 'Completed') completed++;
    else if(status === 'In Progress') active++;
    else if(status === 'Waiting Review') pending++;
    
    if(due && due < nowTime && status !== 'Completed' && status !== 'Approved') late++;
    if(score > 0){ totalScore += score; scoreCount++; }
  });
  
  // 3. حساب KPI الأعضاء في الذاكرة
  const memberKPIs = [];
  membersData.forEach(function(m){
    if(!m[1]) return;
    let mCompleted = 0, mLate = 0, mScore = 0, mCount = 0;
    tasksData.forEach(function(t){
      if(t[3] === m[1]){
        if(t[6] === 'Completed') mCompleted++;
        const due = t[8] ? new Date(t[8]).getTime() : 0;
        if(due && due < nowTime && t[6] !== 'Completed') mLate++;
        const score = Number(t[15]) || 0;
        if(score > 0){ mScore += score; mCount++; }
      }
    });
    const kpi = mCount > 0 ? Math.round(mScore / mCount) : 0;
    const productivity = mCompleted > 0 ? Math.round((mCompleted / (mCompleted + mLate || 1)) * 100) : 0;
    let grade = 'D';
    if(kpi >= 90) grade = 'A+';
    else if(kpi >= 80) grade = 'A';
    else if(kpi >= 70) grade = 'B';
    else if(kpi >= 60) grade = 'C';
    
    memberKPIs.push({name: m[1], kpi: kpi, productivity: productivity, grade: grade});
  });
  
  memberKPIs.sort(function(a,b){ return b.kpi - a.kpi; });
  const top5 = memberKPIs.slice(0, 5);
  const teamKPI = memberKPIs.length > 0 ? Math.round(memberKPIs.reduce(function(s,m){return s+m.kpi;},0) / memberKPIs.length) : 0;
  const teamProd = memberKPIs.length > 0 ? Math.round(memberKPIs.reduce(function(s,m){return s+m.productivity;},0) / memberKPIs.length) : 0;
  
  // 4. حساب المخزون في الذاكرة
  let totalQty = 0, totalVal = 0, lowStock = 0, outStock = 0;
  invData.forEach(function(p){
    const qty = Number(p[7]) || 0;
    const cost = Number(p[12]) || 0;
    const minStock = Number(p[9]) || 0;
    totalQty += qty;
    totalVal += qty * cost;
    if(minStock > 0 && qty <= minStock) lowStock++;
    if(qty === 0) outStock++;
  });
  
  // 5. حساب المالية في الذاكرة
  let balance = 0, monthIncome = 0, monthExpense = 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  
  finData.forEach(function(t){
    const type = t[2];
    const amt = Number(t[5]) || 0;
    const date = t[1] ? new Date(t[1]).getTime() : 0;
    if(type === 'Income'){
      balance += amt;
      if(date >= monthStart) monthIncome += amt;
    } else {
      balance -= amt;
      if(date >= monthStart) monthExpense += amt;
    }
  });
  
  // 6. حساب الطلبات في الذاكرة
  let delivered = 0, returned = 0, cancelled = 0, totalRev = 0, totalAmt = 0, countAmt = 0;
  ordersData.forEach(function(o){
    const status = o[5];
    const amt = Number(o[7]) || 0;
    if(status === 'Delivered'){
      delivered++;
      totalRev += amt;
    }
    if(status === 'Returned') returned++;
    if(status === 'Cancelled') cancelled++;
    if(status !== 'Cancelled'){ totalAmt += amt; countAmt++; }
  });
  const totalOrders = ordersData.length;
  const conversion = totalOrders > 0 ? Math.round(delivered / totalOrders * 100) : 0;
  const returnRate = totalOrders > 0 ? Math.round(returned / totalOrders * 100) : 0;
  const avgValue = countAmt > 0 ? Math.round(totalAmt / countAmt) : 0;
  
  // 7. تجميع النتيجة
  const result = {
    cards: {
      members: membersData.length,
      tasks: tasksData.length,
      completed: completed,
      late: late,
      kpi: teamKPI,
      productivity: teamProd
    },
    topMembers: top5,
    tasksSummary: {
      pending: pending,
      active: active,
      completed: completed,
      late: late,
      avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0
    },
    inventory: {
      totalProducts: invData.length,
      totalQuantity: totalQty,
      totalValue: Math.round(totalVal),
      lowStock: lowStock,
      outOfStock: outStock
    },
    finance: {
      currentBalance: Math.round(balance),
      monthlyIncome: Math.round(monthIncome),
      monthlyExpense: Math.round(monthExpense),
      monthlyProfit: Math.round(monthIncome - monthExpense)
    },
    orders: {
      totalOrders: totalOrders,
      revenue: Math.round(totalRev),
      averageValue: avgValue,
      conversionRate: conversion,
      returnRate: returnRate
    }
  };
  
  Logger.log("Dashboard loaded in " + (Date.now() - startTime) + "ms");
    // Mini ERP
    const salesData = getSheet(APP.SHEETS.SALES).getDataRange().getValues();
    salesData.shift();
    const expData = getSheet(APP.SHEETS.EXPENSES).getDataRange().getValues();
    expData.shift();
    const shData = getSheet(APP.SHEETS.SHAREHOLDERS).getDataRange().getValues();
    shData.shift();
    
    result.sales = salesData.slice(-10); // آخر 10 فواتير
    result.expenses = expData.slice(-10); // آخر 10 مصروفات
    result.shareholders = shData;
  return result;
}
  
  /**
   * جلب قائمة الأعضاء للـ Dropdowns
   */
  function getMembersList(){
    return getMembers().map(m => ({id: m[0], name: m[1], role: m[2]}));
  }
  
  /**
   * جلب قائمة المنتجات للـ Dropdowns
   */
  function getProductsList(){
    return getProducts().map(p => ({
      id: p[INV_COL.ITEM_ID],
      name: p[INV_COL.ITEM_NAME] + ' (' + p[INV_COL.VARIANT] + ')',
      stock: p[INV_COL.QUANTITY],
      price: p[INV_COL.PRICE]
    }));
  }
  
  /**
   * إنشاء مهمة من الـ Dialog
   */
  function createTaskFromDialog(data){
    try{
      validateTaskInput(data);
      const taskId = createTask({
        title: data.title,
        category: data.category,
        assignedTo: data.assignedTo,
        priority: data.priority,
        difficulty: data.difficulty,
        startDate: data.startDate ? new Date(data.startDate) : now(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      });
      notifyTaskAssigned(taskId, data.assignedTo);
      return {success: true, id: taskId, message: t("task_new_assigned")};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * إضافة عضو من الـ Dialog
   */
  function addMemberFromDialog(data){
    try{
      if(!isValidEmail(data.email)) throw new Error(t("val_invalid_email"));
      addMember({
        name: data.name,
        role: data.role,
        email: data.email,
        phone: data.phone || ""
      });
      return {success: true, message: "تم إضافة العضو: " + data.name};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * إضافة منتج من الـ Dialog
   */
  function addProductFromDialog(data){
    try{
      const id = addProduct({
        name: data.name,
        category: data.category,
        variant: data.variant || "",
        color: data.color || "",
        size: data.size || "",
        quantity: Number(data.quantity) || 0,
        minStock: Number(data.minStock) || 0,
        cost: Number(data.cost) || 0,
        price: Number(data.price) || 0,
        warehouse: data.warehouse || "Main",
        supplier: data.supplier || ""
      });
      return {success: true, id: id, message: "تم إضافة المنتج: " + data.name};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * إنشاء طلب من الـ Dialog
   */
  function addOrderFromDialog(data){
    try{
      const orderId = addOrder({
        customer: data.customer,
        phone: data.phone || "",
        email: data.email || "",
        items: data.items || [],
        amount: 0,
        shippingAddress: data.shippingAddress || ""
      });
      return {success: true, id: orderId, message: "تم إنشاء الطلب: " + orderId};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * تحديث النظام من الـ Dashboard
   */
  function refreshSystemFromUI(){
    try{
      safeRefresh();
      return {success: true, message: "تم التحديث بنجاح"};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  
  /**
   * تسجيل معاملة مالية من الـ Dialog
   */
  function addTransactionFromDialog(data){
    try{
      const id = addTransaction({
        type: data.type,
        category: data.category,
        description: data.description,
        amount: Number(data.amount),
        date: data.date ? new Date(data.date) : now()
      });
      return {success: true, id: id, message: "تم تسجيل المعاملة"};
    }catch(e){
      return {success: false, error: e.message};
    }
  }
  /**
 * توليد HTML للـ Dialogs (يتم استدعاؤها من Dashboard)
 */
/**
 * فتح Dialog إضافة مهمة (من السيرفر)
 */
function openTaskDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('TaskDialog')
      .setWidth(500).setHeight(650);
    SpreadsheetApp.getUi().showModalDialog(html, 'إضافة مهمة جديدة');
  }
  
  /**
   * فتح Dialog إضافة عضو
   */
  function openMemberDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('MemberDialog')
      .setWidth(450).setHeight(550);
    SpreadsheetApp.getUi().showModalDialog(html, 'إضافة عضو جديد');
  }
  
  /**
   * فتح Dialog إضافة منتج
   */
  function openProductDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('InventoryDialog')
      .setWidth(500).setHeight(650);
    SpreadsheetApp.getUi().showModalDialog(html, 'إضافة منتج جديد');
  }
  
  /**
   * فتح Dialog طلب جديد
   */
  function openOrderDialogServer(){
    const html = HtmlService.createHtmlOutputFromFile('OrderDialog')
      .setWidth(600).setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, 'طلب جديد');
  }
  /**
 * ============================================================
 * Mini ERP Dialog Bridge
 * ============================================================
 */

function addSaleFromDialog(data){
  try{
    var id = addSale({
      invoice: data.invoice,
      date: data.date ? new Date(data.date) : now(),
      customer: data.customer,
      description: data.description,
      amount: Number(data.amount),
      payment: data.payment,
      notes: data.notes
    });
    return {success: true, id: id, message: "تم حفظ الفاتورة: " + id};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function addExpenseFromDialog(data){
  try{
    addExpense({
      date: data.date ? new Date(data.date) : now(),
      type: data.type,
      supplier: data.supplier,
      description: data.description,
      amount: Number(data.amount),
      notes: data.notes
    });
    return {success: true, message: "تم تسجيل المصروف"};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function addShareholderFromDialog(data){
  try{
    addShareholder({
      name: data.name,
      email: data.email,
      shares: Number(data.shares)
    });
    return {success: true, message: "تم إضافة المساهم: " + data.name};
  }catch(e){
    return {success: false, error: e.message};
  }
}
/**
 * ============================================================
 * Universal Delete Engine
 * ============================================================
 */

function deleteRecordFromUI(data){
  try{
    const sheetName = data.sheet;
    const id = data.id;
    const sheet = getSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    
    for(let i = 1; i < allData.length; i++){
      if(String(allData[i][0]).trim() === String(id).trim()){
        sheet.deleteRow(i + 1);
        logActivity(getCurrentMember(), "حذف سجل", sheetName, id, "", "");
        return {success: true, message: "تم الحذف من " + sheetName};
      }
    }
    throw new Error("السجل غير موجود أو تم حذفه مسبقاً");
  }catch(e){
    return {success: false, error: e.message};
  }
}

/**
 * جلب بيانات أي ورقة للعرض في Dashboard
 */
function getSheetPreview(sheetName, limit){
  try{
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if(data.length <= 1) return {headers: [], rows: []};
    const headers = data[0];
    const rows = data.slice(1, (limit || 10) + 1);
    return {headers: headers, rows: rows, total: data.length - 1};
  }catch(e){
    return {headers: [], rows: [], total: 0, error: e.message};
  }
}
/**
 * ============================================================
 * Department Dashboards: CEO Executive Summary
 * ============================================================
 */

function getCEODashboardData(){
  const cfg = getMiniERPConfig();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Sales
  const sales = getSales();
  let monthRevenue = 0, lastMonthRevenue = 0;
  sales.forEach(function(s){
    var d = new Date(s[SALE_COL.DATE]);
    var amt = toNumber(s[SALE_COL.AMOUNT]);
    if(d >= monthStart) monthRevenue += amt;
    else if(d >= lastMonthStart && d <= lastMonthEnd) lastMonthRevenue += amt;
  });
  
  // Expenses
  const expenses = getExpenses();
  let monthExpenses = 0, lastMonthExpenses = 0;
  expenses.forEach(function(e){
    var d = new Date(e[EXP_COL.DATE]);
    var amt = toNumber(e[EXP_COL.AMOUNT]);
    if(d >= monthStart) monthExpenses += amt;
    else if(d >= lastMonthStart && d <= lastMonthEnd) lastMonthExpenses += amt;
  });
  
  // Pending approvals
  const tasks = getSheet(APP.SHEETS.TASKS).getDataRange().getValues();
  var pendingApproval = 0, activeTasks = 0;
  tasks.forEach(function(t, i){ 
    if(i === 0) return;
    if(t[6] === 'Waiting Review') pendingApproval++;
    if(t[6] === 'In Progress') activeTasks++;
  });
  
  // Members
  const members = getSheet(APP.SHEETS.MEMBERS).getDataRange().getValues();
  var activeMembers = 0;
  members.forEach(function(m, i){ if(i > 0 && String(m[5]).toLowerCase() === 'active') activeMembers++; });
  
  // Low stock
  const inv = getSheet(APP.SHEETS.INVENTORY).getDataRange().getValues();
  var lowStock = 0, outOfStock = 0, totalStockValue = 0;
  inv.forEach(function(p, i){ 
    if(i === 0) return;
    var qty = toNumber(p[7]); 
    var minStock = toNumber(p[9]);
    var cost = toNumber(p[12]);
    totalStockValue += qty * cost;
    if(minStock > 0 && qty <= minStock && qty > 0) lowStock++;
    if(qty === 0) outOfStock++;
  });
  
  // Recent sales (last 5)
  var recentSales = sales.slice(-5).reverse().map(function(s){
    return {
      id: s[SALE_COL.INVOICE],
      date: formatDateStr(s[SALE_COL.DATE]),
      customer: s[SALE_COL.CUSTOMER],
      amount: toNumber(s[SALE_COL.AMOUNT])
    };
  });
  
  // Growth rates
  var revGrowth = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;
  var expGrowth = lastMonthExpenses > 0 ? Math.round(((monthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100) : 0;
  
  return {
    revenue: monthRevenue,
    expenses: monthExpenses,
    profit: monthRevenue - monthExpenses,
    margin: monthRevenue > 0 ? Math.round(((monthRevenue - monthExpenses) / monthRevenue) * 100) : 0,
    revGrowth: revGrowth,
    expGrowth: expGrowth,
    pendingApprovals: pendingApproval,
    activeTasks: activeTasks,
    activeMembers: activeMembers,
    lowStock: lowStock,
    outOfStock: outOfStock,
    stockValue: Math.round(totalStockValue),
    recentSales: recentSales,
    currency: cfg.currency
  };
}
/**
 * ============================================================
 * Department Dashboards: Finance
 * ============================================================
 */

function getFinanceDashboardData(){
  const cfg = getMiniERPConfig();
  const now = new Date();
  const months = [];
  for(var i = 5; i >= 0; i--){
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
      label: d.toLocaleDateString('ar-EG', {month: 'short', year: 'numeric'})
    });
  }
  
  // Transactions
  const finSheet = getSheet(APP.SHEETS.FINANCE);
  const finData = finSheet.getDataRange().getValues();
  var transactions = [];
  var monthlyIncome = {};
  var monthlyExpense = {};
  var categoryExpenses = {};
  var totalIncome = 0, totalExpense = 0;
  var recentTxns = [];
  
  months.forEach(function(m){ monthlyIncome[m.key] = 0; monthlyExpense[m.key] = 0; });
  
  for(var i = 1; i < finData.length; i++){
    var row = finData[i];
    var type = String(row[2]).trim();
    var amt = toNumber(row[5]);
    var date = row[1] ? new Date(row[1]) : null;
    var cat = String(row[3] || 'أخرى').trim();
    var desc = String(row[4] || '').trim();
    
    if(!date || isNaN(date.getTime())) continue;
    
    var mKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    
    if(type === 'Income' || type === 'إيراد'){
      totalIncome += amt;
      if(monthlyIncome[mKey] !== undefined) monthlyIncome[mKey] += amt;
    } else {
      totalExpense += amt;
      if(monthlyExpense[mKey] !== undefined) monthlyExpense[mKey] += amt;
      categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amt;
    }
    
    recentTxns.push({
      date: formatDateStr(date),
      type: type,
      category: cat,
      description: desc,
      amount: amt
    });
  }
  
  // Budget
  const budgetSheet = getSheet("Budget");
  var budgetData = {totalBudget: 0, totalActual: 0, categories: []};
  if(budgetSheet){
    var bData = budgetSheet.getDataRange().getValues();
    for(var j = 1; j < bData.length; j++){
      var bCat = String(bData[j][0] || '').trim();
      var bAmt = toNumber(bData[j][1]);
      var bActual = toNumber(bData[j][2]);
      if(bCat){
        budgetData.totalBudget += bAmt;
        budgetData.totalActual += bActual;
        budgetData.categories.push({
          category: bCat,
          budget: bAmt,
          actual: bActual,
          variance: bActual - bAmt,
          percent: bAmt > 0 ? Math.round((bActual / bAmt) * 100) : 0
        });
      }
    }
  }
  
  // Cash flow
  var cashFlow = months.map(function(m){
    return {
      month: m.label,
      income: Math.round(monthlyIncome[m.key]),
      expense: Math.round(monthlyExpense[m.key]),
      net: Math.round(monthlyIncome[m.key] - monthlyExpense[m.key])
    };
  });
  
  // Top expense categories
  var topCategories = Object.keys(categoryExpenses).map(function(k){
    return {category: k, amount: categoryExpenses[k]};
  }).sort(function(a,b){ return b.amount - a.amount; }).slice(0, 5);
  
  return {
    summary: {
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      netProfit: Math.round(totalIncome - totalExpense),
      margin: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      currency: cfg.currency
    },
    cashFlow: cashFlow,
    recentTransactions: recentTxns.slice(-10).reverse(),
    topCategories: topCategories,
    budget: budgetData
  };
}
/**
 * ============================================================
 * Department Dashboards: Inventory
 * ============================================================
 */

function getInventoryDashboardData(){
  const invSheet = getSheet(APP.SHEETS.INVENTORY);
  const invData = invSheet.getDataRange().getValues();
  
  var totalProducts = 0, totalQuantity = 0, totalValue = 0;
  var lowStock = 0, outOfStock = 0, healthy = 0;
  var categories = {};
  var warehouses = {};
  var lowStockItems = [];
  var outStockItems = [];
  
  for(var i = 1; i < invData.length; i++){
    var row = invData[i];
    var name = String(row[1] || '').trim();
    var cat = String(row[2] || 'أخرى').trim();
    var qty = toNumber(row[7]);
    var minStock = toNumber(row[9]);
    var cost = toNumber(row[12]);
    var warehouse = String(row[11] || 'Main').trim();
    
    if(!name) continue;
    
    totalProducts++;
    totalQuantity += qty;
    totalValue += qty * cost;
    
    // Category
    categories[cat] = categories[cat] || {count: 0, qty: 0, value: 0};
    categories[cat].count++;
    categories[cat].qty += qty;
    categories[cat].value += qty * cost;
    
    // Warehouse
    warehouses[warehouse] = warehouses[warehouse] || {count: 0, qty: 0};
    warehouses[warehouse].count++;
    warehouses[warehouse].qty += qty;
    
    // Stock status
    if(qty === 0){
      outOfStock++;
      outStockItems.push({name: name, category: cat, warehouse: warehouse});
    } else if(minStock > 0 && qty <= minStock){
      lowStock++;
      lowStockItems.push({name: name, category: cat, qty: qty, min: minStock, warehouse: warehouse});
    } else {
      healthy++;
    }
  }
  
  // Stock movements (last 10)
  var movements = [];
  try{
    var moveSheet = getSheet("Stock Movements");
    var moveData = moveSheet.getDataRange().getValues();
    for(var j = Math.max(1, moveData.length - 10); j < moveData.length; j++){
      movements.push({
        date: formatDateStr(moveData[j][0]),
        product: String(moveData[j][2] || ''),
        type: String(moveData[j][3] || ''),
        qty: toNumber(moveData[j][4]),
        warehouse: String(moveData[j][6] || '')
      });
    }
  }catch(e){
    // Stock Movements sheet may not exist
  }
  
  // Top products by value
  var topProducts = [];
  for(var k = 1; k < invData.length; k++){
    var pName = String(invData[k][1] || '').trim();
    var pQty = toNumber(invData[k][7]);
    var pPrice = toNumber(invData[k][13]);
    if(pName) topProducts.push({name: pName, qty: pQty, value: pQty * pPrice});
  }
  topProducts.sort(function(a,b){ return b.value - a.value; });
  
  return {
    summary: {
      totalProducts: totalProducts,
      totalQuantity: totalQuantity,
      totalValue: Math.round(totalValue),
      lowStock: lowStock,
      outOfStock: outOfStock,
      healthy: healthy
    },
    categories: Object.keys(categories).map(function(k){
      return {name: k, count: categories[k].count, qty: categories[k].qty, value: Math.round(categories[k].value)};
    }).sort(function(a,b){ return b.value - a.value; }),
    warehouses: Object.keys(warehouses).map(function(k){
      return {name: k, count: warehouses[k].count, qty: warehouses[k].qty};
    }),
    lowStockItems: lowStockItems.slice(0, 10),
    outStockItems: outStockItems.slice(0, 10),
    movements: movements.reverse(),
    topProducts: topProducts.slice(0, 5)
  };
}
/**
 * ============================================================
 * Department Dashboards: Orders
 * ============================================================
 */

function getOrdersDashboardData(){
  const ordersSheet = getSheet(APP.SHEETS.ORDERS);
  const ordersData = ordersSheet.getDataRange().getValues();
  
  var totalOrders = 0, totalRevenue = 0, totalItems = 0;
  var delivered = 0, pending = 0, confirmed = 0, processing = 0, shipped = 0, cancelled = 0, returned = 0;
  var customers = {};
  var monthlyOrders = {};
  var monthlyRevenue = {};
  var recentOrders = [];
  
  var now = new Date();
  for(var m = 5; m >= 0; m--){
    var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthlyOrders[key] = 0;
    monthlyRevenue[key] = 0;
  }
  
  for(var i = 1; i < ordersData.length; i++){
    var row = ordersData[i];
    var id = String(row[0] || '').trim();
    var customer = String(row[1] || '').trim();
    var status = String(row[5] || 'Pending').trim();
    var amount = toNumber(row[7]);
    var items = toNumber(row[6]);
    var date = row[4] ? new Date(row[4]) : null;
    
    if(!id) continue;
    totalOrders++;
    totalRevenue += amount;
    totalItems += items;
    
    // Status counts
    if(status === 'Delivered') delivered++;
    else if(status === 'Pending') pending++;
    else if(status === 'Confirmed') confirmed++;
    else if(status === 'Processing') processing++;
    else if(status === 'Shipped') shipped++;
    else if(status === 'Cancelled') cancelled++;
    else if(status === 'Returned') returned++;
    
    // Customers
    if(customer){
      customers[customer] = customers[customer] || {orders: 0, revenue: 0};
      customers[customer].orders++;
      customers[customer].revenue += amount;
    }
    
    // Monthly
    if(date && !isNaN(date.getTime())){
      var mKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      if(monthlyOrders[mKey] !== undefined){
        monthlyOrders[mKey]++;
        monthlyRevenue[mKey] += amount;
      }
    }
    
    // Recent (last 10)
    recentOrders.push({
      id: id,
      customer: customer,
      date: formatDateStr(date),
      status: status,
      amount: amount,
      items: items
    });
  }
  
  // Top customers
  var topCustomers = Object.keys(customers).map(function(k){
    return {name: k, orders: customers[k].orders, revenue: customers[k].revenue};
  }).sort(function(a,b){ return b.revenue - a.revenue; }).slice(0, 5);
  
  // Monthly trend
  var trend = [];
  for(var mk in monthlyOrders){
    if(monthlyOrders.hasOwnProperty(mk)){
      var parts = mk.split('-');
      var label = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1).toLocaleDateString('ar-EG', {month: 'short'});
      trend.push({month: label, orders: monthlyOrders[mk], revenue: Math.round(monthlyRevenue[mk])});
    }
  }
  
  return {
    summary: {
      totalOrders: totalOrders,
      totalRevenue: Math.round(totalRevenue),
      totalItems: totalItems,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      conversionRate: totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0,
      returnRate: totalOrders > 0 ? Math.round((returned / totalOrders) * 100) : 0,
      cancelRate: totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0
    },
    status: {
      pending: pending,
      confirmed: confirmed,
      processing: processing,
      shipped: shipped,
      delivered: delivered,
      cancelled: cancelled,
      returned: returned
    },
    topCustomers: topCustomers,
    trend: trend,
    recentOrders: recentOrders.slice(-10).reverse()
  };
}
/**
 * KPI Library Bridge
 */
function getDepartmentKPIsFromUI(deptName){
  try{
    return {success: true, data: getDepartmentKPIs(deptName)};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function getAllDepartmentsSummaryFromUI(){
  try{
    return {success: true, data: getAllDepartmentsSummary()};
  }catch(e){
    return {success: false, error: e.message};
  }
}
/**
 * ============================================================
 * KPI Executive Summary & Alerts
 * ============================================================
 */

function getKPIExecutiveSummary(){
  var depts = getAllDepartmentsSummary();
  var totalDepts = depts.length;
  var excellent = depts.filter(function(d){ return d.score >= 100; }).length;
  var good = depts.filter(function(d){ return d.score >= 80 && d.score < 100; }).length;
  var atRisk = depts.filter(function(d){ return d.score >= 60 && d.score < 80; }).length;
  var critical = depts.filter(function(d){ return d.score < 60; }).length;
  
  var overallScore = totalDepts > 0 ? Math.round(depts.reduce(function(s,d){ return s + d.score; }, 0) / totalDepts) : 0;
  
  // Find worst performing departments
  var worstDepts = depts.filter(function(d){ return d.score < 70; }).slice(0, 3).map(function(d){
    return {name: getDeptArabicNameStatic(d.name), score: d.score, grade: d.grade};
  });
  
  // Find best performing
  var bestDepts = depts.filter(function(d){ return d.score >= 100; }).slice(0, 3).map(function(d){
    return {name: getDeptArabicNameStatic(d.name), score: d.score, grade: d.grade};
  });
  
  // Alerts
  var alerts = [];
  depts.forEach(function(d){
    if(d.score < 60){
      alerts.push({type: 'critical', dept: getDeptArabicNameStatic(d.name), score: d.score, message: 'أداء حرج — تدخل فوري مطلوب'});
    } else if(d.score < 70){
      alerts.push({type: 'warning', dept: getDeptArabicNameStatic(d.name), score: d.score, message: 'أداء منخفض — خطة تحسين مطلوبة'});
    }
  });
  
  // Recommendations
  var recommendations = [];
  if(critical > 0){
    recommendations.push({priority: 'P1', icon: '🔴', text: 'عقد اجتماع طارئ مع ' + critical + ' أقسام حرجة'});
  }
  if(atRisk > 0){
    recommendations.push({priority: 'P2', icon: '🟠', text: 'وضع خطط تحسين لـ ' + atRisk + ' أقسام متوسطة'});
  }
  if(excellent >= 3){
    recommendations.push({priority: 'P3', icon: '🟢', text: 'تكريم ' + excellent + ' أقسام متميزة وتعميم أفضل الممارسات'});
  }
  if(overallScore < 75){
    recommendations.push({priority: 'P1', icon: '🔴', text: 'مراجعة استراتيجية الشركة — الأداء العام دون المستهدف'});
  }
  
  return {
    overallScore: overallScore,
    overallGrade: overallScore >= 100 ? 'A' : (overallScore >= 80 ? 'B' : (overallScore >= 60 ? 'C' : (overallScore >= 40 ? 'D' : 'F'))),
    overallColor: overallScore >= 100 ? '#2E7D32' : (overallScore >= 80 ? '#7B1FA2' : (overallScore >= 60 ? '#F9A825' : '#C62828')),
    totalDepartments: totalDepts,
    excellent: excellent,
    good: good,
    atRisk: atRisk,
    critical: critical,
    worstDepts: worstDepts,
    bestDepts: bestDepts,
    alerts: alerts,
    recommendations: recommendations,
    lastUpdated: Utilities.formatDate(new Date(), APP.INFO.TIMEZONE, 'dd/MM/yyyy HH:mm')
  };
}

function getDeptArabicNameStatic(enName){
  var map = {
    'CEO': 'الإدارة التنفيذية',
    'Finance': 'المالية',
    'Inventory': 'المخزون',
    'Orders': 'الطلبات',
    'Marketing': 'التسويق',
    'HR': 'الموارد البشرية',
    'Operations': 'التشغيل',
    'Sales': 'المبيعات',
    'Customer Service': 'خدمة العملاء',
    'Design': 'التصميم',
    'IT': 'تكنولوجيا المعلومات',
    'Procurement': 'المشتريات',
    'Production': 'الإنتاج',
    'Quality': 'الجودة',
    'Logistics': 'الخدمات اللوجستية',
    'Admin': 'الإدارة',
    'Security': 'الأمن',
    'Compliance': 'الامتثال',
    'R_D': 'البحث والتطوير',
    'Legal': 'الشؤون القانونية'
  };
  return map[enName] || enName;
}

function getKPIExecutiveSummaryFromUI(){
  try{
    return {success: true, data: getKPIExecutiveSummary()};
  }catch(e){
    return {success: false, error: e.message};
  }
}
/**
 * ============================================================
 * Advanced Security — UI Bridge
 * ============================================================
 */

function getPendingApprovalsFromUI(){
  try{
    return {success: true, data: getPendingApprovalRequests()};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function submitApprovalFromUI(data){
  try{
    var id = submitApprovalRequest({
      type: data.type,
      targetSheet: data.targetSheet,
      targetId: data.targetId,
      details: data.details,
      notes: data.notes
    });
    return {success: true, id: id, message: 'تم إرسال طلب الاعتماد'};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function approveRequestFromUI(data){
  try{
    return processApproval(data, 'Approved', 'تم الاعتماد');
  }catch(e){
    return {success: false, error: e.message};
  }
}

function rejectRequestFromUI(data){
  try{
    return processApproval(data, 'Rejected', 'تم الرفض');
  }catch(e){
    return {success: false, error: e.message};
  }
}

function softDeleteFromUI(data){
  try{
    return softDeleteRecord({sheet: data.sheet, id: data.id});
  }catch(e){
    return {success: false, error: e.message};
  }
}

function getArchivedRecordsFromUI(){
  try{
    return {success: true, data: getArchivedRecords()};
  }catch(e){
    return {success: false, error: e.message};
  }
}

function restoreRecordFromUI(data){
  try{
    return restoreRecord(data.archiveId);
  }catch(e){
    return {success: false, error: e.message};
  }
}

function createBackupFromUI(){
  try{
    return createSystemBackup();
  }catch(e){
    return {success: false, error: e.message};
  }
}

function getBackupStatusFromUI(){
  try{
    return {success: true, data: getBackupStatus()};
  }catch(e){
    return {success: false, error: e.message};
  }
}
/**
 * KPI v4 Bridges
 */
function getDepartmentKPIs_v4_UI(deptName, monthKey){
  try{ return {success:true, data:getDepartmentKPIs_v4(deptName, monthKey)}; }
  catch(e){ return {success:false, error:e.message}; }
}

function getAllDepartmentsSummary_v4_UI(monthKey){
  try{ return {success:true, data:getAllDepartmentsSummary_v4(monthKey)}; }
  catch(e){ return {success:false, error:e.message}; }
}

function getKPIsNeedingInput_UI(){
  try{ return {success:true, data:getKPIsNeedingInput()}; }
  catch(e){ return {success:false, error:e.message}; }
}

function submitKPIInput_UI(data){
  try{ return submitKPIInput(data); }
  catch(e){ return {success:false, error:e.message}; }
}
function submitKPIBatch_UI(data){
  try{ return {success: true, data: submitKPIBatch(data.inputs)}; }
  catch(e){ return {success: false, error: e.message}; }
}