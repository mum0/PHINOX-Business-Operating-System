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
 * PHINOX Business Operating System (PBOS)
 * Utilities.gs
 * Common Utility Functions
 * ============================================================
 */

/**
 * إنشاء معرف فريد
 * مثال: TASK-20260725-0001
 */
function generateId(prefix) {
  prefix = prefix || "ID";
  const now = new Date();
  const date = Utilities.formatDate(now, APP.INFO.TIMEZONE, "yyyyMMdd");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return prefix + "-" + date + "-" + random;
}

/**
 * التاريخ الحالي
 */
function now() {
  return new Date();
}

/**
 * تنسيق التاريخ
 */
function formatDate(date) {
  return Utilities.formatDate(new Date(date), APP.INFO.TIMEZONE, APP.INFO.DATE_FORMAT);
}

/**
 * إرجاع Spreadsheet الحالي
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * إرجاع Sheet بالاسم
 */
function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

/**
 * هل الشيت موجود؟
 */
function sheetExists(name) {
  return getSheet(name) !== null;
}

/**
 * آخر صف يحتوي بيانات
 */
function lastRow(sheetName) {
  return getSheet(sheetName).getLastRow();
}

/**
 * آخر عمود
 */
function lastColumn(sheetName) {
  return getSheet(sheetName).getLastColumn();
}

/**
 * إضافة صف جديد
 */
function append(sheetName, values) {
  getSheet(sheetName).appendRow(values);
}

/**
 * حذف جميع البيانات
 */
function clearSheet(sheetName) {
  getSheet(sheetName).clearContents();
}

/**
 * البحث عن صف بواسطة قيمة
 */
function findRow(sheetName, column, value) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][column - 1] == value) {
      return i + 1;
    }
  }
  return -1;
}

/**
 * تحديث صف
 */
function updateRow(sheetName, row, values) {
  const sheet = getSheet(sheetName);
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
}

/**
 * حذف صف
 */
function deleteRow(sheetName, row) {
  getSheet(sheetName).deleteRow(row);
}

/**
 * هل القيمة فارغة؟
 */
function isEmpty(value) {
  return value === "" || value === null || value === undefined;
}

/**
 * تحويل إلى رقم
 */
function toNumber(value) {
  return Number(value) || 0;
}

/**
 * تقريب رقم
 */
function round(value, decimals) {
  decimals = decimals !== undefined ? decimals : 2;
  return Number(value.toFixed(decimals));
}

/**
 * الحد الأدنى والأقصى
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * كتابة Log
 */
function log(message) {
  Logger.log(message);
}

/**
 * ============================================================
 * Utility Additions for Phase 4
 * ============================================================
 */

/**
 * كتابة صفوف دفعة واحدة (تحسين الأداء)
 */
function appendRows(sheetName, rows){
  if(!rows || rows.length === 0) return;
  const sheet = getSheet(sheetName);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * تحديث نطاق دفعة واحدة
 */
function setRangeValues(sheet, startRow, startCol, values){
  if(!values || values.length === 0) return;
  sheet.getRange(startRow, startCol, values.length, values[0].length).setValues(values);
}

/**
 * استخراج عمود من بيانات ثنائية الأبعاد
 */
function getColumn(data, colIndex){
  return data.map(function(row){ return row[colIndex]; });
}

/**
 * فهرس الصف في بيانات
 */
function findRowIndex(data, colIndex, value){
  for(let i = 0; i < data.length; i++){
    if(data[i][colIndex] === value){
      return i;
    }
  }
  return -1;
}

/**
 * ============================================================
 * Mini ERP Helpers
 * ============================================================
 */

function formatCurrency(value, currency){
  currency = currency || 'EGP';
  const symbol = MINI_ERP.SYMBOLS[currency] || currency;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('ar-SA', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return (value < 0 ? '-' : '') + formatted + ' ' + symbol;
}

function formatPercent(ratio){
  return (ratio * 100).toFixed(2) + '%';
}

function formatNumber(value){
  return Number(value).toLocaleString('ar-SA');
}

function formatDateStr(date){
  if(!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if(isNaN(d.getTime())) return String(date);
  return Utilities.formatDate(d, APP.INFO.TIMEZONE, 'dd/MM/yyyy');
}

function toMonthKey(date){
  if(!(date instanceof Date) || isNaN(date.getTime())) return null;
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

function isPositiveNumber(val){
  const n = parseFloat(val);
  return isFinite(n) && n > 0;
}

function safeStr(val){
  return val !== null && val !== undefined ? String(val).trim() : '';
}

function getLastDataRow(sheet, col){
  const lastRow = sheet.getLastRow();
  if(lastRow < 2) return 1;
  const colData = sheet.getRange(1, col, lastRow, 1).getValues();
  for(let i = colData.length - 1; i >= 0; i--){
    if(colData[i][0] !== '') return i + 1;
  }
  return 1;
}

function styleHeader(range, bgColor, textColor){
  range.setBackground(bgColor || APP.COLORS.PRIMARY)
    .setFontColor(textColor || '#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

function applyAlternatingRows(sheet, startRow, numRows, numCols){
  for(let i = 0; i < numRows; i++){
    sheet.getRange(startRow + i, 1, 1, numCols)
      .setBackground(i % 2 === 0 ? '#ffffff' : APP.COLORS.GRAY_LIGHT);
  }
}

function showToast(message, title, timeout){
  SpreadsheetApp.getActiveSpreadsheet().toast(message, title || '⚙️ PHINOX', timeout || 3);
}

function getMiniERPConfig(){
  const sheet = getSheet(APP.SHEETS.SETTINGS);
  if(!sheet) return {companyName: 'PHINOX', currency: 'EGP', sharePrice: 1000, initialCapital: 0};
  const values = sheet.getRange(3, 2, 4, 1).getValues();
  return {
    companyName: String(values[0][0] || 'PHINOX').trim(),
    currency: String(values[1][0] || 'EGP').trim(),
    sharePrice: parseFloat(values[2][0]) || 0,
    initialCapital: parseFloat(values[3][0]) || 0
  };
}