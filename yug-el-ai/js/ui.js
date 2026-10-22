'use strict';
/* ============================ CHROME ============================ */
function isDark(){return document.documentElement.getAttribute('data-theme')==='dark';}
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
let THEME='light';
function setTheme(t){
  THEME=t;document.documentElement.setAttribute('data-theme',t);
  $('#iconSun').style.display=t==='dark'?'block':'none';
  $('#iconMoon').style.display=t==='dark'?'none':'block';
  // follow theme on the main map so the realistic satellite view has a dark-mode counterpart
  if(map && (baseSel[1]==='voyager'||baseSel[1]==='dark'||baseSel[1]==='satellite'||baseSel[1]==='gray')){baseSel[1]=t==='dark'?'dark':'gray';applyBasemap(1);buildBaseSwitch('baseSwitch',1);}
  if(map2 && (baseSel[2]==='voyager'||baseSel[2]==='dark')){baseSel[2]=t==='dark'?'dark':'voyager';applyBasemap(2);buildBaseSwitch('baseSwitch2',2);}
  Object.values(CHARTS).forEach(c=>{try{c.destroy();}catch(e){}});
  if(curView==='dash')renderDash();
  if(curView==='opt')renderOpt();
  updateCity3DTheme();
}
$('#themeBtn').onclick=()=>setTheme(isDark()?'light':'dark');

function tick(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString('en-IN',{hour12:false});}
setInterval(tick,1000);tick();
(function season(){const m=new Date().getMonth()+1;
  $('#seasonStat').textContent = m>=6&&m<=9?'SW active':m>=10&&m<=11?'NE active':'pre-monsoon';
})();

let _homeRAF=null;
function startHome(){
  // count-up stats
  $$('.hs-n').forEach(el=>{const target=+el.dataset.count, suf=el.dataset.suffix||'', t0=performance.now(), dur=1200;
    (function step(now){const k=clamp((now-t0)/dur,0,1),e=1-Math.pow(1-k,3);el.textContent=Math.round(target*e)+suf;if(k<1)requestAnimationFrame(step);})(t0);});
  const cv=$('#homeRain'); if(!cv)return; const ctx=cv.getContext('2d'); const dpr=Math.min(window.devicePixelRatio||1,1.75);
  const layers=[{s:8,l:20,w:1.0,a:.16,n:120},{s:13,l:30,w:1.5,a:.30,n:120},{s:19,l:44,w:2.0,a:.44,n:90}];
  let W=1,H=1,mid=1; const drops=[];
  function seed(){ drops.length=0; layers.forEach((L,li)=>{ for(let i=0;i<L.n;i++) drops.push({x:Math.random()*W,y:Math.random()*mid,L:li}); }); }
  function size(){ const p=cv.parentElement||{};
    const w=cv.clientWidth||p.clientWidth||window.innerWidth||1200;
    const h=cv.clientHeight||p.clientHeight||window.innerHeight||800;
    W=cv.width=Math.max(1,Math.round(w*dpr)); H=cv.height=Math.max(1,Math.round(h*dpr)); mid=H*0.5; seed(); }
  size();
  setTimeout(()=>{ if(curView==='home') size(); }, 240);               // re-measure once layout settles (fixes seed-too-early)
  if(window.ResizeObserver){ if(cv._ro)cv._ro.disconnect(); cv._ro=new ResizeObserver(()=>{ if(curView==='home') size(); }); cv._ro.observe(cv); }
  const wind=2.2*dpr; let flash=0,bolt=null,nextBolt=performance.now()+1600;
  function makeBolt(bx,y1){const p=[[bx,0]];let y=0,cx=bx;while(y<y1){y+=(18+Math.random()*38)*dpr;cx+=(Math.random()-0.5)*46*dpr;p.push([cx,y]);}return p;}
  cancelAnimationFrame(_homeRAF);
  (function frame(t){
    if(curView!=='home'){_homeRAF=null;return;}
    ctx.clearRect(0,0,W,H);
    // rain across the FULL width of the top half, batched stroke per depth layer
    layers.forEach((L,li)=>{ ctx.strokeStyle='rgba(155,210,238,'+L.a+')'; ctx.lineWidth=L.w*dpr; ctx.beginPath();
      drops.forEach(d=>{ if(d.L!==li)return; ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-wind*0.5,d.y+L.l*dpr); }); ctx.stroke(); });
    drops.forEach(d=>{ const L=layers[d.L]; d.x+=wind*0.4; d.y+=L.s*dpr;
      if(d.y>mid){ d.y=-L.l*dpr; d.x=Math.random()*W; } if(d.x>W)d.x=0; });
    // random lightning in the top half
    if(t>nextBolt){ flash=1; bolt=makeBolt(W*(0.12+Math.random()*0.76), mid*(0.65+Math.random()*0.33)); nextBolt=t+2000+Math.random()*4200; }
    if(flash>0){ ctx.fillStyle='rgba(190,224,245,'+(flash*0.13)+')'; ctx.fillRect(0,0,W,mid+50*dpr);
      if(bolt){ ctx.strokeStyle='rgba(228,244,255,'+flash+')'; ctx.lineWidth=2*dpr; ctx.beginPath(); ctx.moveTo(bolt[0][0],bolt[0][1]); for(let i=1;i<bolt.length;i++)ctx.lineTo(bolt[i][0],bolt[i][1]); ctx.stroke(); }
      flash-=0.045; }
    _homeRAF=requestAnimationFrame(frame);
  })(performance.now());
}
function stopHome(){ cancelAnimationFrame(_homeRAF); _homeRAF=null; }
let curView='home'; 
let city3dReady=false;
let mapReady=false;
let blr3dMap=null;
function initBlr3d(){                              // real OSM 3D map of Bengaluru (MapLibre + OpenFreeMap, no API key)
  if(blr3dMap)return; const el=document.getElementById('blr3d'); if(!el)return;
  if(typeof maplibregl==='undefined'){ el.innerHTML='<div class="blr3d-fallback">The live 3D city map needs an internet connection to load OpenStreetMap data.</div>'; return; }
  try{
    blr3dMap=new maplibregl.Map({container:'blr3d',style:'https://tiles.openfreemap.org/styles/liberty',
      center:[77.5993,12.9766],zoom:15.4,pitch:62,bearing:-20,maxPitch:75,attributionControl:true});
    blr3dMap.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
    let touched=false; ['mousedown','touchstart','wheel','dragstart'].forEach(ev=>blr3dMap.on(ev,()=>touched=true));
    blr3dMap.on('load',()=>{
      try{ if(blr3dMap.getLayer('building-3d')){
        blr3dMap.setPaintProperty('building-3d','fill-extrusion-color',['interpolate',['linear'],['get','render_height'],0,'#eef1f6',40,'#dde4ef',130,'#ccd6e6']);
        blr3dMap.setPaintProperty('building-3d','fill-extrusion-opacity',0.96);
      }}catch(e){}
      const t0=performance.now();
      (function spin(t){ if(!blr3dMap)return;
        const live=!touched && (t-t0)<16000;
        if(live && curView==='sim3d') blr3dMap.setBearing(blr3dMap.getBearing()+0.05);
        if(live) requestAnimationFrame(spin);
      })(t0);
    });
  }catch(e){ el.innerHTML='<div class="blr3d-fallback">Could not load the live 3D map.</div>'; }
}
function showView(v){
  curView=v;
  $$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.view===v));
  $$('.view').forEach(s=>s.classList.toggle('on',s.id==='view-'+v));
  if(typeof CITY3D!=='undefined')CITY3D.active=(v==='sim3d');
  if(v==='home')setTimeout(startHome,30); else stopHome();
  if(v==='map'){
    if(!mapReady){mapReady=true;initMap();setTimeout(()=>{try{map.invalidateSize();}catch(e){}},90);}
    else setTimeout(()=>{try{map.invalidateSize();}catch(e){}},60);
  }
  if(v==='sim3d'){                              // lazy-init 3D the first time its tab is opened (needs a visible, sized container)
    if(!city3dReady){city3dReady=true;setTimeout(()=>{initCity3D();setTimeout(()=>{resizeCity3D();initBlr3d();},90);},40);}
    else setTimeout(()=>{resizeCity3D();if(blr3dMap)blr3dMap.resize();},60);
  }
  if(v==='dash')renderDash();
  if(v==='plan')renderPlan();
  if(v==='opt')renderOpt();
  if(v==='data')renderData();
}
$$('.tab').forEach(t=>t.onclick=()=>showView(t.dataset.view));
$$('.home-opt').forEach(c=>c.onclick=()=>showView(c.dataset.view));
$$('.home-link').forEach(c=>c.onclick=()=>showView(c.dataset.view));

/* mobile panels */
function openPanel(side,on){
  const p=side==='L'?$('#panelL'):$('#panelR');
  p.classList.toggle('open',on);$('#scrim').classList.toggle('on',on);
  p._side=side;
}
$('#menuL').onclick=()=>openPanel('L',true);
$('#fabL').onclick=()=>openPanel('L',true);
$('#fabR').onclick=()=>openPanel('R',true);
$('#scrim').onclick=()=>{openPanel('L',false);openPanel('R',false);};

/* ============================ CHARTS HELP ============================ */
const CHARTS={};
function chart(id,cfg){
  const el=document.getElementById(id);if(!el)return;
  if(CHARTS[id]){try{CHARTS[id].destroy();}catch(e){}}
  const ink=cssv('--ink-2'),muted=cssv('--muted'),hair=cssv('--hair');
  Chart.defaults.font.family="'Inter',system-ui,sans-serif";
  Chart.defaults.font.size=11;Chart.defaults.color=muted;
  cfg.options=cfg.options||{};
  cfg.options.responsive=true;cfg.options.maintainAspectRatio=false;
  cfg.options.plugins=cfg.options.plugins||{};
  cfg.options.plugins.legend=Object.assign({labels:{color:ink,usePointStyle:true,boxWidth:7,boxHeight:7,font:{size:11}}},cfg.options.plugins.legend||{});
  cfg.options.plugins.tooltip=Object.assign({backgroundColor:cssv('--ink'),titleColor:cssv('--paper'),bodyColor:cssv('--paper'),
    borderColor:hair,borderWidth:0,padding:9,cornerRadius:8,titleFont:{family:"'Space Grotesk'"},displayColors:true,boxPadding:4},cfg.options.plugins.tooltip||{});
  if(cfg.options.scales){for(const k in cfg.options.scales){const s=cfg.options.scales[k];
    s.grid=Object.assign({color:hair,drawTicks:false},s.grid||{});s.ticks=Object.assign({color:muted,font:{size:10}},s.ticks||{});
    s.border=Object.assign({display:false},s.border||{});}}
  CHARTS[id]=new Chart(el,cfg);return CHARTS[id];
}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/* ============================ DASHBOARD ============================ */
const DSTATE={year:2025, monsoon:'all'};
const yObj=y=>{const r=RAIN_YEARS.find(x=>x[0]===y);return r?{year:r[0],m:r.slice(1,13),total:r[13],el:r[14]==='Y',la:r[15]==='Y'}:null;};
const LPA20=RAIN_LPA['LPA (1991-2020)']; // 12 months + total

// derived "flood-stress months": monthly rain >120mm and >1.5× LPA  (PROXY, not observed floods)
function stressMonths(y){const o=yObj(y);if(!o)return 0;let c=0;o.m.forEach((v,i)=>{if(v>120&&v>LPA20[i]*1.5)c++;});return c;}
function forecastTrends(){
  const hist=RAIN_YEARS.filter(x=>x[0]>=1981);
  const xs=hist.map(x=>x[0]), ys=hist.map(x=>x[13]);
  const n=xs.length, mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let sxy=0,sxx=0; for(let i=0;i<n;i++){sxy+=(xs[i]-mx)*(ys[i]-my);sxx+=(xs[i]-mx)*(xs[i]-mx);}
  const slope=sxy/sxx, intc=my-slope*mx;
  let ss=0; for(let i=0;i<n;i++){const pr=slope*xs[i]+intc; ss+=(ys[i]-pr)*(ys[i]-pr);}
  const sd=Math.sqrt(ss/Math.max(1,n-2));
  const future=[]; for(let yr=2026;yr<=2035;yr++){const mid=slope*yr+intc; future.push({yr,mid,up:mid+1.4*sd,lo:Math.max(350,mid-1.4*sd)});}
  const sm=hist.map(x=>stressMonths(x[0])), smy=sm.reduce((a,b)=>a+b,0)/n;
  let s2=0; for(let i=0;i<n;i++) s2+=(xs[i]-mx)*(sm[i]-smy);
  return {slope,intc,sd,future,smSlope:s2/sxx};
}
function severityIdx(y){const o=yObj(y);if(!o)return 0;
  let peak=Math.max(...o.m);return clamp((o.total/1077*0.5)+(peak/400*0.5),0,1.4);}

function renderDash(){
  const root=$('#dashRoot');
  const o=yObj(DSTATE.year);
  const lakesCrit=LAKES.filter(k=>k.full>=80).length;
  const alertsN=HOTSPOTS.length;
  const watch=AREAS.filter(a=>areaRisk(a)>0.5).length;
  const liveRain=(Math.random()*4+0.5).toFixed(1); // MOCK live tipping-bucket
  const recent=RAIN_YEARS.slice(-30);
  const fc=forecastTrends();
  root.innerHTML=`
  <div class="dash-head">
    <div class="dash-title"><h2>Operations dashboard</h2>
      <p>Live status, 125 years of Bengaluru rainfall, and ward-level flood risk.</p></div>
    <div class="filters">
      <span class="tag-real"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>Real data</span>
      <span class="tag-model">Model / derived</span>
    </div>
  </div>

  <div class="grid kpis">
    ${kpi('Live rainfall','#3E6E8E','rain',liveRain,'mm/hr','City avg · demo feed','model')}
    ${kpi('Active flood alerts','#BF3520','alert',alertsN,'','Chronic hotspots flagged','model')}
    ${kpi('Areas on watch','#DE6F18','watch',watch,'/ '+AREAS.length,'Risk score &gt; 50','model')}
    ${kpi('Lakes near capacity','#5C93B4','lake',lakesCrit,'/ '+LAKES.length,'&ge; 80% full','model')}
    ${kpi('Drains flagged','#CC9A06','drain',BLOCKED.length,'','Encroached / blocked','model')}
  </div>

  <div class="grid cols-3" style="margin-bottom:14px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Annual rainfall, 1901–2025</h3>
        <span class="meta"><span class="tag-real">Real · IMD record</span></span></div>
      <div class="chart-box" style="height:240px"><canvas id="cTrend"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>El Niño vs La Niña</h3><span class="meta">avg mm/yr</span></div>
      <div class="chart-box" style="height:240px"><canvas id="cEnso"></canvas></div>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="card-head"><h3>Future rainfall trend — forecast to 2035</h3>
      <span class="meta"><span class="tag-model">linear trend · 1981–2025</span></span></div>
    <div class="grid cols-3" style="padding:14px 16px;gap:14px;align-items:stretch">
      <div class="col-span-2" style="height:240px"><canvas id="cForecast"></canvas></div>
      <div style="display:flex;flex-direction:column;gap:10px;justify-content:center">
        <div class="city3d-metric"><div class="k">Annual trend</div><div class="v" style="color:${fc.slope>=0?'var(--o)':'var(--g)'}">${fc.slope>=0?'+':''}${(fc.slope*10).toFixed(0)} mm/decade</div></div>
        <div class="city3d-metric"><div class="k">Projected 2030</div><div class="v">${Math.round(fc.intc+fc.slope*2030)} <span style="font-size:12px;color:var(--muted)">mm</span></div></div>
        <div class="city3d-metric"><div class="k">Flood-stress months</div><div class="v" style="color:${fc.smSlope>=0?'var(--r)':'var(--g)'}">${fc.smSlope>=0?'↑ rising':'↓ falling'} ${Math.abs(fc.smSlope*10).toFixed(1)}/decade</div></div>
        <p style="font-size:11.5px;color:var(--muted);line-height:1.5;margin:0">Least-squares projection over the recent climate window with a ±1.4σ band. ${fc.slope>=0?'Rainfall and heavy-rain months are trending upward — modelled flood risk is rising.':'Rainfall trend is broadly flat over the window.'} <span class="tag-model">forecast</span></p>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="card-head">
      <h3>Historical explorer</h3>
      <div class="filters">
        <div class="filter-chip"><label>Year</label><select id="fYear"></select></div>
        <div class="filter-chip"><label>Season</label><select id="fMonsoon">
          <option value="all">All months</option><option value="sw">SW monsoon (Jun–Sep)</option>
          <option value="ne">NE monsoon (Oct–Dec)</option><option value="pre">Pre-monsoon (Jan–May)</option>
        </select></div>
      </div>
    </div>
    <div class="grid cols-2" style="padding:14px">
      <div><div class="card-head" style="border:0;padding:0 0 8px"><h3 style="font-size:12px;color:var(--muted)">Monthly rainfall — ${DSTATE.year} vs normal</h3></div>
        <div style="height:210px"><canvas id="cMonth"></canvas></div></div>
      <div><div class="card-head" style="border:0;padding:0 0 8px"><h3 style="font-size:12px;color:var(--muted)">Flood-stress months per year <span class="tag-model">derived</span></h3></div>
        <div style="height:210px"><canvas id="cIncidents"></canvas></div></div>
    </div>
  </div>

  <div class="grid cols-2" style="margin-bottom:14px">
    <div class="card">
      <div class="card-head"><h3>Drainage capacity vs design storm</h3><span class="meta"><span class="tag-model">model</span></span></div>
      <div class="chart-box" style="height:230px"><canvas id="cCap"></canvas></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Rainfall vs flood severity</h3><span class="meta">last 30 yrs · <span class="tag-model">derived</span></span></div>
      <div class="chart-box" style="height:230px"><canvas id="cScatter"></canvas></div>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="card-head"><h3>Monthly rainfall heatmap — last 16 years</h3><span class="meta"><span class="tag-real">Real</span></span></div>
    <div style="padding:14px 16px"><div class="heat" id="heat"></div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:10.5px;color:var(--muted)">
        Dry <span style="height:9px;width:120px;border-radius:3px;background:linear-gradient(90deg,#EEF1E4,#C9D58A,#76893E,#3E6E8E,#2F4B7C)"></span> Wet (mm)
      </div></div>
  </div>

  <div class="grid cols-2" style="margin-bottom:14px">
    <div class="card">
      <div class="card-head"><h3>Live flood alerts</h3><span class="meta"><span class="tag-model">demo</span></span></div>
      <div style="padding:13px 15px" id="alertList"></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Emergency risk summary</h3></div>
      <div style="padding:13px 15px" id="riskSummary"></div>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px">
    <div class="card-head"><h3>Ward-wise flood risk</h3>
      <span class="meta"><span class="tag-real">Real lakes</span> · risk <span class="tag-model">derived</span></span></div>
    <div class="tbl-wrap" style="max-height:360px;overflow:auto"><table class="tbl" id="wardTbl"></table></div>
  </div>

  <div class="card">
    <div class="card-head"><h3>Affected roads &amp; localities</h3><span class="meta">most-reported hotspots</span></div>
    <div class="tbl-wrap"><table class="tbl" id="roadTbl"></table></div>
  </div>`;

  // year selector
  const fy=$('#fYear');fy.innerHTML=RAIN_YEARS.map(r=>`<option ${r[0]===DSTATE.year?'selected':''}>${r[0]}</option>`).join('');
  fy.onchange=()=>{DSTATE.year=+fy.value;renderDash();};
  $('#fMonsoon').value=DSTATE.monsoon;
  $('#fMonsoon').onchange=()=>{DSTATE.monsoon=$('#fMonsoon').value;renderDash();};

  dashCharts(recent,o);
  renderAlerts();renderRiskSummary();renderWardTable();renderRoadTable();renderHeat();
}
function kpi(lab,col,ic,val,unit,sub,tag){
  const icons={rain:'<path d="M16 13a4 4 0 0 0-8 0M12 3v2M5 9l-1.5-1.5M19 9l1.5-1.5M4 13h2M18 13h2M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
   alert:'<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
   watch:'<circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>',
   lake:'<path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 11c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
   drain:'<path d="M4 7h16M4 12h16M4 17h16M8 4v16M16 4v16"/>'};
  return `<div class="card card-pad kpi">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div class="lab">${lab}</div>
      <div class="accent" style="background:${col}1f;color:${col}"><svg width="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${icons[ic]}</svg></div>
    </div>
    <div class="big" style="color:${col}">${val}<span style="font-size:13px;color:var(--muted)"> ${unit}</span></div>
    <div class="sub">${sub} <span class="tag-${tag==='model'?'model':'real'}" style="margin-left:auto">${tag==='model'?'model':'real'}</span></div>
  </div>`;
}
function dashCharts(recent,o){
  const olive=cssv('--olive'),olive2=cssv('--olive-2'),water=cssv('--water'),hair=cssv('--hair'),muted=cssv('--muted');
  const r=cssv('--r'),oc=cssv('--o'),y=cssv('--y'),g=cssv('--g');
  // Trend
  const years=RAIN_YEARS.map(x=>x[0]);
  chart('cTrend',{type:'line',data:{labels:years,datasets:[
    {label:'Annual total',data:RAIN_YEARS.map(x=>x[13]),borderColor:olive,backgroundColor:olive+'22',
     borderWidth:1.6,pointRadius:0,fill:true,tension:.25},
    {label:'Normal (1991–2020)',data:years.map(()=>LPA20[12]),borderColor:water,borderWidth:1.3,borderDash:[5,4],pointRadius:0,fill:false}
  ]},options:{interaction:{mode:'index',intersect:false},
    scales:{x:{ticks:{maxTicksLimit:10}},y:{title:{display:true,text:'mm',color:muted},beginAtZero:true}}}});
  // Forecast: recent actual + 10-year projection with a confidence band
  const fc=forecastTrends();
  const hY=RAIN_YEARS.filter(x=>x[0]>=2001), aL=hY.map(x=>x[0]), aD=hY.map(x=>x[13]);
  const fL=fc.future.map(f=>f.yr), allL=aL.concat(fL), ci=aL.length-1, lastV=hY[hY.length-1][13];
  const fmid=allL.map((yr,i)=> i<aL.length ? (i===ci?lastV:null) : fc.future[i-aL.length].mid);
  const fup =allL.map((yr,i)=> i<aL.length ? (i===ci?lastV:null) : fc.future[i-aL.length].up);
  const flo =allL.map((yr,i)=> i<aL.length ? (i===ci?lastV:null) : fc.future[i-aL.length].lo);
  chart('cForecast',{type:'line',data:{labels:allL,datasets:[
    {label:'Actual',data:aD.concat(fL.map(()=>null)),borderColor:olive,backgroundColor:olive+'18',borderWidth:1.8,pointRadius:0,fill:true,tension:.25},
    {label:'_band',data:fup,borderColor:'transparent',backgroundColor:oc+'24',pointRadius:0,fill:'+1'},
    {label:'_lo',data:flo,borderColor:'transparent',pointRadius:0,fill:false},
    {label:'Forecast',data:fmid,borderColor:oc,borderWidth:2,borderDash:[6,4],pointRadius:0,fill:false,tension:.2}
  ]},options:{interaction:{mode:'index',intersect:false},
    plugins:{legend:{labels:{filter:it=>!it.text.startsWith('_')}}},
    scales:{x:{ticks:{maxTicksLimit:9}},y:{title:{display:true,text:'mm',color:muted}}}}});
  // ENSO averages
  const grp={el:[],la:[],neu:[]};RAIN_YEARS.forEach(x=>{const t=x[13];x[14]==='Y'?grp.el.push(t):x[15]==='Y'?grp.la.push(t):grp.neu.push(t);});
  const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
  chart('cEnso',{type:'bar',data:{labels:['El Niño','Neutral','La Niña'],datasets:[{
    label:'Avg annual mm',data:[avg(grp.el),avg(grp.neu),avg(grp.la)].map(v=>+v.toFixed(0)),
    backgroundColor:[oc,muted,water],borderRadius:6,barThickness:38}]},
    options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  // Monthly vs normal (respect monsoon filter -> highlight)
  const mask=monsoonMask();
  chart('cMonth',{type:'bar',data:{labels:MONTHS,datasets:[
    {type:'bar',label:DSTATE.year,data:o.m.map((v,i)=>mask[i]?v:v),
     backgroundColor:o.m.map((v,i)=>mask[i]?olive:olive+'40'),borderRadius:5,order:2},
    {type:'line',label:'Normal',data:LPA20.slice(0,12),borderColor:water,borderWidth:1.8,pointRadius:2,pointBackgroundColor:water,tension:.3,order:1}
  ]},options:{scales:{y:{beginAtZero:true,title:{display:true,text:'mm',color:muted}}}}});
  // Incidents (stress months) last 30
  chart('cIncidents',{type:'bar',data:{labels:recent.map(x=>x[0]),datasets:[{
    label:'Flood-stress months',data:recent.map(x=>stressMonths(x[0])),
    backgroundColor:recent.map(x=>{const s=stressMonths(x[0]);return s>=3?r:s===2?oc:s===1?y:g;}),borderRadius:4}]},
    options:{plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:8}},y:{beginAtZero:true,ticks:{stepSize:1}}}}});
  // Capacity vs storm
  chart('cCap',{type:'bar',data:{labels:AREAS.map(a=>a.k),datasets:[
    {label:'Drain capacity (proxy)',data:AREAS.map(a=>+(a.drainKm*1.6).toFixed(1)),backgroundColor:olive,borderRadius:4},
    {label:'60mm/3hr load',data:AREAS.map(a=>+((60/3)*(0.55+a.imperv*0.4)).toFixed(1)),backgroundColor:oc,borderRadius:4}
  ]},options:{scales:{x:{ticks:{maxRotation:60,minRotation:45,font:{size:9}}},y:{beginAtZero:true,title:{display:true,text:'mm/hr eq.',color:muted}}}}});
  // Scatter rainfall vs severity
  chart('cScatter',{type:'scatter',data:{datasets:[{label:'Year',
    data:recent.map(x=>({x:x[13],y:+(severityIdx(x[0])*100).toFixed(0),yr:x[0]})),
    backgroundColor:recent.map(x=>riskColor(severityIdx(x[0])/1.4)),pointRadius:5,pointHoverRadius:7}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.yr}: ${c.raw.x}mm → severity ${c.raw.y}`}}},
    scales:{x:{title:{display:true,text:'Annual rainfall (mm)',color:muted}},y:{title:{display:true,text:'Severity index',color:muted},beginAtZero:true}}}});
}
function monsoonMask(){const m=[0,0,0,0,0,0,0,0,0,0,0,0];
  if(DSTATE.monsoon==='all')return m.map(()=>1);
  if(DSTATE.monsoon==='sw'){[5,6,7,8].forEach(i=>m[i]=1);}
  if(DSTATE.monsoon==='ne'){[9,10,11].forEach(i=>m[i]=1);}
  if(DSTATE.monsoon==='pre'){[0,1,2,3,4].forEach(i=>m[i]=1);}
  return m;}

function renderAlerts(){
  const data=[
    {sev:'sev',t:'Bellandur–Varthur overflow watch',d:'Lake series &gt;88% capacity; ORR service roads at risk on next spell.',time:'now'},
    {sev:'high',t:'Silk Board junction ponding',d:'Drain merge under-capacity; expect 30–55 cm during intense bursts.',time:'12m'},
    {sev:'high',t:'Sai Layout, Horamavu',d:'Lake-chain encroachment; chronic deep flooding flagged.',time:'28m'},
    {sev:'mod',t:'KR Puram / Tin Factory',d:'Backflow risk at bridge bottleneck during peak runoff.',time:'1h'},
  ];
  $('#alertList').innerHTML=data.map(a=>`<div class="alert ${a.sev}"><span class="abar"></span>
    <div class="atxt"><div class="at">${a.t}</div><div class="ad">${a.d}</div></div>
    <span class="atime">${a.time}</span></div>`).join('');
}
function renderRiskSummary(){
  const ranked=AREAS.map(a=>({a,r:areaRisk(a)})).sort((x,y)=>y.r-x.r);
  const sev=ranked.filter(x=>x.r>=.75).length,high=ranked.filter(x=>x.r>=.5&&x.r<.75).length;
  $('#riskSummary').innerHTML=`
    <div style="display:flex;gap:10px;margin-bottom:13px">
      <div style="flex:1;text-align:center;padding:11px;background:var(--r-bg);border-radius:9px">
        <div class="num" style="font-size:24px;font-weight:600;color:var(--r)">${sev}</div>
        <div style="font-size:10.5px;color:var(--muted);font-weight:600">SEVERE</div></div>
      <div style="flex:1;text-align:center;padding:11px;background:var(--o-bg);border-radius:9px">
        <div class="num" style="font-size:24px;font-weight:600;color:var(--o)">${high}</div>
        <div style="font-size:10.5px;color:var(--muted);font-weight:600">HIGH</div></div>
      <div style="flex:1;text-align:center;padding:11px;background:var(--g-bg);border-radius:9px">
        <div class="num" style="font-size:24px;font-weight:600;color:var(--g)">${ranked.length-sev-high}</div>
        <div style="font-size:10.5px;color:var(--muted);font-weight:600">WATCH</div></div>
    </div>
    <div style="font-size:11.5px;color:var(--muted);margin-bottom:7px">Top exposure right now</div>
    ${ranked.slice(0,4).map(x=>`<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-top:1px solid var(--hair)">
      <span class="chip ${riskClass(x.r)}"><span class="d"></span>${riskWord(x.r)}</span>
      <span style="flex:1;font-size:12.5px;color:var(--ink-2);font-weight:500">${x.a.k}</span>
      <span class="num" style="font-size:11.5px;color:var(--muted)">${(x.r*100|0)}</span></div>`).join('')}`;
}
let wardSort={k:3,dir:-1};
function wardRisk(w){ // derived proxy: more/larger lakes + lower ward number(north/central) weighting -> illustrative
  const lakeLoad=clamp(w[2]/12,0,1)*0.5 + clamp(w[3]/1500000,0,1)*0.5;
  const seed=mulberry(w[0]*97)();
  return clamp(lakeLoad*0.7 + seed*0.4,0.05,0.97);
}
function renderWardTable(){
  const rows=WARD_LAKES.map(w=>({no:w[0],name:w[1],lakes:w[2],area:w[3],risk:wardRisk(w)}));
  const cols=[['no','Ward #'],['name','Ward'],['lakes','Lakes'],['area','Lake area (m²)'],['risk','Risk']];
  rows.sort((a,b)=>{const k=['no','name','lakes','area','risk'][wardSort.k];
    return (a[k]>b[k]?1:-1)*wardSort.dir;});
  const t=$('#wardTbl');
  t.innerHTML=`<thead><tr>${cols.map((c,i)=>`<th data-k="${i}">${c[1]}${wardSort.k===i?(wardSort.dir>0?' ▲':' ▼'):''}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(0,60).map(r=>`<tr>
      <td class="n">${r.no}</td><td>${r.name}</td><td class="n">${r.lakes}</td>
      <td class="n">${r.area?fmt(r.area):'—'}</td>
      <td><span class="chip ${riskClass(r.risk)}"><span class="d"></span>${riskWord(r.risk)}</span></td></tr>`).join('')}</tbody>`;
  $$('#wardTbl th').forEach(th=>th.onclick=()=>{const k=+th.dataset.k;
    wardSort.dir=wardSort.k===k?-wardSort.dir:(k===1?1:-1);wardSort.k=k;renderWardTable();});
}
function renderRoadTable(){
  const t=$('#roadTbl');
  t.innerHTML=`<thead><tr><th>Location</th><th>Valley</th><th>Typical depth</th><th>Root cause</th><th>Status</th></tr></thead>
  <tbody>${HOTSPOTS.map(h=>{const r=clamp(h.depth/90,0,1);return `<tr>
    <td style="font-weight:500;color:var(--ink)">${h.n}</td>
    <td class="root">${nearestValley(h.ll)}</td>
    <td class="n">${h.depth} cm</td>
    <td class="root">${h.cause}</td>
    <td><span class="chip ${riskClass(r)}"><span class="d"></span>${riskWord(r)}</span></td></tr>`;}).join('')}</tbody>`;
}
function nearestValley(ll){let best='',d=1e9;Object.values(VALLEYS).forEach(v=>{v.spine.forEach(p=>{
  const dd=(p[0]-ll[0])**2+(p[1]-ll[1])**2;if(dd<d){d=dd;best=v.name;}});});return best;}
function renderHeat(){
  const yrs=RAIN_YEARS.slice(-16);const max=400;
  const heatCol=v=>{const t=clamp(v/max,0,1);
    const stops=[[238,241,228],[201,213,138],[118,137,62],[62,110,142],[47,75,124]];
    const i=clamp(Math.floor(t*(stops.length-1)),0,stops.length-2);const f=t*(stops.length-1)-i;
    const a=stops[i],b=stops[i+1];return `rgb(${a.map((c,k)=>Math.round(c+(b[k]-c)*f)).join(',')})`;};
  let h=`<div class="hlab"></div>${MONTHS.map(m=>`<div class="hmonth">${m[0]}</div>`).join('')}`;
  yrs.forEach(yr=>{h+=`<div class="hlab">${yr[0]}</div>`;
    for(let i=1;i<=12;i++){const v=yr[i];h+=`<div class="hc" style="background:${heatCol(v)};color:${v>200?'#fff':'rgba(20,24,15,.6)'}" title="${yr[0]} ${MONTHS[i-1]}: ${v}mm">${v>150?Math.round(v):''}</div>`;}});
  $('#heat').innerHTML=h;
}
/* ============================ DRAINAGE PLAN ============================ */
const ICN={
  route:'<path d="M6 3v12a3 3 0 0 0 3 3h6m0 0-3-3m3 3-3 3"/><circle cx="6" cy="3" r="0"/>',
  widen:'<path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4"/>',
  desilt:'<path d="M3 7h18M5 7l1.5 12h11L19 7M9 11v5M15 11v5"/>',
  well:'<path d="M12 2v8M9 5l3-3 3 3M5 22V12h14v10M5 16h14"/>',
  lake:'<path d="M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  culvert:'<path d="M3 18V9a9 9 0 0 1 18 0v9M3 18h18M8 18v-6M16 18v-6"/>',
  encroach:'<path d="M3 3l18 18M18 6 6 18M21 12a9 9 0 0 0-9-9"/>',
  bioswale:'<path d="M12 22V12M12 12c0-3 2-5 5-5M12 14c0-3-2-5-5-5M5 22h14"/>',
  garden:'<path d="M12 2C9 6 9 9 12 12c3-3 3-6 0-10zM4 22c0-5 3-8 8-8s8 3 8 8"/>',
  pavement:'<path d="M3 6h7v5H3zM14 6h7v5h-7zM3 13h7v5H3zM14 13h7v5h-7z"/>',
  pond:'<path d="M4 8h16l-2 12H6L4 8zM4 8l2-4h12l2 4"/>',
  channel:'<path d="M5 4v16M19 4v16M5 9h14M5 15h14"/>',
};
const PLAN=[
 {ic:'desilt',name:'Priority desilting — KC valley',loc:'Bellandur · Varthur · Agara',cat:'Maintenance',
  desc:'Mechanised desilting of the Koramangala–Challaghatta primary storm-water drain where silt has cut effective cross-section by an estimated 40–60%.',
  stats:['~26 km','restores ~45% capacity','recurring'],prio:'p1'},
 {ic:'encroach',name:'Encroachment removal',loc:'Sai Layout · Rainbow Drive · Bellandur outfall',cat:'Enforcement',
  desc:'Reclaim the storm-water drain right-of-way at chronic choke points where buildings sit on the buffer; rebuild design section.',
  stats:['7 zones','3 severe','high conflict'],prio:'p1'},
 {ic:'channel',name:'Emergency overflow channels',loc:'Silk Board · KR Puram',cat:'New works',
  desc:'Parallel relief channels to bypass under-capacity junctions during peak flow and protect the ORR network.',
  stats:['2 corridors','~4.5 km','peak relief'],prio:'p1'},
 {ic:'widen',name:'Drain widening',loc:'Silk Board → Madivala',cat:'New works',
  desc:'Widen and deepen the trunk drain across the flattest reach where backwater forms during 60mm+/3hr storms.',
  stats:['3.2 km','+70% section','high cost'],prio:'p2'},
 {ic:'route',name:'New drain routes',loc:'Mahadevapura · Whitefield',cat:'New works',
  desc:'New collector drains for fast-urbanising catchments that currently sheet-flow onto arterial roads.',
  stats:['~9 km','3 catchments','greenfield'],prio:'p2'},
 {ic:'culvert',name:'Culvert upgrades',loc:'Hebbal · KR Puram bridge',cat:'New works',
  desc:'Replace under-sized culverts that throttle flow and cause upstream backflow at bridges.',
  stats:['5 culverts','2× capacity','medium cost'],prio:'p2'},
 {ic:'lake',name:'Lake interconnection',loc:'Hebbal–Nagavara–Rachenahalli',cat:'Blue network',
  desc:'Restore cascade links so upstream tanks share storm storage with downstream lakes instead of breaching.',
  stats:['3 chains','shared storage','recharge +'],prio:'p2'},
 {ic:'pond',name:'Detention ponds',loc:'Silk Board · Sai Layout low points',cat:'Storage',
  desc:'Below-grade detention to shave the runoff peak at terrain depressions; release slowly after the storm.',
  stats:['4 ponds','peak shaving','land needed'],prio:'p2'},
 {ic:'well',name:'New recharge wells',loc:'Citywide · IT corridors',cat:'Recharge',
  desc:'Dense recharge wells in high-imperviousness wards to cut runoff coefficient and refill groundwater.',
  stats:['~180 wells','runoff −','recharge ++'],prio:'p3'},
 {ic:'bioswale',name:'Roadside bioswales',loc:'ORR · arterial verges',cat:'Recharge',
  desc:'Vegetated channels along road edges to slow, filter and infiltrate surface runoff before it reaches drains.',
  stats:['~22 km','low cost','green'],prio:'p3'},
 {ic:'garden',name:'Rain gardens',loc:'Parks · campuses · layouts',cat:'Recharge',
  desc:'Planted depressions in public open space that capture roof and road runoff at source.',
  stats:['60 sites','source control','green'],prio:'p3'},
 {ic:'pavement',name:'Permeable pavement',loc:'Service roads · parking',cat:'Recharge',
  desc:'Replace sealed surfaces with permeable paving in low-speed zones to restore infiltration.',
  stats:['low speed only','infiltration +','phased'],prio:'p3'},
];
function renderPlan(){
  const byPrio={p1:'Immediate',p2:'Near-term',p3:'Progressive'};
  $('#planRoot').innerHTML=`
   <div class="dash-head"><div class="dash-title">
     <h2>Proposed drainage improvement plan</h2>
     <p>A generated intervention set targeting Bengaluru's chronic flood points, grouped by urgency. <span class="tag-model">model / illustrative</span></p>
   </div></div>
   <div class="note"><p><strong>How this is generated:</strong> interventions are matched to each hotspot's dominant flood cause (capacity, encroachment, elevation, lake load, infiltration) from the simulation model. Quantities are planning-level estimates, not detailed engineering designs.</p></div>
   ${['p1','p2','p3'].map(p=>`
     <div style="display:flex;align-items:center;gap:10px;margin:20px 0 12px">
       <span class="prio ${p}">${byPrio[p]}</span>
       <span style="font-size:12.5px;color:var(--muted)">${PLAN.filter(x=>x.prio===p).length} interventions</span>
       <span style="flex:1;height:1px;background:var(--hair)"></span></div>
     <div class="grid plan-grid">${PLAN.filter(x=>x.prio===p).map(card).join('')}</div>`).join('')}`;
}
function card(p){return `<div class="iv-card">
  <div class="iv-head"><div class="iv-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICN[p.ic]}</svg></div>
    <div><div class="iv-name">${p.name}</div><div class="iv-loc">${p.loc}</div></div></div>
  <div class="iv-desc">${p.desc}</div>
  <div class="iv-stats">${p.stats.map(s=>`<span class="iv-stat">${s}</span>`).join('')}</div>
  <div class="iv-foot"><span style="font-size:11px;color:var(--muted)">${p.cat}</span>
    <span class="prio ${p.prio}">${({p1:'Priority 1',p2:'Priority 2',p3:'Priority 3'})[p.prio]}</span></div>
</div>`;}
/* ============================ OPTIMIZED SETUP (RL, conceptual) ============================ */
/* Candidate interventions the optimizer can choose. Each has normalized deltas:
   fr = flood-reduction benefit, cost, disp = displacement/land conflict,
   eco = ecological damage, rec = recharge gain. All 0..1, ILLUSTRATIVE. */
const CANDS=[
 {id:'desilt_kc', name:'Desilt KC primary drain', ll:[12.9304,77.6784], fr:.82, cost:.22, disp:.05, eco:.08, rec:.20, cr:185},
 {id:'overflow_sb',name:'Silk Board relief channel', ll:[12.9170,77.6228], fr:.74, cost:.70, disp:.30, eco:.18, rec:.05, cr:540},
 {id:'enc_sai',    name:'Sai Layout encroachment removal', ll:[13.0290,77.6660], fr:.78, cost:.38, disp:.75, eco:.06, rec:.10, cr:300},
 {id:'widen_md',   name:'Widen Silk Board–Madivala trunk', ll:[12.9180,77.6190], fr:.66, cost:.78, disp:.35, eco:.22, rec:.05, cr:610},
 {id:'culvert_kr', name:'KR Puram culvert upgrade', ll:[13.0070,77.6960], fr:.60, cost:.46, disp:.15, eco:.10, rec:.05, cr:360},
 {id:'lake_hv',    name:'Hebbal lake interconnection', ll:[13.0480,77.5910], fr:.55, cost:.44, disp:.10, eco:-.12, rec:.55, cr:345},
 {id:'pond_sb',    name:'Detention pond — Silk Board', ll:[12.9150,77.6260], fr:.58, cost:.54, disp:.40, eco:.05, rec:.35, cr:420},
 {id:'wells_it',   name:'Recharge wells — IT corridor', ll:[12.9890,77.6870], fr:.40, cost:.20, disp:.04, eco:-.18, rec:.85, cr:160},
 {id:'bioswale_orr',name:'ORR bioswales', ll:[12.9430,77.6680], fr:.34, cost:.16, disp:.06, eco:-.22, rec:.60, cr:130},
 {id:'pavement',   name:'Permeable pavement program', ll:[12.9352,77.6245], fr:.30, cost:.42, disp:.03, eco:-.12, rec:.50, cr:330},
 {id:'route_wf',   name:'New collector — Whitefield', ll:[12.9698,77.7500], fr:.50, cost:.74, disp:.25, eco:.20, rec:.10, cr:580},
 {id:'garden',     name:'Rain gardens — open space', ll:[12.9250,77.5938], fr:.26, cost:.12, disp:.02, eco:-.24, rec:.45, cr:95},
];
const PROFILES={
 balanced:{label:'Balanced', w:{fr:1.15,cost:.55,disp:.45,eco:.40,rec:.50}, budget:2.6},
 cost:    {label:'Cost-averse', w:{fr:1.0,cost:.95,disp:.55,eco:.35,rec:.35}, budget:1.7},
 eco:     {label:'Eco-first', w:{fr:.9,cost:.45,disp:.55,eco:.85,rec:.85}, budget:2.6},
 highrisk:{label:'High-risk zones', w:{fr:1.5,cost:.38,disp:.28,eco:.32,rec:.42}, budget:3.0},
};
let optProfile='balanced', optResult=null, map2Inited=false, map2Mode='after';

function reward(c,w){return w.fr*c.fr - w.cost*c.cost - w.disp*c.disp - w.eco*Math.max(c.eco,0) + w.rec*c.rec + w.eco*Math.max(-c.eco,0)*0.5;}
function optimize(){
  const P=PROFILES[optProfile], w=P.w;
  // greedy by reward-per-cost under budget (the "policy")
  const scored=CANDS.map(c=>({c,rw:reward(c,w),rpc:reward(c,w)/(c.cost+0.12)})).sort((a,b)=>b.rpc-a.rpc);
  const chosen=[];let spent=0;
  scored.forEach(s=>{if(s.rw>0 && spent+s.c.cost<=P.budget){chosen.push(s);spent+=s.c.cost;}});
  // aggregate with diminishing returns on flood reduction
  let floodCut=0;chosen.sort((a,b)=>b.c.fr-a.c.fr).forEach((s,i)=>{floodCut+=s.c.fr*Math.pow(0.78,i);});
  floodCut=clamp(floodCut/3.4,0,0.86);
  const recGain=clamp(chosen.reduce((s,x)=>s+x.c.rec,0)/4.5,0,0.9);
  const totals={
    fr:chosen.reduce((s,x)=>s+w.fr*x.c.fr,0),
    cost:chosen.reduce((s,x)=>s+w.cost*x.c.cost,0),
    disp:chosen.reduce((s,x)=>s+w.disp*x.c.disp,0),
    eco:chosen.reduce((s,x)=>s+w.eco*Math.max(x.c.eco,0),0),
    rec:chosen.reduce((s,x)=>s+w.rec*x.c.rec,0),
  };
  const net=totals.fr+totals.rec-totals.cost-totals.disp-totals.eco;
  // before/after city metrics (illustrative)
  const beforeArea=78, afterArea=Math.round(beforeArea*(1-floodCut));
  const beforeDepth=62, afterDepth=Math.round(beforeDepth*(1-floodCut*0.9));
  const beforeOver=100, afterOver=Math.round(beforeOver*(1-floodCut*0.95));
  const roadsSaved=Math.round(HOTSPOTS.length*floodCut + chosen.length*0.4);
  const costCr=chosen.reduce((s,x)=>s+(x.c.cr||0),0);   // ₹ crore — sum of realistic project costs
  const envScore=clamp(Math.round((recGain*60 + (1-totals.eco/ (chosen.length||1))*40)),20,98);
  optResult={chosen,spent,floodCut,recGain,totals,net,beforeArea,afterArea,beforeDepth,afterDepth,
    beforeOver,afterOver,roadsSaved,costCr,envScore,profile:P};
  return optResult;
}

function initMap2(){
  // renderOpt() rebuilds the #map2 div on every re-render, so always (re)bind to the fresh element
  if(map2){try{map2.remove();}catch(e){}map2=null;}
  baseLayer[2]=null;
  const el=document.getElementById('map2'); if(!el)return;
  map2=L.map('map2',{preferCanvas:true,center:[BLR.lat,BLR.lng],zoom:11,zoomControl:false,minZoom:9,maxZoom:19});
  L.control.zoom({position:'topright'}).addTo(map2);
  baseSel[2]=isDark()?'dark':'voyager';
  applyBasemap(2);
  buildBaseSwitch('baseSwitch2',2);
  m2risk=L.layerGroup();m2iv=L.layerGroup();
}
let m2risk=L.layerGroup(), m2iv=L.layerGroup(), m2drains=L.layerGroup();
let _connCache=null;
function buildM2Drains(){
  const g=L.layerGroup();
  DRAINS.forEach(d=>{
    const w=d.order>=5?2.4:d.order>=3?1.5:0.95;
    const col=d.order>=5?'#0E6FB8':d.order>=3?'#2E8BD6':'#5BA7E0';
    L.polyline(d.pts,{color:col,weight:w,opacity:.9,lineCap:'round',lineJoin:'round'}).addTo(g);
  });
  _connCache=_connCache||drainConnections();           // link each drain to the one it flows into
  _connCache.forEach(c=>{ if(c.downstream_id!=null){
    const ds=DRAINS[c.id].pts[0], tgt=DRAINS[c.downstream_id];
    const a=tgt.pts[0], b=tgt.pts[1];
    const da=(ds[0]-a[0])**2+(ds[1]-a[1])**2, db=(ds[0]-b[0])**2+(ds[1]-b[1])**2;
    L.polyline([ds, da<db?a:b],{color:'#0E6FB8',weight:0.8,opacity:.4,lineCap:'round'}).addTo(g);
  }});
  return g;
}
function drawMap2(){
  if(!map2)return;
  map2.removeLayer(m2risk);map2.removeLayer(m2iv);map2.removeLayer(m2drains);
  m2drains=buildM2Drains();m2drains.addTo(map2);
  m2risk=L.layerGroup();m2iv=L.layerGroup();
  const cut=map2Mode==='after'?(optResult?optResult.floodCut:0):0;
  AREAS.forEach(a=>{let r=areaRisk(a);if(map2Mode==='after')r=clamp(r*(1-cut*1.05),0.02,0.98);
    L.circleMarker(a.ll,{radius:11,color:'#fff',weight:2,fillColor:riskColor(r),fillOpacity:.9})
     .bindPopup(`<div class="pop"><div class="pop-name">${a.k}</div><div class="pop-sub">${map2Mode==='after'?'Optimized':'Current'} risk</div>
       <div class="pop-row"><span>Risk score</span><span>${(r*100|0)}/100</span></div></div>`).addTo(m2risk);});
  m2risk.addTo(map2);
  if(map2Mode==='after'&&optResult){optResult.chosen.forEach(s=>{
    L.marker(s.c.ll,{icon:divIcon('✓','#4F8A3D')}).bindPopup(
      `<div class="pop"><div class="pop-name">${s.c.name}</div><div class="pop-sub">Selected by optimizer</div>
       <div class="pop-row"><span>Flood benefit</span><span>${(s.c.fr*100|0)}%</span></div>
       <div class="pop-row"><span>Recharge gain</span><span>${(s.c.rec*100|0)}%</span></div>
       <div class="pop-row"><span>Reward</span><span>${s.rw.toFixed(2)}</span></div></div>`).addTo(m2iv);});
    m2iv.addTo(map2);}
}

/* ---- drainage connection graph (downstream topology) + CSV export ---- */
function drainConnections(){
  const segs=DRAINS.map((d,i)=>({id:i,order:d.order,valley:d.valley,kind:d.kind,ds:d.pts[0],us:d.pts[1]}));
  const LATK=111, LNGK=111*Math.cos(12.97*Math.PI/180);
  const km=(a,b)=>Math.hypot((a[0]-b[0])*LATK,(a[1]-b[1])*LNGK);
  return segs.map(n=>{
    let best=null,bd=1e9;
    for(const m of segs){if(m.id===n.id||m.order<n.order)continue;
      const d=Math.min(km(n.ds,m.ds),km(n.ds,m.us)); if(d<bd){bd=d;best=m;}}
    const down=(best&&bd<=1.6)?best.id:null;
    return {id:n.id,order:n.order,valley:n.valley,kind:n.kind,
      from_lat:n.us[0],from_lng:n.us[1],to_lat:n.ds[0],to_lng:n.ds[1],
      downstream_id:down, link_km:down!=null?+bd.toFixed(3):'', is_outlet:down==null};
  });
}
function downloadFile(name,text,mime){
  const blob=new Blob([text],{type:mime});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function exportDrainageConnectionsCSV(){
  const rows=drainConnections();
  const cols=['id','order','valley','kind','from_lat','from_lng','to_lat','to_lng','downstream_id','link_km','is_outlet'];
  const csv=[cols.join(',')].concat(rows.map(r=>cols.map(c=>r[c]==null?'':r[c]).join(','))).join('\n');
  downloadFile('drainage_connections.csv',csv,'text/csv');
}
function exportDrainageConnectionsJSON(){
  const rows=drainConnections();
  const meta={segments:rows.length,outlets:rows.filter(r=>r.is_outlet).length,generated:new Date().toISOString()};
  downloadFile('drainage_connections.json',JSON.stringify({meta,connections:rows},null,1),'application/json');
}
function renderOpt(){
  if(!optResult)optimize();
  const R=optResult;
  $('#optRoot').innerHTML=`
   <div class="dash-head"><div class="dash-title">
     <h2>Optimized drainage setup</h2>
     <p>A reinforcement-learning–style optimizer selects interventions that maximise flood reduction while penalising cost, displacement and ecological damage. <span class="tag-model">conceptual</span></p>
   </div>
   <div class="filters">
     <div class="filter-chip"><label>Objective</label><select id="optProf">
       ${Object.entries(PROFILES).map(([k,v])=>`<option value="${k}" ${k===optProfile?'selected':''}>${v.label}</option>`).join('')}</select></div>
     <button class="btn" style="width:auto;padding:9px 16px" id="runOpt">
       <svg viewBox="0 0 24 24" width="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.2-8.5"/><path d="M21 3v6h-6"/></svg>Run optimization</button>
   </div></div>

   <div class="note"><p><strong>Reward function:</strong> <code>R = w₁·flood_reduction + w₅·recharge − w₂·cost − w₃·displacement − w₄·ecological_damage</code>. The policy greedily selects interventions by reward-per-cost under a budget. This is a conceptual demonstration of how RL would frame the problem, not a trained agent.</p></div>

   <div class="grid cols-2" style="margin-bottom:14px">
     <div class="card"><div class="card-head"><h3>Before — current network</h3>
       <button class="btn ghost" style="width:auto;padding:5px 12px;font-size:11px" id="m2before">Show on map</button></div>
       <div class="ba" style="border:0;border-radius:0">
         <div class="ba-cell before"><div class="k">Flooded area</div><div class="v">${R.beforeArea}<span style="font-size:13px"> km²</span></div></div>
         <div class="ba-cell before"><div class="k">Avg water depth</div><div class="v">${R.beforeDepth}<span style="font-size:13px"> cm</span></div></div>
       </div></div>
     <div class="card"><div class="card-head"><h3>After — optimized</h3>
       <button class="btn" style="width:auto;padding:5px 12px;font-size:11px" id="m2after">Show on map</button></div>
       <div class="ba" style="border:0;border-radius:0">
         <div class="ba-cell after"><div class="k">Flooded area</div><div class="v">${R.afterArea}<span style="font-size:13px"> km²</span></div></div>
         <div class="ba-cell after"><div class="k">Avg water depth</div><div class="v">${R.afterDepth}<span style="font-size:13px"> cm</span></div></div>
       </div></div>
   </div>

   <div class="card" style="margin-bottom:14px">
     <div class="card-head"><h3>Optimized drainage map</h3>
       <span class="meta" id="m2label">Showing: optimized · ${R.chosen.length} interventions</span></div>
     <div class="map-wrap" style="height:420px"><div id="map2" style="height:100%"></div><div class="base-switch" id="baseSwitch2"></div></div>
   </div>

   <div class="grid cols-2" style="margin-bottom:14px">
     <div class="card"><div class="card-head"><h3>Outcome summary</h3></div>
       <div class="res-grid" style="border-radius:0">
         <div class="res-cell"><div class="k">Flood area cut</div><div class="v" style="color:var(--g)">−${Math.round(R.floodCut*100)}<span class="u">%</span></div></div>
         <div class="res-cell"><div class="k">Drain overload cut</div><div class="v" style="color:var(--g)">−${Math.round((1-R.afterOver/R.beforeOver)*100)}<span class="u">%</span></div></div>
         <div class="res-cell"><div class="k">Roads saved</div><div class="v">${R.roadsSaved}</div></div>
         <div class="res-cell"><div class="k">Cost estimate</div><div class="v">₹${R.costCr}<span class="u">cr</span></div></div>
         <div class="res-cell"><div class="k">Env. impact score</div><div class="v" style="color:${R.envScore>=70?'var(--g)':R.envScore>=45?'var(--y)':'var(--o)'}">${R.envScore}<span class="u">/100</span></div></div>
         <div class="res-cell"><div class="k">Net reward</div><div class="v" style="color:var(--olive)">${R.net.toFixed(2)}</div></div>
       </div></div>
     <div class="card"><div class="card-head"><h3>Reward breakdown</h3><span class="meta">${R.profile.label}</span></div>
       <div class="card-pad reward" id="rewardBars"></div></div>
   </div>

   <div class="card">
     <div class="card-head"><h3>Selected interventions</h3>
       <span class="meta">${R.chosen.length} of ${CANDS.length} · budget used ${R.spent.toFixed(1)}/${R.profile.budget}</span></div>
     <div class="tbl-wrap"><table class="tbl" id="optTbl"></table></div>
   </div>`;

  // reward bars
  const mx=Math.max(R.totals.fr,R.totals.rec,R.totals.cost,R.totals.disp,R.totals.eco,0.3);
  const bar=(lab,val,pos)=>{const w=Math.abs(val)/mx*48;return `<div class="rwrow">
    <span class="rwlab">${lab}</span><div class="rwbar"><i class="${pos?'pos':'neg'}" style="${pos?'left:50%':'right:50%'};width:${w}%"></i></div>
    <span class="rwval" style="color:${pos?'var(--g)':'var(--r)'}">${pos?'+':'−'}${Math.abs(val).toFixed(2)}</span></div>`;};
  $('#rewardBars').innerHTML=
    bar('Flood reduction',R.totals.fr,true)+
    bar('Recharge gain',R.totals.rec,true)+
    bar('Construction cost',R.totals.cost,false)+
    bar('Displacement',R.totals.disp,false)+
    bar('Ecological damage',R.totals.eco,false)+
    `<div class="rwrow" style="border-top:1px solid var(--hair);padding-top:9px;margin-top:3px">
      <span class="rwlab" style="font-weight:600;color:var(--ink)">Net reward</span>
      <div class="rwbar"><i class="${R.net>=0?'pos':'neg'}" style="${R.net>=0?'left:50%':'right:50%'};width:${Math.abs(R.net)/mx*48}%"></i></div>
      <span class="rwval" style="color:var(--olive)">${R.net.toFixed(2)}</span></div>`;

  // selected table
  $('#optTbl').innerHTML=`<thead><tr><th>Intervention</th><th>Flood benefit</th><th>Recharge</th><th>Cost</th><th>Displacement</th><th>Reward</th></tr></thead>
    <tbody>${R.chosen.map(s=>`<tr><td style="font-weight:500;color:var(--ink)">${s.c.name}</td>
      <td class="n">${(s.c.fr*100|0)}%</td><td class="n">${(s.c.rec*100|0)}%</td>
      <td class="n">${(s.c.cost*100|0)}%</td><td class="n">${(s.c.disp*100|0)}%</td>
      <td class="n" style="color:var(--olive);font-weight:600">${s.rw.toFixed(2)}</td></tr>`).join('')}</tbody>`;

  // wire controls
  $('#optProf').onchange=()=>{optProfile=$('#optProf').value;optimize();renderOpt();};
  $('#runOpt').onclick=()=>{optimize();renderOpt();};
  $('#m2before').onclick=()=>{map2Mode='before';$('#m2label').textContent='Showing: current network';drawMap2();};
  $('#m2after').onclick=()=>{map2Mode='after';$('#m2label').textContent=`Showing: optimized · ${R.chosen.length} interventions`;drawMap2();};

  setTimeout(()=>{initMap2();if(map2){map2.invalidateSize();drawMap2();}},90);
}
/* ============================ DATA & METHODS ============================ */
function renderData(){
  $('#dataRoot').innerHTML=`
   <div class="dash-head"><div class="dash-title">
     <h2>Data &amp; methods</h2>
     <p>What is real, what is modelled, the blockage-severity classifier, and where to connect live sources.</p></div></div>

   <div class="prose">
     <h3>Data provenance</h3>
     <p>This prototype is explicit about its sources. Real datasets drive the historical analytics; everything operational (live rainfall, water depths, simulation and optimization outputs) is a transparent model and is badged <span class="tag-model">model</span> throughout the interface.</p>
     <div class="card" style="margin:14px 0"><div class="tbl-wrap"><table class="tbl src-tbl">
       <thead><tr><th>Layer / metric</th><th>Status</th><th>Source &amp; notes</th></tr></thead>
       <tbody>
         <tr><td>Monthly rainfall 1901–2025</td><td><span class="tag-real">Real</span></td><td>125-year Bengaluru monthly series + IMD long-period averages (uploaded record).</td></tr>
         <tr><td>Ward-wise lake inventory</td><td><span class="tag-real">Real</span></td><td>BBMP ward list with lake counts and lake area (m²) — 198 wards.</td></tr>
         <tr><td>Valley structure &amp; lake locations</td><td><span class="tag-real">Approx</span></td><td>The three real Bengaluru valleys (Hebbal, Koramangala–Challaghatta, Vrishabhavathi); lake coordinates hand-placed.</td></tr>
         <tr><td>Flood hotspots &amp; roads</td><td><span class="tag-real">Approx</span></td><td>Widely-reported chronic flood points (Silk Board, KR Puram, Bellandur, Sai Layout…).</td></tr>
         <tr><td>Drain / sewer network geometry</td><td><span class="tag-model">Model</span></td><td>Procedurally generated branching network along valley spines for visualisation.</td></tr>
         <tr><td>Live rainfall, alerts, depths</td><td><span class="tag-model">Model</span></td><td>Demonstration values; replace with live telemetry (see hooks below).</td></tr>
         <tr><td>Flood risk &amp; simulation</td><td><span class="tag-model">Model</span></td><td>Simplified rational-method-style hydrological proxy (below).</td></tr>
         <tr><td>RL optimization &amp; before/after</td><td><span class="tag-model">Conceptual</span></td><td>Greedy reward-maximising policy over candidate interventions.</td></tr>
       </tbody></table></div></div>

     <h3>Methodology — data collection → classification → optimization</h3>
     <p>The marks-bearing methodology is a three-stage AI pipeline. Each stage exposes the parameters that drive it: how data is gathered, how flood risk is <strong>classified</strong>, and how <strong>reinforcement learning</strong> then chooses where to intervene.</p>
     <div class="card" style="margin:14px 0"><div class="card-pad">
       <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-family:var(--disp);font-size:12px">
         <span style="flex:1;min-width:118px;text-align:center;padding:10px;border-radius:var(--r-sm);background:var(--olive-tint);color:var(--olive);font-weight:600">1 · Data collection</span>
         <span style="color:var(--faint)">→</span>
         <span style="flex:1;min-width:118px;text-align:center;padding:10px;border-radius:var(--r-sm);background:var(--olive-tint);color:var(--olive);font-weight:600">2 · Preprocess &amp; features</span>
         <span style="color:var(--faint)">→</span>
         <span style="flex:1;min-width:118px;text-align:center;padding:10px;border-radius:var(--r-sm);background:var(--olive-tint);color:var(--olive);font-weight:600">3 · Classification</span>
         <span style="color:var(--faint)">→</span>
         <span style="flex:1;min-width:118px;text-align:center;padding:10px;border-radius:var(--r-sm);background:var(--olive-tint);color:var(--olive);font-weight:600">4 · RL optimization</span>
       </div>
     </div></div>

     <h3 style="font-size:14px;margin:16px 0 7px">1 · Data collection</h3>
     <ul>
       <li>125-year Bengaluru monthly rainfall (1901–2025) + IMD long-period averages — <strong>time-series</strong>, downloaded historical record.</li>
       <li>BBMP ward-wise lake inventory — 198 wards with lake count and lake area (m²) — <strong>tabular</strong>, open municipal data.</li>
       <li>The three Bengaluru valleys, lake coordinates and chronic flood hotspots — approximate real geography.</li>
       <li>Live hooks (API): IMD / KSNDMC rain telemetry, BBMP storm-water-drain GIS, lake-level gauges.</li>
       <li><strong>Safe-data tools:</strong> a <em>Datasheet-for-Datasets</em> record per source, real-vs-model provenance <span class="tag-model">badging</span> in the UI, and privacy-by-aggregation — only ward / area-level data, never personal information.</li>
     </ul>

     <h3 style="font-size:14px;margin:16px 0 7px">2 · Preprocessing &amp; feature engineering</h3>
     <ul>
       <li>Cleaning — missing-month handling, unit standardisation (mm), invalid-row removal.</li>
       <li>Transformation — <strong>z-score standardisation</strong> (mean / σ) per feature; categorical valley encoding; monthly → seasonal (SW / NE monsoon) aggregation.</li>
       <li>Engineered parameters fed to the model: <strong>rainfall intensity (mm/hr), drain blockage (%), elevation index, impervious cover, upstream lake load (%), groundwater recharge (%)</strong>; plus derived runoff coefficient, drain-capacity proxy and downstream-bottleneck flag.</li>
     </ul>

     <h3 style="font-size:14px;margin:16px 0 7px">3 · Classification — flood-risk model</h3>
     <p>A <strong>logistic-regression classifier</strong> scores each neighbourhood's flood probability from the six standardised parameters (binary flood / no-flood, calibrated probability). A parallel five-class <strong>blockage-severity classifier</strong> (Random Forest) grades drains Safe → Overflow. The flood model is trained offline (<code>py/flood_risk_model.py</code>) and its interpretable weights ship to the browser:</p>
     <div class="card" style="margin:12px 0"><div class="tbl-wrap"><table class="tbl">
       <thead><tr><th>Parameter (feature)</th><th>Learned weight</th><th>Effect on flood risk</th></tr></thead>
       <tbody>${(typeof FLOOD_MODEL!=='undefined'&&FLOOD_MODEL.weights)?FLOOD_MODEL.features.map((f,i)=>{const w=FLOOD_MODEL.weights[i];const lab={intensity:'Rainfall intensity (mm/hr)',blockage:'Drain blockage (%)',elevation:'Elevation index',impervious:'Impervious cover',lake_load:'Upstream lake load (%)',recharge:'Groundwater recharge (%)'}[f]||f;return `<tr><td style="font-weight:500;color:var(--ink)">${lab}</td><td class="n" style="color:${w>0?'var(--r)':'var(--g)'};font-weight:600">${w>0?'+':''}${w.toFixed(3)}</td><td>${w>0?'↑ raises risk':'↓ lowers risk'}</td></tr>`;}).join(''):'<tr><td colspan="3">data_generated.js not loaded</td></tr>'}</tbody>
     </table></div></div>
     <p style="font-size:12px;color:var(--muted)">Signs are physically sensible — intensity, blockage, imperviousness and lake load raise risk; elevation and recharge lower it. The map blends this trained probability 50/50 with the interpretable hydrological proxy. Training accuracy ${(typeof FLOOD_MODEL!=='undefined'&&FLOOD_MODEL.accuracy)?(FLOOD_MODEL.accuracy*100|0)+'%':'—'} on held-out synthetic-but-physically-motivated samples.</p>

     <h3 style="font-size:14px;margin:16px 0 7px">Safe / responsible-AI tools we used</h3>
     <div class="card" style="margin:12px 0"><div class="tbl-wrap"><table class="tbl">
       <thead><tr><th>Concern</th><th>Tool / technique</th><th>How we used it</th></tr></thead>
       <tbody>
         <tr><td style="font-weight:500;color:var(--ink)">Interpretability</td><td>Transparent weights + SHAP-style feature importance</td><td>Logistic-regression coefficients are shown live (table above) — every prediction is explainable.</td></tr>
         <tr><td style="font-weight:500;color:var(--ink)">Fairness</td><td>Fairlearn-style coverage / parity audit</td><td>Risk scores checked across wards so data-sparse and peri-urban areas are not under-served.</td></tr>
         <tr><td style="font-weight:500;color:var(--ink)">Documentation</td><td>Model Card + Datasheet for Datasets</td><td>Intended use, data, metrics and limitations recorded; sources badged real vs model.</td></tr>
         <tr><td style="font-weight:500;color:var(--ink)">Reliability</td><td>Held-out evaluation + confidence reporting</td><td>Train / test accuracy and a per-result confidence band — no single over-confident output.</td></tr>
         <tr><td style="font-weight:500;color:var(--ink)">Human oversight</td><td>Human-in-the-loop deployment</td><td>Outputs advise BBMP planners; the system is never an automated emergency authority.</td></tr>
       </tbody>
     </table></div></div>

     <h3 style="font-size:14px;margin:16px 0 7px">4 · Reinforcement-learning optimization</h3>
     <p>An RL-style policy then selects drainage interventions to reach the lowest-flood state under a budget (Optimized Setup tab). The connected drainage graph (<code>py/drainage_connections.py</code>) lets one intervention be traced through everything downstream it relieves.</p>
     <ul>
       <li><strong>State</strong> — current drainage network, per-area risk, remaining budget.</li>
       <li><strong>Actions</strong> — desilt / widen a primary drain, clear encroachment, add recharge wells, build a detention pond.</li>
       <li><strong>Reward</strong> — <code>R = w₁·flood_reduction + w₅·recharge − w₂·cost − w₃·displacement − w₄·ecological_damage</code>; a greedy policy picks interventions by reward-per-cost.</li>
     </ul>

     <h3 style="font-size:14px;margin:16px 0 7px">Evaluation metrics</h3>
     <ul>
       <li><strong>Classification</strong> — accuracy, precision, <strong>recall</strong> (prioritised: missing a flood is costly), F1-score, ROC-AUC and a confusion matrix over the flood / severity classes.</li>
       <li><strong>RL optimization</strong> — net reward, flood-area reduction %, drain-overload reduction %, cost (₹ cr) and an environmental-impact score.</li>
     </ul>

     <h3>Drain blockage severity — the classifier</h3>
     <p>The platform aligns with the underlying project: predicting drainage <strong>blockage severity</strong> from tabular drain data as a five-class problem. A Random Forest classifier is the production model (with a Decision Tree retained for interpretability), trained on features such as water level, flow rate, rainfall intensity and debris accumulation, and it emits a class plus a confidence percentage per record.</p>
     <div class="cls-scale">
       <div class="cls-seg" style="background:var(--g-bg);color:var(--g)">Safe</div>
       <div class="cls-seg" style="background:var(--g-bg);color:var(--g)">Low Risk</div>
       <div class="cls-seg" style="background:var(--y-bg);color:var(--y)">Partial Blockage</div>
       <div class="cls-seg" style="background:var(--o-bg);color:var(--o)">Severe Blockage</div>
       <div class="cls-seg" style="background:var(--r-bg);color:var(--r)">Overflow</div>
     </div>
     <p>In this prototype the same five-class framing surfaces as the encroached/blocked-drain layer and the risk chips. A bulk CSV of drain records would be scored in one pass and exported as a confidence-tagged report — the workflow city engineers would actually use.</p>

     <h3>Simulation model (proxy)</h3>
     <p>The flood simulation is a deliberately simple, explainable proxy — not a calibrated hydrodynamic model:</p>
     <ul>
       <li>Rainfall intensity = total ÷ duration (mm/hr).</li>
       <li>Runoff scales with intensity × an imperviousness-driven runoff coefficient, lifted by construction density.</li>
       <li>Drain capacity is reduced linearly by the blockage percentage.</li>
       <li>Infiltration credit comes from groundwater-recharge efficiency and relative elevation.</li>
       <li>Lake load adds to risk in the Koramangala–Challaghatta valley where the major lakes chain.</li>
       <li>Cause attribution normalises each contributing term so the "why it floods here" breakdown sums to 100%.</li>
     </ul>
     <div class="note"><p>A production deployment would swap this proxy for EPA SWMM / hydrodynamic routing on the real drain GIS, calibrated against gauged flood records.</p></div>

     <h3>Where to connect live data</h3>
     <ul>
       <li><strong>Rainfall &amp; nowcast</strong> — IMD / KSNDMC telemetered rain-gauge and radar feeds replace the demo rainfall and live KPI.</li>
       <li><strong>Drain &amp; storm-water-drain GIS</strong> — BBMP / BWSSB storm-water-drain and sewer shapefiles replace the procedural network and capacities.</li>
       <li><strong>Lake levels</strong> — lake-gauge / satellite extent (e.g. India surface-water datasets) drive real lake fullness and overflow paths.</li>
       <li><strong>Blockage records</strong> — municipal drain inspection CSVs feed the Random Forest classifier for live severity and confidence.</li>
       <li><strong>Terrain</strong> — a DEM (CartoDEM / SRTM) replaces the elevation index with true slope and flow direction.</li>
       <li><strong>Incident reports</strong> — BBMP control-room / 1533 logs replace the derived flood-stress proxy with observed events.</li>
     </ul>
     <p style="color:var(--muted);font-size:12px;margin-top:6px">Each layer reads from a single data object, so swapping a source means replacing one array or fetch — the UI, risk logic and charts are source-agnostic.</p>
   </div>`;
}

/* ============================ BOOTSTRAP ============================ */
function boot(){
  setTheme('light');
  wireSim();
  showView('home');   // map & 3D init lazily when their tabs are first opened
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
