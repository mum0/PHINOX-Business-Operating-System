/**
 * ============================================================
 * PHINOX Business Operating System
 * Reports.gs
 * Reporting Engine
 * ============================================================
 */

function generateDailyReport(){ return generateReport(t("rpt_period_daily")); }
function generateWeeklyReport(){ return generateReport(t("rpt_period_weekly")); }
function generateMonthlyReport(){ return generateReport(t("rpt_period_monthly")); }

function generateReport(period){
    const sheet = getSheet(APP.SHEETS.REPORTS);
    const reportId = generateId("RPT");
    const best = bestMember();
    const report = [
        reportId, period,
        Utilities.formatDate(new Date(), APP.INFO.TIMEZONE, APP.INFO.DATE_FORMAT),
        totalMembers(), totalTasks(), completedTasks(), getLateTasks().length,
        averageTaskScore(), teamAverageKPI(), averageProductivity(),
        averageQuality(), averageWorkload(),
        best ? best[1] : "", now()
    ];
    sheet.appendRow(report);
    return reportId;
}

function getReports(){
    const sheet = getSheet(APP.SHEETS.REPORTS);
    const data = sheet.getDataRange().getValues();
    data.shift();
    return data;
}

function latestReport(){
    const reports = getReports();
    if(reports.length === 0) return null;
    return reports[reports.length - 1];
}

function generateMemberReport(member){ return getMemberPerformance(member); }
function generateTeamReport(){ return getPerformanceData(); }

function generateTaskReport(){
    return {
        total: totalTasks(), completed: completedTasks(), active: activeTasks(),
        pending: pendingReviewCount(), late: getLateTasks().length, averageScore: averageTaskScore()
    };
}

function executiveSummary(){
    const best = bestMember();
    return {
        members: totalMembers(), tasks: totalTasks(), completed: completedTasks(),
        averageKPI: teamAverageKPI(), productivity: averageProductivity(),
        quality: averageQuality(), workload: averageWorkload(),
        bestMember: best ? best[1] : ""
    };
}

function exportJSON(){
    return JSON.stringify({
        summary: executiveSummary(), team: generateTeamReport(), tasks: generateTaskReport()
    }, null, 2);
}

function exportCSV(){
    const rows = [];
    rows.push([t("rpt_member"), t("rpt_kpi"), t("rpt_completed"), t("rpt_late"), t("rpt_quality"), t("rpt_productivity")]);
    getMembers().forEach(member => {
        rows.push([
            member[1], calculateMemberKPI(member[1]), memberCompletedTasks(member[1]),
            memberLateTasks(member[1]), memberQuality(member[1]), productivity(member[1])
        ]);
    });
    return rows.map(r => r.join(",")).join("\n");
}

function generateFullReport(){
    generateMonthlyReport();
    return { executive: executiveSummary(), team: generateTeamReport(), tasks: generateTaskReport() };
}