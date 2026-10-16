/* M02 hardware comes from the unchanged native CAD export. Hardware-tour views
   hide named covers/context. Follow-a-piece adds an explicitly conceptual scrap
   overlay from follow-piece.js; it is not measured evidence. */
(() => {
'use strict';
const canvas=document.getElementById('module-canvas'),status=document.getElementById('cad-status'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let gl,program,loc,meshes=[],assembly,ready=false,requested=0,manual=false,frame=0,last=0,drag=null,scene='optical',drawn=0,mode='hardware',pieceProgress=0,pieceMeshes=[],pieceProjected=null,inputProgress=0,settleFrom=0,settleStart=0,settling=false,sceneVisible=true,renderedFrames=0;
const viewport={width:Math.max(1,canvas.clientWidth||1),height:Math.max(1,canvas.clientHeight||1)},settleDuration=120;
const sceneNote=document.getElementById('scene-note'),pieceMarker=document.getElementById('piece-marker'),travelLegend=document.getElementById('travel-direction-legend'),fieldLegend=document.getElementById('field-axis-legend');
const camera={target:[-350,20,1470],radius:800,yaw:-1.05,pitch:-.24},goal={...camera,target:[...camera.target]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t,unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function look(eye,target){const z=unit(eye.map((v,i)=>v-target[i])),x=unit(cross([0,0,1],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function perspective(aspect){const f=1/Math.tan(36*Math.PI/360),near=5,far=20000;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0])}
function tint(c){if(Array.isArray(c))return c.slice(0,3).map(v=>v>1?v/255:v);const h=(c||'#8eb5ae').replace('#','');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)}
function normals(v,ix){const n=new Float32Array(v.length);for(let i=0;i<ix.length;i+=3){const p=ix.slice(i,i+3).map(x=>x*3),a=v.slice(p[1],p[1]+3).map((x,k)=>x-v[p[0]+k]),b=v.slice(p[2],p[2]+3).map((x,k)=>x-v[p[0]+k]),q=cross(a,b);for(const j of p)for(let k=0;k<3;k++)n[j+k]+=q[k]}for(let i=0;i<n.length;i+=3)n.set(unit([...n.slice(i,i+3)]),i);return n}
function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}
function initialize(){gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl||!gl.getExtension('OES_element_index_uint'))throw Error('WebGL mesh rendering is unavailable.');program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;uniform mat4 vp;uniform vec3 offset;varying vec3 N;varying vec3 P;void main(){N=normal;P=position+offset;gl_Position=vp*vec4(P,1.);}`));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec3 N;varying vec3 P;uniform vec3 tint;uniform vec3 eye;uniform vec2 surface;uniform float alpha;uniform float unlit;void main(){vec3 n=normalize(N);if(!gl_FrontFacing)n=-n;vec3 v=normalize(eye-P);vec3 l=normalize(vec3(-.45,-.65,1.));vec3 l2=normalize(vec3(.75,.4,.65));float key=max(dot(n,l),0.);float fill=max(dot(n,l2),0.);float hemi=.28+.14*(n.z*.5+.5);float spec=pow(max(dot(n,normalize(l+v)),0.),surface.x)*surface.y;float rim=pow(1.-max(dot(n,v),0.),3.)*.065;vec3 col=tint*(hemi+key*.70+fill*.24)+vec3(1.,.95,.84)*spec+vec3(.72,.84,.9)*rim;col=pow(clamp(col,0.,1.),vec3(.85));gl_FragColor=vec4(mix(col,tint,unlit),alpha);}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));loc={position:gl.getAttribLocation(program,'position'),normal:gl.getAttribLocation(program,'normal'),vp:gl.getUniformLocation(program,'vp'),tint:gl.getUniformLocation(program,'tint'),eye:gl.getUniformLocation(program,'eye'),surface:gl.getUniformLocation(program,'surface'),offset:gl.getUniformLocation(program,'offset'),alpha:gl.getUniformLocation(program,'alpha'),unlit:gl.getUniformLocation(program,'unlit')};gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(program)}
function buffer(kind,data){const b=gl.createBuffer();gl.bindBuffer(kind,b);gl.bufferData(kind,data,gl.STATIC_DRAW);return b}
const keys=[
 {p:0,target:[-350,20,1470],radius:800,yaw:-1.05,pitch:-.24},
 {p:.42,target:[-330,30,1470],radius:660,yaw:-1.50,pitch:-.20},
 {p:.60,target:[-140,0,1200],radius:1350,yaw:-1.25,pitch:.15},
 {p:.78,target:[0,0,965],radius:690,yaw:-1.08,pitch:.85},
 {p:1.04,target:[0,0,965],radius:630,yaw:-1.20,pitch:.90},
 {p:1.26,target:[300,-119,1055],radius:540,yaw:1.15,pitch:.60},
 {p:1.39,target:[300,-119,1055],radius:470,yaw:1.15,pitch:.60},
 {p:1.55,target:[300,119,1055],radius:540,yaw:-1.15,pitch:.50},
 {p:1.64,target:[300,119,1055],radius:470,yaw:-1.20,pitch:.50},
 {p:1.76,target:[500,-160,1120],radius:1350,yaw:-1.15,pitch:.30},
 {p:1.87,target:[800,-460,1190],radius:1300,yaw:-1.32,pitch:.25},
 {p:2,target:[120,-110,1180],radius:2450,yaw:-1.10,pitch:.35}
];
function sample(p){let i=0;while(i<keys.length-2&&p>keys[i+1].p)i++;const a=keys[i],b=keys[i+1],t=clamp((p-a.p)/(b.p-a.p),0,1),u=t*t*(3-2*t);return{target:a.target.map((v,k)=>mix(v,b.target[k],u)),radius:Math.exp(mix(Math.log(a.radius),Math.log(b.radius),u)),yaw:mix(a.yaw,b.yaw,u),pitch:mix(a.pitch,b.pitch,u)}}
function setData(key,value){if(canvas.dataset[key]!==value)canvas.dataset[key]=value}
function setNote(value){if(sceneNote.textContent!==value)sceneNote.textContent=value}
function updateGoal(pieceState){if(mode==='piece'&&window.ferroPieceScene){Object.assign(goal,window.ferroPieceScene.cameraAt(pieceProgress));const state=pieceState||window.ferroPieceScene.stateAt(pieceProgress,{details:false});scene=state.station;setData('scene',scene);setData('mode','piece');setData('pieceProgress',pieceProgress.toFixed(5));setNote(state.routing?.active?'Conceptual host routing · entire mixed piece':state.routing?.opacity>0?'Transition · conceptual host routing':state.cutaway>0?'Conceptual example · belt/window shown transparent':state.station==='transverse'?'Conceptual example · housings + near former omitted':'Conceptual scrap · actual CAD context');return}setData('mode','hardware');const p=reduced.matches?(requested<.62?.15:requested<1.65?1.08:1.9):requested;Object.assign(goal,reduced.matches&&requested>=.62&&requested<1.65?{target:[150,0,1010],radius:1150,yaw:-1.30,pitch:.65}:sample(p));scene=requested<.62?'optical':requested<1.65?'induction':'output';setData('scene',scene);setNote(scene==='induction'?'Cutaway · covers, insulation + near housing omitted':scene==='optical'?'Optical assembly · surrounding frame omitted':'Actual CAD · host shown for context');}
function changed(){if(!frame&&ready&&sceneVisible&&!document.hidden)frame=requestAnimationFrame(render)}
function pauseGuide(){if(manual)return;settling=false;manual=true;Object.assign(goal,camera,{target:[...camera.target]});window.dispatchEvent(new Event('ferrosift-manual'))}
function visible(o){
 const id=o.id;
 if(mode==='piece')return window.ferroPieceScene.hardwareVisible(o,pieceProgress);
 if(/_insulation$/.test(id)||/calibration_(carrier|handle|coupon)/.test(id))return false;
 const optical=o.group==='optical'&&!/optical_(slotted_carrier|carrier_|top_service_cover|lid_spacer)/.test(id)&&!o.default_hidden;
 const transit=!reduced.matches&&requested>.44&&requested<.80;
 if(transit&&optical)return true;
 if(scene==='optical'&&!transit)return optical;
 if(scene==='induction'||transit||(!reduced.matches&&requested<1.78)){
   if(scene==='output'&&o.group==='controls')return !o.default_hidden;
   if(!['under_belt','transverse'].includes(o.group))return false;
   if(['module_support_window','under_cartridge_cover','side_face_cover_-1','side_face_cover_1'].includes(id))return false;
   if(o.presentation?.hide_in_induction||assembly.presentation?.induction_hidden_ids?.includes(id)||assembly.presentationHideSets?.induction_inspection?.includes(id)||assembly.presentationHideSets?.near_side_housing_cutaway?.includes(id)||assembly.presentationHideSets?.bare_windings?.includes(id))return false;
   return !o.default_hidden||o.winding_part==='bobbin'||o.winding_part==='retainer'||o.winding_part==='terminal';
 }
 return !o.default_hidden||/^(optical_top_service_cover|under_cartridge_cover|side_face_cover_|outer_lane_pod_guard_)/.test(id);
}
function material(o){let c=tint(o.color),surface=[30,.10];if(o.scope==='host_reference')c=[.42,.47,.45];if(o.materialClass==='metal')surface=[65,.30];if(o.materialClass==='coil_conductor'||o.materialClass==='coil_terminal')surface=[95,.58];if(o.materialClass==='optical_glass'||/lens_glass|aperture/.test(o.id)){c=[.07,.13,.16];surface=[130,.65]}if(o.winding_part==='bobbin'||o.winding_part==='retainer'||/former/.test(o.id)){c=[.17,.23,.26];surface=[38,.14]}return{c,surface}}
function drawMesh(m,offset=[0,0,0],alpha=1){gl.bindBuffer(gl.ARRAY_BUFFER,m.v);gl.enableVertexAttribArray(loc.position);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,m.n);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.i);gl.uniform3fv(loc.tint,m.c);gl.uniform2fv(loc.surface,m.surface);gl.uniform3fv(loc.offset,offset);gl.uniform1f(loc.alpha,alpha);gl.uniform1f(loc.unlit,m.unlit||0);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,0);}
function project(point,vp,w,h){const p=[...point,1],v=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)v[r]+=vp[c*4+r]*p[c];return{x:(v[0]/v[3]*.5+.5)*w,y:(.5-v[1]/v[3]*.5)*h,visible:v[3]>0&&Math.abs(v[0]/v[3])<1&&Math.abs(v[1]/v[3])<1};}
function render(now){frame=0;if(!ready||!sceneVisible||document.hidden)return;
 // This is the only piece presentation clock. The finite cubic reaches the
 // current input exactly with zero terminal velocity; it never extrapolates.
 if(mode==='piece'&&!manual&&settling){const t=clamp((now-settleStart)/settleDuration,0,1);pieceProgress=mix(settleFrom,inputProgress,1-(1-t)**3);if(t>=1){pieceProgress=inputProgress;settling=false;}}
 const state=mode==='piece'?window.ferroPieceScene.stateAt(pieceProgress,{details:false}):null;
 if(state&&!manual)updateGoal(state);
 const dt=last?Math.min(now-last,50):16;last=now;const t=mode==='piece'||reduced.matches?1:1-Math.exp(-dt/125);let delta=0;for(let k=0;k<3;k++){const d=goal.target[k]-camera.target[k];camera.target[k]+=d*t;delta=Math.max(delta,Math.abs(d)/1000)}for(const k of ['radius','yaw','pitch']){const d=goal[k]-camera[k];camera[k]+=d*t;delta=Math.max(delta,Math.abs(d)/(k==='radius'?1000:1))}
 const w=viewport.width,h=viewport.height,dpr=Math.min(devicePixelRatio||1,1.8,Math.sqrt(1800000/(w*h)));if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const fit=Math.max(1,.95/(w/h))*(mode==='piece'&&w<500?1.08:1),r=camera.radius*fit,eye=[camera.target[0]+r*Math.cos(camera.pitch)*Math.cos(camera.yaw),camera.target[1]+r*Math.cos(camera.pitch)*Math.sin(camera.yaw),camera.target[2]+r*Math.sin(camera.pitch)],vp=multiply(perspective(w/h),look(eye,camera.target));gl.uniformMatrix4fv(loc.vp,false,vp);gl.uniform3fv(loc.eye,eye);drawn=0;
 const cutaway=state?.cutaway||0;
 // Transparency is a labelled presentation cutaway of the original belt/window,
 // not a change in the physical support or the source CAD geometry.
 // RGB uses source alpha, while framebuffer alpha accumulates coverage once.
 // Squaring source alpha here makes premultiplied canvas edges flash white.
 const hardwareOpacity=state?state.routing.hardwareOpacity:1;
 const translucent=[];
 for(const m of meshes){const eligibility=state?window.ferroPieceScene.hardwareOpacity(m.pieceCategory,pieceProgress):visible(m.o)?1:0;if(eligibility<=0)continue;const beltAlpha=m.pieceCategory==='belt'?mix(1,.20,cutaway):m.pieceCategory==='window'?mix(1,.12,cutaway):1,alpha=hardwareOpacity*eligibility*beltAlpha;if(alpha<.999){translucent.push({m,alpha});continue}drawMesh(m);drawn++;}
 if(translucent.length){gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);for(const {m,alpha} of translucent){if(alpha>.001){drawMesh(m,[0,0,0],alpha);drawn++;}}gl.depthMask(true);gl.disable(gl.BLEND);}
 if(state){
  // Crossfade a labelled, separate routing diagram while keeping the same whole
  // fragment. Neither a new actuator nor a physical capture path is asserted.
  if(state.routing.opacity>0){gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);for(const m of pieceMeshes)if(m.tag==='route')drawMesh(m,[0,0,1000],state.routing.opacity);gl.depthMask(true);gl.disable(gl.BLEND);}
  for(const m of pieceMeshes)if(m.tag==='piece')drawMesh(m,state.pose.translation);
  // World-fixed, depth-tested annotations. They do not inherit piece motion,
  // and no disabling of depth test makes an axis visible through solid scrap.
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  for(const m of pieceMeshes){const alpha=m.tag==='travel'?state.annotations.travelOpacity:!manual&&m.tag==='bottomAxis'?state.annotations.bottomOpacity:!manual&&m.tag==='sideAxis'?state.annotations.sideOpacity:0;if(alpha>.001)drawMesh(m,[0,0,0],alpha);}
  gl.depthMask(true);gl.disable(gl.BLEND);
  pieceProjected=project([state.x,state.y,1070],vp,w,h);
 } else pieceProjected=null;
 for(const [id,point] of [['route-steel-label',[735,165,1003]],['route-mixed-label',[650,-125,1003]]]){const label=document.getElementById(id);if(label){const opacity=state?.routing.opacity||0,q=opacity>0?project(point,vp,w,h):null;label.hidden=!q||!q.visible;label.style.opacity=opacity;if(q){label.style.left=clamp(q.x,75,w-75)+'px';label.style.top=q.y+'px';}}}
 const marker=pieceMarker;if(marker){marker.hidden=!pieceProjected||!pieceProjected.visible;if(pieceProjected){marker.style.left=pieceProjected.x+'px';marker.style.top=pieceProjected.y+'px';}}
 setData('drawn',String(drawn));setData('overlay',state?'conceptual':'none');renderedFrames++;
 if(travelLegend)travelLegend.hidden=!state||state.annotations.travelOpacity<=.001;
 if(fieldLegend)fieldLegend.hidden=!state||manual||Math.max(state.annotations.bottomOpacity,state.annotations.sideOpacity)<=.001;
 if(state)window.dispatchEvent(new CustomEvent('ferrosift-piece-presented',{detail:{progress:pieceProgress,inputProgress,settling,frame:renderedFrames}}));
 if(mode==='piece'&&settling||mode==='hardware'&&delta>.00025)changed();}
// Piece, camera, station annotations and captions use the same presented p.
// Native scroll only supplies the target; no second controller RAF is needed.
function pieceState(){if(mode!=='piece'||!window.ferroPieceScene)return null;return{...window.ferroPieceScene.stateAt(pieceProgress),projected:pieceProjected?{...pieceProjected}:null};}
window.ferroWalkthrough={
 setProgress(p){requested=clamp(p,0,2);if(mode==='hardware'&&!manual){updateGoal();changed()}},
 setMode(next){if(!['piece','hardware'].includes(next))return;if(next==='piece'&&!window.ferroPieceScene)return;mode=next;manual=false;settling=false;if(mode==='piece')pieceProgress=inputProgress;updateGoal();Object.assign(camera,goal,{target:[...goal.target]});changed()},
 setPieceProgress(p,{resumeOnProgressChange=true,immediate=false}={}){const next=clamp(p,0,1),progressChanged=Math.abs(next-inputProgress)>1e-7,resumed=mode==='piece'&&manual&&progressChanged&&resumeOnProgressChange;inputProgress=next;
  if(mode==='piece'){if(progressChanged&&resumeOnProgressChange)manual=false;
   if(immediate||reduced.matches||!ready||!sceneVisible||document.hidden){pieceProgress=inputProgress;settling=false;}
   else if(progressChanged&&!manual){settleFrom=pieceProgress;settleStart=performance.now();settling=Math.abs(inputProgress-pieceProgress)>1e-7;}
   if(!manual&&!settling){updateGoal();Object.assign(camera,goal,{target:[...goal.target]})}changed();if(resumed)window.dispatchEvent(new Event('ferrosift-resume'));}},
 resume(){manual=false;settling=false;if(mode==='piece')pieceProgress=inputProgress;updateGoal();changed()},
 getState:()=>({ready,manual,mode,scene,progress:requested,inputProgress,presentedProgress:pieceProgress,settling,settleDurationMs:settleDuration,settleDeadline:settling?settleStart+settleDuration:null,renderedFrames,framePending:!!frame,sceneVisible,components:meshes.length,drawn,piece:pieceState(),camera:{...camera,target:[...camera.target]}})
};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,touch:e.pointerType==='touch',accepted:e.pointerType!=='touch'};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.accepted){const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.4)return;drag.accepted=true}pauseGuide();goal.yaw-=(e.clientX-drag.x)*.006;goal.pitch=clamp(goal.pitch+(e.clientY-drag.y)*.004,-.6,1.45);drag.x=e.clientX;drag.y=e.clientY;changed()});for(const ev of['pointerup','pointercancel'])canvas.addEventListener(ev,()=>drag=null);
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){window.ferroWalkthrough.resume();window.dispatchEvent(new Event('ferrosift-resume'));return}pauseGuide();if(e.key==='ArrowLeft')goal.yaw-=.12;if(e.key==='ArrowRight')goal.yaw+=.12;if(e.key==='ArrowUp')goal.pitch=clamp(goal.pitch+.10,-.6,1.45);if(e.key==='ArrowDown')goal.pitch=clamp(goal.pitch-.10,-.6,1.45);if(['+','='].includes(e.key))goal.radius=Math.max(80,goal.radius*.88);if(e.key==='-')goal.radius=Math.min(6000,goal.radius/.88);changed()});new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r){viewport.width=Math.max(1,r.width);viewport.height=Math.max(1,r.height)}changed()}).observe(canvas);
function suspendPresentation(){if(frame)cancelAnimationFrame(frame);frame=0;last=0;settling=false;if(!manual)pieceProgress=inputProgress;}
new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;if(!sceneVisible)suspendPresentation();else changed()},{rootMargin:'80px'}).observe(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendPresentation();else changed()});
reduced.addEventListener('change',()=>{settling=false;pieceProgress=inputProgress;if(!manual)updateGoal();changed()});
(async()=>{try{const response=await fetch(new URL('../engineering/revalis-module-assembly.json',document.currentScript?.src||new URL('module-explorer/viewer.js',location.href)),{cache:'no-store'});if(!response.ok)throw Error('CAD export unavailable.');assembly=await response.json();if(assembly.units!=='mm'||!Array.isArray(assembly.objects))throw Error('CAD mesh contract unavailable.');initialize();const ids=new Set();let triangles=0;meshes=assembly.objects.map(o=>{if(!o.id||ids.has(o.id)||!['module','host_reference'].includes(o.scope)||!Array.isArray(o.vertices)||o.vertices.some(v=>!Number.isFinite(v))||!Array.isArray(o.indices)||o.indices.some(v=>!Number.isInteger(v)||v<0||v>=o.vertices.length/3))throw Error('Invalid native CAD component.');ids.add(o.id);triangles+=o.indices.length/3;return{o,pieceCategory:window.ferroPieceScene?.hardwareCategory(o)||'none',...material(o),v:buffer(gl.ARRAY_BUFFER,new Float32Array(o.vertices)),n:buffer(gl.ARRAY_BUFFER,o.normals?new Float32Array(o.normals):normals(o.vertices,o.indices)),i:buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(o.indices)),count:o.indices.length}});if(window.ferroPieceScene)pieceMeshes=window.ferroPieceScene.makeGeometry().map(m=>({...m,c:m.color,v:buffer(gl.ARRAY_BUFFER,new Float32Array(m.vertices)),n:buffer(gl.ARRAY_BUFFER,new Float32Array(m.normals)),i:buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(m.indices)),count:m.indices.length}));ready=true;canvas.dataset.ready='true';status.textContent=`Native CAD export: ${meshes.length} components / ${triangles.toLocaleString()} triangles. Coordinates in millimetres. Inspection views omit covers, winding insulation and surrounding context; all displayed hardware comes from the native CAD export. Follow-a-piece adds one conceptual irregular mixed scrap and a separate host-routing schematic, not measured responses or verified tracking.`;document.getElementById('model-loading').hidden=true;updateGoal();Object.assign(camera,goal,{target:[...goal.target]});changed();window.dispatchEvent(new Event('ferrosift-ready'))}catch(error){canvas.hidden=true;document.getElementById('model-loading').hidden=true;document.getElementById('module-fallback').hidden=false;status.textContent='Interactive CAD unavailable. Native STEP and drawings remain accessible.';canvas.dataset.error=error.message;window.dispatchEvent(new Event('ferrosift-fallback'))}})();
})();
