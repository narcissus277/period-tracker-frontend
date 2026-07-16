const SUPABASE_URL='https://mxfvgspptteadirmpjqy.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZnZnc3BwdHRlYWRpcm1wanF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTQyMzAsImV4cCI6MjA5Nzc3MDIzMH0.HVeDbsECu7v0PVuggG4gnroXZj4aRv7IhR_AJ79BHh0';
const {createClient}=window.supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY);

let records=[],ovulRecords=[],avgCycle=28,curYear=new Date().getFullYear(),curMonth=new Date().getMonth();
let selectedDate=null,selectedOpt='period',duration=5,currentTab=0;

function fmt(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function fmtDisplay(s){const d=new Date(s+'T00:00:00');return`${d.getMonth()+1}月${d.getDate()}日`;}
function fmtDateLabel(s){const d=new Date(s+'T00:00:00');const days=['日','一','二','三','四','五','六'];return`${d.getMonth()+1}月${d.getDate()}日 · 周${days[d.getDay()]}`;}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

// CYCLE
function calcCycle(){
  const real=records.filter(r=>r.notes!=='marked');
  if(!real.length)return{avgCycle:28,latest:null,nextPredicted:null,daysInCycle:0,currentPhase:null};
  const sorted=[...real].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
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
  return{avgCycle:cycle,latest,nextPredicted:fmt(nextDate),daysInCycle:daysIn,daysUntilNext:daysUntil,currentPhase:phase};
}

function getPhaseForDate(ds){
  const real=records.filter(r=>r.notes!=='marked');
  if(!real.length)return null;
  const target=new Date(ds+'T00:00:00');
  const ovulOff=avgCycle-14;
  const sortedReal=[...real].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
  for(const r of sortedReal){
    const start=new Date(r.start_date+'T00:00:00');
    const day=Math.floor((target-start)/86400000);
    if(day>=0&&day<avgCycle){
      if(day<r.duration)return{phase:'period',isStart:day===0};
      if(day<ovulOff-1)return{phase:'follicular',isStart:false};
      if(day<=ovulOff+1)return{phase:'ovulation',isStart:day===ovulOff};
      return{phase:'luteal',isStart:false};
    }
  }
  const sorted=[...real].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
  const nextStart=new Date(sorted[0].start_date+'T00:00:00');
  nextStart.setDate(nextStart.getDate()+avgCycle);
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
  period:{name:'月经期',color:'var(--period)',desc:'注意保暖，多喝热水，避免剧烈运动，可以热敷缓解不适'},
  follicular:{name:'卵泡期',color:'var(--follicular)',desc:'雌激素升高，精力充沛，适合运动和开始新计划'},
  ovulation:{name:'排卵期',color:'var(--ovulation)',desc:'体温微升，白带拉丝，是排卵日前后各一天'},
  luteal:{name:'黄体期',color:'var(--luteal)',desc:'孕酮升高，容易疲惫，情绪敏感，补充维生素B6有帮助'},
};

function renderStatus(){
  const{avgCycle:ac,latest,nextPredicted,daysInCycle,daysUntilNext,currentPhase}=calcCycle();
  const sec=document.getElementById('status-section');
  if(!latest){
    sec.innerHTML=`<div style="text-align:center;padding:24px 0"><div style="font-size:32px;margin-bottom:10px">🌙</div><div style="color:var(--text-dim);font-size:13px">还没有记录，去日历页添加第一条吧</div></div>`;
    return;
  }
  const ph=PHASE_INFO[currentPhase]||PHASE_INFO.luteal;
  const ovulDay=ac-14;
  const sections=[
    {key:'period',name:'月经期',range:`第 1–5 天`,desc:'保暖休息，热敷缓解',color:'var(--period)'},
    {key:'follicular',name:'卵泡期',range:`第 6–${ovulDay-2} 天`,desc:'精力旺盛，适合运动',color:'var(--follicular)'},
    {key:'ovulation',name:'排卵期',range:`第 ${ovulDay} 天`,desc:'体温微升，白带拉丝',color:'var(--ovulation)'},
    {key:'luteal',name:'黄体期',range:`第 ${ovulDay+2}–${ac} 天`,desc:'孕酮升高，情绪敏感',color:'var(--luteal)'},
  ];
  const ringR=42,ringC=52,circ=2*Math.PI*ringR;
  const arc=(sf,lf,c)=>{
    const off=circ*(1-sf)+circ*0.25;
    return`<circle cx="${ringC}" cy="${ringC}" r="${ringR}" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="${circ*lf} ${circ*(1-lf)}" stroke-dashoffset="${off}" stroke-linecap="round"/>`;
  };
  const pF=5/ac,fF=(ovulDay-7)/ac,oF=3/ac,lF=(ac-ovulDay-1)/ac;
  const ma=(daysInCycle/ac)*360-90;
  const mx=ringC+ringR*Math.cos(ma*Math.PI/180),my=ringC+ringR*Math.sin(ma*Math.PI/180);
  sec.innerHTML=`
    <div class="ring-row">
      <div class="ring-wrap">
        <svg viewBox="0 0 104 104">
          <circle cx="${ringC}" cy="${ringC}" r="${ringR}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>
          ${arc(0,pF,'var(--period)')}${arc(pF,fF,'var(--follicular)')}${arc(pF+fF,oF,'var(--ovulation)')}${arc(pF+fF+oF,lF,'var(--luteal)')}
          <circle cx="${mx}" cy="${my}" r="4.5" fill="white" opacity=".9"/>
        </svg>
        <div class="ring-center"><div class="ring-day serif">${daysInCycle+1}</div><div class="ring-day-label">第 ${daysInCycle+1} 天</div></div>
      </div>
      <div class="ring-info">
        <div class="phase-name serif" style="color:${ph.color}">${ph.name}</div>
        <div class="phase-desc">${ph.desc}</div>
        ${daysUntilNext>=0?`<div class="phase-next">距下次经期 · ${daysUntilNext} 天</div>`:''}
      </div>
    </div>
    <div class="sep"></div>
    <div class="timeline">${sections.map(s=>{
      const ic=s.key===currentPhase;
      return`<div class="tl-row${ic?' curr':''}">
        <div class="tl-left"><div class="tl-dot" style="background:${s.color}"></div><div class="tl-line"></div></div>
        <div class="tl-right"><div class="tl-name serif">${s.name}<span class="tl-range">${s.range}</span></div><div class="tl-desc">${s.desc}</div></div>
      </div>`;
    }).join('')}</div>`;
  document.getElementById('stats-grid').style.display='';
  document.getElementById('stat-last').textContent=fmtDisplay(latest.start_date);
  document.getElementById('stat-cycle').textContent=ac+' 天';
  document.getElementById('stat-next').textContent=nextPredicted?fmtDisplay(nextPredicted):'—';
  renderHistory();
}

function renderHistory(){
  const real=records.filter(r=>r.notes!=='marked');
  const sec=document.getElementById('history-section');
  if(!real.length&&!ovulRecords.length){sec.style.display='none';return;}
  sec.style.display='';
  const sorted=[...real].sort((a,b)=>new Date(b.start_date)-new Date(a.start_date));
  const sortedOvul=[...ovulRecords].sort((a,b)=>new Date(b.ovulation_date)-new Date(a.ovulation_date));
  let html=sorted.map(r=>`
    <div class="hist-item">
      <div class="hist-dot"></div>
      <div class="hist-date serif">${fmtDisplay(r.start_date)}</div>
      <div class="hist-meta">经期 · 持续 ${r.duration||5} 天</div>
      <div class="hist-del" onclick="deleteRecord('${r.start_date}')">删除</div>
    </div>`).join('');
  html+=sortedOvul.map(r=>`
    <div class="hist-item">
      <div class="ovul-hist-dot"></div>
      <div class="hist-date serif">${fmtDisplay(r.ovulation_date)}</div>
      <div class="hist-meta">排卵期</div>
      <div class="hist-del" onclick="deleteOvulRecord('${r.ovulation_date}')">删除</div>
    </div>`).join('');
  document.getElementById('history-list').innerHTML=html;
}

const MONTH_NAMES=['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const MONTH_EN=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

function renderCalendar(){
  document.getElementById('cal-month-title').textContent=MONTH_NAMES[curMonth];
  document.getElementById('cal-year-title').textContent=MONTH_EN[curMonth].slice(0,3)+' '+curYear;
  const today=fmt(new Date()),first=new Date(curYear,curMonth,1),last=new Date(curYear,curMonth+1,0);
  const startDay=first.getDay();
  let html='';
  for(let i=0;i<startDay;i++)html+='<div class="day empty"><div class="day-num"></div><div class="day-dot"></div></div>';
  for(let d=1;d<=last.getDate();d++){
    const ds=`${curYear}-${String(curMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const info=getPhaseForDate(ds);const isToday=ds===today;const hasOvul=ovulRecords.some(r=>r.ovulation_date===ds);
    let cls='day';
    if(info){cls+=` phase-${info.phase}`;if(info.isStart&&info.phase==='period')cls+=' period-start';if(info.isStart&&info.phase==='ovulation')cls+=' ovul-start';}
    if(hasOvul)cls+=' has-ovulation';
    if(isToday)cls+=' is-today';
    html+=`<div class="${cls}" onclick="onDayClick('${ds}')"><div class="day-num">${d}</div><div class="day-dot"></div></div>`;
  }
  document.getElementById('days-grid').innerHTML=html;
  renderPhaseStrip();
}

function renderPhaseStrip(){
  const{currentPhase,avgCycle:ac}=calcCycle();const ovulDay=ac-14;
  const items=[
    {key:'period',name:'月经期',range:`第 1–5 天`,tip:'保暖休息，热敷缓解',color:'var(--period)'},
    {key:'follicular',name:'卵泡期',range:`第 6–${ovulDay-2} 天`,tip:'精力旺盛，适合运动',color:'var(--follicular)'},
    {key:'ovulation',name:'排卵期',range:`第 ${ovulDay} 天`,tip:'体温微升，白带拉丝',color:'var(--ovulation)'},
    {key:'luteal',name:'黄体期',range:`第 ${ovulDay+2}–${ac} 天`,tip:'孕酮升高，情绪敏感',color:'var(--luteal)'},
  ];
  document.getElementById('phase-strip').innerHTML=items.map(it=>{
    const ic=it.key===currentPhase;
    return`<div class="phase-strip-item${ic?' curr':''}">
      <div class="ps-dot" style="background:${it.color}"></div>
      <div class="ps-info"><div class="ps-name serif">${it.name} · ${it.range}</div><div class="ps-tip">${it.tip}</div></div>
      ${ic?`<div class="ps-tag" style="background:rgba(255,255,255,0.07);color:var(--text-mid)">当前</div>`:''}
    </div>`;
  }).join('');
}

// TAB + SWIPE
function switchTab(idx,animate=true){
  currentTab=idx;
  const wrapper=document.getElementById('swipe-wrapper');
  if(!animate)wrapper.style.transition='none';
  wrapper.style.transform=`translateX(-${idx*100}%)`;
  if(!animate)setTimeout(()=>wrapper.style.transition='',0);
  document.getElementById('tab-0').classList.toggle('active',idx===0);
  document.getElementById('tab-1').classList.toggle('active',idx===1);
  // move indicator
  const bar=document.getElementById('tab-bar');
  const tabs=bar.querySelectorAll('.tab');
  const line=document.getElementById('tab-line');
  const t=tabs[idx];
  line.style.left=t.offsetLeft+'px';
  line.style.width=t.offsetWidth+'px';
}

// touch swipe
(()=>{
  const container=document.getElementById('swipe-container');
  let startX=0,startY=0,isDragging=false,isHoriz=null;
  container.addEventListener('touchstart',e=>{
    startX=e.touches[0].clientX;startY=e.touches[0].clientY;
    isDragging=true;isHoriz=null;
  },{passive:true});
  container.addEventListener('touchmove',e=>{
    if(!isDragging)return;
    const dx=e.touches[0].clientX-startX,dy=e.touches[0].clientY-startY;
    if(isHoriz===null)isHoriz=Math.abs(dx)>Math.abs(dy);
    if(!isHoriz)return;
    e.preventDefault();
    const wrapper=document.getElementById('swipe-wrapper');
    wrapper.style.transition='none';
    const base=currentTab*100;
    const pct=dx/container.offsetWidth*100;
    wrapper.style.transform=`translateX(${-base+pct}%)`;
  },{passive:false});
  container.addEventListener('touchend',e=>{
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
  const existing=records.find(r=>r.start_date===ds);
  const existingOvul=ovulRecords.find(r=>r.ovulation_date===ds);
  if(existing&&existing.notes!=='marked')selectOpt('clear');
  else if(existingOvul)selectOpt('clear');
  else selectOpt('period');
  document.querySelectorAll('.day').forEach(el=>el.classList.remove('selected'));
  const allDays=document.querySelectorAll('#days-grid .day:not(.empty)');
  const dayNum=new Date(ds+'T00:00:00').getDate();
  if(allDays[dayNum-1])allDays[dayNum-1].classList.add('selected');
  document.getElementById('sheet-overlay').classList.add('open');
}
function closeSheet(){
  document.getElementById('sheet-overlay').classList.remove('open');
  document.querySelectorAll('.day.selected').forEach(el=>el.classList.remove('selected'));
  selectedDate=null;
}
function onOverlayClick(e){if(e.target===document.getElementById('sheet-overlay'))closeSheet();}
function selectOpt(opt){
  selectedOpt=opt;
  ['period','ovulation','mark','clear'].forEach(k=>{
    const el=document.getElementById('opt-'+k),chk=el.querySelector('.sheet-check');
    el.classList.toggle('active',k===opt);chk.textContent=k===opt?'✓':'';
  });
  document.getElementById('duration-row').style.display=opt==='period'?'':'none';
}
function changeDur(d){duration=Math.max(1,Math.min(10,duration+d));document.getElementById('dur-val').textContent=duration;}

async function saveRecord(){
  if(!selectedDate)return;
  const btn=document.getElementById('btn-save');btn.disabled=true;
  try{
    if(selectedOpt==='clear'){
      // 清除经期记录
      await db.from('period_records').delete().eq('start_date',selectedDate);
      records=records.filter(r=>r.start_date!==selectedDate);
      // 清除排卵期记录
      await db.from('ovulation_records').delete().eq('ovulation_date',selectedDate);
      ovulRecords=ovulRecords.filter(r=>r.ovulation_date!==selectedDate);
      showToast('已清除记录');
    }else if(selectedOpt==='ovulation'){
      const ex=ovulRecords.find(r=>r.ovulation_date===selectedDate);
      if(ex){showToast('这天已经记录过排卵期了');}
      else{const{data,error}=await db.from('ovulation_records').insert({ovulation_date:selectedDate,notes:''}).select();if(error)throw error;ovulRecords.push(data[0]);showToast('已记录排卵期');}
    }else if(selectedOpt==='mark'){
      const ex=records.find(r=>r.start_date===selectedDate);
      if(ex){await db.from('period_records').update({notes:'marked',duration:1}).eq('start_date',selectedDate);ex.notes='marked';ex.duration=1;}
      else{const{data,error}=await db.from('period_records').insert({start_date:selectedDate,notes:'marked',duration:1}).select();if(error)throw error;records.push(data[0]);}
      showToast('已标记');
    }else{
      const ex=records.find(r=>r.start_date===selectedDate);
      if(ex){await db.from('period_records').update({notes:'',duration}).eq('start_date',selectedDate);ex.notes='';ex.duration=duration;}
      else{const{data,error}=await db.from('period_records').insert({start_date:selectedDate,notes:'',duration}).select();if(error)throw error;records.push(data[0]);}
      showToast('已记录月经期开始');
    }
    closeSheet();renderStatus();renderCalendar();
  }catch(e){showToast('保存失败：'+e.message);}
  finally{btn.disabled=false;}
}
async function deleteRecord(dateStr){
  if(!confirm(`确认删除 ${fmtDisplay(dateStr)} 的记录？`))return;
  try{
    await db.from('period_records').delete().eq('start_date',dateStr);
    records=records.filter(r=>r.start_date!==dateStr);
    showToast('已删除');renderStatus();renderCalendar();
  }catch(e){showToast('删除失败');}
}
async function deleteOvulRecord(dateStr){
  if(!confirm(`确认删除 ${fmtDisplay(dateStr)} 的排卵期记录？`))return;
  try{
    await db.from('ovulation_records').delete().eq('ovulation_date',dateStr);
    ovulRecords=ovulRecords.filter(r=>r.ovulation_date!==dateStr);
    showToast('已删除');renderStatus();renderCalendar();
  }catch(e){showToast('删除失败');}
}

async function init(){
  try{
    const{data,error}=await db.from('period_records').select('*').order('start_date',{ascending:true});
    if(error)throw error;
    records=(data||[]).map(r=>({...r,duration:r.duration||5}));
    const{data:ovulData,error:ovulError}=await db.from('ovulation_records').select('*').order('ovulation_date',{ascending:true});
    if(!ovulError)ovulRecords=(ovulData||[]);
    renderStatus();renderCalendar();
    // init tab indicator position
    setTimeout(()=>switchTab(0,false),50);
  }catch(e){
    document.getElementById('status-section').innerHTML=`<div class="loading-state" style="color:#e85d75">加载失败：${e.message}</div>`;
  }
}
init();
