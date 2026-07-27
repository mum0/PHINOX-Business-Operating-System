
/**
 * ============================================================
 * PHINOX Business Operating System
 * Tasks.gs - Part 1
 * ============================================================
 */

/**
 * إنشاء مهمة جديدة
 */
function createTask(task) {

  function validateTaskInput(task){
    if(isEmpty(task.title)) throw new Error(t("val_task_title_required"));
    if(isEmpty(task.assignedTo)) throw new Error(t("val_member_required"));
    if(!Object.values(APP.PRIORITY).includes(task.priority)) throw new Error(t("val_invalid_priority"));
    if(!Object.values(APP.DIFFICULTY).includes(task.difficulty)) throw new Error(t("val_invalid_difficulty"));
}
  
  const sheet = getSheet(APP.SHEETS.TASKS);

  const row = [
    generateId("TASK"),
    task.title,
    task.category,
    task.assignedTo,
    task.priority,
    task.difficulty,
    APP.TASK_STATUS.NOT_STARTED,
    task.startDate,
    task.dueDate,
    0,
    "",
    "",
    "",
    "",
    "",
    0,
    0,
    0,
    0,
    now(),
    now()
  ];

  sheet.appendRow(row);

  return row[0];

}

/**
 * جميع المهام
 */
function getTasks() {

  const sheet = getSheet(APP.SHEETS.TASKS);

  const data = sheet.getDataRange().getValues();

  data.shift();

  return data;

}

/**
 * مهمة بواسطة ID
 */
function getTask(taskId){

  const tasks = getTasks();

  for(const row of tasks){

    if(row[0]===taskId){

      return row;

    }

  }

  return null;

}

/**
 * تحديث المهمة
 */
function updateTask(taskId, updates){

  const sheet = getSheet(APP.SHEETS.TASKS);

  const data = sheet.getDataRange().getValues();

  for(let i=1;i<data.length;i++){

    if(data[i][0]===taskId){

      const row = data[i];

      Object.keys(updates).forEach(key=>{

        const map = {

          title:1,
          category:2,
          assignedTo:3,
          priority:4,
          difficulty:5,
          status:6,
          startDate:7,
          dueDate:8,
          completion:9,
          quality:10,
          impact:11,
          evidence:12,
          reviewer:13,
          notes:14

        };

        if(map[key]!==undefined){

          row[map[key]]=updates[key];

        }

      });

      row[20]=now();

      sheet.getRange(i+1,1,1,row.length)
      .setValues([row]);

      return true;

    }

  }

  return false;

}

/**
 * حذف مهمة
 */
function deleteTask(taskId){

  const sheet=getSheet(APP.SHEETS.TASKS);

  const data=sheet.getDataRange().getValues();

  for(let i=1;i<data.length;i++){

    if(data[i][0]===taskId){

      sheet.deleteRow(i+1);

      return true;

    }

  }

  return false;

}

/**
 * ============================================================
 * Tasks.gs - Part 2
 * Search / Filter / Assignment
 * ============================================================
 */

/**
 * البحث بواسطة الحالة
 */
function getTasksByStatus(status){

  return getTasks().filter(task => task[6] === status);

}

/**
 * البحث بواسطة العضو
 */
function getTasksByMember(member){

  return getTasks().filter(task => task[3] === member);

}

/**
 * البحث بواسطة الأولوية
 */
function getTasksByPriority(priority){

  return getTasks().filter(task => task[4] === priority);

}

/**
 * البحث بواسطة الفئة
 */
function getTasksByCategory(category){

  return getTasks().filter(task => task[2] === category);

}
/**
 * المهام المتأخرة
 */
function getLateTasks(){
  const today = new Date();
  return getTasks().filter(task => {
    if(!isValidDate(task[8])) return false;
    const due = new Date(task[8]);
    const status = task[6];
    return (
      due < today &&
      status !== APP.TASK_STATUS.APPROVED &&
      status !== APP.TASK_STATUS.CANCELLED &&
      status !== APP.TASK_STATUS.REJECTED
    );
  });
}

/**
 * حساب أيام التأخير
 */
function calculateLateDays(task){
  const status = task[6];
  if(status === APP.TASK_STATUS.APPROVED ||
     status === APP.TASK_STATUS.CANCELLED ||
     status === APP.TASK_STATUS.REJECTED)
      return 0;
  if(!isValidDate(task[8])) return 0;
  const today = new Date();
  const due = new Date(task[8]);
  if(today <= due) return 0;
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}
/**
 * تحديث جميع أيام التأخير
 */
function updateLateDays(){

  const tasks = getTasks();

  tasks.forEach(task=>{

      const late = calculateLateDays(task);

      updateTask(

          task[0],

          {

              daysLate:late

          }

      );

  });

}

/**
 * تغيير حالة المهمة
 */
function changeTaskStatus(taskId,status){

  updateTask(taskId,{

      status:status

  });

}

/**
 * بدء تنفيذ المهمة
 */
function startTask(taskId){

  changeTaskStatus(

      taskId,

      APP.TASK_STATUS.IN_PROGRESS

  );

}

/**
 * إرسال للمراجعة
 */
function submitTask(taskId){

  changeTaskStatus(

      taskId,

      APP.TASK_STATUS.WAITING_REVIEW

  );

}

/**
 * اعتماد المهمة
 */
function approveTask(taskId){

  updateTask(taskId,{

      status:APP.TASK_STATUS.APPROVED,

      completion:100

  });

}

/**
 * رفض المهمة
 */
function rejectTask(taskId){

  changeTaskStatus(

      taskId,

      APP.TASK_STATUS.REJECTED

  );

}

/**
 * إلغاء المهمة
 */
function cancelTask(taskId){

  changeTaskStatus(

      taskId,

      APP.TASK_STATUS.CANCELLED

  );

}

/**
 * إعادة إسناد المهمة
 */
function assignTask(taskId,member){

  updateTask(taskId,{

      assignedTo:member

  });

}

/**
 * تحديث نسبة الإنجاز
 */
function updateCompletion(taskId,percent){

  percent = clamp(percent,0,100);

  updateTask(taskId,{

      completion:percent
  }
  );

}

/**
 * ============================================================
 * Tasks.gs - Part 3
 * Scoring / Statistics / Dashboard Integration
 * ============================================================
 */

/**
 * حساب وزن المهمة
 */
function calculateTaskWeight(task){

    const priorityWeight =
        APP.TASK_WEIGHT.PRIORITY[task[4]] || 1;

    const difficultyWeight =
        APP.TASK_WEIGHT.DIFFICULTY[task[5]] || 1;

    return round(priorityWeight * difficultyWeight,2);

}

/**
 * حساب Score الأساسي
 */
function calculateTaskScore(task){

    const completion = toNumber(task[9]);
    const quality = toNumber(task[10]);
    const impact = toNumber(task[11]);
    const evidence = toNumber(task[12]);

    const score =
        (completion*0.40)+
        (quality*0.30)+
        (impact*0.20)+
        (evidence*0.10);

    return round(score);

}

/**
 * حساب الدرجة النهائية
 */
function calculateWeightedScore(task){

    const score = calculateTaskScore(task);

    const weight = calculateTaskWeight(task);

    return round(score*weight);

}

/**
 * إعادة حساب جميع المهام (دفعة واحدة)
 */
function recalculateAllTasks(){

    const sheet = getSheet(APP.SHEETS.TASKS);

    const lastRow = sheet.getLastRow();

    if(lastRow <= 1) return;

    const data = sheet.getRange(2, 1, lastRow - 1, 21).getValues();

    const updates = [];

    for(let i=0; i<data.length; i++){

        const row = data[i];

        row[15]=calculateTaskScore(row);

        row[16]=calculateTaskWeight(row);

        row[17]=calculateWeightedScore(row);

        row[18]=calculateLateDays(row);

        row[20]=now();

        updates.push(row);

    }

    if(updates.length > 0){

        sheet.getRange(2, 1, updates.length, 21).setValues(updates);

    }

}

/**
 * عدد المهام
 */
function totalTasks(){

    return getTasks().length;

}

/**
 * المهام المكتملة
 */
function completedTasks(){

    return getTasks().filter(

        t=>t[6]===APP.TASK_STATUS.APPROVED

    ).length;

}

/**
 * المهام الجارية
 */
function activeTasks(){

    return getTasks().filter(

        t=>t[6]===APP.TASK_STATUS.IN_PROGRESS

    ).length;

}

/**
 * المهام المعلقة
 */
function pendingTasks(){

    return getTasks().filter(

        t=>t[6]===APP.TASK_STATUS.WAITING_REVIEW

    ).length;

}

/**
 * متوسط الأداء
 */
function averageTaskScore(){

    const tasks=getTasks();

    if(tasks.length===0) return 0;

    let total=0;

    tasks.forEach(t=>{

        total+=toNumber(t[17]);

    });

    return round(total/tasks.length);

}

/**
 * تحديث Dashboard
 */
function updateDashboard(){

    const dashboard =
        getSheet(APP.SHEETS.DASHBOARD);

    dashboard.clear();

    dashboard.appendRow(["Metric","Value"]);

    dashboard.appendRow([
        "Total Tasks",
        totalTasks()
    ]);

    dashboard.appendRow([
        "Completed",
        completedTasks()
    ]);

    dashboard.appendRow([
        "In Progress",
        activeTasks()
    ]);

    dashboard.appendRow([
        "Waiting Review",
        pendingTasks()
    ]);

    dashboard.appendRow([
        "Late Tasks",
        getLateTasks().length
    ]);

    dashboard.appendRow([
        "Average Score",
        averageTaskScore()
    ]);

}

/**
 * تحديث النظام بالكامل
 */
function refreshSystem(){

    recalculateAllTasks();

    updateDashboard();

}

/**
 * Trigger عند تعديل الشيت
 */
function onEdit(e){

    try{

        if(e && e.range){

            const sheetName = e.range.getSheet().getName();

            if(sheetName !== APP.SHEETS.TASKS &&
               sheetName !== APP.SHEETS.MEMBERS &&
               sheetName !== APP.SHEETS.REVIEWS){

                return;

            }

        }

        refreshSystem();

    }catch(err){

        Logger.log(err);

    }

}