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
 * Reviews.gs - Part 1
 * Review & Approval Engine
 * ============================================================
 */

/**
 * إنشاء مراجعة
 */
function createReview(taskId, reviewer, decision, score, comment){

    const sheet = getSheet(APP.SHEETS.REVIEWS);

    sheet.appendRow([

        generateId("REV"),

        taskId,

        reviewer,

        getTask(taskId)[3],

        decision,

        score,

        comment,

        now()

    ]);

    processReview(taskId, decision, score, comment);

}

/**
 * معالجة قرار المراجعة
 */
function processReview(taskId, decision, score, comment){

    if(decision==="Approved"){

        approveReview(taskId, score, comment);

    }else{

        rejectReview(taskId, score, comment);

    }

}

/**
 * اعتماد المهمة
 */
function approveReview(taskId, score, comment){

    updateTask(taskId,{

        status:APP.TASK_STATUS.APPROVED,

        quality:score,

        notes:comment,

        completion:100

    });

}

/**
 * رفض المهمة
 */
function rejectReview(taskId, score, comment){

    updateTask(taskId,{

        status:APP.TASK_STATUS.REJECTED,

        quality:score,

        notes:comment

    });

}

/**
 * جميع المراجعات
 */
function getReviews(){

    const sheet = getSheet(APP.SHEETS.REVIEWS);

    const data = sheet.getDataRange().getValues();

    data.shift();

    return data;

}

/**
 * مراجعات مهمة
 */
function getTaskReviews(taskId){

    return getReviews().filter(

        review=>review[1]===taskId

    );

}

/**
 * آخر مراجعة
 */
function latestReview(taskId){

    const reviews=getTaskReviews(taskId);

    if(reviews.length===0)
        return null;

    return reviews[reviews.length-1];

}
/**
 * ============================================================
 * PHINOX Business Operating System
 * Reviews.gs - Part 2
 * Review Workflow & Statistics
 * ============================================================
 */

/**
 * إعادة فتح المهمة
 */
function returnTaskForRevision(taskId, comment){

    updateTask(taskId,{

        status: APP.TASK_STATUS.IN_PROGRESS,

        notes: comment

    });

}

/**
 * مراجعات مراجع معين
 */
function getReviewerReviews(reviewer){

    return getReviews().filter(review =>

        review[2] === reviewer

    );

}

/**
 * عدد مراجعات المراجع
 */
function reviewerReviewCount(reviewer){

    return getReviewerReviews(reviewer).length;

}

/**
 * نسبة الاعتماد
 */
function reviewerApprovalRate(reviewer){

    const reviews = getReviewerReviews(reviewer);

    if(reviews.length === 0)
        return 0;

    const approved = reviews.filter(review=>

        review[4] === "Approved"

    ).length;

    return round(

        approved / reviews.length * 100

    );

}

/**
 * متوسط تقييم المراجع
 */
function reviewerAverageScore(reviewer){

    const reviews = getReviewerReviews(reviewer);

    if(reviews.length===0)
        return 0;

    let total = 0;

    reviews.forEach(review=>{

        total += toNumber(review[5]);

    });

    return round(total / reviews.length);

}

/**
 * مراجعات معلقة
 */
function pendingReviews(){

    return getTasks().filter(task=>

        task[6]===APP.TASK_STATUS.WAITING_REVIEW

    );

}

/**
 * عدد المراجعات المعلقة
 */
function pendingReviewCount(){

    return pendingReviews().length;

}

/**
 * تحديث إحصائيات المراجعة
 * يُرجع البيانات ليتم عرضها في Dashboard.gs
 */
function refreshReviewDashboard(){

    return [

        ["Pending Reviews", pendingReviewCount()]

    ];

}

/**
 * تحديث نظام المراجعات
 */
function refreshReviews(){

    refreshReviewDashboard();

}

/**
 * اعتماد جميع المهام المنتظرة (اختبار)
 */
function approveAllPending(){

    pendingReviews().forEach(task=>{

        approveReview(

            task[0],

            100,

            "Auto Approved"

        );

    });

}