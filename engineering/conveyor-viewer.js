/* Ferrosift conveyor concept viewer. No runtime dependencies or external requests.
 * Assembly geometry is loaded from the adjacent conveyor-assembly.json file.
 * Moving sample markers and routing windows are explanatory, never inference.
 * Coordinates remain in assembly millimetres: X travel, Y transverse, Z up.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) api.mount(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const I = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  const mul = (a,b) => {const o = new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++) o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;};
  function trs(p=[0,0,0],r=[0,0,0]) {
    const [x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
    return new Float32Array([cy*cz,cy*sz,-sy,0,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,0,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy,0,...p,1]);
  }
  const point = (m,p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function look(eye,target) {const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,0,1],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
  function perspective(aspect) {const f=1/Math.tan(38*Math.PI/360),n=10,z=80000;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(z+n)/(n-z),-1,0,0,2*z*n/(n-z),0]);}
  const finiteArray=(a,n)=>Array.isArray(a)&&(!n||a.length===n)&&a.every(Number.isFinite);
  function validateAssembly(data) {
    if (!data || data.units!=='mm' || !Array.isArray(data.objects) || !data.objects.length) throw Error('Assembly must contain millimetre mesh objects.');
    const ids=new Set();let coordinates=0,triangles=0;
    for(const m of data.objects) {
      if(typeof m.id!=='string'||!m.id||ids.has(m.id)) throw Error('Each assembly object needs a unique id.');ids.add(m.id);
      if(!finiteArray(m.vertices)||m.vertices.length<9||m.vertices.length%3) throw Error('Invalid vertices for '+m.id);
      if(!finiteArray(m.indices)||m.indices.length%3||!m.indices.length||m.indices.some(i=>!Number.isInteger(i)||i<0||i>=m.vertices.length/3)) throw Error('Invalid triangle indices for '+m.id);
      if(m.normals && (!finiteArray(m.normals,m.vertices.length))) throw Error('Invalid normals for '+m.id);
      for(const k of ['position','rotation','explode']) if(k in m&&!finiteArray(m[k],3)) throw Error('Invalid '+k+' for '+m.id);
      if('color' in m && !(typeof m.color==='string'&&/^#[0-9a-f]{6}$/i.test(m.color)) && !(Array.isArray(m.color)&&[3,4].includes(m.color.length)&&m.color.every(v=>Number.isFinite(v)&&v>=0&&v<=255))) throw Error('Invalid color for '+m.id);
      if('opacity' in m&&!Number.isFinite(m.opacity)) throw Error('Invalid opacity for '+m.id);
      if('default_hidden' in m&&typeof m.default_hidden!=='boolean') throw Error('Invalid visibility for '+m.id);
      if('animation' in m){const a=m.animation;if(!a||!['roller','review-gate','belt'].includes(a.type))throw Error('Invalid animation for '+m.id);if(a.type==='belt'){if('direction' in a&&!finiteArray(a.direction,3))throw Error('Invalid belt animation for '+m.id);}else{if(!['x','y','z'].includes(a.axis)||!finiteArray(a.pivot,3))throw Error('Invalid animation for '+m.id);if(a.type==='roller'&&(!Number.isFinite(a.radius)||a.radius<=0||('direction' in a&&!Number.isFinite(a.direction))))throw Error('Invalid roller animation for '+m.id);if(a.type==='review-gate'&&(!Number.isFinite(a.angle)||('balanceAngle' in a&&!Number.isFinite(a.balanceAngle))))throw Error('Invalid gate animation for '+m.id);}}
      coordinates+=m.vertices.length;triangles+=m.indices.length/3;
    }
    if(coordinates>18000000||triangles>6000000) throw Error('Assembly exceeds the viewer mesh budget.');
    if(data.routes) for(const path of Object.values(data.routes)) if(!Array.isArray(path)||path.length<2||path.some(p=>!finiteArray(p,3))) throw Error('Invalid illustrative routing path.');
    if(data.serviceZones)for(const zone of data.serviceZones)if(!zone||!Array.isArray(zone.points)||zone.points.length<3||zone.points.some(p=>!finiteArray(p,3)))throw Error('Invalid reserved service envelope.');
    return {objects:ids.size,triangles};
  }
  function vertexNormals(vertices,indices) {
    const out=new Float32Array(vertices.length);
    for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3).map(x=>x*3),a=vertices.slice(ids[0],ids[0]+3),b=vertices.slice(ids[1],ids[1]+3),c=vertices.slice(ids[2],ids[2]+3),n=cross(b.map((v,k)=>v-a[k]),c.map((v,k)=>v-a[k]));for(const id of ids) for(let k=0;k<3;k++) out[id+k]+=n[k];}
    for(let i=0;i<out.length;i+=3){const n=norm(Array.from(out.slice(i,i+3)));out.set(n,i);}return out;
  }
  function reviewPhase(time) {
    const t=((time%26)+26)%26;
    if(t<8)return{key:'normal',label:'Normal batch · target / balance',feed:true,review:false};
    if(t<14)return{key:'drain',label:'Feed inhibited · clear the balance path',feed:false,review:false};
    if(t<15)return{key:'verify',label:'Gate change · await position feedback',feed:false,review:true};
    if(t<19)return{key:'review',label:'Conservative review window · balance group',feed:true,review:true};
    if(t<25)return{key:'clear',label:'Feed inhibited · clear review window',feed:false,review:true};
    return{key:'restore',label:'Gate restore · await position feedback',feed:false,review:false};
  }
  function kinematics(speed) {return{mmPerFrame:1000*speed/30,lastSensorToLipSeconds:1.25/speed,deckTransitSeconds:3/speed};}
  function pointOnPath(path,t) {
    t=Math.max(0,Math.min(1,t));const lengths=[];let total=0;for(let i=1;i<path.length;i++){total+=Math.hypot(...path[i].map((v,k)=>v-path[i-1][k]));lengths.push(total);}
    const d=t*total;let i=lengths.findIndex(v=>v>=d);if(i<0)i=lengths.length-1;const before=i?lengths[i-1]:0,f=(d-before)/(lengths[i]-before||1);return path[i].map((v,k)=>v+(path[i+1][k]-v)*f);
  }
  // Keep outlet names readable even when their projected bin positions converge.
  // On narrow canvases, two-line cards share a single row with leader lines.
  function layoutRouteLabels(entries,width,height) {
    if(!entries.length||width<60||height<60)return[];
    const compact=width<520,pad=12,gap=compact?7:12,n=entries.length;
    const cardWidth=Math.min(compact?126:156,(width-2*pad-gap*(n-1))/n),cardHeight=compact?40:30;
    const ordered=[...entries].sort((a,b)=>a.anchor[0]-b.anchor[0]),total=n*cardWidth+(n-1)*gap;
    const mid=ordered.reduce((s,e)=>s+e.anchor[0],0)/n;
    const start=Math.max(pad,Math.min(width-pad-total,mid-total/2));
    const y=Math.max(pad,Math.min(height-pad-cardHeight,Math.max(...ordered.map(e=>e.anchor[1]))+28));
    return ordered.map((e,i)=>({...e,x:start+i*(cardWidth+gap),y,width:cardWidth,height:cardHeight,compact}));
  }
  function color(value) {if(Array.isArray(value)){const c=value.slice(0,3);return c.some(v=>v>1)?c.map(v=>v/255):c;}const h=String(value||'#87939d').replace('#','');if(/^[0-9a-f]{6}$/i.test(h))return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);return[.52,.58,.63];}
  function bounds(object) {const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],localLo=[...lo],localHi=[...hi],m=trs(object.position,object.rotation);for(let i=0;i<object.vertices.length;i+=3){const local=object.vertices.slice(i,i+3),p=point(m,local);for(let k=0;k<3;k++){localLo[k]=Math.min(localLo[k],local[k]);localHi[k]=Math.max(localHi[k],local[k]);lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}}return{lo,hi,localLo,localHi,center:lo.map((v,k)=>(v+hi[k])/2),localCenter:localLo.map((v,k)=>(v+localHi[k])/2)};}
  function tourPosition(centers,viewportY) {
    if(!centers.length||viewportY<=centers[0])return 0;
    for(let i=0;i<centers.length-1;i++)if(viewportY<=centers[i+1])return i+(viewportY-centers[i])/Math.max(1,centers[i+1]-centers[i]);
    return centers.length-1;
  }
  function sampleCamera(cameras,progress,aspect=1) {
    const p=Math.max(0,Math.min(cameras.length-1,progress)),i=Math.floor(p),j=Math.min(cameras.length-1,i+1),raw=p-i,t=raw*raw*(3-2*raw),a=cameras[i],b=cameras[j];
    const target=a.target.map((v,k)=>v+(b.target[k]-v)*t),polar=c=>{const d=c.eye.map((v,k)=>v-c.target[k]),r=Math.hypot(...d);return {r,yaw:Math.atan2(d[1],d[0]),pitch:Math.asin(d[2]/r)};},pa=polar(a),pb=polar(b);
    let turn=pb.yaw-pa.yaw;while(turn>Math.PI)turn-=2*Math.PI;while(turn<-Math.PI)turn+=2*Math.PI;
    const fit=k=>(k===0||k===cameras.length-1)?Math.max(1,1.65/aspect):Math.max(1,.74/aspect);
    return {target,radius:(pa.r+(pb.r-pa.r)*t)*(fit(i)+(fit(j)-fit(i))*t),yaw:pa.yaw+turn*t,pitch:pa.pitch+(pb.pitch-pa.pitch)*t};
  }
  function mount(win) {
    const doc=win.document,$=id=>doc.getElementById(id),canvas=$('machine-canvas');if(!canvas)return;
    const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
    const script=doc.currentScript,base=new URL('.',script.src),state={ready:false,paused:win.matchMedia('(prefers-reduced-motion: reduce)').matches,exploded:false,free:true,section:false,dimensions:false,service:false,annotations:false,technicalTopic:'',optionalDepth:false,progress:0,currentStage:0,time:0,travel:0,sequenceTime:0,speed:1,selected:'',hidden:new Set(),shownCategories:new Set(),reviewAssignments:0,reviewNeighbours:0,yaw:0,pitch:0,zoom:1,objects:0,triangles:0};
    const stageNames=['SYSTEM LAYOUT','OPTICAL INSPECTION','INDUCTION TEST BAY','POSITION + WINDOWS','TWO-STAGE ROUTING','VALIDATION PLAN'];
    const api={available:false,update,pause:v=>{state.paused=!!v;dirty=true;},explode:v=>{state.exploded=!!v;dirty=true;},orbit:v=>{state.free=!!v;canvas.classList.toggle('explorable',state.free);dirty=true;},reset(){state.optionalDepth=false;state.technicalTopic='';win.ferroTechnical?.close();state.yaw=0;state.pitch=0;state.zoom=1;state.exploded=false;state.section=false;state.selected='';state.dimensions=false;state.service=false;state.annotations=false;if(doc.querySelector('.scene-step'))update();else{state.currentStage=0;state.progress=0;syncStage();}for(const id of ['dimensions-toggle','service-toggle','annotation-toggle'])if($(id))$(id).setAttribute('aria-pressed','false');if($('section-toggle'))$('section-toggle').setAttribute('aria-pressed','false');if($('component-select'))$('component-select').value='';dirty=true;},halftone(){},getState:()=>({...state,hidden:[...state.hidden],shownCategories:[...state.shownCategories],camera:{eye:[...camera.eye],target:[...camera.target],destination:camera.destination,settling:camera.settling,error:camera.error},renderStats:{...renderStats},renderer:state.ready?'assembly-webgl':'static-schematic'}),setSpeed(v){if(Number.isFinite(v))state.speed=Math.max(.5,Math.min(2,v));syncReadout();dirty=true;},selectPart,inspectTopic,clearTechnical(){state.technicalTopic='';state.selected='';state.optionalDepth=false;if($('component-select'))$('component-select').value='';dirty=true;},setStage(v){state.technicalTopic='';state.optionalDepth=false;win.ferroTechnical?.close();if($('component-select'))$('component-select').value='';const stage=Math.max(0,Math.min(5,Number(v)||0));state.yaw=0;state.pitch=0;state.zoom=1;state.selected='';const step=doc.querySelectorAll('.scene-step')[Math.round(stage)];if(step){const rect=step.getBoundingClientRect();win.scrollTo({top:win.scrollY+rect.top+rect.height/2-win.innerHeight/2,behavior:reduced.matches?'instant':'smooth'});update();}else{state.progress=stage;state.currentStage=Math.round(stage);syncStage();}dirty=true;}};
    win.ferroScene=api;
    let dirty=true,visible=true,last=0,assembly=null,meshes=[],gl=null,program,locations,viewProjection=I(),explosion=0,lastPhase='',particles=[],birthAt=0,sampleSerial=0;
    let shadowProgram,shadowLocations,shadowFBO,shadowTexture,shadowVP,groundMesh,shadowSignature='',shadowDepth=false;
    const renderStats={frames:0,lastRenderMs:0,shadowPasses:0,drawCalls:0,shadowDrawCalls:0,pixelRatio:1,shadowSize:1024,batches:0,overlayUpdates:0};
    let batches=[],drawCache=null,drawCacheKey='',shadowLastTime=-Infinity,lastOverlayKey='',overlayLastTime=0,frameDrawCalls=0,shadowDrawCalls=0;
    const modelCache=new Map(),matrixIdentity=I();let geometryRevision=0;
    const shadowSize=1024,pixelBudget=1800000;let adaptiveScale=1,slowFrames=0;const size={width:1,height:1,revision:0};
    const camera={eye:[3400,-4800,3000],target:[1420,0,850],destination:null,settling:false,error:0,initialized:false};
    const overlay=$('assembly-overlay'),fallback=$('webgl-fallback'),status=$('assembly-status'),phaseLabel=$('routing-phase');
    // Stack the notice, status and controls using their actual rendered heights.
    // This avoids overlaps when text or controls wrap on a narrow screen.
    const footerRoot=typeof canvas.closest==='function'?canvas.closest('.machine-stage, .assembly-viewport'):null;
    function syncFooterLayout(){if(!footerRoot)return;const notice=footerRoot.querySelector('.scene-disclaimer'),controls=footerRoot.querySelector('.scene-bottomline')||footerRoot.querySelector('.scene-controls');const h=node=>node?Math.ceil(node.getBoundingClientRect().height):0;const sizes={notice:h(notice),controls:h(controls),status:h(status),phase:h(phaseLabel)};for(const[k,v]of Object.entries(sizes))footerRoot.style.setProperty('--assembly-'+k+'-height',v+'px');footerRoot.style.setProperty('--assembly-footer-height',(16+sizes.notice+8+sizes.status+12+sizes.controls+14+sizes.phase)+'px');dirty=true;}
    if(footerRoot){const targets=[footerRoot.querySelector('.scene-disclaimer'),footerRoot.querySelector('.scene-bottomline')||footerRoot.querySelector('.scene-controls'),status,phaseLabel].filter(Boolean);if(win.ResizeObserver){const observer=new win.ResizeObserver(syncFooterLayout);targets.forEach(n=>observer.observe(n));}win.addEventListener('resize',syncFooterLayout,{passive:true});if(doc.fonts&&doc.fonts.ready)doc.fonts.ready.then(syncFooterLayout);syncFooterLayout();}
    function message(text,error=false){if(status){status.textContent=text;status.classList.toggle('is-error',error);}}
    function syncStage(){const i=state.currentStage;if($('view-select'))$('view-select').value=String(i);doc.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.view)===i)));if($('focus-note')){$('focus-note').hidden=i===0||i===5;$('focus-note').textContent=['','Optical inspection · device envelope; coverage unvalidated.','Induction cassette · measures response below the belt. Airjet and gate sort downstream.','Last sensing datum · 1250 mm before the discharge lip.','Airjet: target / balance. Gate: balance-group review. Illustrative sequence.',''][i];}if($('stage-number'))$('stage-number').textContent=String(i).padStart(2,'0')+' / 05';if($('stage-name'))$('stage-name').textContent=stageNames[i];doc.querySelectorAll('.stage-dots i').forEach((d,k)=>d.classList.toggle('active',k===i));if($('scene-tag-text'))$('scene-tag-text').textContent=['Parametric layout · concept only','RGB + optional depth · no PCB model yet','Adjustable gap · response requires tests','Encoder scheduling · calculated travel only','Airjet target / balance; review by group','Assay, route capture and economics to test'][i];}
    function update(){const steps=[...doc.querySelectorAll('.scene-step')];if(steps.length){const centers=steps.map(el=>{const r=el.getBoundingClientRect();return r.top+r.height*.5;});state.progress=tourPosition(centers,win.innerHeight*.5);const nearest=Math.round(state.progress);if(state.currentStage!==nearest){state.currentStage=nearest;syncStage();}const meter=$('tour-progress');if(meter)meter.style.setProperty('--tour-progress',String(state.progress/Math.max(1,steps.length-1)));}const root=$('machine');if(root){const r=root.getBoundingClientRect();visible=r.bottom>0&&r.top<win.innerHeight;}dirty=true;}
    function syncReadout(){const k=kinematics(state.speed);if($('belt-speed-value'))$('belt-speed-value').textContent=state.speed.toFixed(2)+' m/s';if($('kinematic-readout'))$('kinematic-readout').textContent=k.mmPerFrame.toFixed(1)+' mm/frame at 30 fps · '+k.lastSensorToLipSeconds.toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+' s last sensor → lip';}
    function fail(error){api.available=false;state.ready=false;canvas.hidden=true;if(overlay)overlay.hidden=true;if(fallback)fallback.hidden=false;message('3D assembly unavailable. Use the accessible schematic and component schedule.',true);if($('assembly-error-detail'))$('assembly-error-detail').textContent=String(error.message||error);for(const id of ['explode-toggle','orbit-toggle','section-toggle','dimensions-toggle','service-toggle'])if($(id))$(id).disabled=true;}
    function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
    function setupGL(){
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL is unavailable.');
      const vs=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel;uniform mat4 uVP;uniform mat4 uShadowVP;varying vec3 vNormal;varying vec3 vWorld;varying vec4 vShadow;void main(){vec4 world=uModel*vec4(aPosition,1.);vWorld=world.xyz;vNormal=mat3(uModel)*aNormal;vShadow=uShadowVP*world;gl_Position=uVP*world;}`;
      // Native depth supplies studio-floor contact shadows. Machine surfaces use
      // clean studio lighting; older browsers omit the floor shadows.
      shadowDepth=!!gl.getExtension('WEBGL_depth_texture');
      const fs=`precision highp float;
      varying vec3 vNormal;varying vec3 vWorld;varying vec4 vShadow;
      uniform vec3 uColor;uniform vec3 uEye;uniform float uAlpha;uniform float uSection;uniform float uSelected;uniform float uBelt;uniform float uTravel;uniform float uMetal;uniform float uRough;uniform float uGround;uniform highp sampler2D uShadow;
      float unpackDepth(vec4 c){return ${shadowDepth?'c.r':'1.'};}
      float shadow(vec3 n){vec3 p=vShadow.xyz/vShadow.w*.5+.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;float shade=0.;float bias=max(.001,.003*(1.-dot(n,normalize(vec3(-.35,-.55,1.)))));for(int x=0;x<2;x++)for(int y=0;y<2;y++){float z=unpackDepth(texture2D(uShadow,p.xy+(vec2(float(x),float(y))-.5)*1.6/1024.));shade+=(p.z-bias<=z)?1.:0.;}return .38+.62*shade/4.;}
      void main(){if(uSection>.5&&vWorld.y<0.&&uGround<.5)discard;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 v=normalize(uEye-vWorld);vec3 l=normalize(vec3(-.35,-.55,1.));vec3 h=normalize(v+l);float nl=max(dot(n,l),0.);float nv=max(dot(n,v),.001);float visibility=uGround>.5?shadow(n):1.;
      vec3 base=pow(uColor,vec3(2.2));float hemi=.28+.27*(n.z*.5+.5);vec3 diffuse=base*(hemi+nl*1.65*visibility+max(dot(n,normalize(vec3(.65,.8,.55))),0.)*.38);
      float exponent=mix(150.,9.,uRough);vec3 f0=mix(vec3(.045),base,uMetal);vec3 fresnel=f0+(1.-f0)*pow(1.-nv,5.);float spec=pow(max(dot(n,h),0.),exponent)*(exponent+2.)/24.;
      vec3 reflection=reflect(-v,n);float strip=pow(max(dot(reflection,normalize(vec3(.1,-.8,.9))),0.),mix(60.,7.,uRough));float rim=pow(max(dot(reflection,normalize(vec3(-.7,.7,.5))),0.),12.);
      vec3 c=diffuse*(1.-uMetal*.35)+fresnel*(spec*visibility*.9+strip*.8+rim*.3);c+=uSelected*vec3(.06,.12,.14)*( .4+pow(1.-nv,3.));
      if(uBelt>.5&&abs(n.z)>.6){float seam=1.-smoothstep(.5,2.,abs(mod(vWorld.x-uTravel*sign(n.z),360.)-180.));c+=vec3(.016)*seam;}
      c=c/(c+vec3(.8));c=pow(c,vec3(1./2.2));float alpha=uAlpha;
      if(uGround>.5){float fade=1.-smoothstep(2500.,7200.,length((vWorld.xy-vec2(1350.,0.))*vec2(.65,1.)));alpha*=fade*.86;}
      gl_FragColor=vec4(c,alpha);}`;
      const link=(vertex,fragment)=>{const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;};
      program=link(vs,fs);locations={};for(const n of ['uModel','uVP','uShadowVP','uColor','uEye','uAlpha','uSection','uSelected','uBelt','uTravel','uMetal','uRough','uGround','uShadow'])locations[n]=gl.getUniformLocation(program,n);for(const n of ['aPosition','aNormal'])locations[n]=gl.getAttribLocation(program,n);
      shadowProgram=link('attribute vec3 aPosition;uniform mat4 uModel;uniform mat4 uVP;uniform float uSection;varying vec3 vWorld;void main(){vec4 p=uModel*vec4(aPosition,1.);vWorld=p.xyz;gl_Position=uVP*p;}',`precision highp float;uniform float uSection;varying vec3 vWorld;void main(){if(uSection>.5&&vWorld.y<0.)discard;gl_FragColor=vec4(1.);}`);
      shadowLocations={position:gl.getAttribLocation(shadowProgram,'aPosition'),model:gl.getUniformLocation(shadowProgram,'uModel'),vp:gl.getUniformLocation(shadowProgram,'uVP'),section:gl.getUniformLocation(shadowProgram,'uSection')};
      const radius=4600,near=100,far=17000,ortho=new Float32Array([1/radius,0,0,0,0,1/radius,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);shadowVP=mul(ortho,look([-2600,-5900,11000],[1400,0,500]));
      const texture=(format,type,pixels=null,width=shadowSize,height=shadowSize)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,format,width,height,0,format,type,pixels);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
      if(shadowDepth){
        shadowTexture=texture(gl.DEPTH_COMPONENT,gl.UNSIGNED_INT);
        const shadowColor=texture(gl.RGBA,gl.UNSIGNED_BYTE);
        shadowFBO=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFBO);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,shadowColor,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Shadow framebuffer unavailable');
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      }else shadowTexture=texture(gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]),1,1);
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    }
    // Presentation materials only. Dimensions and vertices stay in the frozen CAD file.
    function material(object){const c=object.category,id=object.id;let rgb=color(object.color),metal=.35,rough=.48;
      if(['frame','hood','guard','controls','drive'].includes(c)){rgb=[.29,.34,.38];metal=.3;rough=.47;}
      if(['roller','bearing','fasteners','tensioning','airjet','chute','feeder','gate'].includes(c)){rgb=[.57,.62,.65];metal=.78;rough=.34;}
      if(c==='bin'){rgb=[.37,.43,.46];metal=.55;rough=.55;}
      if(c==='sensor'){rgb=id==='induction_cassette_tray'?[.30,.46,.44]:[.56,.61,.57];metal=.22;rough=.55;}
      if(c==='belt'||c==='cable'||/pad|handle|baffle/.test(id)){rgb=[.10,.13,.15];metal=0;rough=.82;}
      if(c==='camera'||c==='encoder'){rgb=[.19,.23,.27];metal=.45;rough=.35;}
      if(c==='light'){rgb=[.69,.73,.72];metal=.25;rough=.4;}
      if(/concentrate|review_gate_plate|air_isolation/.test(id)){rgb=[.49,.44,.33];metal=.55;rough=.48;}
      if(object.opacity<1){rgb=[.36,.49,.52];metal=.4;rough=.2;}
      if(c==='studio'){rgb=[.16,.19,.22];metal=0;rough=1;}
      return{color:rgb,metal,rough};
    }
    function bufferMesh(object){const normals=object.normals||vertexNormals(object.vertices,object.indices);let vertices=object.vertices,normalsOut=normals,indices=object.indices;const max=indices.reduce((m,i)=>Math.max(m,i),0),uint=max>65535&&gl.getExtension('OES_element_index_uint');let indexed=true;if(max>65535&&!uint){vertices=[];normalsOut=[];for(const id of indices){vertices.push(...object.vertices.slice(id*3,id*3+3));normalsOut.push(...normals.slice(id*3,id*3+3));}indexed=false;}
      const buffer=(target,data)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);return b;};
      const box=bounds(object);return{object,material:material(object),baseMatrix:trs(object.position,object.rotation),explode:explodeVector(object,box),bounds:box,positions:buffer(gl.ARRAY_BUFFER,new Float32Array(vertices)),normals:buffer(gl.ARRAY_BUFFER,new Float32Array(normalsOut)),index:indexed?buffer(gl.ELEMENT_ARRAY_BUFFER,uint?new Uint32Array(indices):new Uint16Array(indices)):null,count:indices.length,indexType:uint?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,color:color(object.color),opacity:Number.isFinite(object.opacity)?Math.max(0,Math.min(1,object.opacity)):(Array.isArray(object.color)&&object.color.length===4?Math.min(1,object.color[3]):1)};
    }
    function explodeVector(object,b){if(object.explode)return object.explode;const c=String(object.category||'').toLowerCase();if(/optical|camera|light|hood/.test(c))return[0,0,650];if(/sensor|induct/.test(c))return[0,-600,-200];if(/guard|panel|cover/.test(c))return[0,b.center[1]<0?-550:550,180];if(/electric|control|cable/.test(c))return[0,-600,200];if(/sort|chute|bin|air|gate/.test(c))return[650,0,0];return[0,0,0];}
    function modelMatrix(mesh){
      if(modelCache.has(mesh))return modelCache.get(mesh);
      const o=mesh.object;if(explosion===0&&(!o.animation||o.animation.type==='belt'))return mesh.baseMatrix;
      const d=mesh.explode,p=(o.position||[0,0,0]).map((v,i)=>v+d[i]*explosion);let m=trs(p,o.rotation),a=o.animation;
      if(a&&finiteArray(a.pivot,3)){let angle=a.type==='roller'?-state.travel/a.radius*(a.direction||1):a.type==='review-gate'?gateAngle(a):0;const r=[0,0,0];r[{x:0,y:1,z:2}[a.axis]??1]=angle;m=mul(m,mul(trs(a.pivot),mul(trs([0,0,0],r),trs(a.pivot.map(v=>-v)))));}
      modelCache.set(mesh,m);return m;
    }
    // Bake compatible static parts into category/material batches once. Named source
    // meshes remain intact for picking, selection and the frozen geometry record.
    function buildBatches(){const groups=new Map();for(const mesh of meshes){const o=mesh.object;if(mesh.opacity<1||(o.animation&&o.animation.type!=='belt'))continue;
      const key=JSON.stringify([o.category,mesh.material,mesh.explode,!!o.default_hidden,!!(o.optional&&o.installed===false)]);let group=groups.get(key);if(!group){group={id:'batch-'+groups.size,category:o.category,default_hidden:!!o.default_hidden,optional:!!(o.optional&&o.installed===false),installed:o.installed,vertices:[],normals:[],indices:[],sourceIds:[],color:mesh.material.color,explode:mesh.explode};groups.set(key,group);}group.sourceIds.push(o.id);
      const offset=group.vertices.length/3,m=mesh.baseMatrix;for(let i=0;i<o.vertices.length;i+=3){const v=point(m,[o.vertices[i],o.vertices[i+1],o.vertices[i+2]]);group.vertices.push(v[0],v[1],v[2]);const n=o.normals||[];const x=n[i]||0,y=n[i+1]||0,z=n[i+2]||0;group.normals.push(m[0]*x+m[4]*y+m[8]*z,m[1]*x+m[5]*y+m[9]*z,m[2]*x+m[6]*y+m[10]*z);}for(const index of o.indices)group.indices.push(index+offset);
    }batches=[...groups.values()].map(g=>{const b=bufferMesh(g);b.material=material(meshes.find(m=>m.object.id===g.sourceIds[0]).object);return b;});renderStats.batches=batches.length;geometryRevision++;}
    function getDrawCache(){const key=[...state.hidden].join(',')+'|'+[...state.shownCategories].join(',')+'|'+state.selected+'|'+state.optionalDepth+'|'+geometryRevision;if(key===drawCacheKey)return drawCache;drawCacheKey=key;const visible=m=>!state.hidden.has(m.object.category||'Other')&&(!m.object.default_hidden||state.shownCategories.has(m.object.category||'Other'))&&(!(m.object.optional&&m.object.installed===false)||state.optionalDepth);
      const selected=meshes.find(m=>m.object.id===state.selected),opaque=batches.filter(visible),transparent=[],dynamic=[];
      for(const m of meshes){if(state.hidden.has(m.object.category||'Other')||(!visible(m)&&m!==selected))continue;if(m.opacity<1)transparent.push(m);else if(m.object.animation&&m.object.animation.type!=='belt')dynamic.push(m);}
      drawCache={opaque,dynamic,transparent,selected: selected&&!state.hidden.has(selected.object.category||'Other')?selected:null};drawCache.shadow=[...opaque,...dynamic,...transparent.filter(m=>m.opacity>=.8)];if(selected?.object.default_hidden&&!state.shownCategories.has(selected.object.category))drawCache.shadow.push(selected);return drawCache;
    }
    function draw(mesh,m=matrixIdentity,selected=false,section=state.section){frameDrawCalls++;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.positions);gl.enableVertexAttribArray(locations.aPosition);gl.vertexAttribPointer(locations.aPosition,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normals);gl.enableVertexAttribArray(locations.aNormal);gl.vertexAttribPointer(locations.aNormal,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(locations.uModel,false,m);gl.uniform3fv(locations.uColor,mesh.object.category?mesh.material.color:mesh.color);gl.uniform1f(locations.uMetal,mesh.material.metal);gl.uniform1f(locations.uRough,mesh.material.rough);gl.uniform1f(locations.uGround,mesh.object.category==='studio'?1:0);gl.uniform1f(locations.uAlpha,mesh.opacity);gl.uniform1f(locations.uSelected,selected?1:0);gl.uniform1f(locations.uSection,section?1:0);gl.uniform1f(locations.uBelt,mesh.object.category==='belt'?1:0);gl.uniform1f(locations.uTravel,state.travel%360);if(mesh.index){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);}else gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
    function gateAngle(a){const t=((state.sequenceTime%26)+26)%26,smooth=x=>x*x*(3-2*x);let f=t<14?0:t<15?smooth(t-14):t<25?1:1-smooth(t-25);return(a.balanceAngle||0)+((a.angle||0)-(a.balanceAngle||0))*f;}
    const cameras=[{eye:[3400,-4800,3000],target:[1420,0,850]},{eye:[2400,-2200,2280],target:[1440,0,1310]},{eye:[2250,-1930,1270],target:[1600,-80,865]},{eye:[3320,2700,2120],target:[2350,0,995]},{eye:[5450,-2900,2240],target:[3450,0,600]},{eye:[3400,-4800,3000],target:[1420,0,850]}];
    function projection(dt){const aspect=size.width/Math.max(1,size.height),c=sampleCamera(cameras,state.progress,aspect),target=c.target,r=c.radius*state.zoom*(1+explosion*.25),yaw=c.yaw+state.yaw,pitch=Math.max(.025,Math.min(1.48,c.pitch+state.pitch)),eye=[target[0]+Math.cos(yaw)*Math.cos(pitch)*r,target[1]+Math.sin(yaw)*Math.cos(pitch)*r,target[2]+Math.sin(pitch)*r];
      const alpha=reduced.matches||!camera.initialized?1:1-Math.exp(-dt*(pointers.size?18:9));camera.error=0;for(let i=0;i<3;i++){camera.eye[i]+=(eye[i]-camera.eye[i])*alpha;camera.target[i]+=(target[i]-camera.target[i])*alpha;camera.error+=Math.abs(eye[i]-camera.eye[i])+Math.abs(target[i]-camera.target[i]);}camera.initialized=true;camera.destination={eye,target:[...target]};camera.settling=camera.error>.3;if(camera.settling)dirty=true;else{camera.eye=[...eye];camera.target=[...target];}viewProjection=mul(perspective(aspect),look(camera.eye,camera.target));return camera.eye;
    }
    function renderShadow(shown,now){if(!shadowDepth)return;const signature=[explosion.toFixed(3),gateAngle({angle:.45,balanceAngle:-.45}).toFixed(3),state.section,drawCacheKey].join('|');if(signature===shadowSignature)return;if(shadowSignature&&now-shadowLastTime<1000/20){dirty=true;return;}shadowLastTime=now;shadowSignature=signature;renderStats.shadowPasses++;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFBO);gl.viewport(0,0,shadowSize,shadowSize);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.BLEND);gl.depthMask(true);gl.useProgram(shadowProgram);gl.uniformMatrix4fv(shadowLocations.vp,false,shadowVP);gl.uniform1f(shadowLocations.section,state.section?1:0);for(const mesh of shown){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.positions);gl.enableVertexAttribArray(shadowLocations.position);gl.vertexAttribPointer(shadowLocations.position,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(shadowLocations.model,false,modelMatrix(mesh));if(mesh.index){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.drawElements(gl.TRIANGLES,mesh.count,mesh.indexType,0);}else gl.drawArrays(gl.TRIANGLES,0,mesh.count);shadowDrawCalls++;}gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.enable(gl.BLEND);}

    function resize(){size.width=Math.max(1,canvas.clientWidth);size.height=Math.max(1,canvas.clientHeight);size.revision++;dirty=true;}

    function project(p){const m=viewProjection,w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];if(w<=0)return null;return[(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w*size.width/2+size.width/2,size.height/2-(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w*size.height/2];}

    function inspectTopic(topic){const stage={optical:1,induction:2,tracking:3,sorting:4}[topic];if(stage===undefined)return;api.setStage(stage);state.technicalTopic=topic;win.ferroTechnical?.open(topic);dirty=true;}
    function selectPart(id){const mesh=meshes.find(m=>m.object.id===id);state.selected=mesh?mesh.object.id:'';if($('component-select'))$('component-select').value=state.selected;if(mesh){const o=mesh.object;if(o.optional&&o.installed===false)state.optionalDepth=true;state.hidden.delete(o.category||'Other');for(const input of doc.querySelectorAll('#category-controls input'))if(input.dataset.category===o.category)input.checked=true;const topic=win.ferroTechnical?.topicFor(o)||'component';state.technicalTopic=topic;win.ferroTechnical?.open(topic,{...o,bbox:{min:mesh.bounds.lo,max:mesh.bounds.hi}});if($('component-detail'))$('component-detail').textContent=o.note||o.description||o.name||o.id;}dirty=true;}
    function pickPart(clientX,clientY){if(!assembly)return;const rect=canvas.getBoundingClientRect(),nx=(clientX-rect.left)/rect.width*2-1,ny=1-(clientY-rect.top)/rect.height*2,f=norm(camera.target.map((v,i)=>v-camera.eye[i])),right=norm(cross(f,[0,0,1])),up=cross(right,f),tangent=Math.tan(38*Math.PI/360),direction=norm(f.map((v,i)=>v+right[i]*nx*rect.width/rect.height*tangent+up[i]*ny*tangent));let nearest=Infinity,picked=null;const candidates=[];
      for(const mesh of meshes){const o=mesh.object;if(mesh.opacity<.35||((o.optional&&o.installed===false)&&!state.optionalDepth)||state.hidden.has(o.category||'Other')||(o.default_hidden&&!state.shownCategories.has(o.category||'Other')&&o.id!==state.selected))continue;const m=modelMatrix(mesh),delta=camera.eye.map((v,i)=>v-m[12+i]),origin=[0,4,8].map(k=>m[k]*delta[0]+m[k+1]*delta[1]+m[k+2]*delta[2]),dir=[0,4,8].map(k=>m[k]*direction[0]+m[k+1]*direction[1]+m[k+2]*direction[2]);let lo=0,hi=Infinity;for(let k=0;k<3;k++){if(Math.abs(dir[k])<1e-9){if(origin[k]<mesh.bounds.localLo[k]||origin[k]>mesh.bounds.localHi[k]){hi=-1;break;}continue;}let a=(mesh.bounds.localLo[k]-origin[k])/dir[k],b=(mesh.bounds.localHi[k]-origin[k])/dir[k];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}if(hi>=lo)candidates.push({mesh,origin,dir,lo});}
      candidates.sort((a,b)=>a.lo-b.lo);for(const {mesh,origin:o,dir:d,lo} of candidates){if(lo>nearest)break;const vertices=mesh.object.vertices,indices=mesh.object.indices;for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3,e1x=vertices[b]-vertices[a],e1y=vertices[b+1]-vertices[a+1],e1z=vertices[b+2]-vertices[a+2],e2x=vertices[c]-vertices[a],e2y=vertices[c+1]-vertices[a+1],e2z=vertices[c+2]-vertices[a+2],px=d[1]*e2z-d[2]*e2y,py=d[2]*e2x-d[0]*e2z,pz=d[0]*e2y-d[1]*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-8)continue;const inv=1/det,tx=o[0]-vertices[a],ty=o[1]-vertices[a+1],tz=o[2]-vertices[a+2],u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)continue;const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,v=(d[0]*qx+d[1]*qy+d[2]*qz)*inv;if(v<0||u+v>1)continue;const t=(e2x*qx+e2y*qy+e2z*qz)*inv;if(t>0&&t<nearest&&(!state.section||camera.eye[1]+direction[1]*t>=0)){nearest=t;picked=mesh.object.id;}}}if(picked)selectPart(picked);
    }
    function technicalOverlay(){if(!state.technicalTopic||state.exploded)return;
      const topic=state.technicalTopic;if(topic==='optical'){const rgb=meshes.find(m=>m.object.id==='camera_rgb_housing'),fp=rgb?.object.footprint_mm,lensMesh=meshes.find(m=>m.object.id==='camera_rgb_lens');if(!fp||!lensMesh)return;const lens=[lensMesh.bounds.center[0],lensMesh.bounds.center[1],lensMesh.bounds.lo[2]],cx=fp.center[0],cy=fp.center[1],z=fp.center[2]+1,dx=fp.length_x/2,dy=fp.width_y/2,footprint=[[cx-dx,cy-dy,z],[cx+dx,cy-dy,z],[cx+dx,cy+dy,z],[cx-dx,cy+dy,z]];for(const p of footprint)line([lens,p],'technical-ray');line([...footprint,footprint[0]],'technical-footprint');label('400 mm example · not full-belt coverage',[1300,-270,1020],'technical-label');}
      if(topic==='induction'){const zone=[[1425,-300,1003],[1775,-300,1003],[1775,300,1003],[1425,300,1003]];line([...zone,zone[0]],'technical-zone');line([[1600,-310,1000],[1600,-480,1080]],'technical-ray');label('Reserved sensing zone',[1600,-490,1120],'technical-label');}
      if(topic==='tracking'){const x=1300+(state.travel%1700);line([[1300,0,1030],[3000,0,1030]],'technical-ray');line([[1750,-300,1008],[1750,300,1008]],'technical-zone');line([[x-35,-35,1030],[x+35,-35,1030],[x+35,35,1030],[x-35,35,1030],[x-35,-35,1030]],'technical-object');label('Illustrative object position',[x,0,1130],'technical-label');}
      if(topic==='sorting'){line([[3096,-275,974],[3096,275,974]],'technical-zone');label('12 nozzle positions · 50 mm study pitch',[3096,0,1070],'technical-label');if(assembly.routes)outletLabels();}
    }

    const svgNS='http://www.w3.org/2000/svg';
    function el(tag,attrs={},text){const n=doc.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
    function line(points,className){const p=points.map(project);if(p.some(x=>!x))return;overlay.append(el('polyline',{points:p.map(x=>x.map(v=>v.toFixed(1)).join(',')).join(' '),class:className,fill:'none'}));}
    function label(text,p,className='dimension-label'){const q=project(p);if(!q)return;const node=el('text',{x:q[0],y:q[1],class:className,'text-anchor':'middle'},text);overlay.append(node);}
    function outletLabels(){const entries=[];for(const[name,path]of Object.entries(assembly.routes)){if(!['target','balance','review'].includes(name))continue;const bin=meshes.find(m=>m.object.id==='bin_'+(name==='target'?'concentrate':name));if(bin&&state.hidden.has(bin.object.category||'Other'))continue;const shift=bin?explodeVector(bin.object,bin.bounds):[650,0,0];const anchor=project(path[path.length-1].map((v,i)=>v+shift[i]*explosion));if(anchor)entries.push({name,anchor});if(explosion<.02)line(path,'route-line route-'+name);}
      for(const item of layoutRouteLabels(entries,canvas.clientWidth,canvas.clientHeight)){const center=item.x+item.width/2,edge=item.anchor[1]>item.y+item.height/2?item.y+item.height:item.y,bend=(edge+item.anchor[1])/2;overlay.append(el('polyline',{points:`${item.anchor.join(',')} ${item.anchor[0]},${bend} ${center},${bend} ${center},${edge}`,class:'route-leader route-'+item.name,fill:'none'}));overlay.append(el('circle',{cx:item.anchor[0],cy:item.anchor[1],r:2.5,class:'route-anchor route-'+item.name}));overlay.append(el('rect',{x:item.x,y:item.y,width:item.width,height:item.height,rx:4,class:'route-card route-'+item.name}));const lines=item.compact?(item.name==='target'?['PCB-rich','target']:item.name==='review'?['Review','window']:['Balance']):[item.name==='target'?'PCB-rich target':item.name==='review'?'Review window':'Balance'];for(let i=0;i<lines.length;i++)overlay.append(el('text',{x:center,y:item.y+item.height/2+(i-(lines.length-1)/2)*14+4,class:'route-card-label route-'+item.name,'text-anchor':'middle'},lines[i]));}
    }
    function dimension(a,b,text){line([a,b],'dimension-line');const d=b.map((v,i)=>v-a[i]),tick=Math.abs(d[2])>Math.abs(d[0])+Math.abs(d[1])?[35,0,0]:[0,0,35];for(const p of [a,b])line([p.map((v,i)=>v-tick[i]),p.map((v,i)=>v+tick[i])],'dimension-line');label(text,a.map((v,i)=>(v+b[i])/2+(i===2?55:0)));}
    function overlayFrame(now){if(!overlay)return;const animated=state.technicalTopic==='tracking'||state.technicalTopic==='sorting';const key=[state.dimensions,state.service,state.annotations,state.selected,state.currentStage,state.technicalTopic,explosion.toFixed(3),size.revision,...viewProjection].join('|');if(key===lastOverlayKey&&!animated)return;if(animated&&!state.paused&&now-overlayLastTime<1000/30)return;lastOverlayKey=key;overlayLastTime=now;renderStats.overlayUpdates++;overlay.replaceChildren();overlay.setAttribute('viewBox',`0 0 ${size.width} ${size.height}`);if(state.dimensions){dimension([0,-620,1000],[3000,-620,1000],'3000 mm sensing deck');dimension([600,-300,1250],[600,300,1250],'600 mm active width');dimension([-240,-420,0],[-240,-420,1000],'1000 mm belt top');for(const[x,t]of[[1300,'RGB · x=1300'],[1600,'Induction · x=1600'],[1750,'Last sensing · x=1750']]){line([[x,0,1000],[x,0,2150]],'datum-line');label(t,[x,0,2200+(x===1600?180:0)]);}label('Study dimensions · mm',[1500,0,2550]);}
      if(state.service&&assembly.serviceZones){for(const zone of assembly.serviceZones){line([...zone.points,zone.points[0]],'service-line');const center=zone.points.reduce((s,p)=>s.map((v,i)=>v+p[i]/zone.points.length),[0,0,0]);label(zone.label||'Reserved service envelope',center,'service-label');}}

      if(state.selected&&!win.ferroTechnical){const mesh=meshes.find(m=>m.object.id===state.selected);if(mesh&&!state.hidden.has(mesh.object.category||'Other'))label(mesh.object.name||mesh.object.id,point(modelMatrix(mesh),mesh.bounds.localCenter),'part-label');}
      if(assembly&&assembly.routes&&state.annotations&&state.technicalTopic!=='sorting')outletLabels();
      if(state.currentStage===2&&!state.exploded&&!state.technicalTopic){line([[1600,-310,990],[1600,-510,1085]],'datum-line');label('Sensing location',[1600,-510,1115],'part-label');}
      technicalOverlay();
    }
    let markerMesh;
    function createMarker(){const v=[8,0,0,-8,0,0,0,8,0,0,-8,0,0,0,8,0,0,-8],i=[0,2,4,2,1,4,1,3,4,3,0,4,2,0,5,1,2,5,3,1,5,0,3,5];return bufferMesh({id:'illustrative-marker',vertices:v,indices:i,color:'#4676ff'});}
    function updateSamples(dt){const phase=reviewPhase(state.sequenceTime);if(phase.key!==lastPhase){lastPhase=phase.key;if(phaseLabel)phaseLabel.textContent=phase.label;}if(!state.paused){for(const p of particles)p.distance+=dt*1000*state.speed;while(birthAt+.7<=state.sequenceTime){birthAt+=.7;const birthPhase=reviewPhase(birthAt);if(!birthPhase.feed)continue;sampleSerial++;const candidate=sampleSerial%3===0;particles.push({distance:(state.sequenceTime-birthAt)*1000,target:candidate&&!birthPhase.review,lane:0,review:birthPhase.review});if(birthPhase.review){state.reviewAssignments++;if(candidate)state.reviewNeighbours++;if($('review-tally'))$('review-tally').textContent='Illustrative review assignments: '+state.reviewAssignments+' markers · '+state.reviewNeighbours+' candidate neighbours';}}}particles=particles.filter(p=>p.distance<6000);}
    function animateSamples(){for(const p of particles){const x=p.distance;let pos;if(x<=3000)pos=[x,p.lane,1014];else{const route=p.target?'target':p.review?'review':'balance',path=assembly.routes&&assembly.routes[route];if(!path)continue;const travel=(x-3000)/1800;if(travel>1)continue;pos=pointOnPath(path,travel);}markerMesh.color=p.target?[.29,.51,1]:p.review?[.97,.66,.25]:[.73,.79,.83];draw(markerMesh,trs(pos,[0,0,p.target?.2:-.15]),false,false);}}
    function frame(now){win.requestAnimationFrame(frame);const elapsed=last?(now-last)/1000:0;last=now;if(!state.ready||!visible||doc.hidden)return;
      // Wall time drives kinematics. Only a long interruption is discarded; slow
      // rendering never changes belt speed or illustrative sequence timing.
      const dt=elapsed>.25?0:Math.max(0,elapsed);if(!state.paused){state.time+=dt;state.travel+=dt*state.speed*1000;state.sequenceTime+=dt*state.speed;dirty=true;}if(!dirty)return;const start=win.performance.now();dirty=false;frameDrawCalls=0;shadowDrawCalls=0;modelCache.clear();updateSamples(dt);
      const target=Number(state.exploded);explosion=reduced.matches?target:explosion+(target-explosion)*(1-Math.exp(-dt*9));if(Math.abs(explosion-target)>.002)dirty=true;else explosion=target;
      const ratio=Math.min(win.devicePixelRatio||1,1.4,Math.sqrt(pixelBudget/(size.width*size.height)))*adaptiveScale,w=Math.max(1,Math.round(size.width*ratio)),h=Math.max(1,Math.round(size.height*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}renderStats.pixelRatio=ratio;
      const cache=getDrawCache();renderShadow(cache.shadow,now);gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);const eye=projection(dt);gl.uniformMatrix4fv(locations.uVP,false,viewProjection);gl.uniformMatrix4fv(locations.uShadowVP,false,shadowVP);gl.uniform3fv(locations.uEye,eye);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(locations.uShadow,0);
      gl.depthMask(true);draw(groundMesh,matrixIdentity,false,false);for(const m of cache.opaque)draw(m,modelMatrix(m),state.currentStage===2&&m.object.sourceIds?.includes('induction_cassette_tray'));for(const m of cache.dynamic)draw(m,modelMatrix(m),m.object.id===state.selected);
      if(cache.selected&&cache.selected.opacity>=1&&!cache.dynamic.includes(cache.selected)){gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-1);draw(cache.selected,modelMatrix(cache.selected),true);gl.disable(gl.POLYGON_OFFSET_FILL);}
      gl.depthMask(false);const sortKey=[...camera.eye,...camera.target,explosion].join(',');if(cache.sortKey!==sortKey){for(const m of cache.transparent)m.eyeDistance=Math.hypot(...point(modelMatrix(m),m.bounds.localCenter).map((v,i)=>v-eye[i]));cache.transparent.sort((a,b)=>b.eyeDistance-a.eyeDistance);cache.sortKey=sortKey;}for(const m of cache.transparent)draw(m,modelMatrix(m),m.object.id===state.selected);gl.depthMask(true);if(state.annotations&&!state.exploded&&!state.section)animateSamples();overlayFrame(now);
      const mode=state.exploded?'EXPLODED CONCEPT':state.section?'OPEN SECTION · UNCAPPED':'ASSEMBLY VIEW';if($('scene-mode')&&$('scene-mode').textContent!==mode)$('scene-mode').textContent=mode;renderStats.frames++;renderStats.lastRenderMs=win.performance.now()-start;renderStats.drawCalls=frameDrawCalls;renderStats.shadowDrawCalls=shadowDrawCalls;
      if(elapsed>.024&&elapsed<.25){if(++slowFrames>45&&adaptiveScale>.75){adaptiveScale=Math.max(.75,adaptiveScale-.1);slowFrames=0;}}else slowFrames=Math.max(0,slowFrames-1);
    }
    function loadUI(data,stats){const categories=[...new Set(data.objects.map(m=>m.category||'Other'))].sort(),container=$('category-controls'),select=$('component-select');if(container){container.replaceChildren();for(const name of categories){const label=doc.createElement('label'),input=doc.createElement('input');input.type='checkbox';input.checked=data.objects.some(o=>(o.category||'Other')===name&&!o.default_hidden);if(!input.checked)state.hidden.add(name);input.dataset.category=name;input.addEventListener('change',()=>{if(input.checked){state.hidden.delete(name);state.shownCategories.add(name);}else state.hidden.add(name);dirty=true;});label.append(input,doc.createTextNode(name));container.append(label);}}
      if(select){for(const m of data.objects){const option=doc.createElement('option');option.value=m.id;option.textContent=m.name||m.id;select.append(option);}select.addEventListener('change',()=>{selectPart(select.value);const m=data.objects.find(o=>o.id===select.value);if(m){const category=m.category||'Other';state.hidden.delete(category);if(container)for(const input of container.querySelectorAll('input'))if(input.dataset.category===category)input.checked=true;}if($('component-detail'))$('component-detail').textContent=m?(m.description||`${m.category||'Assembly'} · ${m.id}`):'Choose a named component to highlight it. Device envelopes do not reproduce manufacturer internals.';dirty=true;});}
      if($('service-toggle')&&(!data.serviceZones||!data.serviceZones.length)){$('service-toggle').disabled=true;$('service-toggle').title='Service-envelope export pending';}const provenance=data.provenance||{};message(`${stats.objects} named meshes · ${stats.triangles.toLocaleString()} triangles · ${provenance.kind==='cad-tessellation'?'CAD tessellation':'parametric concept geometry'}`);if($('geometry-provenance'))$('geometry-provenance').textContent=provenance.description||'Geometry provenance is supplied with the assembly file. Concept geometry is not a fabrication release.';
    }
    for(const[id,key]of[['section-toggle','section'],['dimensions-toggle','dimensions'],['service-toggle','service'],['annotation-toggle','annotations']])if($(id))$(id).addEventListener('click',()=>{state[key]=!state[key];$(id).setAttribute('aria-pressed',String(state[key]));dirty=true;});
    if($('belt-speed'))$('belt-speed').addEventListener('input',e=>api.setSpeed(Number(e.target.value)));
    if($('view-select'))$('view-select').addEventListener('change',e=>api.setStage(e.target.value));
    doc.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{api.setStage(Number(b.dataset.view));}));
    reduced.addEventListener('change',e=>{if(e.matches)state.paused=true;dirty=true;});
    let drag=null,clickStart=null,wasPinch=false;const pointers=new Map();let pinchDistance=0;canvas.tabIndex=0;canvas.classList.add('explorable');canvas.addEventListener('pointerdown',e=>{if(!state.free)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){clickStart=[e.clientX,e.clientY];wasPinch=false;}else wasPinch=true;drag=[e.clientX,e.clientY];pinchDistance=pointers.size===2?Math.hypot(...[...pointers.values()][0].map((v,i)=>v-[...pointers.values()][1][i])):0;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!state.free)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinchDistance)state.zoom=Math.max(.3,Math.min(2.5,state.zoom*pinchDistance/Math.max(1,distance)));pinchDistance=distance;}else if(drag){state.yaw-=(e.clientX-drag[0])*.005;state.pitch+=(e.clientY-drag[1])*.004;}drag=[e.clientX,e.clientY];dirty=true;});const endDrag=e=>{const isClick=e.type==='pointerup'&&!wasPinch&&clickStart&&Math.hypot(e.clientX-clickStart[0],e.clientY-clickStart[1])<6;if(isClick)pickPart(e.clientX,e.clientY);pointers.delete(e.pointerId);drag=pointers.size?[...pointers.values()][0]:null;pinchDistance=0;};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('keydown',e=>{if(!state.free)return;const keys={ArrowLeft:()=>state.yaw-=.12,ArrowRight:()=>state.yaw+=.12,ArrowUp:()=>state.pitch+=.08,ArrowDown:()=>state.pitch-=.08,'+':()=>state.zoom=Math.max(.3,state.zoom*.9),'=':()=>state.zoom=Math.max(.3,state.zoom*.9),'-':()=>state.zoom=Math.min(2.5,state.zoom*1.1)};if(keys[e.key]){e.preventDefault();keys[e.key]();dirty=true;}});
    canvas.addEventListener('wheel',e=>{if(!state.free||(!doc.body.classList.contains('assembly-standalone')&&!e.ctrlKey))return;e.preventDefault();state.zoom=Math.max(.3,Math.min(2.5,state.zoom*Math.exp(e.deltaY*.0015)));dirty=true;},{passive:false});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(Error('Graphics context was lost. Reload to restore the assembly.'));});win.addEventListener('resize',()=>{resize();update();dirty=true;},{passive:true});doc.addEventListener('visibilitychange',()=>{last=0;dirty=true;});
    win.addEventListener('scroll',update,{passive:true});
    if(win.ResizeObserver)new win.ResizeObserver(resize).observe(canvas);resize();syncStage();syncReadout();update();win.requestAnimationFrame(frame);message('Loading the named concept assembly…');
    win.fetch(new URL('conveyor-assembly.json',base)).then(r=>{if(!r.ok)throw Error('Assembly file returned HTTP '+r.status);return r.json();}).then(data=>{const stats=validateAssembly(data);setupGL();meshes=data.objects.map(bufferMesh);markerMesh=createMarker();groundMesh=bufferMesh({id:'studio-floor',category:'studio',vertices:[-8000,-9000,-8,11000,-9000,-8,11000,9000,-8,-8000,9000,-8],indices:[0,1,2,0,2,3],normals:[0,0,1,0,0,1,0,0,1,0,0,1],color:'#293139'});assembly=data;buildBatches();state.objects=stats.objects;state.triangles=stats.triangles;loadUI(data,stats);state.ready=true;api.available=true;canvas.hidden=false;if(overlay)overlay.hidden=false;if(fallback)fallback.hidden=true;dirty=true;}).catch(fail);
    return api;
  }
  return {validateAssembly,vertexNormals,reviewPhase,kinematics,pointOnPath,layoutRouteLabels,trs,point,mul,bounds,tourPosition,sampleCamera,mount};
});
