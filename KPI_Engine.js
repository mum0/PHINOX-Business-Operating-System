/**
 * ============================================================
 * PHINOX BOS — KPI Engine v4.0
 * Auto-Calculation + Manual Input + Monthly Tracking
 * ============================================================
 */

const KPI_SHEETS = { RECORDS: 'KPI_Records', TARGETS: 'KPI_Targets', INPUT: 'KPI_Input' };

/* ───────────────────────────────────────────
   1. ENSURE SHEETS
   ─────────────────────────────────────────── */

function ensureKPISheets(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // KPI_Records: تخزين القيم الفعلية شهرياً
  var rec = ss.getSheetByName(KPI_SHEETS.RECORDS);
  if(!rec){
    rec = ss.insertSheet(KPI_SHEETS.RECORDS);
    rec.getRange(1,1,1,6).setValues([['KPI_ID','Department','Month','Actual','Source','Updated']])
      .setBackground('#1a237e').setFontColor('#fff').setFontWeight('bold');
    for(var i=1;i<=6;i++) rec.setColumnWidth(i,140);
  }
  
  // KPI_Targets: الأهداف
  var tgt = ss.getSheetByName(KPI_SHEETS.TARGETS);
  if(!tgt){
    tgt = ss.insertSheet(KPI_SHEETS.TARGETS);
    tgt.getRange(1,1,1,6).setValues([['KPI_ID','Department','Name','Target','Unit','Frequency']])
      .setBackground('#1a237e').setFontColor('#fff').setFontWeight('bold');
    initDefaultTargets(tgt);
  }
  
  // KPI_Input: قيم يدوية مؤقتة
  var inp = ss.getSheetByName(KPI_SHEETS.INPUT);
  if(!inp){
    inp = ss.insertSheet(KPI_SHEETS.INPUT);
    inp.getRange(1,1,1,4).setValues([['KPI_ID','Value','Month','Notes']])
      .setBackground('#1a237e').setFontColor('#fff').setFontWeight('bold');
  }
}

function initDefaultTargets(sheet){
  var rows = [];
  var depts = Object.keys(KPI_LIBRARY);
  depts.forEach(function(dept){
    KPI_LIBRARY[dept].forEach(function(k){
      rows.push([k.id, dept, k.name, k.target, k.unit, k.freq]);
    });
  });
  if(rows.length) sheet.getRange(2,1,rows.length,6).setValues(rows);
}

/* ───────────────────────────────────────────
   2. GET / SET RECORDS
   ─────────────────────────────────────────── */

function getKPIRecord(kpiId, monthKey){
  ensureKPISheets();
  var sheet = getSheet(KPI_SHEETS.RECORDS);
  var data = sheet.getDataRange().getValues();
  for(var i=data.length-1;i>=1;i--){
    if(String(data[i][0]).trim()===kpiId && String(data[i][2]).trim()===monthKey){
      return {actual:toNumber(data[i][3]), source:String(data[i][4]), updated:data[i][5]};
    }
  }
  return null;
}

function setKPIRecord(kpiId, dept, monthKey, actual, source){
  ensureKPISheets();
  var sheet = getSheet(KPI_SHEETS.RECORDS);
  // تحديث إن وجد
  var data = sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]).trim()===kpiId && String(data[i][2]).trim()===monthKey){
      sheet.getRange(i+1,4,1,3).setValues([[actual, source, now()]]);
      return;
    }
  }
  // إضافة جديد
  sheet.appendRow([kpiId, dept, monthKey, actual, source, now()]);
}

function getKPITarget(kpiId){
  ensureKPISheets();
  var sheet = getSheet(KPI_SHEETS.TARGETS);
  var data = sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(String(data[i][0]).trim()===kpiId) return {target:toNumber(data[i][3]), unit:String(data[i][4]||''), freq:String(data[i][5]||'monthly')};
  }
  return {target:0, unit:'', freq:'monthly'};
}

/* ───────────────────────────────────────────
   3. AUTO-CALCULATION ENGINE
   ─────────────────────────────────────────── */

function calculateKPIAuto(kpiDef, monthKey){
  var formula = kpiDef.formula;
  var id = kpiDef.id;
  
  // Helpers
  var fin = function(){
    var s = getSheet(APP.SHEETS.FINANCE);
    return s ? s.getDataRange().getValues() : [];
  };
  var ord = function(){
    var s = getSheet(APP.SHEETS.ORDERS);
    return s ? s.getDataRange().getValues() : [];
  };
  var inv = function(){
    var s = getSheet(APP.SHEETS.INVENTORY);
    return s ? s.getDataRange().getValues() : [];
  };
  var tsk = function(){
    var s = getSheet(APP.SHEETS.TASKS);
    return s ? s.getDataRange().getValues() : [];
  };
  var mem = function(){
    var s = getSheet(APP.SHEETS.MEMBERS);
    return s ? s.getDataRange().getValues() : [];
  };
  var sal = function(){ return getSales(); };
  
  var mk = monthKey; // e.g. "2026-08"
  var prevMk = getPrevMonthKey(mk);
  
  switch(formula){
    // ── المبيعات ──
    case 'growth': {
      var cur=0, prev=0;
      sal().forEach(function(s){
        var sm = toMonthKey(new Date(s[SALE_COL.DATE]));
        if(sm===mk) cur+=toNumber(s[SALE_COL.AMOUNT]);
        if(sm===prevMk) prev+=toNumber(s[SALE_COL.AMOUNT]);
      });
      return prev>0 ? Math.round(((cur-prev)/prev)*100) : 0;
    }
    case 'count': {
      if(id==='invoice_count') return sal().length;
      if(id==='sales_growth') return sal().length;
      var c=0;
      sal().forEach(function(s){ if(toMonthKey(new Date(s[SALE_COL.DATE]))===mk) c++; });
      return c;
    }
    case 'avg': {
      var list = sal().filter(function(s){ return toMonthKey(new Date(s[SALE_COL.DATE]))===mk; });
      var t = list.reduce(function(s,r){return s+toNumber(r[SALE_COL.AMOUNT]);},0);
      return list.length>0 ? Math.round(t/list.length) : 0;
    }
    case 'unique': {
      var cust = {};
      sal().forEach(function(s){ if(toMonthKey(new Date(s[SALE_COL.DATE]))===mk) cust[s[SALE_COL.CUSTOMER]]=true; });
      return Object.keys(cust).length;
    }
    case 'collection': {
      var col=0, tot=0;
      sal().forEach(function(s){
        if(toMonthKey(new Date(s[SALE_COL.DATE]))===mk){
          tot+=toNumber(s[SALE_COL.AMOUNT]);
          if(s[SALE_COL.PAYMENT]!=='آجل' && s[SALE_COL.PAYMENT]!=='Deferred') col+=toNumber(s[SALE_COL.AMOUNT]);
        }
      });
      return tot>0 ? Math.round((col/tot)*100) : 0;
    }
    
    // ── المالية ──
    case 'margin': {
      var f=fin(), inc=0, exp=0;
      for(var i=1;i<f.length;i++){
        if(toMonthKey(new Date(f[i][1]))===mk){
          if(String(f[i][2]).trim()==='Income'||String(f[i][2]).trim()==='إيراد') inc+=toNumber(f[i][5]);
          else exp+=toNumber(f[i][5]);
        }
      }
      return inc>0 ? Math.round(((inc-exp)/inc)*100) : 0;
    }
    case 'cashflow': {
      var f=fin(), bal=0;
      for(var i=1;i<f.length;i++) if(toMonthKey(new Date(f[i][1]))===mk) bal+=toNumber(f[i][6]);
      return Math.round(bal);
    }
    case 'burn': {
      var f=fin(), e=0, n=0;
      for(var i=1;i<f.length;i++){
        if(toMonthKey(new Date(f[i][1]))===mk){
          var t=String(f[i][2]).trim();
          if(t!=='Income' && t!=='إيراد'){ e+=toNumber(f[i][5]); n++; }
        }
      }
      return n>0 ? Math.round(e/n) : 0;
    }
    case 'expense_ratio': {
      var f=fin(), inc=0, exp=0;
      for(var i=1;i<f.length;i++){
        if(toMonthKey(new Date(f[i][1]))===mk){
          if(String(f[i][2]).trim()==='Income'||String(f[i][2]).trim()==='إيراد') inc+=toNumber(f[i][5]);
          else exp+=toNumber(f[i][5]);
        }
      }
      return inc>0 ? Math.round((exp/inc)*100) : 0;
    }
    case 'variance': {
      var b=getSheet("Budget"); if(!b) return 0;
      var d=b.getDataRange().getValues(), v=0, n=0;
      for(var i=1;i<d.length;i++){
        var bud=toNumber(d[i][1]), act=toNumber(d[i][2]);
        if(bud>0){ v+=Math.abs((act-bud)/bud); n++; }
      }
      return n>0 ? Math.round((v/n)*100) : 0;
    }
    case 'runway': {
      var f=fin(), bal=0, exp=0, n=0;
      for(var i=1;i<f.length;i++){
        bal+=toNumber(f[i][6]);
        var t=String(f[i][2]).trim();
        if(t!=='Income' && t!=='إيراد'){ exp+=toNumber(f[i][5]); n++; }
      }
      var monthly = n>0 ? exp/n : 0;
      return monthly>0 ? Math.round(bal/monthly) : 0;
    }
    case 'roi': {
      var sh=getSheet(APP.SHEETS.SHAREHOLDERS);
      if(!sh) return 0;
      var d=sh.getDataRange().getValues(), prof=0, inv=0;
      for(var i=1;i<d.length;i++){ prof+=toNumber(d[i][6]); inv+=toNumber(d[i][4]); }
      return inv>0 ? Math.round((prof/inv)*100) : 0;
    }
    
    // ── المخزون ──
    case 'turnover': {
      var i=inv(), avgVal=0, sold=0;
      for(var k=1;k<i.length;k++) avgVal+=toNumber(i[k][7])*toNumber(i[k][12]);
      avgVal = avgVal/Math.max(1,i.length-1);
      sal().forEach(function(s){ if(toMonthKey(new Date(s[SALE_COL.DATE]))===mk) sold+=toNumber(s[SALE_COL.AMOUNT]); });
      return avgVal>0 ? Math.round((sold/avgVal)*100)/100 : 0;
    }
    case 'fillrate': {
      var o=ord(), filled=0, tot=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk){
          tot++;
          if(String(o[i][5]).trim()!=='Cancelled') filled++;
        }
      }
      return tot>0 ? Math.round((filled/tot)*100) : 0;
    }
    case 'carrying': {
      var i=inv(), val=0;
      for(var k=1;k<i.length;k++) val+=toNumber(i[k][7])*toNumber(i[k][12]);
      return Math.round((val*0.2)/12);
    }
    case 'capacity': {
      var i=inv(), qty=0;
      for(var k=1;k<i.length;k++) qty+=toNumber(i[k][7]);
      return Math.min(100, Math.round((qty/10000)*100));
    }
    case 'defect': {
      var i=inv(), def=0, tot=0;
      for(var k=1;k<i.length;k++){ tot+=toNumber(i[k][7]); if(String(i[k][16]||'').toLowerCase().indexOf('defect')>-1) def+=toNumber(i[k][7]); }
      return tot>0 ? Math.round((def/tot)*100) : 0;
    }
    case 'yield': {
      var i=inv(), good=0, tot=0;
      for(var k=1;k<i.length;k++){ var q=toNumber(i[k][7]); tot+=q; if(q>0) good+=q; }
      return tot>0 ? Math.round((good/tot)*100) : 0;
    }
    
    // ── الطلبات ──
    case 'conversion': {
      var o=ord(), del=0, tot=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk){
          tot++; if(String(o[i][5]).trim()==='Delivered') del++;
        }
      }
      return tot>0 ? Math.round((del/tot)*100) : 0;
    }
    case 'returnrate': {
      var o=ord(), ret=0, tot=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk){
          tot++; if(String(o[i][5]).trim()==='Returned') ret++;
        }
      }
      return tot>0 ? Math.round((ret/tot)*100) : 0;
    }
    case 'aov': {
      var o=ord(), rev=0, cnt=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk && String(o[i][5]).trim()!=='Cancelled'){
          rev+=toNumber(o[i][7]); cnt++;
        }
      }
      return cnt>0 ? Math.round(rev/cnt) : 0;
    }
    case 'fulfillment_time': {
      var o=ord(), hrs=0, cnt=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk){
          var ship=o[i][13]?new Date(o[i][13]):null;
          var order=o[i][4]?new Date(o[i][4]):null;
          if(ship&&order&&!isNaN(ship.getTime())&&!isNaN(order.getTime())){
            hrs+=(ship-order)/(1000*60*60); cnt++;
          }
        }
      }
      return cnt>0 ? Math.round(hrs/cnt) : 0;
    }
    case 'otd': {
      var o=ord(), ontime=0, tot=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk && String(o[i][5]).trim()==='Delivered'){
          tot++;
          var due=o[i][9]?new Date(o[i][9]):null;
          var act=o[i][14]?new Date(o[i][14]):null;
          if(due&&act&&act<=due) ontime++;
        }
      }
      return tot>0 ? Math.round((ontime/tot)*100) : 0;
    }
    case 'damage': {
      var o=ord(), dmg=0, tot=0;
      for(var i=1;i<o.length;i++){
        if(toMonthKey(new Date(o[i][4]))===mk){
          tot++;
          if(String(o[i][16]||'').toLowerCase().indexOf('damage')>-1||String(o[i][16]||'').toLowerCase().indexOf('تلف')>-1) dmg++;
        }
      }
      return tot>0 ? Math.round((dmg/tot)*100) : 0;
    }
    
    // ── المهام ──
    case 'efficiency':
    case 'ontime':
    case 'passrate': {
      var t=tsk(), comp=0, score=0;
      for(var i=1;i<t.length;i++){
        if(toMonthKey(new Date(t[i][19]))===mk && (String(t[i][6]).trim()==='Completed'||String(t[i][6]).trim()==='Approved')){
          comp++; score+=toNumber(t[i][15]);
        }
      }
      if(formula==='efficiency') return comp>0 ? Math.round(score/comp) : 0;
      return comp>0 ? Math.round((score/(comp*100))*100) : 0;
    }
    case 'velocity': {
      var t=tsk(), comp=0, ontime=0;
      for(var i=1;i<t.length;i++){
        if(toMonthKey(new Date(t[i][19]))===mk && String(t[i][6]).trim()==='Completed'){
          comp++; if(toNumber(t[i][18])<=0) ontime++;
        }
      }
      return comp>0 ? Math.round((ontime/comp)*100) : 0;
    }
    case 'resolution': {
      var t=tsk(), res=0, tot=0;
      for(var i=1;i<t.length;i++){
        if(toMonthKey(new Date(t[i][19]))===mk){
          tot++;
          if(String(t[i][6]).trim()==='Completed'||String(t[i][6]).trim()==='Approved') res++;
        }
      }
      return tot>0 ? Math.round((res/tot)*100) : 0;
    }
    
    // ── الموارد البشرية ──
    case 'retention': {
      var m=mem(), act=0, tot=0;
      for(var i=1;i<m.length;i++){ tot++; if(String(m[i][5]).toLowerCase()==='active') act++; }
      return tot>0 ? Math.round((act/tot)*100) : 0;
    }
    case 'hiretime': {
      var m=mem(), days=0, cnt=0;
      for(var i=1;i<m.length;i++){
        var join=m[i][6]?new Date(m[i][6]):null;
        if(join&&!isNaN(join.getTime())){ days+=(new Date()-join)/(1000*60*60*24); cnt++; }
      }
      return cnt>0 ? Math.round(days/cnt) : 0;
    }
    
    // ── غير قابل للحساب الآلي ──
    default: return null;
  }
}

/* ───────────────────────────────────────────
   4. MAIN GETTER (Auto + Manual + Cached)
   ─────────────────────────────────────────── */

function getKPIValue(kpiDef, monthKey){
  monthKey = monthKey || getCurrentMonthKey();
  
  // 1. Check cache/records
  var rec = getKPIRecord(kpiDef.id, monthKey);
  if(rec && rec.source==='manual') return {value:rec.actual, source:'manual', trend:'stable'};
  
  // 2. Auto-calculate
  var auto = calculateKPIAuto(kpiDef, monthKey);
  if(auto !== null){
    setKPIRecord(kpiDef.id, kpiDef.dept, monthKey, auto, 'auto');
    var prev = getKPIRecord(kpiDef.id, getPrevMonthKey(monthKey));
    var trend = prev ? (auto > prev.actual ? 'up' : (auto < prev.actual ? 'down' : 'stable')) : 'stable';
    return {value:auto, source:'auto', trend:trend};
  }
  
  // 3. Manual input sheet
  var man = getManualKPIValue(kpiDef.id, monthKey);
  if(man !== null){
    setKPIRecord(kpiDef.id, kpiDef.dept, monthKey, man, 'manual');
    return {value:man, source:'manual', trend:'stable'};
  }
  
  // 4. Fallback to target (no data yet)
  return {value:0, source:'nodata', trend:'stable'};
}

function getCurrentMonthKey(){
  var d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function getPrevMonthKey(mk){
  var p=mk.split('-');
  var y=parseInt(p[0]), m=parseInt(p[1]);
  if(m===1){y--; m=12;}else{m--;}
  return y+'-'+String(m).padStart(2,'0');
}
function getManualKPIValue(kpiId, monthKey){
  try{
    var s=getSheet(KPI_SHEETS.INPUT);
    if(!s) return null;
    var d=s.getDataRange().getValues();
    for(var i=1;i<d.length;i++){
      if(String(d[i][0]).trim()===kpiId && String(d[i][2]).trim()===monthKey) return toNumber(d[i][1]);
    }
  }catch(e){}
  return null;
}

/* ───────────────────────────────────────────
   5. DEPARTMENT WRAPPER
   ─────────────────────────────────────────── */

function getDepartmentKPIs_v4(deptName, monthKey){
  monthKey = monthKey || getCurrentMonthKey();
  var dept = KPI_LIBRARY[deptName];
  if(!dept) return {department:deptName, kpis:[], score:0};
  
  var result=[], totalWeight=0, weightedScore=0;
  
  dept.forEach(function(kpi){
    var v = getKPIValue(kpi, monthKey);
    var tgt = getKPITarget(kpi.id);
    var actual = v.value;
    var achievement = tgt.target>0 ? (actual/tgt.target)*100 : 0;
    
    // Lower-is-better check
    var lowerBetter = ['returnrate','burn_rate','shrinkage','expense_ratio','defect_rate','error_rate','downtime','absenteeism','damage_rate','complaints','incident_count','litigation_risk','findings','risk_score','fulfillment_time','hiretime','cost_per_case','bottleneck'].indexOf(kpi.id)>-1;
    if(lowerBetter && achievement>0) achievement = Math.min(200, (tgt.target/Math.max(1,actual))*100);
    achievement = Math.min(achievement, 200);
    
    var grade='F', color='#C62828';
    if(achievement>=120){grade='A+'; color='#1B5E20';}
    else if(achievement>=100){grade='A'; color='#2E7D32';}
    else if(achievement>=80){grade='B'; color='#7B1FA2';}
    else if(achievement>=60){grade='C'; color='#F9A825';}
    else if(achievement>=40){grade='D'; color='#E65100';}
    
    result.push({
      id:kpi.id, name:kpi.name, nameEn:kpi.nameEn,
      actual:actual, target:tgt.target, unit:tgt.unit,
      achievement:Math.round(achievement), grade:grade, color:color,
      weight:kpi.weight, trend:v.trend, freq:tgt.freq, source:v.source
    });
    
    totalWeight += kpi.weight;
    weightedScore += (achievement * kpi.weight);
  });
  
  var score = totalWeight>0 ? Math.round(weightedScore/totalWeight) : 0;
  return {
    department:deptName, kpis:result, score:score,
    grade: score>=100?'A':(score>=80?'B':(score>=60?'C':(score>=40?'D':'F'))),
    color: score>=100?'#2E7D32':(score>=80?'#7B1FA2':(score>=60?'#F9A825':'#C62828'))
  };
}

function getAllDepartmentsSummary_v4(monthKey){
  monthKey = monthKey || getCurrentMonthKey();
  var depts = Object.keys(KPI_LIBRARY);
  var result = [];
  depts.forEach(function(d){
    var k = getDepartmentKPIs_v4(d, monthKey);
    result.push({name:d, score:k.score, grade:k.grade, color:k.color, kpisCount:k.kpis.length});
  });
  return result.sort(function(a,b){return b.score-a.score;});
}

/* ───────────────────────────────────────────
   6. INPUT HANDLER
   ─────────────────────────────────────────── */

function submitKPIInput(data){
  ensureKPISheets();
  var sheet = getSheet(KPI_SHEETS.INPUT);
  var month = data.month || getCurrentMonthKey();
  
  // Update if exists
  var all = sheet.getDataRange().getValues();
  for(var i=1;i<all.length;i++){
    if(String(all[i][0]).trim()===data.kpiId && String(all[i][2]).trim()===month){
      sheet.getRange(i+1, 2, 1, 3).setValues([[toNumber(data.value), month, data.notes||'']]);
      setKPIRecord(data.kpiId, data.dept, month, toNumber(data.value), 'manual');
      return {success:true, message:'تم التحديث'};
    }
  }
  sheet.appendRow([data.kpiId, toNumber(data.value), month, data.notes||'']);
  setKPIRecord(data.kpiId, data.dept, month, toNumber(data.value), 'manual');
  return {success:true, message:'تم الإضافة'};
}

function getKPIsNeedingInput(){
  ensureKPISheets();
  var need = [];
  var month = getCurrentMonthKey();
  Object.keys(KPI_LIBRARY).forEach(function(dept){
    KPI_LIBRARY[dept].forEach(function(k){
      if(calculateKPIAuto(k, month)===null){
        var rec = getKPIRecord(k.id, month);
        if(!rec) need.push({id:k.id, name:k.name, dept:dept, unit:getKPITarget(k.id).unit});
      }
    });
  });
  return need;
}
/**
 * إدخال دفعة من KPIs دفعة واحدة
 */
function submitKPIBatch(inputs){
    ensureKPISheets();
    var results = [];
    inputs.forEach(function(item){
      try{
        submitKPIInput({
          kpiId: item.kpiId,
          dept: item.dept,
          value: item.value,
          month: item.month || getCurrentMonthKey(),
          notes: item.notes || 'دفعة يدوية من WebApp'
        });
        results.push({kpiId: item.kpiId, success: true});
      }catch(e){
        results.push({kpiId: item.kpiId, success: false, error: e.message});
      }
    });
    return {
      success: true,
      updated: results.filter(function(r){return r.success;}).length,
      failed: results.filter(function(r){return !r.success;}).length,
      details: results
    };
  }