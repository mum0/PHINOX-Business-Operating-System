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
 * Dashboard.gs - Part 1
 * Dashboard Engine
 * ============================================================
 */

/**
 * تحديث لوحة التحكم الرئيسية
 */
function buildDashboard(){

    const sheet = getSheet(APP.SHEETS.DASHBOARD);

    sheet.clear();

    let row = 1;

    row = createDashboardHeader(sheet, row);

    row = createSummaryCards(sheet, row);

    row = createPerformanceSection(sheet, row);

    row = createMemberSection(sheet, row);

    row = createTaskSection(sheet, row);

    row = createKPISection(sheet, row);

    return row;

}

/**
 * Header
 */
function createDashboardHeader(sheet, startRow){

    sheet.getRange(startRow, 1, 1, 6)
        .merge()
        .setValue(APP.INFO.NAME);

    sheet.getRange(startRow + 1, 1)
        .setValue("Generated");

    sheet.getRange(startRow + 1, 2)
        .setValue(now());

    return startRow + 3;

}

/**
 * بطاقات الملخص
 */
function createSummaryCards(sheet, startRow){

    const cards = [

        ["Members", totalMembers()],

        ["Tasks", totalTasks()],

        ["Completed", completedTasks()],

        ["Late", getLateTasks().length],

        ["Average KPI", teamAverageKPI()],

        ["Average Productivity", averageProductivity()]

    ];

    cards.forEach((card, index) => {

        sheet.getRange(startRow + index, 1).setValue(card[0]);

        sheet.getRange(startRow + index, 2).setValue(card[1]);

    });

    return startRow + cards.length + 1;

}

/**
 * قسم الأداء
 */
function createPerformanceSection(sheet, startRow){

    const data = updatePerformanceDashboard();

    data.forEach((rowData, index) => {

        sheet.getRange(startRow + index, 1, 1, 2).setValues([rowData]);

    });

    return startRow + data.length + 1;

}

/**
 * قسم الأعضاء
 */
function createMemberSection(sheet, startRow){

    sheet.getRange(startRow, 1)
         .setValue("Top Members");

    const members = topPerformers(5);

    members.forEach((member, index) => {

        sheet.getRange(startRow + 1 + index, 1, 1, 4).setValues([

            [member.member, member.kpi, member.productivity, member.grade]

        ]);

    });

    return startRow + 1 + members.length + 1;

}

/**
 * قسم المهام
 */
function createTaskSection(sheet, startRow){

    sheet.getRange(startRow, 1)
        .setValue("Tasks Summary");

    const rows = [

        ["Waiting Review", pendingReviewCount()],

        ["In Progress", activeTasks()],

        ["Completed", completedTasks()]

    ];

    rows.forEach((rowData, index) => {

        sheet.getRange(startRow + 1 + index, 1, 1, 2).setValues([rowData]);

    });

    return startRow + 1 + rows.length + 1;

}

/**
 * قسم KPI
 */
function createKPISection(sheet, startRow){

    const kpiData = updateKPIDashboard();

    kpiData.forEach((rowData, index) => {

        sheet.getRange(startRow + index, 1, 1, 2).setValues([rowData]);

    });

    const reviewData = refreshReviewDashboard();

    reviewData.forEach((rowData, index) => {

        sheet.getRange(startRow + kpiData.length + index, 1, 1, 2).setValues([rowData]);

    });

    return startRow + kpiData.length + reviewData.length + 1;

}

/**
 * ============================================================
 * Dashboard.gs - Part 2
 * Formatting & Charts
 * ============================================================
 */

/**
 * البحث عن صف بواسطة القيمة
 */
function findRowByValue(sheet, col, value){
    const data = sheet.getRange(1, col, sheet.getLastRow(), 1).getValues();
    for(let i = 0; i < data.length; i++){
        if(data[i][0] === value){
            return i + 1;
        }
    }
    return -1;
}

/**
 * تنسيق لوحة التحكم
 */
function formatDashboard(){

    const sheet = getSheet(APP.SHEETS.DASHBOARD);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    sheet.setFrozenRows(2);

    sheet.getRange(1, 1, lastRow, lastCol)
         .setVerticalAlignment("middle");

    sheet.getRange("A1:F1")
         .setFontSize(18)
         .setFontWeight("bold")
         .setBackground(APP.COLORS.HEADER)
         .setFontColor("#FFFFFF");

    sheet.autoResizeColumns(1, lastCol);

}

/**
 * إنشاء رسم بياني للمهام
 */
function createTaskChart(){

    const sheet = getSheet(APP.SHEETS.DASHBOARD);

    const startRow = findRowByValue(sheet, 1, "Tasks Summary");
    if(startRow < 0) return;

    const range = sheet.getRange(startRow, 1, 4, 2);

    const chart = sheet.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(range)
        .setPosition(2, 8, 0, 0)
        .setOption("title","Tasks Overview")
        .build();

    sheet.insertChart(chart);

}

/**
 * إنشاء رسم KPI
 */
function createKPIChart(){

    const sheet = getSheet(APP.SHEETS.DASHBOARD);

    const startRow = findRowByValue(sheet, 1, "Top Members");
    if(startRow < 0) return;

    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4);

    const chart = sheet.newChart()
        .setChartType(Charts.ChartType.COLUMN)
        .addRange(range)
        .setPosition(18, 8, 0, 0)
        .setOption("title","Top Members")
        .build();

    sheet.insertChart(chart);

}

/**
 * حذف جميع الرسوم
 */
function clearDashboardCharts(){

    const sheet = getSheet(APP.SHEETS.DASHBOARD);

    sheet.getCharts().forEach(chart=>{

        sheet.removeChart(chart);

    });

}

/**
 * تحديث Dashboard بالكامل
 */
function refreshDashboard(){

    buildDashboard();

    formatDashboard();

    clearDashboardCharts();

    createTaskChart();

    createKPIChart();

}

/**
 * فتح Dashboard
 */
function openDashboard(){

    const ss = SpreadsheetApp.getActive();

    ss.setActiveSheet(

        getSheet(APP.SHEETS.DASHBOARD)

    );

}