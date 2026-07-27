/**
 * ============================================================
 * PHINOX Business Operating System (PBOS)
 * Validation.gs
 * Data Validation Engine
 * ============================================================
 */

function applyValidationRules(){
    applyRoleValidation();
    applyStatusValidation();
    applyPriorityValidation();
    applyDifficultyValidation();
    applyCategoryValidation();
}

function applyRoleValidation(){
    const sheet = getSheet(APP.SHEETS.MEMBERS);
    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(APP.ROLES),true)
    .setAllowInvalid(false)
    .build();
    sheet.getRange("C2:C").setDataValidation(rule);
}

function applyStatusValidation(){
    const sheet = getSheet(APP.SHEETS.TASKS);
    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(APP.TASK_STATUS), true)
    .setAllowInvalid(false)
    .build();
    sheet.getRange("G2:G").setDataValidation(rule);
}

function applyPriorityValidation(){
    const sheet = getSheet(APP.SHEETS.TASKS);
    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(APP.PRIORITY), true)
    .setAllowInvalid(false)
    .build();
    sheet.getRange("E2:E").setDataValidation(rule);
}

function applyDifficultyValidation(){
    const sheet = getSheet(APP.SHEETS.TASKS);
    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(APP.DIFFICULTY), true)
    .setAllowInvalid(false)
    .build();
    sheet.getRange("F2:F").setDataValidation(rule);
}

function applyCategoryValidation(){
    const sheet = getSheet(APP.SHEETS.TASKS);
    const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(APP.KPI_CATEGORY), true)
    .setAllowInvalid(false)
    .build();
    sheet.getRange("C2:C").setDataValidation(rule);
}

function isValidEmail(email){
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function isValidPhone(phone){
    return /^[0-9+\-\s]{8,20}$/.test(phone);
}

function isValidDate(value){
    return value instanceof Date && !isNaN(value);
}

function isValidPercentage(value){
    return value>=0 && value<=100;
}

function validateTaskInput(task){
    if(isEmpty(task.title))
        throw new Error(t("val_task_title_required"));
    if(isEmpty(task.assignedTo))
        throw new Error(t("val_member_required"));
    if(!Object.values(APP.PRIORITY).includes(task.priority))
        throw new Error(t("val_invalid_priority"));
    if(!Object.values(APP.DIFFICULTY).includes(task.difficulty))
        throw new Error(t("val_invalid_difficulty"));
}