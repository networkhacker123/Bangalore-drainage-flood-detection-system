'use strict';
/* ============================ MAP ENGINE ============================ */
let map, map2;
/* ---- keyless basemaps (no API token required) ----
   voyager/positron/dark : © OpenStreetMap © CARTO
   osm                    : © OpenStreetMap contributors
   satellite / terrain    : Esri (World Imagery / World Topo) — free tile services
   A labels overlay is layered on satellite so place names stay readable.       */
const C_ATTR='&copy; OpenStreetMap &copy; CARTO';
const OSM_ATTR='&copy; OpenStreetMap contributors';
const ESRI_IMG_ATTR='Imagery &copy; Esri, Maxar, Earthstar Geographics';
const ESRI_TOPO_ATTR='&copy; Esri — World Topographic Map';
function tl(url,opt){return L.tileLayer(url,Object.assign({maxZoom:19,detectRetina:true},opt));}
const BASEMAPS={
  voyager:  {label:'Streets',    dark:false, make:()=>tl('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{attribution:C_ATTR,subdomains:'abcd'})},
  gray:     {label:'Gray',       dark:false, make:()=>tl('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:C_ATTR,subdomains:'abcd'})},
  osm:      {label:'OSM detail', dark:false, make:()=>tl('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:OSM_ATTR,maxZoom:19})},
  satellite:{label:'Satellite',  dark:true,  make:()=>L.layerGroup([
                 tl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:ESRI_IMG_ATTR,maxZoom:19}),
                 tl('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',{attribution:'',subdomains:'abcd',maxZoom:19})])},
  terrain:  {label:'Terrain',    dark:false, make:()=>tl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{attribution:ESRI_TOPO_ATTR,maxZoom:19})},
  dark:     {label:'Dark',       dark:true,  make:()=>tl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:C_ATTR,subdomains:'abcd'})},
};
const baseKeys=Object.keys(BASEMAPS);
let baseSel={1:'voyager',2:'voyager'};      // chosen key per map (1=main, 2=optimized)
let baseLayer={1:null,2:null};
function applyBasemap(which){
  const m=which===1?map:map2; if(!m)return;
  if(baseLayer[which]){m.removeLayer(baseLayer[which]);}
  baseLayer[which]=BASEMAPS[baseSel[which]].make().addTo(m);
  baseLayer[which].bringToBack&&baseLayer[which].bringToBack();
}
const Lgroups = {}; // id -> Leaflet layer group
let simState = null; // last simulation result

function riskColor(r){return r>=0.6?'#BF3520':r>=0.3?'#DE6F18':'#4F8A3D';}
function floodColor(r){return r>=0.6?'#BF3520':r>=0.3?'#DE6F18':'#4F8A3D';}
function riskClass(r){return r>=0.75?'sev':r>=0.5?'high':r>=0.28?'mod':'safe';}
function riskWord(r){return r>=0.75?'Severe':r>=0.5?'High':r>=0.28?'Moderate':'Low';}

/* Trained logistic-regression flood probability (from py/flood_risk_model.py).
   Returns null if the generated model isn't loaded. */
function modelFloodProb(a, S){
  if(typeof FLOOD_MODEL==='undefined' || !FLOOD_MODEL.weights) return null;
  const lakeLoad = (a.valley==="KC"? S.lake : S.lake*0.6);
  const vals=[S.intensity, S.blk, a.elev, a.imperv, lakeLoad, S.rec];
  let z=FLOOD_MODEL.bias;
  for(let i=0;i<vals.length;i++) z += FLOOD_MODEL.weights[i]*(vals[i]-FLOOD_MODEL.mean[i])/FLOOD_MODEL.std[i];
  return 1/(1+Math.exp(-z));
}

/* baseline risk for an area given current sim (or defaults).
   Blends the interpretable hydrological heuristic with the trained model. */
function areaRisk(a, S){
  S = S || {intensity:6, blk:35, lake:70, con:3, rec:40};
  const cap = (a.drainKm*1.6) * (1-S.blk/100);          // mm/hr-equivalent capacity proxy
  const runoff = S.intensity * (0.55 + a.imperv*0.4) * (1 + (S.con-2)*0.05);
  const infil = (S.rec/100)*1.4 + a.elev*1.3;            // absorption credit
  const lakeLoad = (a.valley==="KC"?0.8:0.5) * (S.lake/100);
  let r = (runoff - cap*0.5 - infil + lakeLoad*2.0) / 9;
  r += (1-a.elev)*0.12 + (a.hot?0.06:0);
  r = clamp(r,0.02,0.98);
  const mp = modelFloodProb(a, S);
  if(mp!=null) r = clamp(0.5*r + 0.5*mp, 0.02, 0.98);     // smart blend
  return r;
}

function mkLakes(){const g=L.layerGroup();LAKES.forEach(k=>{
  const c=L.circle(k.ll,{radius:k.r,color:'#0E83C8',weight:1.4,fillColor:'#4CAFE8',fillOpacity:.46});
  c.bindPopup(lakePopup(k));g.addLayer(c);});return g;}
function ordWeight(o){return o>=7?2.6:o>=6?2.1:o>=5?1.7:o>=4?1.15:o>=3?0.85:o>=2?0.6:0.45;}
function addDrainLine(g,d,primary){
  const w=ordWeight(d.order), col=primary?'#0E6FB8':d.order>=3?'#2E8BD6':d.order>=2?'#5BA7E0':'#8BC3EA';
  L.polyline(d.pts,{color:'#FFFFFF',weight:w+1.4,opacity:primary?.6:.32,lineCap:'round',lineJoin:'round',smoothFactor:2.2}).addTo(g);
  L.polyline(d.pts,{color:col,weight:w,opacity:primary?.97:.85,lineCap:'round',lineJoin:'round',smoothFactor:2.2}).addTo(g);
  if(primary)L.polyline(d.pts,{color:'#CDE8FB',weight:0.7,opacity:.5,dashArray:'1 13',lineCap:'round',smoothFactor:2.2}).addTo(g);
}
function mkRaja(){const g=L.layerGroup();DRAINS.filter(d=>d.order>=5).forEach(d=>addDrainLine(g,d,true));return g;}
function mkDrains(){const g=L.layerGroup();DRAINS.filter(d=>d.order<5).forEach(d=>addDrainLine(g,d,false));return g;}
function mkSewers(){const g=L.layerGroup();DRAINS.filter((d,i)=>d.order===3&&i%2===0).forEach(d=>{
  L.polyline(d.pts,{color:'#5E7892',weight:1.5,opacity:.72,dashArray:'3 5',lineCap:'round'}).addTo(g);});return g;}
function mkOverflow(){const g=L.layerGroup();LAKES.filter(k=>k.full>=80).forEach(k=>{
  const v=VALLEYS[k.valley];const near=v.spine.reduce((p,c)=>{const d=(c[0]-k.ll[0])**2+(c[1]-k.ll[1])**2;return d<p.d?{d,c}:p;},{d:1e9}).c;
  L.polyline([k.ll,near],{color:'#BF3520',weight:2.6,opacity:.85,dashArray:'2 6'}).addTo(g);
  L.circleMarker(near,{radius:4,color:'#BF3520',fillColor:'#BF3520',fillOpacity:.9,weight:0}).addTo(g);});return g;}
function mkLow(){const g=L.layerGroup();LOWLYING.forEach(p=>{
  L.polygon(p,{color:'#7A6A2F',weight:1,fillColor:'#C9B45E',fillOpacity:.28,dashArray:'3 3'}).addTo(g);});return g;}
let topRenderer=null, riskRenderer=null; // canvas panes above the drains so roads/markers stay visible
function rOpt(extra){return Object.assign({pane:'topPane',renderer:topRenderer},extra);}
function mkArterials(){const g=L.layerGroup();ROADS.forEach(rd=>{
  // casing + fill for a clean road look
  L.polyline(rd.path,rOpt({color:'#ffffff',weight:rd.hwy?6:4.5,opacity:.65,lineCap:'round',lineJoin:'round'})).addTo(g);
  L.polyline(rd.path,rOpt({color:rd.hwy?'#1f1f1f':'#3c3c3c',weight:rd.hwy?3.0:2.1,opacity:.92,lineCap:'round',lineJoin:'round'})).addTo(g)
   .bindPopup(`<div class="pop"><div class="pop-name">${rd.n}</div><div class="pop-sub">${rd.hwy?'Highway / major arterial':'Arterial road'}${rd.flood?' · flood-prone':''}</div></div>`);
});return g;}
function mkMetro(){const g=L.layerGroup();METRO.forEach(m=>{
  L.polyline(m.path,rOpt({color:m.col,weight:3.2,opacity:.92,dashArray:'1 7',lineCap:'round'})).addTo(g)
   .bindPopup(`<div class="pop"><div class="pop-name">Namma Metro — ${m.n}</div><div class="pop-sub">Rapid transit</div></div>`);
});return g;}
function mkRoads(){ // flood-prone road stretches (highlight real arterials + hotspots)
  const g=L.layerGroup();
  ROADS.filter(rd=>rd.flood).forEach(rd=>{
    L.polyline(rd.path,rOpt({color:'#DE6F18',weight:rd.hwy?7:5.5,opacity:.55,lineCap:'round',lineJoin:'round'})).addTo(g);});
  HOTSPOTS.forEach(h=>{
    L.circleMarker(h.ll,{pane:'topPane',renderer:topRenderer,radius:6,color:'#fff',weight:2,fillColor:'#DE6F18',fillOpacity:.95}).addTo(g).bindPopup(
     `<div class="pop"><div class="pop-name">${h.n}</div><div class="pop-sub">Flood-prone road point</div>
      <div class="pop-row"><span>Typical depth (severe)</span><span>${h.depth} cm</span></div>
      <div class="pop-row"><span>Primary cause</span><span style="font-size:11px">${h.cause}</span></div></div>`);});
  return g;}
function mkUnderpass(){const g=L.layerGroup();UNDERPASSES.forEach(u=>{
  L.marker(u.ll,{icon:divIcon('U','#3E6E8E')}).addTo(g).bindPopup(
   `<div class="pop"><div class="pop-name">${u.n}</div><div class="pop-sub">Underpass — monitor during heavy rain</div></div>`);});return g;}
function mkRecharge(){const g=L.layerGroup();RECHARGE.forEach(p=>{
  L.circleMarker(p,{radius:5,color:'#4F8A3D',fillColor:'#6FB14E',fillOpacity:.8,weight:1}).addTo(g)
   .bindPopup('<div class="pop"><div class="pop-name">Recharge well</div><div class="pop-sub">Groundwater recharge point (illustrative)</div></div>');});return g;}
function mkCulverts(){const g=L.layerGroup();HOTSPOTS.filter(h=>/culvert|bridge|bottleneck/i.test(h.cause)).concat(
   [{n:"Bellandur outfall culvert",ll:[12.9304,77.6784],cause:"Major outfall"}]).forEach(h=>{
  L.marker(h.ll,{icon:divIcon('▿','#DE6F18')}).addTo(g).bindPopup(
   `<div class="pop"><div class="pop-name">${h.n}</div><div class="pop-sub">Culvert / hydraulic bottleneck</div></div>`);});return g;}
function mkBlocked(){const g=L.layerGroup();BLOCKED.forEach(b=>{
  const col=b.sev==='Severe'?'#BF3520':'#DE6F18';
  L.circleMarker(b.ll,{radius:7,color:col,fillColor:col,fillOpacity:.55,weight:2}).addTo(g).bindPopup(
   `<div class="pop"><div class="pop-name">${b.n}</div><div class="pop-sub">Encroached / blocked drain — ${b.sev}</div></div>`);});return g;}
function mkBuilt(){const g=L.layerGroup();BUILTUP.forEach(b=>{
  L.circle(b.c,{radius:b.r*111000,color:'#6E7363',weight:1,fillColor:'#9AA08B',fillOpacity:.18}).addTo(g)
   .bindPopup(`<div class="pop"><div class="pop-name">${b.n}</div><div class="pop-sub">High-density built-up area</div></div>`);});return g;}
function mkConstruction(){const g=L.layerGroup();CONSTRUCTION.forEach(b=>{
  L.circle(b.c,{radius:b.r*111000,color:'#8B6E3A',weight:1.2,fillColor:'#C29A52',fillOpacity:.22,dashArray:'5 4'}).addTo(g)
   .bindPopup(`<div class="pop"><div class="pop-name">${b.n}</div><div class="pop-sub">Construction-heavy zone — reduced infiltration</div></div>`);});return g;}
function mkElev(){const g=L.layerGroup();AREAS.forEach(a=>{
  const e=a.elev; const col=e>0.55?'#8FA255':e>0.4?'#C9B45E':e>0.25?'#D89A5A':'#C57A57';
  L.circle(a.ll,{radius:900,color:col,weight:0,fillColor:col,fillOpacity:.30}).addTo(g)
   .bindPopup(`<div class="pop"><div class="pop-name">${a.k}</div><div class="pop-sub">Relative elevation index</div>
   <div class="pop-row"><span>Elevation index</span><span>${(e*100|0)}/100</span></div>
   <div class="pop-row"><span>Slope</span><span>${e>0.5?'Adequate':e>0.3?'Gentle':'Flat / depression'}</span></div></div>`);});return g;}
let riskLayerRefs=[];
/* Flood-risk markers drawn as animated concentric WAVE RINGS (water ripples)
   instead of plain circles — colour + ripple speed scale with risk. */
function waveIcon(r){
  const col=floodColor(r);
  const k=clamp(r,0,1);
  const dur=(3.1 - k*1.7).toFixed(2);     // higher risk ripples faster
  const reach=(34 + k*40)|0;              // and spreads wider
  const core=(8 + k*6)|0;
  const html=`<div class="wave-marker" style="--wm:${col};--wmd:${dur}s;--wmx:${reach}px">
      <span class="wm-ring"></span><span class="wm-ring r2"></span><span class="wm-ring r3"></span>
      <span class="wm-core" style="width:${core}px;height:${core}px;margin:-${core/2}px 0 0 -${core/2}px"></span>
    </div>`;
  return L.divIcon({className:'wave-div',html,iconSize:[0,0],iconAnchor:[0,0]});
}
function mkRisk(){const g=L.layerGroup();riskLayerRefs=[];AREAS.forEach(a=>{
  const r=areaRisk(a,simState);
  const m=L.marker(a.ll,{icon:waveIcon(r),riseOnHover:true,keyboard:false});
  m.bindPopup(areaPopup(a, simState));m._area=a;m._risk=r;riskLayerRefs.push(m);g.addLayer(m);});return g;}

function divIcon(txt,col){return L.divIcon({className:'',html:
  `<div style="width:22px;height:22px;border-radius:6px;background:${col};color:#fff;display:grid;place-items:center;font:600 11px var(--mono);box-shadow:0 1px 4px rgba(0,0,0,.3);border:1.5px solid #fff">${txt}</div>`,
  iconSize:[22,22],iconAnchor:[11,11]});}

/* ---- FLOOD HEATMAP + connected flood zones ----
   Heat glows around each affected area and propagates downstream toward the
   valley outlet, so flooding reads as connected along the drainage system.
   Driven by the simulation state (fake data for demonstration).             */
const VALLEY_OUTLET={HV:[13.105,77.605], KC:[12.880,77.790], VV:[12.840,77.470]};
let heatRef=null, zoneRef=L.layerGroup(), floodGroupRef=null;
/* cached city-wide grid so the heatmap covers ALL of Bengaluru, not just hotspots */
let _cityGrid=null;
function cityGrid(){
  if(_cityGrid)return _cityGrid;
  const pts=[], lat0=12.83,lat1=13.13,lng0=77.47,lng1=77.77,N=22;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const la=lat0+(lat1-lat0)*i/(N-1), ln=lng0+(lng1-lng0)*j/(N-1);
    let w=0.16;                              // baseline city presence
    AREAS.forEach(a=>{const d2=(la-a.ll[0])*(la-a.ll[0])+(ln-a.ll[1])*(ln-a.ll[1]); w+=0.55*Math.exp(-d2/0.0010)*(1.2-a.elev);});
    HOTSPOTS.forEach(h=>{const d2=(la-h.ll[0])*(la-h.ll[0])+(ln-h.ll[1])*(ln-h.ll[1]); w+=0.6*Math.exp(-d2/0.0006);});
    pts.push([la,ln,clamp(w,0,1)]);
  }
  _cityGrid=pts; return pts;
}
function floodPoints(S){
  const rng=mulberry(99); const pts=[];
  if(!S) return pts;                       // clean map until a simulation is run (no baseline hue)
  const rainF = clamp(S.intensity/30,0,1);
  cityGrid().forEach(g=>{ const w=clamp(g[2]*(rainF*1.05) + rainF*0.18, 0, 1); if(w>0.1) pts.push([g[0],g[1],w]); });
  AREAS.forEach(a=>{
    const r=areaRisk(a,S); if(r<0.16)return;
    const cnt=Math.round(5+r*26), spread=0.005+r*0.013;
    for(let i=0;i<cnt;i++)pts.push([a.ll[0]+(rng()-0.5)*spread, a.ll[1]+(rng()-0.5)*spread, Math.min(1,r*1.05)]);
    if(r>=0.42){ // propagate downstream toward outlet
      const o=VALLEY_OUTLET[a.valley]; const steps=10;
      for(let i=1;i<=steps;i++){const f=i/steps*0.72;
        pts.push([a.ll[0]+(o[0]-a.ll[0])*f, a.ll[1]+(o[1]-a.ll[1])*f, r*(1-f*0.8)]);}
    }
  });
  // chronic hotspots always glow
  HOTSPOTS.forEach(h=>{const r=clamp(h.depth/90,0.35,1);for(let i=0;i<10;i++)
    pts.push([h.ll[0]+(rng()-0.5)*0.006, h.ll[1]+(rng()-0.5)*0.006, r]);});
  return pts;
}
function buildFloodZones(S){
  zoneRef.clearLayers();
  AREAS.forEach(a=>{const r=areaRisk(a,S); if(r<0.45)return;
    const col=floodColor(r);
    // downstream flow band — connects the area to its outlet
    const o=VALLEY_OUTLET[a.valley];
    const mid=[a.ll[0]+(o[0]-a.ll[0])*0.6, a.ll[1]+(o[1]-a.ll[1])*0.6];
    L.polyline([a.ll,mid],{color:col,weight:7+r*12,opacity:.16,lineCap:'round'}).addTo(zoneRef);
    // flooded footprint
    L.circle(a.ll,{radius:500+r*1400,color:col,weight:1.4,opacity:.5,fillColor:col,fillOpacity:.16}).addTo(zoneRef);
  });
}
function mkFloodHeat(){
  const g=L.layerGroup();
  if(typeof L.heatLayer==='function'){
    heatRef=L.heatLayer(floodPoints(null),{radius:30,blur:26,max:1.0,minOpacity:.25,
      gradient:{0.25:'#4F8A3D',0.55:'#DE6F18',0.9:'#BF3520'}});
    g.addLayer(heatRef);
  }
  zoneRef=L.layerGroup(); buildFloodZones(null); g.addLayer(zoneRef);
  floodGroupRef=g; return g;
}
function setFlood(S){
  if(heatRef)heatRef.setLatLngs(floodPoints(S));
  buildFloodZones(S);
}
/* ---- animated heatmap: flood reveals from sources then gently breathes ---- */
let _heatTimer=null, _heatPhase=0, _heatReveal=0;
function startHeatAnim(){
  stopHeatAnim();
  _heatReveal=0; _heatPhase=0;
  const fullInt = simState ? simState.intensity : 0;
  // start the heatmap at its faint low state immediately (no full-intensity flash)
  if(heatRef && simState){
    const S0=Object.assign({},simState,{intensity:fullInt*0.16});
    heatRef.setLatLngs(floodPoints(S0).map(p=>[p[0],p[1],clamp(p[2]*0.9,0,1)]));
  }
  _heatTimer=setInterval(()=>{
    if(!simState||!heatRef){return;}
    _heatReveal=Math.min(1,_heatReveal+0.006);                // ~30-second low->high build (lighter, 180ms)
    _heatPhase+=0.22;
    const ramp=0.16+0.84*_heatReveal;                         // rain builds from light to heavy
    const breathe=0.90+0.10*Math.sin(_heatPhase);
    const Sr=Object.assign({},simState,{intensity:fullInt*ramp});
    const pts=floodPoints(Sr).map(p=>[p[0],p[1],clamp(p[2]*breathe,0,1)]);
    heatRef.setLatLngs(pts);                                  // flood spreads outward as it ramps
  },180);
}
function stopHeatAnim(){
  if(_heatTimer){clearInterval(_heatTimer);_heatTimer=null;}
  if(heatRef)heatRef.setLatLngs(floodPoints(simState));
}
/* ---- popups ---- */
function lakePopup(k){return `<div class="pop"><div class="pop-h"><div>
  <div class="pop-name">${k.n}</div><div class="pop-sub">${k.n2||'Lake'} · ${VALLEYS[k.valley].name}</div></div>
  <span class="chip ${k.full>=85?'sev':k.full>=70?'high':'mod'}"><span class="d"></span>${k.full}% full</span></div>
  <div class="pop-row"><span>Storage used</span><span>${k.full}%</span></div>
  <div class="pop-row"><span>Spill risk</span><span>${k.full>=85?'High':k.full>=70?'Elevated':'Low'}</span></div>
  <div class="pop-row"><span>Valley</span><span style="font-size:10.5px">${k.valley}</span></div></div>`;}

const CAUSES=[
 {k:'cap',label:'Rainfall exceeded drain capacity'},
 {k:'elev',label:'Low elevation / terrain depression'},
 {k:'con',label:'High construction density'},
 {k:'enc',label:'Drain encroachment / blockage'},
 {k:'lake',label:'Lake overflow'},
 {k:'slope',label:'Poor slope gradient'},
 {k:'rec',label:'Reduced groundwater absorption'},
 {k:'imp',label:'Impervious surface increase'},
 {k:'bot',label:'Downstream bottleneck'},
];
function causeBreakdown(a,S){
  S=S||{intensity:6,blk:35,lake:70,con:3,rec:40};
  const c={};
  c.cap = clamp((S.intensity - a.drainKm*1.6*(1-S.blk/100))/8,0,1);
  c.elev= clamp((1-a.elev)*0.9,0,1);
  c.con = clamp((S.con-1)/3*0.8 + (a.imperv-0.6),0,1);
  c.enc = clamp(S.blk/100,0,1);
  c.lake= clamp((a.valley==='KC'?S.lake/100:S.lake/160),0,1);
  c.slope=clamp((1-a.elev)*0.7,0,1);
  c.rec = clamp(1-S.rec/100,0,1)*0.8;
  c.imp = clamp(a.imperv,0,1);
  c.bot = clamp(a.hot?0.7:0.35,0,1);
  const tot=Object.values(c).reduce((s,v)=>s+v,0)||1;
  return CAUSES.map(x=>({label:x.label,pct:Math.round(c[x.k]/tot*100)})).sort((p,q)=>q.pct-p.pct).slice(0,5);
}
function areaPopup(a,S){
  const r=areaRisk(a,S);const rc=riskClass(r);const causes=causeBreakdown(a,S);
  const depth=Math.round(r*r*78 + (a.hot?8:0));
  return `<div class="pop"><div class="pop-h"><div>
    <div class="pop-name">${a.k}</div><div class="pop-sub">${VALLEYS[a.valley].name}</div></div>
    <span class="chip ${rc}"><span class="d"></span>${riskWord(r)}</span></div>
    <div class="pop-row"><span>Flood risk score</span><span>${(r*100|0)}/100</span></div>
    <div class="pop-row"><span>Est. water depth</span><span>${depth} cm</span></div>
    <div class="pop-row"><span>Drainage capacity</span><span>${a.drainKm} km</span></div>
    <div class="pop-row"><span>Impervious cover</span><span>${(a.imperv*100|0)}%</span></div>
    <div class="pop-causes"><h6>Why it floods here</h6>
    ${causes.map(c=>`<div class="cause"><span style="flex:1;min-width:0">${c.label}</span>
      <span class="cause-bar"><i style="width:${c.pct}%"></i></span><span class="cause-pct">${c.pct}%</span></div>`).join('')}
    </div></div>`;
}

/* ---- layer registry ---- */
const LAYERS=[
 {id:'floodheat', name:'Flood heatmap', group:'Risk & water', sw:'#DE6F18', on:true, build:mkFloodHeat},
 {id:'risk', name:'Flood risk zones', group:'Risk & water', sw:'#DE6F18', on:true, build:mkRisk, count:()=>AREAS.length},
 {id:'lakes', name:'Lakes', group:'Risk & water', sw:'#5C93B4', on:true, build:mkLakes, count:()=>LAKES.length},
 {id:'overflow', name:'Lake overflow paths', group:'Risk & water', sw:'#BF3520', on:false, build:mkOverflow, count:()=>LAKES.filter(k=>k.full>=80).length},
 {id:'low', name:'Low-lying areas', group:'Risk & water', sw:'#C9B45E', on:false, build:mkLow, count:()=>LOWLYING.length},

 {id:'arterials', name:'Major roads', group:'Roads & transit', sw:'#C9A23A', on:true, build:mkArterials, count:()=>ROADS.length},
 {id:'metro', name:'Metro lines', group:'Roads & transit', sw:'#7A4F9E', on:true, build:mkMetro, count:()=>METRO.length},
 {id:'roads', name:'Flood-prone roads', group:'Roads & transit', sw:'#DE6F18', on:true, build:mkRoads, count:()=>ROADS.filter(r=>r.flood).length},
 {id:'underpass', name:'Underpasses', group:'Roads & transit', sw:'#3E6E8E', on:false, build:mkUnderpass, count:()=>UNDERPASSES.length},

 {id:'raja', name:'Primary drains / canals', group:'Drainage network', sw:'#008DDE', on:true, build:mkRaja, count:()=>DRAINS.filter(d=>d.order>=5).length},
 {id:'drains', name:'Small stormwater drains', group:'Drainage network', sw:'#5BA7E0', on:false, build:mkDrains, count:()=>DRAINS.filter(d=>d.order<5).length},
 {id:'sewers', name:'Sewer lines', group:'Drainage network', sw:'#5E7892', on:false, build:mkSewers},
 {id:'culverts', name:'Culverts & bottlenecks', group:'Drainage network', sw:'#DE6F18', on:false, build:mkCulverts},
 {id:'blocked', name:'Encroached / blocked', group:'Drainage network', sw:'#BF3520', on:true, build:mkBlocked, count:()=>BLOCKED.length},
 {id:'recharge', name:'Recharge wells', group:'Drainage network', sw:'#6FB14E', on:false, build:mkRecharge, count:()=>RECHARGE.length},

 {id:'elev', name:'Terrain / elevation', group:'Land & terrain', sw:'#C9B45E', on:false, build:mkElev},
 {id:'built', name:'High-density built-up', group:'Land & terrain', sw:'#9AA08B', on:false, build:mkBuilt, count:()=>BUILTUP.length},
 {id:'construction', name:'Construction-heavy', group:'Land & terrain', sw:'#C29A52', on:false, build:mkConstruction, count:()=>CONSTRUCTION.length},
];

function initMap(){
  map=L.map('map',{preferCanvas:true,center:[BLR.lat,BLR.lng],zoom:BLR.zoom,zoomControl:false,attributionControl:true,minZoom:9,maxZoom:19});
  L.control.zoom({position:'topright'}).addTo(map);
  baseSel[1]=isDark()?'dark':'gray';
  applyBasemap(1);
  map.createPane('topPane'); map.getPane('topPane').style.zIndex=450;
  topRenderer=L.canvas({pane:'topPane'});
  map.createPane('riskPane'); map.getPane('riskPane').style.zIndex=460;
  riskRenderer=L.canvas({pane:'riskPane'});
  LAYERS.forEach(l=>{Lgroups[l.id]=l.build();if(l.on)Lgroups[l.id].addTo(map);});
  buildLayerPanel();
  buildBaseSwitch('baseSwitch',1);
}
function buildBaseSwitch(elId,which){
  const el=document.getElementById(elId);if(!el)return;
  el.innerHTML=baseKeys.map(k=>`<button data-k="${k}" class="${baseSel[which]===k?'on':''}">${BASEMAPS[k].label}</button>`).join('');
  $$('#'+elId+' button').forEach(b=>b.onclick=()=>{
    baseSel[which]=b.dataset.k;applyBasemap(which);
    $$('#'+elId+' button').forEach(x=>x.classList.toggle('on',x.dataset.k===baseSel[which]));
  });
}
function refreshRisk(){
  if(Lgroups.risk){map.removeLayer(Lgroups.risk);}
  Lgroups.risk=mkRisk();
  if($(`#lt-risk`)?.classList.contains('on')) Lgroups.risk.addTo(map);
}
function buildLayerPanel(){
  const root=$('#layerList');root.innerHTML='';
  const groups=[...new Set(LAYERS.map(l=>l.group))];
  groups.forEach(gn=>{
    const wrap=document.createElement('div');wrap.className='lgroup';
    wrap.innerHTML=`<div class="lgroup-h">${gn}</div>`;
    LAYERS.filter(l=>l.group===gn).forEach(l=>{
      const row=document.createElement('div');
      row.className='ltog'+(l.on?' on':' off');row.id='lt-'+l.id;
      row.innerHTML=`<span class="lswatch" style="background:${l.sw}"></span>
        <span class="lname">${l.name}</span>
        ${l.count?`<span class="lcount">${l.count()}</span>`:''}
        <span class="switch"></span>`;
      row.onclick=()=>{
        const on=!row.classList.contains('on');
        row.classList.toggle('on',on);row.classList.toggle('off',!on);
        if(on)Lgroups[l.id].addTo(map);else map.removeLayer(Lgroups[l.id]);
      };
      wrap.appendChild(row);
    });
    root.appendChild(wrap);
  });
}
/* ============================ SIMULATION ============================ */
const SIM={rain:60,dur:3,area:'Bellandur',blk:35,lake:70,con:3,rec:40};
const CON_WORDS={1:'Low',2:'Moderate',3:'High',4:'Very high'};

function runSimulation(){
  const intensity = SIM.rain/SIM.dur;                 // mm/hr
  const S={intensity,blk:SIM.blk,lake:SIM.lake,con:SIM.con,rec:SIM.rec};
  simState=S;
  // recompute every area; collect affected
  const ranked=AREAS.map(a=>({a,r:areaRisk(a,S),causes:causeBreakdown(a,S)}))
                    .sort((x,y)=>y.r-x.r);
  const focus=ranked.find(x=>x.a.k===SIM.area)||ranked[0];
  const affected=ranked.filter(x=>x.r>=0.4);
  const depth=Math.round(focus.r*focus.r*82 + (focus.a.hot?9:0));
  const drainsOver=Math.round((focus.a.drainKm) * clamp(focus.r*1.1,0,1));
  const lakesOver=LAKES.filter(k=>(k.full + SIM.lake/4 + intensity*1.1)>=98).length;
  const roadsBlocked=affected.flatMap(x=>x.a.roads).slice(0,7);
  // confidence: higher when inputs are within model's comfortable band
  const conf=Math.round(clamp(0.9 - Math.abs(intensity-25)/120 - (SIM.blk>85?0.1:0) ,0.55,0.94)*100);
  const verdict=riskWord(focus.r);
  // recommendation
  const top=focus.causes[0].label;
  const rec=recommend(top,focus.a);
  refreshRisk();
  setFlood(S);
  if(Lgroups.floodheat && !map.hasLayer(Lgroups.floodheat)){Lgroups.floodheat.addTo(map);
    $('#lt-floodheat')?.classList.add('on');$('#lt-floodheat')?.classList.remove('off');}
  startHeatAnim();
  $('#mapMode').textContent=`${SIM.rain} mm / ${SIM.dur<1?SIM.dur*60+' min':SIM.dur+' hr'} · ${SIM.area}`;
  const ip=clamp(intensity/45*100,3,100);
  const ipCol=intensity>=30?'#BF3520':intensity>=15?'#DE6F18':intensity>=7?'#CC9A06':'#4F8A3D';
  animateIntensity(intensity, ip, ipCol);
  // slow cinematic glide to the focus area
  map.flyTo(focus.a.ll, 13, {duration:2.4, easeLinearity:0.10});
  startRiskPulse();
  setTimeout(()=>{const m=riskLayerRefs.find(x=>x._area.k===focus.a.k);if(m)m.openPopup();},2500);
  renderResults({focus,affected,depth,drainsOver,lakesOver,roadsBlocked,conf,verdict,intensity,rec});
  updateCity3D({focus,affected,depth,drainsOver,roadsBlocked,intensity});
}
function recommend(cause,a){
  if(/capacity|bottleneck/i.test(cause)) return `Priority desilting + widening of the ${VALLEYS[a.valley].name} primary channel near ${a.k}; add an emergency overflow channel to relieve peak flow.`;
  if(/encroach|block/i.test(cause)) return `Clear encroachment and debris on the storm-water drain feeding ${a.k}; restore the design cross-section and add trash screens upstream.`;
  if(/lake/i.test(cause)) return `Lower pre-monsoon lake level and repair the ${a.k} outfall weir; interconnect with the downstream tank to share storm storage.`;
  if(/elevation|slope|depression/i.test(cause)) return `Install a detention pond at the ${a.k} low point and re-grade road camber to route surface water to the nearest primary storm-water drain.`;
  if(/absorption|impervious|construction/i.test(cause)) return `Add recharge wells, bioswales and permeable pavement across ${a.k} to cut runoff coefficient and restore infiltration.`;
  return `Combined desilting, encroachment removal and recharge upgrade recommended for ${a.k}.`;
}
function renderResults(R){
  const rc=riskClass(R.focus.r);
  $('#simResults').innerHTML=`
    <div class="res-head">
      <div class="res-verdict"><span class="chip ${rc}"><span class="d"></span>${R.verdict}</span>
        <h4>${R.focus.a.k}</h4></div>
      <div class="res-conf">Model confidence
        <span class="conf-bar"><i style="width:${R.conf}%"></i></span>
        <span class="num" style="color:var(--olive);font-weight:600">${R.conf}%</span></div>
    </div>
    <div class="res-grid">
      <div class="res-cell"><div class="k">Areas affected</div><div class="v">${R.affected.length} <span class="u">/ ${AREAS.length}</span></div></div>
      <div class="res-cell"><div class="k">Water depth</div><div class="v">${R.depth} <span class="u">cm</span></div></div>
      <div class="res-cell"><div class="k">Drains overloaded</div><div class="v">${R.drainsOver} <span class="u">km</span></div></div>
      <div class="res-cell"><div class="k">Lakes overflowing</div><div class="v">${R.lakesOver}</div></div>
      <div class="res-cell"><div class="k">Rain intensity</div><div class="v">${R.intensity.toFixed(1)} <span class="u">mm/hr</span></div></div>
      <div class="res-cell"><div class="k">Risk score</div><div class="v">${(R.focus.r*100|0)} <span class="u">/100</span></div></div>
    </div>
    <div class="res-list"><h6>Likely cause of flooding</h6>
      ${R.focus.causes.map(c=>`<div class="cause"><span style="flex:1">${c.label}</span>
        <span class="cause-bar"><i style="width:${c.pct}%"></i></span><span class="cause-pct">${c.pct}%</span></div>`).join('')}
    </div>
    <div class="res-list"><h6>Roads likely blocked</h6>
      ${R.roadsBlocked.map(r=>`<div class="res-li"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="var(--o)" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>${r}</div>`).join('')}
    </div>
    <div class="rec-box"><h6>Recommended intervention</h6><p>${R.rec}</p></div>
    <div style="padding:10px 15px"><span class="tag-model">Model output · illustrative</span></div>`;
}
function resetSim(){
  stopRiskPulse();stopHeatAnim();
  simState=null;refreshRisk();setFlood(null);
  $('#mapMode').textContent='Baseline conditions';
  animateIntensity(0, 0, getComputedStyle(document.documentElement).getPropertyValue('--g').trim()||'#4F8A3D');
  map.flyTo([BLR.lat,BLR.lng],BLR.zoom,{duration:1.8, easeLinearity:0.14});
  $('#simResults').innerHTML=`<div class="res-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12z"/></svg>
      <p>Configure a rainfall event above and run the model to see affected areas, water depth, overloaded drains and recommended interventions.</p></div>`;
  updateCity3D();
}
function wireSim(){
  const seg=(id,key,fmtf)=>{$$('#'+id+' button').forEach(b=>b.onclick=()=>{
    $$('#'+id+' button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    SIM[key]=parseFloat(b.dataset.v);fmtf();updateCity3D();});};
  seg('segRain','rain',()=>$('#rainLbl').textContent=SIM.rain+' mm');
  seg('segDur','dur',()=>$('#durLbl').textContent=SIM.dur<1?SIM.dur*60+' min':SIM.dur+' hr');
  const sel=$('#areaSel');sel.innerHTML=AREAS.map(a=>`<option ${a.k==='Bellandur'?'selected':''}>${a.k}</option>`).join('');
  sel.onchange=()=>{SIM.area=sel.value;updateCity3D();};
  const bind=(id,key,lbl,suf='')=>{const el=$('#'+id);el.oninput=()=>{SIM[key]=+el.value;$('#'+lbl).textContent= key==='con'?CON_WORDS[el.value]:el.value+suf;updateCity3D();};};
  bind('rngBlk','blk','blkVal');bind('rngLake','lake','lakeVal');
  bind('rngCon','con','conLbl');$('#rngCon').oninput=()=>{SIM.con=+$('#rngCon').value;$('#conLbl').textContent=CON_WORDS[$('#rngCon').value];updateCity3D();};
  bind('rngRec','rec','recVal');
  $('#runSim').onclick=runSimulation;$('#resetSim').onclick=resetSim;
}

/* ============================ SLOW MAP ANIMATION ============================ */
/* Animated rainfall-intensity readout: counts up smoothly while the bar fills. */
let _intensityRAF=null;
function animateIntensity(target,widthPct,color){
  const valEl=$('#miVal'), fillEl=$('#miFill');
  if(!valEl||!fillEl)return;
  fillEl.style.transition='width 1.7s cubic-bezier(.22,.61,.36,1), background .7s ease';
  fillEl.style.background=color;
  fillEl.style.width=widthPct+'%';
  const start=parseFloat(valEl.textContent)||0, t0=performance.now(), dur=1700;
  cancelAnimationFrame(_intensityRAF);
  (function step(now){
    const k=clamp((now-t0)/dur,0,1), e=1-Math.pow(1-k,3);
    valEl.textContent=(start+(target-start)*e).toFixed(1);
    if(k<1)_intensityRAF=requestAnimationFrame(step);
  })(t0);
}

/* Gently pulsing risk markers — keeps the map feeling alive after a run. */
let _riskPulseRAF=null;
function startRiskPulse(){ cancelAnimationFrame(_riskPulseRAF); _riskPulseRAF=null; }
function stopRiskPulse(){
  cancelAnimationFrame(_riskPulseRAF);_riskPulseRAF=null;
  riskLayerRefs.forEach(m=>{if(m&&m._area&&m.setRadius){try{m.setRadius(11);}catch(e){}}});
}

