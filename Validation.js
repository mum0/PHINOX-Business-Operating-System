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
 * Validation.gs
 * Data Validation Engine
 * ============================================================
 */

/**
 * تطبيق جميع الـ Validation
 */
function applyValidationRules(){

    applyRoleValidation();
    applyStatusValidation();
    applyPriorityValidation();
    applyDifficultyValidation();
    applyCategoryValidation();

}

/**
 * Roles
 */
function applyRoleValidation(){

    const sheet = getSheet(APP.SHEETS.MEMBERS);

    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(APP.ROLES),true)
    .setAllowInvalid(false)
    .build();

    sheet.getRange("C2:C").setDataValidation(rule);

}

/**
 * Status
 */
function applyStatusValidation(){

    const sheet = getSheet(APP.SHEETS.TASKS);

    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(
        Object.values(APP.TASK_STATUS),
        true
    )
    .setAllowInvalid(false)
    .build();

    sheet.getRange("G2:G").setDataValidation(rule);

}

/**
 * Priority
 */
function applyPriorityValidation(){

    const sheet = getSheet(APP.SHEETS.TASKS);

    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(
        Object.values(APP.PRIORITY),
        true
    )
    .setAllowInvalid(false)
    .build();

    sheet.getRange("E2:E").setDataValidation(rule);

}

/**
 * Difficulty
 */
function applyDifficultyValidation(){

    const sheet = getSheet(APP.SHEETS.TASKS);

    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(
        Object.values(APP.DIFFICULTY),
        true
    )
    .setAllowInvalid(false)
    .build();

    sheet.getRange("F2:F").setDataValidation(rule);

}

/**
 * Category
 */
function applyCategoryValidation(){

    const sheet = getSheet(APP.SHEETS.TASKS);

    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(
        Object.values(APP.KPI_CATEGORY),
        true
    )
    .setAllowInvalid(false)
    .build();

    sheet.getRange("C2:C").setDataValidation(rule);

}

/**
 * Email Validation
 */
function isValidEmail(email){

    const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email);

}

/**
 * Phone Validation
 */
function isValidPhone(phone){

    return /^[0-9+\-\s]{8,20}$/.test(phone);

}

/**
 * Date Validation
 */
function isValidDate(value){

    return value instanceof Date &&
           !isNaN(value);

}

/**
 * Percentage Validation
 */
function isValidPercentage(value){

    return value>=0 && value<=100;

}

/**
 * منع الإدخال الخاطئ
 */
function validateTaskInput(task){

    if(isEmpty(task.title))
        throw new Error("Task title required.");

    if(isEmpty(task.assignedTo))
        throw new Error("Member required.");

    if(!Object.values(APP.PRIORITY)
        .includes(task.priority))
        throw new Error("Invalid priority.");

    if(!Object.values(APP.DIFFICULTY)
        .includes(task.difficulty))
        throw new Error("Invalid difficulty.");

}