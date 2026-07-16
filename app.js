const SUPABASE_URL='https://mxfvgspptteadirmpjqy.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZnZnc3BwdHRlYWRpcm1wanF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTQyMzAsImV4cCI6MjA5Nzc3MDIzMH0.HVeDbsECu7v0PVuggG4gnroXZj4aRv7IhR_AJ79BHh0';
const API_URL=SUPABASE_URL+'/rest/v1';
const HEADERS={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'};

async function api(path,opts){const r=await fetch(API_URL+path,{headers:HEADERS,...opts});const t=await r.text();if(!r.ok)throw new Error(t);return t?JSON.parse(t):[];}

let records=[],ovulRecords=[],avgCycle=28,curYear=new Date().getFullYear(),curMonth=new Date().getMonth();
let selectedDate=null,selectedOpt='period',duration=5,currentTab=0;

function fmt(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmtDisplay(s){const d=new Date(s+'T00:00:00');return d.getMonth()+1+'月'+d.getDate()+'日';}
function fmtDateLabel(s){const d=new Date(s+'T00:00:00');const x=['日','一','二','三','四','五','六'];return d.getMonth()+1+'月'+d.getDate()+'日 · 周'+x[d.getDay()];}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2200);}

function calcCycle(){
  const real=records.filter(function(r){return r.notes!=='marked';});
  if(!real.length)return{avgCycle:28,latest:null,nextPredicted:null,daysInCycle:0,currentPhase:null};
  const sorted=[...real].sort(function(a,b){return new Date(b.start_date)-new Date(a.start_date);});
  const latest=sorted[0];
  let cycle=28;
  if(sorted.length>=2){
    let total=0,count=0;
    for(let i=0;i<sorted.length-1;i++){
      const diff=(new Date(sorted[i].start_date)-new Date(sorted[i+1].start_date))/86400000;
      if(diff>15&&diff<65){total+=diff;count++;}
    }
    if(count>0)cycle=Math.round(total/count);
  }
  avgCycle=cycle;
  const today=new Date();today.setHours(0,0,0,0);
  const lastStart=new Date(latest.start_date+'T00:00:00');
  const daysIn=Math.floor((today-lastStart)/86400000);
  const nextDate=new Date(lastStart);nextDate.setDate(nextDate.getDate()+cycle);
  const daysUntil=Math.floor((nextDate-today)/86400000);
  const ovulDay=cycle-14;
  let phase=null;
  if(daysIn>=0&&daysIn<cycle){
    if(daysIn<5)phase='period';
    else if(daysIn<ovulDay-1)phase='follicular';
    else if(daysIn<=ovulDay+1)phase='ovulation';
    else phase='luteal';
  }
  return{avgCycle:cycle,latest:latest,nextPredicted:fmt(nextDate),daysInCycle:daysIn,daysUntilNext:daysUntil,currentPhase:phase};
}

function getPhaseForDate(ds){
  const real=records.filter(function(r){return r.notes!=='marked';});
  if(!real.length)return null;
  const target=new Date(ds+'T00:00:00');
  const ovulOff=avgCycle-14;
  const sortedReal=[...real].sort(function(a,b){return new Date(b.start_date)-new Date(a.start_date);});
  for(let i=0;i<sortedReal.length;i++){
    const r=sortedReal[i];
    const start=new Date(r.start_date+'T00:00:00');
    const day=Math.floor((target-start)/86400000);
    if(day>=0&&day<avgCycle){
      if(day<r.duration)return{phase:'period',isStart:day===0};
      if(day<ovulOff-1)return{phase:'follicular',isStart:false};
      if(day<=ovulOff+1)return{phase:'ovulation',isStart:day===ovulOff};
      return{phase:'luteal',isStart:false};
    }
  }
  const sorted=[...real].sort(function(a,b){return new Date(b.start_date)-new Date(a.start_date);});
  const nextStart=new Date(sorted[0].start_date+'T00:00:00');
  nextStart.setDate(nextStart.get()+avgCycle);
  const day=Math.floor((target-nextStart)/86400000);
  if(day>=0&&day<avgCycle){
    if(day<5)return{phase:'pred-period',isStart:day===0};
    if(day<ovulOff-1)return{phase:'pred-follicular',isStart:false};
    if(day<=ovulOff+1)return{phase:'pred-ovulation',isStart:false};
    return{phase:'pred-luteal',isStart:false};
  }
  return null;
}

const PHASE_INFO={
  period:{name:'\u6708\u7ecf\u671f',color:'var(--period)',desc:'\u6ce8\u610f\u4fdd\u6696\uff0c\u591a\u559d\u70ed\u6c34\uff0c\u907f\u514d\u5267\u70c8\u8fd0\u52a8\uff0c\u53ef\u4ee5\u70ed\u6577\u7f13\u89e3\u4e0d\u9002'},
  follicular:{name:'\u5375\u6ce1\u671f',color:'var(--follicular)',desc:'\u96cc\u6fc0\u7d20\u5347\u9ad8\uff0c\u7cbe\u529b\u5145\u6c9b\uff0c\u9002\u5408\u8fd0\u52a8\u548c\u5f00\u59cb\u65b0\u8ba1\u5212'},
  ovulation:{name:'\u6392\u5375\u671f',color:'var(--ovulation)',desc:'\u4f53\u6e29\u5fae\u5347\uff0c\u767d\u5e26\u62c9\u4e1d\uff0c\u662f\u6392\u5375\u65e5\u524d\u540e\u5404\u4e00\u5929'},
  luteal:{name:'\u9ec4\u4f53\u671f',color:'var(--luteal)',desc:'\u5b55\u916e\u5347\u9ad8\uff0c\u5bb9\u6613\u75b2\u60eb\uff0c\u60c5\u7eea\u654f\u611f\uff0c\u8865\u5145\u7ef4\u751f\u7d20B6\u6709\u5e2e\u52a9'},
};

function renderStatus(){
  const o=calcCycle();
  const sec=document.getElementById('status-section');
  if(!o.latest){
    sec.innerHTML='<div style="text-align:center;padding:24px 0"><div style="font-size:32px;margin-bottom:10px">\uD83C\uDF19</div><div style="color:var(--text-dim);font-size:13px">\u8fd8\u6ca1\u6709\u8bb0\u5f55\uff0c\u53bb\u65e5\u5386\u9875\u6dfb\u52a0\u7b2c\u4e00\u6761\u5427</div></div>';
    return;
  }
  const ph=PHASE_INFO[o.currentPhase]||PHASE_INFO.luteal;
  const od=o.avgCycle-14;
  const ringR=42,ringC=52,circ=2*Math.PI*ringR;
  function arc(sf,lf,c){
    const off=circ*(1-sf)+circ*0.25;
    return'<circle cx="'+ringC+'" cy="'+ringC+'" r="'+ringR+'" fill="none" stroke="'+c+'" stroke-width="7" stroke-dasharray="'+circ*lf+' '+circ*(1-lf)+'" stroke-dashoffset="'+off+'" stroke-linecap="round"/>';
  }
  const pF=5/o.avgCycle,fF=(od-7)/o.avgCycle,oF=3/o.avgCycle,lF=(o.avgCycle-od-1)/o.avgCycle;
  const ma=(o.daysInCycle/o.avgCycle)*360-90;
  const mx=ringC+ringR*Math.cos(ma*Math.PI/180),my=ringC+ringR*Math.sin(ma*Math.PI/180);
  sec.innerHTML='<div class="ring-row"><div class="ring-wrap"><svg viewBox="0 0 104 104"><circle cx="'+ringC+'" cy="'+ringC+'" r="'+ringR+'" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>'+arc(0,pF,'var(--period)')+arc(pF,fF,'var(--follicular)')+arc(pF+fF,oF,'var(--ovulation)')+arc(pF+fF+oF,lF,'var(--luteal)')+'<circle cx="'+mx+'" cy="'+my+'" r="4.5" fill="white" opacity=".9"/></svg><div class="ring-center"><div class="ring-day serif">'+(o.daysInCycle+1)+'</div><div class="ring-day-label">\u7B2C '+(o.daysInCycle+1)+' \u5929</div></div></div><div class="ring-info"><div class="phase-name serif" style="color:'+ph.color+'">'+ph.name+'</div><div class="phase-desc">'+ph.desc+'</div>'+(o.daysUntilNext>=0?'<div class="phase-next">\u8DDD\u4E0B\u6B21\u7ECF\u671F \u00B7 '+o.daysUntilNext+' \u5929</div>':'')+'</div></div><div class="sep"></div><div class="timeline">'+
    ['period','follicular','ovulation','luteal'].map(function(k){
      var names={'period':'\u6708\u7ecf\u671f','follicular':'\u5375\u6ce1\u671f','ovulation':'\u6392\u5375\u671f','luteal':'\u9ec4\u4f53\u671f'};
      var ranges={'period':'\u7B2C 1\u20135 \u5929','follicular':'\u7B2C 6\u2013'+(od-2)+' \u5929','ovulation':'\u7B2C '+od+' \u5929','luteal':'\u7B2C '+(od+2)+'\u2013'+o.avgCycle+' \u5929'};
      var descs={'period':'\u4fdd\u6696\u4f11\u606f\uff0c\u70ed\u6577\u7f13\u89e3','follicular':'\u7cbe\u529b\u65fa\u76db\uff0c\u9002\u5408\u8fd0\u52a8','ovulation':'\u4f53\u6e29\u5fae\u5347\uff0c\u767d\u5e26\u62c9\u4e1d','luteal':'\u5b55\u916e\u5347\u9ad8\uff0c\u60c5\u7eea\u654f\u611f'};
      var colors={'period':'var(--period)','follicular':'var(--follicular)','ovulation':'var(--ovulation)','luteal':'var(--luteal)'};
      var ic=k===o.currentPhase;
      return'<div class="tl-row'+(ic?' curr':'')+'"><div class="tl-left"><div class="tl-dot" style="background:'+colors[k]+'"></div><div class="tl-line"></div></div><div class="tl-right"><div class="tl-name serif">'+names[k]+'<span class="tl-range">'+ranges[k]+'</span></div><div class="tl-desc">'+descs[k]+'</div></div></div>';
    }).join('')+'</div>';
  document.getElementById('stats-grid').style.display='';
  document.getElementById('stat-last').textContent=fmtDisplay(o.latest.start_date);
  document.getElementById('stat-cycle').textContent=o.avgCycle+' \u5929';
  document.getElementById('stat-next').textContent=o.nextPredicted?fmtDisplay(o.nextPredicted):'\u2014';
  renderHistory();
}

function renderHistory(){
  const real=records.filter(function(r){return r.notes!=='marked';});
  const sec=document.getElementById('history-section');
  if(!real.length&&!ovulRecords.length){sec.style.display='none';return;}
  sec.style.display='';
  const sorted=[...real].sort(function(a,b){return new Date(b.start_date)-new Date(a.start_date);});
  const sortedOvul=[...ovulRecords].sort(function(a,b){return new Date(b.ovulation_date)-new Date(a.ovulation_date);});
  let html='';
  for(let i=0;i<sorted.length;i++){var r=sorted[i];html+='<div class="hist-item"><div class="hist-dot"></div><div class="hist-date serif">'+fmtDisplay(r.start_date)+'</div><div class="hist-meta">\u7ECF\u671F \u00B7 \u6301\u7EED '+(r.duration||5)+' \u5929</div><div class="hist-del" onclick="deleteRecord(\''+r.start_date+'\')">\u5220\u9664</div></div>';}
  for(let i=0;i<sortedOvul.length;i++){var r=sortedOvul[i];html+='<div class="hist-item"><div class="ovul-hist-dot"></div><div class="hist-date serif">'+fmtDisplay(r.ovulation_date)+'</div><div class="hist-meta">\u6392\u5375\u671f</div><div class="hist-del" onclick="deleteOvulRecord(\''+r.ovulation_date+'\')">\u5220\u9664</div></div>';}
  document.getElementById('history-list').innerHTML=html;
}

var MONTH_NAMES=['\u4E00\u6708','\u4E8C\u6708','\u4E09\u6708','\u56DB\u6708','\u4E94\u6708','\u516D\u6708','\u4E03\u6708','\u516B\u6708','\u4E5D\u6708','\u5341\u6708','\u5341\u4E00\u6708','\u5341\u4E8C\u6708'];
var MONTH_EN=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

function renderCalendar(){
  document.getElementById('cal-month-title').textContent=MONTH_NAMES[curMonth];
  document.getElementById('cal-year-title').textContent=MONTH_EN[curMonth].slice(0,3)+' '+curYear;
  const today=fmt(new Date()),first=new Date(curYear,curMonth,1),last=new Date(curYear,curMonth+1,0);
  const startDay=first.getDay();
  let html='';
  for(let i=0;i<startDay;i++)html+='<div class="day empty"><div class="day-num"></div><div class="day-dot"></div></div>';
  for(let d=1;d<=last.getDate();d++){
    const ds=curYear+'-'+String(curMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const info=getPhaseForDate(ds);const isToday=ds===today;const hasOvul=ovulRecords.some(function(r){return r.ovulation_date===ds;});
    let cls='day';
    if(info){cls+=' phase-'+info.phase;if(info.isStart&&info.phase==='period')cls+=' period-start';if(info.isStart&&info.phase==='ovulation')cls+=' ovul-start';}
    if(hasOvul)cls+=' has-ovulation';
    if(isToday)cls+=' is-today';
    html+='<div class="'+cls+'" onclick="onDayClick(\''+ds+'\')"><div class="day-num">'+d+'</div><div class="day-dot"></div></div>';
  }
  document.getElementById('days-grid').innerHTML=html;
  renderPhaseStrip();
}

function renderPhaseStrip(){
  const o=calcCycle();const od=o.avgCycle-14;
  const items=[
    {key:'period',name:'\u6708\u7ecf\u671f',range:'\u7B2C 1\u20135 \u5929',tip:'\u4fdd\u6696\u4f11\u606f\uff0c\u70ed\u6577\u7f13\u89e3',color:'var(--period)'},
    {key:'follicular',name:'\u5375\u6ce1\u671f',range:'\u7B2C 6\u2013'+(od-2)+' \u5929',tip:'\u7cbe\u529b\u65fa\u76db\uff0c\u9002\u5408\u8fd0\u52a8',color:'var(--follicular)'},
    {key:'ovulation',name:'\u6392\u5375\u671f',range:'\u7B2C '+od+' \u5929',tip:'\u4f53\u6e29\u5fae\u5347\uff0c\u767d\u5e26\u62c9\u4e1d',color:'var(--ovulation)'},
    {key:'luteal',name:'\u9ec4\u4f53\u671f',range:'\u7B2C '+(od+2)+'\u2013'+o.avgCycle+' \u5929',tip:'\u5b55\u916e\u5347\u9ad8\uff0c\u60c5\u7eea\u654f\u611f',color:'var(--luteal)'},
  ];
  document.getElementById('phase-strip').innerHTML=items.map(function(it){
    const ic=it.key===o.currentPhase;
    return'<div class="phase-strip-item'+(ic?' curr':'')+'"><div class="ps-dot" style="background:'+it.color+'"></div><div class="ps-info"><div class="ps-name serif">'+it.name+' \u00B7 '+it.range+'</div><div class="ps-tip">'+it.tip+'</div></div>'+(ic?'<div class="ps-tag" style="background:rgba(255,255,255,0.07);color:var(--text-mid)">\u5F53\u524D</div>':'')+'</div>';
  }).join('');
}

function switchTab(idx,animate){
  if(animate===undefined)animate=true;
  currentTab=idx;
  const wrapper=document.getElementById('swipe-wrapper');
  if(!animate)wrapper.style.transition='none';
  wrapper.style.transform='translateX(-'+(idx*100)+'%)';
  if(!animate)setTimeout(function(){wrapper.style.transition='';},0);
  document.getElementById('tab-0').classList.toggle('active',idx===0);
  document.getElementById('tab-1').classList.toggle('active',idx===1);
  const bar=document.getElementById('tab-bar');
  const tabs=bar.querySelectorAll('.tab');
  const line=document.getElementById('tab-line');
  const t=tabs[idx];
  line.style.left=t.offsetLeft+'px';
  line.style.width=t.offsetWidth+'px';
}

(function(){
  const container=document.getElementById('swipe-container');
  let startX=0,startY=0,isDragging=false,isHoriz=null;
  container.addEventListener('touchstart',function(e){startX=e.touches[0].clientX;startY=e.touches[0].clientY;isDragging=true;isHoriz=null;},{passive:true});
  container.addEventListener('touchmove',function(e){
    if(!isDragging)return;
    const dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY;
    if(isHoriz===null)isHoriz=Math.abs(dx)>Math.abs(dy);
    if(!isHoriz)return;
    e.preventDefault();
    const wrapper=document.getElementById('swipe-wrapper');
    wrapper.style.transition='none';
    const pct=dx/container.offsetWidth*100;
    wrapper.style.transform='translateX('+(-currentTab*100+pct)+'%)';
  },{passive:false});
  container.addEventListener('touchend',function(e){
    if(!isDragging||!isHoriz)return;
    isDragging=false;
    const dx=e.changedTouches[0].clientX-startX;
    document.getElementById('swipe-wrapper').style.transition='';
    if(dx<-50&&currentTab<1)switchTab(1);
    else if(dx>50&&currentTab>0)switchTab(0);
    else switchTab(currentTab);
  });
})();

function prevMonth(){curMonth--;if(curMonth<0){curMonth=11;curYear--;}renderCalendar();}
function nextMonth(){curMonth++;if(curMonth>11){curMonth=0;curYear++;}renderCalendar();}
function goToday(){const n=new Date();curYear=n.getFullYear();curMonth=n.getMonth();renderCalendar();}

function onDayClick(ds){
  selectedDate=ds;
  document.getElementById('sheet-date').textContent=fmtDateLabel(ds);
  const existing=records.find(function(r){return r.start_date===ds;});
  const existingOvul=ovulRecords.find(function(r){return r.ovulation_date===ds;});
  if(existing&&existing.notes!=='marked')selectOpt('clear');
  else if(existingOvul)selectOpt('clear');
  else selectOpt('period');
  document.querySelectorAll('.day').forEach(function(el){el.classList.remove('selected');});
  const allDays=document.querySelectorAll('#days-grid .day:not(.empty)');
  const dayNum=new Date(ds+'T00:00:00').getDate();
  if(allDays[dayNum-1])allDays[dayNum-1].classList.add('selected');
  document.getElementById('sheet-overlay').classList.add('open');
}
function closeSheet(){document.getElementById('sheet-overlay').classList.remove('open');document.querySelectorAll('.day.selected').forEach(function(el){el.classList.remove('selected');});selectedDate=null;}
function onOverlayClick(e){if(e.target===document.getElementById('sheet-overlay'))closeSheet();}
function selectOpt(opt){
  selectedOpt=opt;
  ['period','ovulation','mark','clear'].forEach(function(k){
    const el=document.getElementById('opt-'+k),chk=el.querySelector('.sheet-check');
    el.classList.toggle('active',k===opt);chk.textContent=k===opt?'\u2713':'';
  });
  document.getElementById('duration-row').style.display=opt==='period'?'':'none';
}
function changeDur(d){duration=Math.max(1,Math.min(10,duration+d));document.getElementById('dur-val').textContent=duration;}

async function saveRecord(){
  if(!selectedDate)return;
  const btn=document.getElementById('btn-save');btn.disabled=true;
  try{
    if(selectedOpt==='clear'){
      await api('/period_records?start_date=eq.'+selectedDate,{method:'DELETE'});
      records=records.filter(function(r){return r.start_date!==selectedDate;});
      await api('/ovulation_records?ovulation_date=eq.'+selectedDate,{method:'DELETE'});
      ovulRecords=ovulRecords.filter(function(r){return r.ovulation_date!==selectedDate;});
      showToast('\u5DF2\u6E05\u9664\u8BB0\u5F55');
    }else if(selectedOpt==='ovulation'){
      const ex=ovulRecords.find(function(r){return r.ovulation_date===selectedDate;});
      if(ex){showToast('\u8FD9\u5929\u5DF2\u7ECF\u8BB0\u5F55\u8FC7\u6392\u5375\u671F\u4E86');}
      else{var data=await api('/ovulation_records',{method:'POST',body:JSON.stringify({ovulation_date:selectedDate,notes:''})});ovulRecords.push(data[0]);showToast('\u5DF2\u8BB0\u5F55\u6392\u5375\u671F');}
    }else if(selectedOpt==='mark'){
      const ex=records.find(function.start_date===selectedDate;});
      if(ex){await api('/period_records?start_date=eq.'+selectedDate,{method:'PATCH',body:JSON.stringify({notes:'marked',duration:1})});ex.notes='marked';ex.duration=1;}
      else{var data=await api('/period_records',{method:'POST',body:JSON.stringify({start_date:selectedDate,notes:'marked',duration:1})});records.push(data[0]);}
      showToast('\u5DF2\u6807\u8BB0');
    }else{
      const ex=records.find(function(r){return r.start_date===selectedDate;});
      if(ex){await api('/period_records?start_date=eq.'+selectedDate,{method:'PATCH',body:JSON.stringify:'',duration:duration})});ex.notes='';exuration=duration;}
      else{var data=await api('/period_records',{method:'POST',body:JSON.stringify({start_date:selectedDate,notes:'',duration:duration})});records.push(data[0]);}
      showToast('\u5DF2\u8BB0\u5F55\u6708\u7ECF\u671F\u5F00\u59CB');
    }
    closeSheet();renderStatus();renderCalendar();
  }catch(e){showToast('\u4FDD\u5B58\u5931\u8D25\uFF1A'+e.message);}
  finally{btn.disabled=false;}
}
async function deleteRecord(dateStr){
  try{
    await api('/period_records?start_date=eq.'+dateStr,{method:'DELETE'});
    records=records.filter(function(r){return r.start_date!==dateStr;});
    showToast('\u5DF2\u5220\u9664');renderStatus();renderCalendar();
  }catch(e){showToast('\u5220\u9664\u5931\u8D25');}
}
async function deleteOvulRecord(dateStr){
  try{
    await api('/ovulation_records?ovulation_date=eq.'+dateStr,{method:'DELETE'});
    ovulRecords=ovulRecords.filter(function(r){return r.ovulation_date!==dateStr;});
    showToast('\u5DF2\u5220\u9664');renderStatus();renderCalendar();
  }catch(e){showToast('\u5220\u9664\u5931\u8D25');}
}

async function init(){
  try{
    records=await api('/period_records?order=start_date.asc');
    records=records.map(function(r){r.duration=r.duration||5;return r;});
    ovulRecords=await api('/ovulation_records?order=ovulation_date.asc');
    renderStatus();renderCalendar();
    setTimeout(function(){switchTab(0,false);},50);
  }catch(e){
    document.getElementById('status-section').innerHTML='<div class="loading-state" style="color:#e85d75">\u52A0\u8F7D\u5931\u8D25\uFF1A'+e.message+'</div>';
  }
}
init();
