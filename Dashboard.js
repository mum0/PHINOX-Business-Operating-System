/**
 * ============================================================
 * PHINOX Business Operating System
 * Dashboard.gs - Part 1
 * Dashboard Engine
 * ============================================================
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

function createDashboardHeader(sheet, startRow){
    sheet.getRange(startRow, 1, 1, 6).merge().setValue(APP.INFO.NAME);
    sheet.getRange(startRow + 1, 1).setValue(t("dash_generated"));
    sheet.getRange(startRow + 1, 2).setValue(now());
    return startRow + 3;
}

function createSummaryCards(sheet, startRow){
    const cards = [
        [t("dash_total_tasks"), totalTasks()],
        [t("dash_completed"), completedTasks()],
        [t("dash_in_progress"), activeTasks()],
        [t("dash_late"), getLateTasks().length],
        [t("dash_team_kpi"), teamAverageKPI()],
        [t("dash_avg_productivity"), averageProductivity()]
    ];
    cards.forEach((card, index) => {
        sheet.getRange(startRow + index, 1).setValue(card[0]);
        sheet.getRange(startRow + index, 2).setValue(card[1]);
    });
    return startRow + cards.length + 1;
}

function createPerformanceSection(sheet, startRow){
    const data = updatePerformanceDashboard();
    data.forEach((rowData, index) => {
        sheet.getRange(startRow + index, 1, 1, 2).setValues([rowData]);
    });
    return startRow + data.length + 1;
}

function createMemberSection(sheet, startRow){
    sheet.getRange(startRow, 1).setValue(t("dash_top_members"));
    const members = topPerformers(5);
    members.forEach((member, index) => {
        sheet.getRange(startRow + 1 + index, 1, 1, 4).setValues([[member.member, member.kpi, member.productivity, member.grade]]);
    });
    return startRow + 1 + members.length + 1;
}

function createTaskSection(sheet, startRow){
    sheet.getRange(startRow, 1).setValue(t("dash_tasks_summary"));
    const rows = [
        [t("dash_waiting_review"), pendingReviewCount()],
        [t("dash_in_progress"), activeTasks()],
        [t("dash_completed"), completedTasks()]
    ];
    rows.forEach((rowData, index) => {
        sheet.getRange(startRow + 1 + index, 1, 1, 2).setValues([rowData]);
    });
    return startRow + 1 + rows.length + 1;
}

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

function findRowByValue(sheet, col, value){
    const data = sheet.getRange(1, col, sheet.getLastRow(), 1).getValues();
    for(let i = 0; i < data.length; i++){
        if(data[i][0] === value) return i + 1;
    }
    return -1;
}

function formatDashboard(){
    const sheet = getSheet(APP.SHEETS.DASHBOARD);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    sheet.setFrozenRows(2);
    sheet.getRange(1, 1, lastRow, lastCol).setVerticalAlignment("middle");
    sheet.getRange("A1:F1").setFontSize(18).setFontWeight("bold").setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF");
    sheet.autoResizeColumns(1, lastCol);
}

function createTaskChart(){
    const sheet = getSheet(APP.SHEETS.DASHBOARD);
    const startRow = findRowByValue(sheet, 1, t("dash_tasks_summary"));
    if(startRow < 0) return;
    const range = sheet.getRange(startRow, 1, 4, 2);
    const chart = sheet.newChart().setChartType(Charts.ChartType.PIE).addRange(range).setPosition(2, 8, 0, 0).setOption("title", "Tasks Overview").build();
    sheet.insertChart(chart);
}

function createKPIChart(){
    const sheet = getSheet(APP.SHEETS.DASHBOARD);
    const startRow = findRowByValue(sheet, 1, t("dash_top_members"));
    if(startRow < 0) return;
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4);
    const chart = sheet.newChart().setChartType(Charts.ChartType.COLUMN).addRange(range).setPosition(18, 8, 0, 0).setOption("title", "Top Members").build();
    sheet.insertChart(chart);
}

function clearDashboardCharts(){
    const sheet = getSheet(APP.SHEETS.DASHBOARD);
    sheet.getCharts().forEach(chart => sheet.removeChart(chart));
}

function refreshDashboard(){
    buildDashboard();
    formatDashboard();
    clearDashboardCharts();
    createTaskChart();
    createKPIChart();
}

function openDashboard(){
    const ss = SpreadsheetApp.getActive();
    ss.setActiveSheet(getSheet(APP.SHEETS.DASHBOARD));
}