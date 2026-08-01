/**
 * ============================================================
 * PHINOX Business Operating System
 * Shareholders.gs - Mini ERP: Shareholders & Capital
 * ============================================================
 */

const SH_COL = {
    NAME: 0, EMAIL: 1, SHARES: 2, OWNERSHIP: 3,
    INV_VALUE: 4, CURRENT_VALUE: 5, PROFIT: 6, LOSS: 7
  };
  
  function ensureShareholdersColumns(){
    const sheet = getSheet(APP.SHEETS.SHAREHOLDERS);
    const required = ["Name", "Email", "Shares", "Ownership", "Inv Value", "Current Value", "Profit", "Loss"];
    const lastCol = sheet.getLastColumn();
    const current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if(current.length < required.length || current[0] !== "Name"){
      if(sheet.getLastRow() <= 1){
        sheet.clear();
        const h = sheet.getRange(1, 1, 1, required.length);
        h.setValues([required]);
        h.setBackground(APP.COLORS.HEADER).setFontColor("#FFFFFF").setFontWeight("bold");
        for(let i = 1; i <= required.length; i++) sheet.setColumnWidth(i, 160);
      }
    }
  }
  
  function addShareholder(data){
    const sheet = getSheet(APP.SHEETS.SHAREHOLDERS);
    const cfg = getMiniERPConfig();
    const shares = toNumber(data.shares);
    const invValue = shares * cfg.sharePrice;
    const row = [
      data.name || "",
      data.email || "",
      shares,
      0, // Ownership calculated later
      invValue,
      invValue,
      0,
      0
    ];
    sheet.appendRow(row);
    recalcShareholders();
    logActivity(getCurrentMember(), "مساهم جديد", APP.SHEETS.SHAREHOLDERS, "", "", data.name);
    showToast("تم إضافة المساهم: " + data.name);
    return true;
  }
  
  function getShareholders(){
    ensureShareholdersColumns();
    const sheet = getSheet(APP.SHEETS.SHAREHOLDERS);
    const data = sheet.getDataRange().getValues();
    data.shift();
    return data;
  }
  
  function recalcShareholders(){
    const sheet = getSheet(APP.SHEETS.SHAREHOLDERS);
    const cfg = getMiniERPConfig();
    const data = sheet.getDataRange().getValues();
    if(data.length <= 1) return;
    
    var holders = [];
    var totalShares = 0;
    
    for(var i = 1; i < data.length; i++){
      var shares = toNumber(data[i][SH_COL.SHARES]);
      totalShares += shares;
      holders.push({row: i, shares: shares});
    }
    
    for(var j = 0; j < holders.length; j++){
      var idx = holders[j].row;
      var ownership = totalShares > 0 ? holders[j].shares / totalShares : 0;
      var currentValue = holders[j].shares * cfg.sharePrice;
      var invValue = toNumber(data[idx][SH_COL.INV_VALUE]) || currentValue;
      var profit = Math.max(0, currentValue - invValue);
      var loss = Math.max(0, invValue - currentValue);
      
      data[idx][SH_COL.OWNERSHIP] = formatPercent(ownership);
      data[idx][SH_COL.CURRENT_VALUE] = currentValue;
      data[idx][SH_COL.PROFIT] = profit;
      data[idx][SH_COL.LOSS] = loss;
    }
    
    sheet.getRange(2, 1, data.length - 1, data[0].length).setValues(data.slice(1));
  }
  
  function refreshShareholdersDashboard(){
    const cfg = getMiniERPConfig();
    const holders = getShareholders();
    const totalShares = holders.reduce(function(s, h){ return s + toNumber(h[SH_COL.SHARES]); }, 0);
    return [
      ["عدد المساهمين", holders.length],
      ["إجمالي الأسهم", formatNumber(totalShares)],
      ["سعر السهم", formatCurrency(cfg.sharePrice, cfg.currency)],
      ["رأس المال", formatCurrency(cfg.initialCapital, cfg.currency)]
    ];
  }