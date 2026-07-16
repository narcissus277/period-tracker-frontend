var SUPABASE_URL = 'https://mxfvgspptteadirmpjqy.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZnZnc3BwdHRlYWRpcm1wanF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTQyMzAsImV4cCI6MjA5Nzc3MDIzMH0.HVeDbsECu7v0PVuggG4gnroXZj4aRv7IhR_AJ79BHh0';
var API = SUPABASE_URL + '/rest/v1';
var HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function dbQuery(path) {
  var r = await fetch(API + path, { headers: HEADERS });
  if (!r.ok) { var t = await r.text(); throw new Error(t); }
  return await r.json();
}

async function init() {
  try {
    document.getElementById('status').textContent = '查询数据中...';
    var data = await dbQuery('/period_records?order=start_date.asc');
    document.getElementById('status').textContent = '共 ' + data.length + ' 条记录';
    if (data.length > 0) {
      var last = data[data.length - 1];
      document.getElementById('status').textContent = '上次经期: ' + last.start_date;
    }
  } catch (e) {
    document.getElementById('status').textContent = '错误: ' + e.message;
  }
}
init();
