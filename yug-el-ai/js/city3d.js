'use strict';
/* ============================================================================
   3D CITY SIMULATION  —  v4  (small but highly detailed Bengaluru block)
   - buildings with lit window facades, street trees, lane markings
   - storm-water CANALS carved beside every road
   - WATER appears ONLY when you run the simulation (rain): it rises slowly,
     fills the canals first, then ponds in low ground and floods the roads
   - detailed cars (wheels + brake lights) that slow & jam as the rain builds
   - traffic lights cycle at every junction; named streets
   ========================================================================== */
const CITY3D={
  scene:null,renderer:null,camera:null,group:null,terrain:null,water:null,
  cars:[],lights:[],labels:[],trees:[],drains:[],roadWater:[],rain:null,rainGeo:null,
  last:0, rot:-0.6,targetRot:-0.6, elev:0.55,targetElev:0.55, dist:58,targetDist:58,
  drag:false,lastX:0,lastY:0,auto:true,
  risk:0.35, rainRamp:0,targetRain:0,armed:false, simT:0,
  waterLevel:-0.9,targetWater:-0.9,
  signalT:0,signalPhase:0,active:true,
  rainCount:500, HALF:30
};
const VX=[-15,0,15], HZ=[-15,0,15];
const ROADS3=[
  {axis:'h',at:0,  name:'Outer Ring Road',     main:true},
  {axis:'h',at:-15,name:'Old Airport Road'},
  {axis:'h',at:15, name:'Sarjapur Road'},
  {axis:'v',at:0,  name:'Bellandur Main Road', main:true},
  {axis:'v',at:-15,name:'HSR 27th Main'},
  {axis:'v',at:15, name:'Marathahalli Road'},
];
const DIPS=[[8,8,5,1.2],[-15,-6,4,1.0],[14,15,5,1.0],[-9,12,4,0.9]];

/* terrain: flat-ish blocks, narrow CANAL troughs beside each road, a few basins */
function terrainH(x,z){
  let h=0.55;
  for(const d of DIPS){const r2=(x-d[0])*(x-d[0])+(z-d[1])*(z-d[1]);h-=0.5*Math.exp(-r2/(2*d[2]*d[2]));}
  h+=0.05*Math.sin(x*0.16)*Math.cos(z*0.14);
  return h;
}
function depthAt(x,z){return Math.max(0, CITY3D.waterLevel - terrainH(x,z));}

function current3DScenario(source){
  const intensity=SIM.rain/SIM.dur;
  const S={intensity,blk:SIM.blk,lake:SIM.lake,con:SIM.con,rec:SIM.rec};
  const ranked=AREAS.map(a=>({a,r:areaRisk(a,S),causes:causeBreakdown(a,S)})).sort((x,y)=>y.r-x.r);
  const focus=source?.focus || ranked.find(x=>x.a.k===SIM.area) || ranked[0];
  const affected=source?.affected || ranked.filter(x=>x.r>=0.4);
  const depth=source?.depth ?? Math.round(focus.r*focus.r*82 + (focus.a.hot?9:0));
  const drainsOver=source?.drainsOver ?? Math.round(focus.a.drainKm*clamp(focus.r*1.1,0,1));
  const roadsBlocked=source?.roadsBlocked || affected.flatMap(x=>x.a.roads).slice(0,7);
  const delay=Math.round(7 + focus.r*46 + SIM.blk*.18 + Math.min(30,intensity*.5));
  return {focus,affected,depth,drainsOver,roadsBlocked,intensity,delay,risk:focus.r};
}

function initCity3D(){
  const mount=$('#city3dViewport'); if(!mount)return;
  if(!window.THREE){
    mount.innerHTML='<div class="city3d-fallback"><div><strong>3D renderer unavailable</strong><br>Three.js could not load. The flood metrics still update from the simulation model.</div></div>';
    updateCity3D();return;
  }
  const T=THREE;
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  mount.appendChild(renderer.domElement);
  CITY3D.renderer=renderer;
  const scene=CITY3D.scene=new T.Scene();
  scene.fog=new T.Fog(isDark()?0x10140d:0xdde6d3,60,150);
  CITY3D.camera=new T.PerspectiveCamera(44,1,.1,360);
  CITY3D.group=new T.Group();scene.add(CITY3D.group);
  scene.add(new T.HemisphereLight(0xf7ffe8,0x42603a,isDark()?.8:1.1));
  const sun=new T.DirectionalLight(0xffffff,isDark()?.82:1.22);sun.position.set(-34,60,28);scene.add(sun);

  buildTerrain(T); buildRoads(T); buildBuildings(T); buildTrees(T);
  buildLights(T); buildLabels(T); buildDrains(T); buildRoadWater(T); buildCars(T); createRain(T);
  wireInteraction(renderer.domElement);
  window.addEventListener('resize',resizeCity3D);
  resizeCity3D();updateCity3D();requestAnimationFrame(animateCity3D);
}

function buildTerrain(T){
  const S=2*CITY3D.HALF+20, seg=44;
  const geo=new T.PlaneGeometry(S,S,seg,seg);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position, colors=[];
  const grass=new T.Color(isDark()?0x27331f:0x9cb184), soil=new T.Color(isDark()?0x3a4a2c:0xbcc7a6);
  const canalC=new T.Color(isDark()?0x2a3340:0x6f7d86);
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),h=terrainH(x,z);pos.setY(i,h);
    let c = h<-0.2 ? canalC.clone() : grass.clone().lerp(soil,clamp((h-0.2)/0.8,0,1));
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  CITY3D.terrain=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.97}));
  CITY3D.group.add(CITY3D.terrain);
}

/* facade texture: dark/light wall with a grid of (some lit) windows */
function facadeTexture(T,dark){
  const c=document.createElement('canvas');c.width=64;c.height=64;const x=c.getContext('2d');
  x.fillStyle=dark?'#39424e':'#cdbfa9';x.fillRect(0,0,64,64);
  for(let i=0;i<4;i++)for(let j=0;j<5;j++){
    const lit=Math.random()<0.5;
    x.fillStyle=lit?(dark?'#ffe6a0':'#aebfd0'):(dark?'#222a33':'#8a93a0');
    x.fillRect(5+i*15,4+j*12,10,8);
  }
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.NearestFilter;return t;
}
function buildBuildings(T){
  const rng=mulberry(91), H=CITY3D.HALF, dark=isDark();
  const onRoad=(x,z)=>VX.some(v=>Math.abs(x-v)<5.5)||HZ.some(v=>Math.abs(z-v)<5.5);
  const items=[];
  for(let x=-H+5;x<=H-5;x+=6){
    for(let z=-H+5;z<=H-5;z+=5.6){
      if(onRoad(x,z))continue;
      const jx=x+(rng()-.5)*1.2, jz=z+(rng()-.5)*1.2; if(onRoad(jx,jz))continue;
      const base=terrainH(jx,jz);
      items.push({jx,jz,base,bh:2.5+rng()*9,w:2.2+rng()*2,d:2.2+rng()*2,t:(rng()*4)|0});
    }
  }
  const facade=facadeTexture(T,dark); facade.repeat.set(2,3);
  const mat=new T.MeshStandardMaterial({map:facade,emissive:dark?0x352f1e:0x000000,emissiveMap:dark?facade:null,emissiveIntensity:dark?.5:0,roughness:.85});
  const inst=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mat,items.length);
  const m=new T.Matrix4(), col=new T.Color();
  const tints=dark?[0x55624f,0x66745f,0x70624f,0x4e5a52]:[0xe2c9b4,0xccd7c4,0xd8c1a8,0xd0c2b0];
  items.forEach((it,i)=>{ m.makeScale(it.w,it.bh,it.d); m.setPosition(it.jx,it.base+it.bh/2,it.jz); inst.setMatrixAt(i,m); col.setHex(tints[it.t]); inst.setColorAt(i,col); });
  inst.instanceMatrix.needsUpdate=true; if(inst.instanceColor)inst.instanceColor.needsUpdate=true;
  CITY3D.group.add(inst);
}

function buildTrees(T){
  const rng=mulberry(53), H=CITY3D.HALF;
  const onRoad=(x,z)=>VX.some(v=>Math.abs(x-v)<6)||HZ.some(v=>Math.abs(z-v)<6);
  const items=[];
  for(let i=0;i<46;i++){ const x=(rng()-.5)*2*(H-4), z=(rng()-.5)*2*(H-4); const base=terrainH(x,z);
    if(base<0||(!onRoad(x,z)&&rng()<.5))continue; items.push({x,z,base}); }
  if(!items.length)return;
  const trunkM=new T.MeshStandardMaterial({color:0x6b4a2b,roughness:.9});
  const leafM=new T.MeshStandardMaterial({color:isDark()?0x2f5d33:0x4f8a4a,roughness:.85});
  const trunk=new T.InstancedMesh(new T.CylinderGeometry(.13,.17,1.1,6),trunkM,items.length);
  const foliage=new T.InstancedMesh(new T.ConeGeometry(.95,2.4,7),leafM,items.length);
  const m=new T.Matrix4();
  items.forEach((it,i)=>{ m.makeTranslation(it.x,it.base+.55,it.z); trunk.setMatrixAt(i,m); m.makeTranslation(it.x,it.base+2.0,it.z); foliage.setMatrixAt(i,m); });
  trunk.instanceMatrix.needsUpdate=true; foliage.instanceMatrix.needsUpdate=true;
  CITY3D.group.add(trunk); CITY3D.group.add(foliage);
}

function buildRoads(T){
  const H=CITY3D.HALF;
  const roadMat=new T.MeshStandardMaterial({color:isDark()?0x0d0f11:0x16181b,roughness:.94});
  const edgeMat=new T.MeshBasicMaterial({color:0xf2f2ee}), dashMat=new T.MeshBasicMaterial({color:0xe8c233});
  function strip(w,d,x,z,mat,y){const m=new T.Mesh(new T.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);CITY3D.group.add(m);return m;}
  ROADS3.forEach(r=>{
    const W=r.main?6.0:4.6, y0=0.61;
    if(r.axis==='h'){
      strip(2*H,W,0,r.at,roadMat,y0);
      strip(2*H,0.18,0,r.at-W/2+0.2,edgeMat,y0+.02); strip(2*H,0.18,0,r.at+W/2-0.2,edgeMat,y0+.02);
      for(let x=-H+2;x<H;x+=8) strip(2,0.22,x,r.at,dashMat,y0+.02);
    }else{
      strip(W,2*H,r.at,0,roadMat,y0);
      strip(0.18,2*H,r.at-W/2+0.2,0,edgeMat,y0+.02); strip(0.18,2*H,r.at+W/2-0.2,0,edgeMat,y0+.02);
      for(let z=-H+2;z<H;z+=8) strip(0.22,2,r.at,z,dashMat,y0+.02);
    }
  });
}

function buildLights(T){
  const pole=new T.MeshStandardMaterial({color:0x2a2e26,roughness:.6});
  VX.forEach(x=>HZ.forEach(z=>{
    const g=new T.Group();
    const pol=new T.Mesh(new T.CylinderGeometry(.13,.13,3.0,8),pole);pol.position.y=1.5;g.add(pol);
    const head=new T.Mesh(new T.BoxGeometry(.42,1.1,.42),pole);head.position.y=2.9;g.add(head);
    const lamp=new T.Mesh(new T.SphereGeometry(.22,12,12),new T.MeshBasicMaterial({color:0x3ad24d}));
    lamp.position.y=3.1;g.add(lamp);
    g.position.set(x+2.4,terrainH(x+2.4,z+2.4)+0.6,z+2.4);CITY3D.group.add(g);CITY3D.lights.push({lamp});
  }));
}

function textSprite(T,text){
  const c=document.createElement('canvas');c.width=320;c.height=68;const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(255,255,255,0.9)';roundRect(ctx,4,12,312,44,12);ctx.fill();
  ctx.strokeStyle='rgba(92,107,47,0.9)';ctx.lineWidth=2;roundRect(ctx,4,12,312,44,12);ctx.stroke();
  ctx.font='600 26px Inter, system-ui, sans-serif';ctx.fillStyle='#23311a';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,160,35);
  const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthTest:false}));
  sp.scale.set(12,2.6,1);return sp;
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function buildLabels(T){
  const H=CITY3D.HALF;
  ROADS3.forEach(r=>{const sp=textSprite(T,r.name);
    if(r.axis==='h') sp.position.set(-H+11,5.5,r.at-3.2); else sp.position.set(r.at+3.2,5.5,-H+11);
    CITY3D.group.add(sp);CITY3D.labels.push(sp);});
}

/* blue storm-water DRAINS running beside every road (always visible) */
function buildDrains(T){
  const H=CITY3D.HALF;
  const dm=new T.MeshStandardMaterial({color:0x1f86d6,emissive:0x0a5fa6,emissiveIntensity:.45,roughness:.3,transparent:true,opacity:.96});
  function strip(w,d,x,z){const m=new T.Mesh(new T.PlaneGeometry(w,d),dm);m.rotation.x=-Math.PI/2;m.position.set(x,terrainH(x,z)+0.05,z);CITY3D.group.add(m);CITY3D.drains.push(m);}
  ROADS3.forEach(r=>{const off=(r.main?6.0:4.6)/2+0.85;
    if(r.axis==='h'){strip(2*H,0.8,0,r.at+off);strip(2*H,0.8,0,r.at-off);}
    else{strip(0.8,2*H,r.at+off,0);strip(0.8,2*H,r.at-off,0);}
  });
}
/* translucent flood water ON the roads — hidden until it rains, never on building plots */
function buildRoadWater(T){
  const H=CITY3D.HALF;
  function strip(w,d,x,z){
    const mat=new T.MeshStandardMaterial({color:0x2f7fd0,emissive:0x0a4f8c,emissiveIntensity:.3,roughness:.12,metalness:.15,transparent:true,opacity:0,depthWrite:false});
    const m=new T.Mesh(new T.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,terrainH(x,z)+0.1,z);m.visible=false;CITY3D.group.add(m);CITY3D.roadWater.push(m);
  }
  ROADS3.forEach(r=>{const W=r.main?6.4:5.0; if(r.axis==='h') strip(2*H,W,0,r.at); else strip(W,2*H,r.at,0);});
}

let CARGEO=null;
function makeCar(T,bodyMat,sh){
  const g=new T.Group();
  const body=new T.Mesh(CARGEO.body,bodyMat);body.position.y=.42;g.add(body);
  const cab=new T.Mesh(CARGEO.cab,sh.cab);cab.position.set(-.05,.78,0);g.add(cab);
  const w1=new T.Mesh(CARGEO.wheel,sh.wheel);w1.rotation.x=Math.PI/2;w1.position.set(-.6,.2,0);g.add(w1);
  const w2=new T.Mesh(CARGEO.wheel,sh.wheel);w2.rotation.x=Math.PI/2;w2.position.set(.6,.2,0);g.add(w2);
  const bl=new T.Mesh(CARGEO.bl,sh.brake);bl.position.set(-.96,.42,0);bl.visible=false;g.add(bl);g.userData.brake=bl;
  CITY3D.group.add(g);return g;
}
function buildCars(T){
  CARGEO={body:new T.BoxGeometry(1.9,.55,1.0),cab:new T.BoxGeometry(1.0,.42,.92),wheel:new T.CylinderGeometry(.2,.2,1.05,8),bl:new T.BoxGeometry(.08,.16,.9)};
  const sh={cab:new T.MeshStandardMaterial({color:0x223038,roughness:.3}),wheel:new T.MeshStandardMaterial({color:0x111417,roughness:.7}),brake:new T.MeshBasicMaterial({color:0xff4422})};
  const cols=[0xe8eef2,0xf1c232,0xe16c22,0x5fb46b,0xffffff,0xc4d6e6,0x9fb0c0,0x3d6f9e,0xd96b6b];
  const bodyMats=cols.map(c=>new T.MeshStandardMaterial({color:c,roughness:.45,metalness:.1}));
  const H=CITY3D.HALF, len=2*H; let ci=0;
  ROADS3.forEach(r=>{ const pool=r.main?5:3, lane=r.main?1.4:1.15;
    [1,-1].forEach(dir=>{ const cars=[];
      for(let i=0;i<pool;i++){const car=makeCar(T,bodyMats[(ci++)%bodyMats.length],sh);
        cars.push({mesh:car,s:(i/pool)*len+(dir<0?2:0),base:5.2+Math.random()*1.4,v:5.2,active:true});}
      CITY3D.cars.push({road:r,dir,lane,len,cars,minGap:3.2}); });
  });
}

function createRain(T){
  const N=CITY3D.rainCount,S=2*CITY3D.HALF+24,geo=new T.BufferGeometry(),pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*S;pos[i*3+1]=Math.random()*64;pos[i*3+2]=(Math.random()-.5)*S;}
  geo.setAttribute('position',new T.BufferAttribute(pos,3));
  const pts=new T.Points(geo,new T.PointsMaterial({color:0x9fd0ef,size:.5,transparent:true,opacity:0,depthWrite:false}));
  pts.frustumCulled=false;CITY3D.scene.add(pts);CITY3D.rain=pts;CITY3D.rainGeo=geo;
}

function wireInteraction(cv){
  cv.style.touchAction='none';cv.style.cursor='grab';
  cv.addEventListener('pointerdown',e=>{CITY3D.drag=true;CITY3D.lastX=e.clientX;CITY3D.lastY=e.clientY;cv.style.cursor='grabbing';cv.setPointerCapture?.(e.pointerId);});
  cv.addEventListener('pointermove',e=>{if(!CITY3D.drag)return;
    CITY3D.targetRot+=(e.clientX-CITY3D.lastX)*.008;
    CITY3D.targetElev=clamp(CITY3D.targetElev-(e.clientY-CITY3D.lastY)*.005,0.14,1.50);
    CITY3D.lastX=e.clientX;CITY3D.lastY=e.clientY;});
  const end=()=>{CITY3D.drag=false;cv.style.cursor='grab';};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointerleave',end);
  cv.addEventListener('wheel',e=>{e.preventDefault();CITY3D.targetDist=clamp(CITY3D.targetDist+e.deltaY*.04,38,130);},{passive:false});
  $$('.city3d-ctrl button').forEach(b=>b.onclick=()=>{const c=b.dataset.c;
    if(c==='in')CITY3D.targetDist=clamp(CITY3D.targetDist-11,38,130);
    else if(c==='out')CITY3D.targetDist=clamp(CITY3D.targetDist+11,38,130);
    else if(c==='auto'){CITY3D.auto=!CITY3D.auto;b.classList.toggle('on',CITY3D.auto);}
    else setView('3d');});
  $$('.city3d-view button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
  const runBtn=$('#city3dRun'); if(runBtn) runBtn.onclick=startStorm;
}
function setView(which){
  $$('.city3d-view button').forEach(b=>b.classList.toggle('on',b.dataset.v===which));
  if(which==='top'){CITY3D.targetElev=1.48;CITY3D.targetDist=88;CITY3D.auto=false;}
  else{CITY3D.targetElev=0.55;CITY3D.targetDist=58;}
  const ab=$('#city3dAuto'); if(ab) ab.classList.toggle('on',CITY3D.auto);
}
function startStorm(){
  CITY3D.armed=true;CITY3D.rainRamp=0;CITY3D.simT=0;CITY3D.waterLevel=-0.9;
  CITY3D.cars.forEach(l=>l.cars.forEach(c=>c.v=c.base));
  const btn=$('#city3dRun'); if(btn){btn.classList.add('running');btn.textContent='● Rain building…';
    setTimeout(()=>{btn.classList.remove('running');btn.innerHTML='&#9654; Replay storm';},9000);}
}
function resizeCity3D(){
  if(!CITY3D.renderer||!CITY3D.camera)return;
  const mount=$('#city3dViewport');if(!mount)return;
  const w=Math.max(280,mount.clientWidth),h=Math.max(300,mount.clientHeight);
  CITY3D.renderer.setSize(w,h,false);CITY3D.camera.aspect=w/h;CITY3D.camera.updateProjectionMatrix();
}

function updateCity3D(source){
  const s=current3DScenario(source);
  CITY3D.risk=s.risk;
  CITY3D.targetRain=clamp(s.intensity/40*0.7+s.risk*0.5,0,1);
  CITY3D.targetWaterPeak=0.18+s.risk*1.12;             // a little more water reaches the roads (~0.6) at peak
  if(source){CITY3D.armed=true;CITY3D.rainRamp=0;CITY3D.simT=0;}
  $('#city3dScenario') && ($('#city3dScenario').textContent=`${SIM.rain} mm / ${SIM.dur<1?SIM.dur*60+' min':SIM.dur+' hr'}`);
  $('#city3dArea') && ($('#city3dArea').textContent=s.focus.a.k);
  $('#city3dDelay') && ($('#city3dDelay').textContent=`${s.delay} min`);
  $('#city3dOverflow') && ($('#city3dOverflow').textContent=`${s.drainsOver.toFixed(1)} km`);
  $('#city3dDepth') && ($('#city3dDepth').textContent=`${s.depth} cm`);
  $('#city3dRoads') && ($('#city3dRoads').textContent=`${Math.max(1,s.roadsBlocked.length)} corridors`);
}
function updateCity3DTheme(){ if(CITY3D.scene) CITY3D.scene.fog=new THREE.Fog(isDark()?0x10140d:0xdde6d3,60,150); }

function carPos(lane,s){
  const r=lane.road,H=CITY3D.HALF,off=lane.dir>0?-lane.lane:lane.lane;
  if(r.axis==='h'){const x=(lane.dir>0?(-H+s):(H-s));return {x,z:r.at+off,dx:lane.dir,dz:0};}
  const z=(lane.dir>0?(-H+s):(H-s));return {x:r.at+off,z,dx:0,dz:lane.dir};
}
function distToRed(lane,s){
  const r=lane.road,H=CITY3D.HALF,cross=r.axis==='h'?VX:HZ;
  const red=(r.axis==='h')?(CITY3D.signalPhase===1):(CITY3D.signalPhase===0);
  if(!red)return Infinity;let best=Infinity;
  cross.forEach(cv=>{const a=lane.dir>0?(cv+H):(H-cv);const d=a-s-2.8;if(d>0&&d<best)best=d;});
  return best;
}

function animateCity3D(t){
  if(!CITY3D.renderer)return;
  if(!CITY3D.active){CITY3D.last=t;requestAnimationFrame(animateCity3D);return;}   // don't render when 3D tab is hidden
  const dt=Math.min(.05,((t-CITY3D.last)||16)/1000);CITY3D.last=t;
  if(CITY3D.auto&&!CITY3D.drag)CITY3D.targetRot+=dt*.08;
  CITY3D.rot+=(CITY3D.targetRot-CITY3D.rot)*.08;
  CITY3D.elev+=(CITY3D.targetElev-CITY3D.elev)*.10;
  CITY3D.dist+=(CITY3D.targetDist-CITY3D.dist)*.10;
  CITY3D.group.rotation.y=CITY3D.rot;
  CITY3D.camera.position.set(0,Math.sin(CITY3D.elev)*CITY3D.dist,Math.cos(CITY3D.elev)*CITY3D.dist);
  CITY3D.camera.lookAt(0,1.5,0);

  // rain builds slowly over ~30s once armed (a real "Run")
  if(CITY3D.armed)CITY3D.simT=Math.min(30,CITY3D.simT+dt);
  const p=clamp(CITY3D.simT/30,0,1), tr=CITY3D.armed?CITY3D.targetRain*(p*p*(3-2*p)):0;
  CITY3D.rainRamp += (tr-CITY3D.rainRamp)*0.1;
  const rain=CITY3D.rainRamp;
  // flood water appears ONLY on the roads (never on building plots); drains brighten as they fill
  CITY3D.roadWater.forEach(m=>{ m.visible=rain>0.02; m.material.opacity=clamp(rain*0.78,0,0.82); });
  CITY3D.drains.forEach(d=>{ d.material.emissiveIntensity=0.4+rain*0.5; });

  const phaseDur=3.5+rain*4.5;CITY3D.signalT+=dt;
  if(CITY3D.signalT>phaseDur){CITY3D.signalT=0;CITY3D.signalPhase^=1;}
  CITY3D.lights.forEach(L=>L.lamp.material.color.setHex(CITY3D.signalPhase===0?0x3ad24d:0xe0473a));

  // traffic
  const speedScale=1-rain*0.78;
  CITY3D.cars.forEach(lane=>{
    const cars=lane.cars,L=lane.len;
    const activeN=Math.max(2,Math.round(cars.length*(0.45+0.55*clamp(rain,0,1))));
    cars.forEach((c,i)=>{c.active=i<activeN;c.mesh.visible=c.active;});
    const act=cars.filter(c=>c.active).sort((a,b)=>b.s-a.s);
    for(const c of act){
      const pp=carPos(lane,c.s),dep=rain*0.6;
      let vmax=c.base*speedScale*(dep>0.4?0.12:dep>0.15?0.45:1);
      const dRed=distToRed(lane,c.s); if(dRed<6) vmax=Math.min(vmax,dRed<1.2?0:c.base*0.18);
      let gap=Infinity;for(const o of act){if(o===c)continue;let g=o.s-c.s;if(g<0)g+=L;if(g<gap)gap=g;}
      if(gap<lane.minGap)vmax=0; else if(gap<lane.minGap*2)vmax=Math.min(vmax,c.base*0.25);
      c.v+=(vmax-c.v)*0.09;c.s=(c.s+c.v*dt)%L;
      const q=carPos(lane,c.s),ty=terrainH(q.x,q.z);
      c.mesh.position.set(q.x,ty+0.12,q.z);c.mesh.rotation.y=Math.atan2(-q.dz,q.dx);
      c.mesh.visible=c.active;
      if(c.mesh.userData.brake)c.mesh.userData.brake.visible=c.v<c.base*0.3;
    }
  });

  if(CITY3D.rain){
    CITY3D.rain.material.opacity=clamp(rain*0.85,0,.8);
    const arr=CITY3D.rainGeo.attributes.position.array,N=arr.length/3,S=2*CITY3D.HALF+24;
    const fall=(50+rain*160)*dt,visN=Math.floor(N*clamp(rain,0,1));
    for(let i=0;i<N;i++){
      if(i<visN){arr[i*3+1]-=fall;if(arr[i*3+1]<0.2){arr[i*3+1]=60+Math.random()*5;arr[i*3]=(Math.random()-.5)*S;arr[i*3+2]=(Math.random()-.5)*S;}}
      else arr[i*3+1]=-60;
    }
    CITY3D.rainGeo.attributes.position.needsUpdate=true;
  }
  CITY3D.renderer.render(CITY3D.scene,CITY3D.camera);
  requestAnimationFrame(animateCity3D);
}

/* ============================================================================
   STATIC HIGH-FIDELITY PREVIEW — full Bengaluru city model
   Rendered ON DEMAND (once + on drag), no animation loop. Illustrates the
   visual fidelity achievable when the model runs on larger / HPC hardware.
   ========================================================================== */
const CUBBON={scene:null,renderer:null,camera:null,group:null,rot:-0.62,elev:0.5,dist:190,drag:false,lastX:0,lastY:0,ready:false};
function renderCubbon(){
  if(!CUBBON.renderer)return;
  CUBBON.group.rotation.y=CUBBON.rot;
  CUBBON.camera.position.set(0,Math.sin(CUBBON.elev)*CUBBON.dist,Math.cos(CUBBON.elev)*CUBBON.dist);
  CUBBON.camera.lookAt(0,2,0);
  CUBBON.renderer.render(CUBBON.scene,CUBBON.camera);
}
function initCubbon(){
  if(CUBBON.ready)return; const mount=$('#cubbonViewport'); if(!mount)return;
  if(!window.THREE){mount.innerHTML='<div class="city3d-fallback"><div>3D preview unavailable</div></div>';return;}
  CUBBON.ready=true; const T=THREE;
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  mount.appendChild(renderer.domElement); CUBBON.renderer=renderer;
  const scene=CUBBON.scene=new T.Scene(); scene.fog=new T.Fog(isDark()?0x0e1116:0xe9ecef,210,560);
  CUBBON.camera=new T.PerspectiveCamera(42,1,.1,520);
  const g=CUBBON.group=new T.Group(); scene.add(g);
  scene.add(new T.HemisphereLight(0xffffff,0x9aa089,isDark()?.9:1.22));
  const sun=new T.DirectionalLight(0xffffff,isDark()?.85:1.3); sun.position.set(-60,110,50); scene.add(sun);
  buildCityModel(T,g);
  function rs(){const w=Math.max(280,mount.clientWidth),h=Math.max(240,mount.clientHeight);
    renderer.setSize(w,h,false);CUBBON.camera.aspect=w/h;CUBBON.camera.updateProjectionMatrix();renderCubbon();}
  window.addEventListener('resize',rs);
  const cv=renderer.domElement; cv.style.cursor='grab'; cv.style.touchAction='none';
  cv.addEventListener('pointerdown',e=>{CUBBON.drag=true;CUBBON.lastX=e.clientX;CUBBON.lastY=e.clientY;cv.style.cursor='grabbing';cv.setPointerCapture?.(e.pointerId);});
  cv.addEventListener('pointermove',e=>{if(!CUBBON.drag)return;CUBBON.rot+=(e.clientX-CUBBON.lastX)*.006;CUBBON.elev=clamp(CUBBON.elev-(e.clientY-CUBBON.lastY)*.004,0.22,1.35);CUBBON.lastX=e.clientX;CUBBON.lastY=e.clientY;renderCubbon();});
  const end=()=>{CUBBON.drag=false;cv.style.cursor='grab';}; cv.addEventListener('pointerup',end); cv.addEventListener('pointerleave',end);
  cv.addEventListener('wheel',e=>{e.preventDefault();CUBBON.dist=clamp(CUBBON.dist+e.deltaY*.08,90,380);renderCubbon();},{passive:false});
  rs();
}
function buildCityModel(T,g){
  const rng=mulberry(7), R=150, step=15, dark=isDark();
  const ground=new T.Mesh(new T.PlaneGeometry(R*2.7,R*2.7),new T.MeshStandardMaterial({color:dark?0x23262b:0xd9dade,roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-0.1;g.add(ground);
  // harbour / water on the +x side
  const water=new T.Mesh(new T.PlaneGeometry(160,320),new T.MeshStandardMaterial({color:0x2aa6b0,emissive:0x0b5560,emissiveIntensity:.15,roughness:.25,metalness:.15}));
  water.rotation.x=-Math.PI/2;water.position.set(170,0,0);g.add(water);
  // parks
  const parkMat=new T.MeshStandardMaterial({color:dark?0x2c4a26:0x8fbf6a,roughness:1});
  const parks=[[70,-70,34,26],[-90,80,30,24],[120,-100,34,28],[-40,-120,30,22]];
  parks.forEach(p=>{const m=new T.Mesh(new T.PlaneGeometry(p[2],p[3]),parkMat);m.rotation.x=-Math.PI/2;m.position.set(p[0],0.02,p[1]);g.add(m);});
  // road grid
  const roadMat=new T.MeshStandardMaterial({color:dark?0x4a4f57:0x9aa0a8,roughness:1});
  for(let x=-R;x<=112;x+=step){const m=new T.Mesh(new T.PlaneGeometry(1.8,R*2),roadMat);m.rotation.x=-Math.PI/2;m.position.set(x,0.04,0);g.add(m);}
  for(let z=-R;z<=R;z+=step){const m=new T.Mesh(new T.PlaneGeometry(284,1.8),roadMat);m.rotation.x=-Math.PI/2;m.position.set(-19,0.04,z);g.add(m);}
  // orange highways (diagonal)
  const hwMat=new T.MeshBasicMaterial({color:0xe8a23a});
  [[-150,-150,120,150],[-160,70,150,-46]].forEach(p=>{const dx=p[2]-p[0],dz=p[3]-p[1],len=Math.hypot(dx,dz);
    const m=new T.Mesh(new T.PlaneGeometry(len,2.6),hwMat);m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(dz,dx);m.position.set((p[0]+p[2])/2,0.06,(p[1]+p[3])/2);g.add(m);});
  // WHITE MASSING buildings (instanced) — taller toward the centre
  const items=[];
  for(let bx=-R+step;bx<110;bx+=step)for(let bz=-R+step;bz<R;bz+=step){
    let skip=false; parks.forEach(p=>{if(Math.abs(bx-p[0])<18&&Math.abs(bz-p[1])<14)skip=true;}); if(skip)continue;
    const d=Math.hypot(bx,bz), tall=clamp(1-d/170,0,1), n=2+(rng()*3|0);
    for(let k=0;k<n;k++){
      const ox=bx+(rng()-.5)*(step-4.5), oz=bz+(rng()-.5)*(step-4.5);
      const w=2.2+rng()*4.5, dd=2.2+rng()*4.5, h=2+rng()*5 + tall*tall*42*(0.4+rng()*0.6);
      items.push({x:ox,y:h/2,z:oz,w,h,d:dd,c:0.9+rng()*0.08});
    }
  }
  const bmat=new T.MeshStandardMaterial({color:0xffffff,roughness:.82,metalness:.02});
  const inst=new T.InstancedMesh(new T.BoxGeometry(1,1,1),bmat,items.length);
  const M=new T.Matrix4(), col=new T.Color();
  items.forEach((it,i)=>{M.makeScale(it.w,it.h,it.d);M.setPosition(it.x,it.y,it.z);inst.setMatrixAt(i,M);
    const v=dark?0.46+(it.c-0.9)*1.4:it.c; col.setRGB(v,v,Math.min(1,v+0.012)); inst.setColorAt(i,col);});
  inst.instanceMatrix.needsUpdate=true; if(inst.instanceColor)inst.instanceColor.needsUpdate=true; g.add(inst);
  // red landmark blocks
  const redMat=new T.MeshStandardMaterial({color:0xb44a3a,roughness:.8});
  [[20,-30,10,8,9],[-60,-10,8,10,7]].forEach(p=>{const b=new T.Mesh(new T.BoxGeometry(p[2],p[4],p[3]),redMat);b.position.set(p[0],p[4]/2,p[1]);g.add(b);});
  // stadiums (white ring + coloured field)
  function stadium(x,z,field){
    const ring=new T.Mesh(new T.CylinderGeometry(9,10,5,30,1,true),new T.MeshStandardMaterial({color:0xf2f2f5,roughness:.8,side:T.DoubleSide}));
    ring.position.set(x,2.5,z);g.add(ring);
    const f=new T.Mesh(new T.CircleGeometry(7,30),new T.MeshStandardMaterial({color:field,roughness:1}));
    f.rotation.x=-Math.PI/2;f.position.set(x,0.12,z);f.scale.set(1,0.72,1);g.add(f);
  }
  stadium(-112,72,0xb44a3a); stadium(-92,44,0x7aa84a);
  if(typeof textSprite==='function'){const sp=textSprite(T,'Bengaluru — full city model');sp.position.set(-20,72,0);sp.scale.set(34,7.5,1);g.add(sp);}
}
