var SB_URL = 'https://mxfvgspptteadirmpjqy.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZnZnc3BwdHRlYWRpcm1wanF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTQyMzAsImV4cCI6MjA5Nzc3MDIzMH0.HVeDbsECu7v0PVuggG4gnroXZj4aRv7IhR_AJ79BHh0';
var API = SB_URL + '/rest/v1';
var HDR = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function qry(path) {
  var r = await fetch(API + path, { headers: HDR });
  if (!r.ok) { var t = await r.text(); throw new Error(t); }
  return await r.json();
}

var records = [];
var ovulRecords = [];
var avgCycle = 28;
var curYear = new Date().getFullYear();
var curMonth = new Date().getMonth();
var currentTab = 0;

function fmt(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function calcCycle() {
  var real = records.filter(function(r) { return r.notes !== 'marked'; });
  if (real.length === 0) return null;
  var sorted = real.slice().sort(function(a, b) { return new Date(b.start_date) - new Date(a.start_date); });
  var latest = sorted[0];
  var cycle = 28;
  if (sorted.length >= 2) {
    var total = 0, count = 0;
    for (var i = 0; i < sorted.length - 1; i++) {
      var diff = (new Date(sorted[i].start_date) - new Date(sorted[i + 1].start_date)) / 86400000;
      if (diff > 15 && diff < 65) { total += diff; count++; }
    }
    if (count > 0) cycle = Math.round(total / count);
  }
  avgCycle = cycle;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var lastStart = new Date(latest.start_date + 'T00:00:00');
  var daysIn = Math.floor((today - lastStart) / 86400000);
  var nextDate = new Date(lastStart); nextDate.setDate(nextDate.getDate() + cycle);
  return { latest: latest, avgCycle: cycle, daysIn: daysIn, nextDate: nextDate };
}

function renderStatus() {
  var info = calcCycle();
  var el = document.getElementById('statusSection');
  if (!info) {
    el.textContent = '还没有记录，去日历页添加第一条吧';
    return;
  }
  el.innerHTML = '上次: ' + info.latest.start_date + ' | 周期: ' + info.avgCycle + '天 | 第' + (info.daysIn + 1) + '天';
  document.getElementById('statLast').textContent = info.latest.start_date;
  document.getElementById('statCycle').textContent = info.avgCycle + '天';
  document.getElementById('statNext').textContent = fmt(info.nextDate);
}

function renderCalendar() {
  var grid = document.getElementById('daysGrid');
  var first = new Date(curYear, curMonth, 1);
  var last = new Date(curYear, curMonth + 1, 0);
  var html = '';
  for (var i = 0; i < first.getDay(); i++) html += '<div class="day empty"></div>';
  for (var d = 1; d <= last.getDate(); d++) {
    html += '<div class="day"><div class="day-num">' + d + '</div></div>';
  }
  grid.innerHTML = html;
  document.getElementById('calMonth').textContent = curYear + '年' + (curMonth + 1) + '月';
}

function prevMonth() { curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } renderCalendar(); }
function nextMonth() { curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } renderCalendar(); }
function goToday() { var n = new Date(); curYear = n.getFullYear(); curMonth = n.getMonth(); renderCalendar(); }

function switchTab(idx) {
  currentTab = idx;
  document.getElementById('swipeWrap').style.transform = 'translateX(-' + (idx * 100) + '%)';
  document.getElementById('tab0').className = idx === 0 ? 'tab active' : 'tab';
  document.getElementById('tab1').className = idx ===1 ? : 'tab';
}

 function init() try {
    document.getElementById('statusSection').textContent =加载中...';
 = await qry('/period_records?order=start_date.asc');
    records = records.map(function(r) { r.duration = r.duration || 5; return r; });
    ovulRecords = await qry('/ovulation_records?order=ovulation_date.asc');
    renderStatus();
    renderCalendar();
  } catch (e) {
    document.getElementById('statusSection').textContent = '加载失败: ' + e.message;
  }
}
init();