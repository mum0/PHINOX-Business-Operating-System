/**
 * Marketing & Social Media Controller
 * UI forms and dashboards for Phase 7C
 * PHINOX BOS v5
 */

const MktSocController = (function() {
  'use strict';

  function _showDialog(html, title, width, height) {
    width = width || 500;
    height = height || 600;
    SpreadsheetApp.getUi().showModalDialog(
      HtmlService.createHtmlOutput(html).setWidth(width).setHeight(height),
      title
    );
  }

  // ============ MARKETING FORM ============

  function showMarketingForm() {
    MktService.ensureSheetExists();
    var platforms = Object.values(MktSchema.PLATFORM);
    var channels = Object.values(MktSchema.CHANNEL);

    var platformOptions = platforms.map(function(p) {
      return '<option value="' + p + '">' + p + '</option>';
    }).join('');

    var channelOptions = channels.map(function(c) {
      return '<option value="' + c + '">' + c + '</option>';
    }).join('');

    var html =
      '<style>body{font-family:sans-serif;padding:20px;}label{display:block;margin-top:10px;font-weight:bold;}input,select{width:100%;padding:6px;margin-top:4px;box-sizing:border-box;}button{margin-top:20px;padding:10px 20px;background:#1a237e;color:#fff;border:none;cursor:pointer;}#status{margin-top:15px;padding:10px;display:none;}</style>' +
      '<h2>➕ Enter Marketing Data</h2>' +
      '<form id="mktForm">' +
      '<label>Date</label><input type="date" name="date" required>' +
      '<label>Platform</label><select name="platform" required>' + platformOptions + '</select>' +
      '<label>Channel</label><select name="channel">' + channelOptions + '</select>' +
      '<label>Campaign ID</label><input type="text" name="campaignId">' +
      '<label>Campaign Name</label><input type="text" name="campaignName">' +
      '<label>Currency</label><input type="text" name="currency" value="EGP">' +
      '<label>Ad Spend</label><input type="number" name="spend" min="0" step="0.01" required>' +
      '<label>Impressions</label><input type="number" name="impressions" min="0">' +
      '<label>Reach</label><input type="number" name="reach" min="0">' +
      '<label>Clicks</label><input type="number" name="clicks" min="0">' +
      '<label>Leads</label><input type="number" name="leads" min="0">' +
      '<label>Conversions</label><input type="number" name="conversions" min="0">' +
      '<label>Attributed Revenue</label><input type="number" name="attributedRevenue" min="0" step="0.01">' +
      '<label>Creative Cost</label><input type="number" name="creativeCost" min="0" step="0.01">' +
      '<label>Agency Cost</label><input type="number" name="agencyCost" min="0" step="0.01">' +
      '<label>Other Cost</label><input type="number" name="otherCost" min="0" step="0.01">' +
      '<label>Notes</label><input type="text" name="notes">' +
      '<button type="button" onclick="submitForm()">Save Record</button>' +
      '</form>' +
      '<div id="status"></div>' +
      '<script>' +
      'function submitForm(){' +
      'var form=document.getElementById("mktForm");' +
      'var data={};' +
      'var inputs=form.querySelectorAll("input,select");' +
      'for(var i=0;i<inputs.length;i++){data[inputs[i].name]=inputs[i].value;}' +
      'google.script.run.withSuccessHandler(function(r){' +
      'var s=document.getElementById("status");s.style.display="block";s.style.background="#d4edda";s.textContent="Saved: "+r;' +
      'form.reset();' +
      '}).withFailureHandler(function(e){' +
      'var s=document.getElementById("status");s.style.display="block";s.style.background="#f8d7da";s.textContent="Error: "+e.message;' +
      '}).saveMarketingRecord(data);' +
      '}' +
      '</script>';

    _showDialog(html, 'Enter Marketing Data', 500, 700);
  }

  function saveMarketingRecord(data) {
    try {
      MktService.ensureSheetExists();
      var id = MktService.createRecord(data);
      return id;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  // ============ SOCIAL MEDIA FORM ============

  function showSocialForm() {
    SocService.ensureSheetExists();
    var platforms = Object.values(SocSchema.PLATFORM);

    var platformOptions = platforms.map(function(p) {
      return '<option value="' + p + '">' + p + '</option>';
    }).join('');

    var html =
      '<style>body{font-family:sans-serif;padding:20px;}label{display:block;margin-top:10px;font-weight:bold;}input,select{width:100%;padding:6px;margin-top:4px;box-sizing:border-box;}button{margin-top:20px;padding:10px 20px;background:#1a237e;color:#fff;border:none;cursor:pointer;}#status{margin-top:15px;padding:10px;display:none;}</style>' +
      '<h2>➕ Enter Social Media Data</h2>' +
      '<form id="socForm">' +
      '<label>Date</label><input type="date" name="date" required>' +
      '<label>Platform</label><select name="platform" required>' + platformOptions + '</select>' +
      '<label>Followers (point-in-time)</label><input type="number" name="followers" min="0">' +
      '<label>Follower Growth</label><input type="number" name="followerGrowth">' +
      '<label>Reach</label><input type="number" name="reach" min="0">' +
      '<label>Impressions</label><input type="number" name="impressions" min="0">' +
      '<label>Engagements</label><input type="number" name="engagements" min="0">' +
      '<label>Likes</label><input type="number" name="likes" min="0">' +
      '<label>Comments</label><input type="number" name="comments" min="0">' +
      '<label>Shares</label><input type="number" name="shares" min="0">' +
      '<label>Saves</label><input type="number" name="saves" min="0">' +
      '<label>Video Views</label><input type="number" name="videoViews" min="0">' +
      '<label>Watch Time (minutes)</label><input type="number" name="watchTime" min="0">' +
      '<label>Profile Visits</label><input type="number" name="profileVisits" min="0">' +
      '<label>Link Clicks</label><input type="number" name="linkClicks" min="0">' +
      '<label>Leads</label><input type="number" name="leads" min="0">' +
      '<label>Purchases</label><input type="number" name="purchases" min="0">' +
      '<label>Attributed Revenue</label><input type="number" name="attributedRevenue" min="0" step="0.01">' +
      '<label>Notes</label><input type="text" name="notes">' +
      '<button type="button" onclick="submitForm()">Save Record</button>' +
      '</form>' +
      '<div id="status"></div>' +
      '<script>' +
      'function submitForm(){' +
      'var form=document.getElementById("socForm");' +
      'var data={};' +
      'var inputs=form.querySelectorAll("input,select");' +
      'for(var i=0;i<inputs.length;i++){data[inputs[i].name]=inputs[i].value;}' +
      'google.script.run.withSuccessHandler(function(r){' +
      'var s=document.getElementById("status");s.style.display="block";s.style.background="#d4edda";s.textContent="Saved: "+r;' +
      'form.reset();' +
      '}).withFailureHandler(function(e){' +
      'var s=document.getElementById("status");s.style.display="block";s.style.background="#f8d7da";s.textContent="Error: "+e.message;' +
      '}).saveSocialRecord(data);' +
      '}' +
      '</script>';

    _showDialog(html, 'Enter Social Media Data', 500, 750);
  }

  function saveSocialRecord(data) {
    try {
      SocService.ensureSheetExists();
      var id = SocService.createRecord(data);
      return id;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  // ============ CSV IMPORT ============

  function showMarketingCsvImport() {
    MktService.ensureSheetExists();
    var html =
      '<style>body{font-family:sans-serif;padding:20px;}textarea{width:100%;height:300px;font-family:monospace;}button{margin-top:15px;padding:10px 20px;background:#1a237e;color:#fff;border:none;cursor:pointer;}#status{margin-top:15px;padding:10px;display:none;}</style>' +
      '<h2>📥 Import Marketing CSV</h2>' +
      '<p>Paste CSV with headers. Supported columns: date, platform, channel, campaignId, campaignName, currency, spend, impressions, reach, clicks, leads, conversions, attributedRevenue, creativeCost, agencyCost, otherCost, notes</p>' +
      '<textarea id="csvData" placeholder="date,platform,spend,impressions,clicks\n2026-08-01,Meta,1000,50000,500"></textarea>' +
      '<button type="button" onclick="submitCsv()">Import</button>' +
      '<div id="status"></div>' +
      '<script>' +
      'function submitCsv(){' +
      'var csv=document.getElementById("csvData").value;' +
      'if(!csv.trim()){alert("Please paste CSV data");return;}' +
      'google.script.run.withSuccessHandler(function(r){' +
      'var s=document.getElementById("status");s.style.display="block";' +
      'var msg="Imported: "+r.imported+" rows\nRejected: "+r.rejected.length+" rows\nTotal: "+r.total;' +
      'if(r.rejected.length>0){msg+="\n\nErrors:";r.rejected.forEach(function(x){msg+="\nRow "+x.row+": "+x.error;});}' +
      's.style.background=r.rejected.length===0?"#d4edda":"#fff3cd";s.textContent=msg;' +
      '}).withFailureHandler(function(e){' +
      'var s=document.getElementById("status");s.style.display="block";s.style.background="#f8d7da";s.textContent="Error: "+e.message;' +
      '}).importMarketingCsv(csv);' +
      '}' +
      '</script>';

    _showDialog(html, 'Import Marketing CSV', 600, 600);
  }

  function importMarketingCsv(csvText) {
    try {
      return MktService.importFromCsv(csvText);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  function showSocialCsvImport() {
    SocService.ensureSheetExists();
    var html =
      '<style>body{font-family:sans-serif;padding:20px;}textarea{width:100%;height:300px;font-family:monospace;}button{margin-top:15px;padding:10px 20px;background:#1a237e;color:#fff;border:none;cursor:pointer;}#status{margin-top:15px;padding:10px;display:none;}</style>' +
      '<h2>📥 Import Social Media CSV</h2>' +
      '<p>Paste CSV with headers. Supported columns: date, platform, followers, followerGrowth, reach, impressions, engagements, likes, comments, shares, saves, videoViews, watchTime, profileVisits, linkClicks, leads, purchases, attributedRevenue, notes</p>' +
      '<textarea id="csvData" placeholder="date,platform,followers,reach,impressions,engagements\n2026-08-01,Instagram,5000,2000,5000,300"></textarea>' +
      '<button type="button" onclick="submitCsv()">Import</button>' +
      '<div id="status"></div>' +
      '<script>' +
      'function submitCsv(){' +
      'var csv=document.getElementById("csvData").value;' +
      'if(!csv.trim()){alert("Please paste CSV data");return;}' +
      'google.script.run.withSuccessHandler(function(r){' +
      'var s=document.getElementById("status");s.style.display="block";' +
      'var msg="Imported: "+r.imported+" rows\nRejected: "+r.rejected.length+" rows\nTotal: "+r.total;' +
      'if(r.rejected.length>0){msg+="\n\nErrors:";r.rejected.forEach(function(x){msg+="\nRow "+x.row+": "+x.error;});}' +
      's.style.background=r.rejected.length===0?"#d4edda":"#fff3cd";s.textContent=msg;' +
      '}).withFailureHandler(function(e){' +
      'var s=document.getElementById("status");s.style.display="block";s.style.background="#f8d7da";s.textContent="Error: "+e.message;' +
      '}).importSocialCsv(csv);' +
      '}' +
      '</script>';

    _showDialog(html, 'Import Social CSV', 600, 600);
  }

  function importSocialCsv(csvText) {
    try {
      return SocService.importFromCsv(csvText);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  // ============ DASHBOARDS ============

  function showMarketingDashboard() {
    try {
      var now = new Date();
      var monthKey = KpiSchema._periodKey(KpiSchema.PERIOD.MONTHLY, now);
      var kpiIds = ['MKT-01','MKT-02','MKT-03','MKT-04','MKT-05','MKT-06','MKT-07','MKT-08','MKT-09','MKT-10','MKT-11','MKT-12','MKT-13','MKT-14','MKT-15','MKT-16','MKT-17','MKT-18'];
      var html = '<h2>📣 Marketing Dashboard</h2><table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;"><tr><th>KPI</th><th>Value</th><th>Unit</th></tr>';

      kpiIds.forEach(function(kpiId) {
        var def = KpiSchema.getDefinition(kpiId);
        var existing = KpiRepository.findByKpiIdAndPeriod(kpiId, monthKey);
        var value = existing ? Number(existing.value).toFixed(2) : '—';
        html += '<tr><td>' + (def ? def.name : kpiId) + '</td><td>' + value + '</td><td>' + (def ? def.unit : '') + '</td></tr>';
      });

      html += '</table>';
      _showDialog(html, 'Marketing Dashboard', 500, 600);
    } catch (e) {
      SpreadsheetApp.getUi().alert('Error: ' + e.message);
    }
  }

  function showSocialDashboard() {
    try {
      var now = new Date();
      var monthKey = KpiSchema._periodKey(KpiSchema.PERIOD.MONTHLY, now);
      var kpiIds = ['SOC-01','SOC-02','SOC-03','SOC-04','SOC-05','SOC-06','SOC-07','SOC-08','SOC-09','SOC-10','SOC-11','SOC-12','SOC-13','SOC-14','SOC-15','SOC-16'];
      var html = '<h2>📱 Social Media Dashboard</h2><table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;"><tr><th>KPI</th><th>Value</th><th>Unit</th></tr>';

      kpiIds.forEach(function(kpiId) {
        var def = KpiSchema.getDefinition(kpiId);
        var existing = KpiRepository.findByKpiIdAndPeriod(kpiId, monthKey);
        var value = existing ? Number(existing.value).toFixed(2) : '—';
        html += '<tr><td>' + (def ? def.name : kpiId) + '</td><td>' + value + '</td><td>' + (def ? def.unit : '') + '</td></tr>';
      });

      html += '</table>';
      _showDialog(html, 'Social Media Dashboard', 500, 600);
    } catch (e) {
      SpreadsheetApp.getUi().alert('Error: ' + e.message);
    }
  }

  return {
    showMarketingForm: showMarketingForm,
    saveMarketingRecord: saveMarketingRecord,
    showSocialForm: showSocialForm,
    saveSocialRecord: saveSocialRecord,
    showMarketingCsvImport: showMarketingCsvImport,
    importMarketingCsv: importMarketingCsv,
    showSocialCsvImport: showSocialCsvImport,
    importSocialCsv: importSocialCsv,
    showMarketingDashboard: showMarketingDashboard,
    showSocialDashboard: showSocialDashboard
  };
})();
