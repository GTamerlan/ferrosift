/* Conceptual travelling e-waste overlay. This file is NOT a CAD export, field
   solution, measured response or validated tracking result. The original M02
   hardware mesh is loaded separately and is never modified by this renderer. */
(() => {
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>scale(a,1/(Math.hypot(...a)||1));
// One rigid, irregular mixed-material fragment. Material identities and a
// laminated construction are illustrative assumptions, not sensor inferences.
// Copper follows one continuous OPEN-ended winding; no induced current is drawn.
const copperWireRadius=2.2;
function copperCenterline(){
 const path=[],turns=5.15,steps=Math.ceil(turns*96);
 // A rounded rectangular winding fits the narrow middle of the broken core.
 function section(t){const q=((t/(Math.PI/2))%4+4)%4,k=Math.floor(q),a=(q-k)*Math.PI/2;
  const corners=[[16,17],[-16,17],[-16,-17],[16,-17]],angs=[0,Math.PI/2,Math.PI,Math.PI*1.5];
  return[corners[k][0]+7*Math.cos(angs[k]+a),26.2+corners[k][1]+7*Math.sin(angs[k]+a)];}
 for(let i=0;i<=steps;i++){const t=i/steps*turns*2*Math.PI,q=section(t),y=-17+i/steps*34;
  // Uneven spacing and a gently distorted outer winding avoid pristine symmetry.
  path.push([q[0]*(1+.018*Math.sin(t*.7)),y+.45*Math.sin(t*.55),q[1]+.25*Math.sin(t*.7)**2]);}
 const first=path[0],last=path[path.length-1];
 return [[first[0]+8,first[1]-8,first[2]+4],[first[0]+5,first[1]-4,first[2]+1],...path,[last[0]+4,last[1]+5,last[2]+2],[last[0]+7,last[1]+9,last[2]+6]];
}
const copperPath=copperCenterline();
// Establish nominal belt contact from the actual polygonal wire sweep, rather
// than rounding its support height. This is geometry only, not stability proof.
function sweepMinZ(points,r){let min=Infinity;for(let j=0;j<points.length-1;j++){const a=points[j],b=points[j+1],d=unit(b.map((v,i)=>v-a[i])),u=unit(cross(d,Math.abs(d[2])>.8?[0,1,0]:[0,0,1])),v=cross(d,u);for(let i=0;i<10;i++){const t=i*2*Math.PI/10,dz=(u[2]*Math.cos(t)+v[2]*Math.sin(t))*r;min=Math.min(min,a[2]+dz,b[2]+dz);}}return min;}
const supportDrop=Math.min(sweepMinZ(copperPath,copperWireRadius),...[36,148,255,375].map(i=>sweepMinZ([copperPath[i],copperPath[i+1]],copperWireRadius+.025)));
for(const q of copperPath)q[2]-=supportDrop;
const positions=[[0,-640],[.14,-280],[.26,-280],[.41,0],[.57,0],[.69,300],[.83,300],[.90,550],[1,780]];
function positionAt(p){for(let i=0;i<positions.length-1;i++){const a=positions[i],b=positions[i+1];if(p<=b[0])return mix(a[1],b[1],ease(clamp((p-a[0])/(b[0]-a[0]))));}return 780;}
function routeAt(p){return p<.90?0:ease(clamp((p-.90)/.10));}
function stateAt(progress){
 const p=clamp(progress),x=positionAt(p),route=routeAt(p),y=-130*route,transition=ease(clamp((p-.86)/.08));
 return {conceptual:true,id:'42',progress:p,x,y,station:p<.14?'intro':p<.30?'optical':p<.62?'bottom':p<.90?'transverse':'fusion',object:'irregular assumed laminated-steel fragment with attached open copper winding',
  pose:{translation:[x,y,1000],coreAxis:[0,1,0],supportMinZ:1000,constantOrientation:true,wholePieceRigid:true},
  bottomField:[0,0,1],transverseField:[0,1,0],fieldVisible:null,fieldGlyphs:false,currentGlyphs:false,
  bounds:{min:[x-36,y-57,1000],max:[x+36,y+55,1057]},
  materials:{core:'assumed laminated steel',winding:'assumed copper',sleeve:'assumed insulating material',compositionKnownForIllustration:true,notInferredBySensors:true,steelContributesToBothChannels:true},
  copperPaths:{type:'single continuous open-ended attached winding',closed:false,wireRadius:copperWireRadius,centerline:copperPath.map(q=>[...q]),electricalConnectionUnspecified:true,retainedAroundBrokenInsulatingFormer:true},
  currentLoops:{shown:false,excitationAndMagnitudeUnsolved:true},
  routing:{active:p>=.90,opacity:transition,hardwareOpacity:1-transition,schematic:true,wholePiece:true,progress:route,selected:'mixed-material stream',alternative:'steel stream',entry:[550,0,1000],selectedEndpoint:[780,-130,1000],alternativeEndpoint:[780,130,1000],noValidatedActuatorOrCapture:true},
  evidence:{appearance:p>=.22,bottom:p>=.50,transverse:p>=.75,fusion:p>=.90}};
}
const cameraKeys=[
 {p:0,dz:30,r:250,yaw:-.83,pitch:.44},
 {p:.08,dz:40,r:340,yaw:-1.02,pitch:.41},
 {p:.16,dz:260,r:920,yaw:-1.15,pitch:.19},
 {p:.26,dz:260,r:920,yaw:-1.15,pitch:.19},
 {p:.36,dz:23,r:430,yaw:-1.0,pitch:.55},
 {p:.57,dz:23,r:430,yaw:-1.0,pitch:.55},
 {p:.66,dz:38,r:470,yaw:-.80,pitch:.60},
 {p:.83,dz:38,r:470,yaw:-.80,pitch:.60},
 {p:.94,dz:24,r:680,yaw:-.80,pitch:.75},
 {p:1,dz:24,r:680,yaw:-.80,pitch:.75}
];
function cameraAt(progress){const p=clamp(progress);let i=0;while(i<cameraKeys.length-2&&p>cameraKeys[i+1].p)i++;const a=cameraKeys[i],b=cameraKeys[i+1],t=ease(clamp((p-a.p)/(b.p-a.p))),routeFrame=ease(clamp((p-.83)/.11));return{target:[mix(positionAt(p),665,routeFrame),-40*routeFrame,1000+mix(a.dz,b.dz,t)],radius:mix(a.r,b.r,t),yaw:mix(a.yaw,b.yaw,t),pitch:mix(a.pitch,b.pitch,t)};}
function makeGeometry(){
 const result=[];
 function mesh(id,color,tag='piece',surface=[35,.20],unlit=0){const m={id,color,tag,surface,unlit,vertices:[],indices:[],normals:[]};result.push(m);return m;}
 function tri(m,a,b,c){const n=unit(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i]))),k=m.vertices.length/3;m.vertices.push(...a,...b,...c);m.normals.push(...n,...n,...n);m.indices.push(k,k+1,k+2);}
 function quad(m,a,b,c,d){tri(m,a,b,c);tri(m,a,c,d);}
 function prism(m,poly,depth,map){
  const front=poly.map(p=>map(p[0],p[1],depth/2)),back=poly.map(p=>map(p[0],p[1],-depth/2));
  const area=poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1]},0),ids=poly.map((_,i)=>i);if(area<0)ids.reverse();
  const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  let guard=0;while(ids.length>2&&guard++<poly.length*poly.length){let cut=false;for(let j=0;j<ids.length;j++){const a=ids[(j+ids.length-1)%ids.length],b=ids[j],c=ids[(j+1)%ids.length];if(turn(poly[a],poly[b],poly[c])<=1e-8)continue;
   if(ids.some(i=>i!==a&&i!==b&&i!==c&&turn(poly[a],poly[b],poly[i])>=-1e-8&&turn(poly[b],poly[c],poly[i])>=-1e-8&&turn(poly[c],poly[a],poly[i])>=-1e-8))continue;
   tri(m,front[a],front[b],front[c]);tri(m,back[c],back[b],back[a]);ids.splice(j,1);cut=true;break;}if(!cut)throw Error('Invalid conceptual scrap outline');}
  for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;quad(m,front[i],back[i],back[j],front[j]);}
 }
 function tube(m,a,b,r=1,n=7){const d=unit(b.map((v,i)=>v-a[i])),u=unit(cross(d,Math.abs(d[2])>.8?[0,1,0]:[0,0,1])),v=cross(d,u);for(let i=0;i<n;i++){const c=2*Math.PI*i/n,e=2*Math.PI*(i+1)/n,aa=add(a,add(scale(u,Math.cos(c)*r),scale(v,Math.sin(c)*r))),ab=add(a,add(scale(u,Math.cos(e)*r),scale(v,Math.sin(e)*r))),ba=add(b,add(scale(u,Math.cos(c)*r),scale(v,Math.sin(c)*r))),bb=add(b,add(scale(u,Math.cos(e)*r),scale(v,Math.sin(e)*r)));quad(m,aa,ba,bb,ab);tri(m,a,ab,aa);tri(m,b,ba,bb);}}
 // Ragged steel laminations form a broken, asymmetric core; thin dark seams
 // separate the nominal plates. The wider ends are fractured, not bolt heads.
 const outline=[[-15.5,-23],[-29,-31],[-33,-42],[-24,-45],[-27,-53],[-13,-50],[-8,-55],[2,-49],[14,-53],[18,-43],[32,-38],[29,-30],[16,-25],[15.5,23],[27,31],[23,38],[29,45],[18,48],[10,44],[3,51],[-7,45],[-17,49],[-23,39],[-18,30],[-15.5,23]];
 const plateCount=19,platePitch=2.18,plateThickness=1.78;
 for(let j=0;j<plateCount;j++){
  const shade=.30+(j%4)*.025,m=mesh('fragment-steel-lamination-'+j,[shade,shade+.045,shade+.05],'piece',[32,.14]);
  // Small fractured-edge variations leave the winding's central neck unchanged.
  const shape=outline.map(([x,y],i)=>Math.abs(y)>26?[x+.70*Math.sin(j*1.7+i),y+.55*Math.cos(j*.9+i*1.1)]:[x,y]);
  prism(m,shape,plateThickness,(x,y,z)=>[x,y,5.9+j*platePitch+z-supportDrop]);
 }
 const sleeve=mesh('fragment-torn-insulating-former',[.15,.135,.105],'piece',[10,.02]);
 // A broken, open-bottom U-shaped insulating former surrounds the steel
 // neck without a solid placeholder occupying it. The winding is nominally
 // retained around this remnant; no fastening or stability is validated.
 const former=[[-20.0,10.5]];
 for(let j=0;j<=12;j++){const a=Math.PI-j*Math.PI/24;former.push([-16+4.0*Math.cos(a),42.9+4.0*Math.sin(a)]);}
 for(let j=0;j<=12;j++){const a=Math.PI/2-j*Math.PI/24;former.push([16+4.0*Math.cos(a),42.9+4.0*Math.sin(a)]);}
 former.push([20.0,10.5],[16.2,10.5],[16.2,46.3],[-16.2,46.3],[-16.2,10.5]);
 prism(sleeve,former,39,(x,z,y)=>[x,y,z-supportDrop]);
 // Continuous damaged copper conductor: each segment meets the next. Visible
 // cut leads are connected to this winding and are never drawn peeling away.
 const copper=mesh('fragment-attached-open-copper-winding',[.69,.285,.085],'piece',[65,.32]);
 for(let i=0;i<copperPath.length-1;i++)tube(copper,copperPath[i],copperPath[i+1],copperWireRadius,10);
 const tarnish=mesh('fragment-copper-abrasion',[.38,.18,.065],'piece',[18,.08]);
 for(const i of [36,148,255,375])tube(tarnish,copperPath[i],copperPath[i+1],copperWireRadius+.025,10);
 // There is intentionally no travelling field/current overlay. Intended field
 // directions belong to the stations; no response or current has been solved.
 // A flat branching diagram is an explicitly separate host-sorter schematic,
 // not fabricated CAD for an ejector, chute, bin, capture envelope or mechanism.
 const floor=mesh('schematic-host-routing-board',[.77,.82,.78],'route',[12,.02],.55);
 quad(floor,[495,-235,-.3],[865,-235,-.3],[865,235,-.3],[495,235,-.3]);
 const paths=mesh('schematic-alternative-steel-path',[.52,.59,.57],'route',[12,.02],.65);
 const selected=mesh('schematic-selected-whole-piece-path',[.27,.56,.43],'route',[12,.02],.65);
 function stripe(m,a,b,width){const d=unit([b[0]-a[0],b[1]-a[1],0]),n=[-d[1]*width/2,d[0]*width/2,0];quad(m,add(a,n),add(a,scale(n,-1)),add(b,scale(n,-1)),add(b,n));}
 stripe(paths,[510,0,.02],[550,0,.02],72);stripe(paths,[550,0,.02],[780,130,.02],72);
 stripe(selected,[550,0,.04],[780,-130,.04],72);
 for(const [m,y] of[[paths,130],[selected,-130]]){quad(m,[735,y-58,.03],[825,y-58,.03],[825,y+58,.03],[735,y+58,.03]);const c=[672,y*.53,.10],dir=unit([230,y,0]),n=[-dir[1],dir[0],0];tri(m,add(c,scale(dir,19)),add(add(c,scale(dir,-10)),scale(n,20)),add(add(c,scale(dir,-10)),scale(n,-20)));}
 const arrows=mesh('schematic-route-direction-marks',[.91,.95,.89],'route',[12,.02],.75);
 for(const y of[-130,130]){const c=[650,y*.44,.2],dir=unit([230,y,0]),n=[-dir[1],dir[0],0];tri(arrows,add(c,scale(dir,17)),add(add(c,scale(dir,-10)),scale(n,15)),add(add(c,scale(dir,-10)),scale(n,-15)));}
 return result;
}
function hardwareVisible(o,p){const id=o.id;if(p>=.94)return false;
 if(id==='host_carrying_belt'||id==='module_support_window')return true;
 if(/^lane_(guide|skirt)_/.test(id))return true;
 if(o.group==='optical')return p<.34&&!o.default_hidden&&!/carrier|lid_spacer|cable_gland|mount_screw|mount_pad|drop_arm/.test(id);
 if(o.group==='under_belt')return p>=.30&&p<=.65&&!/_insulation$|cable|height_shim|slide_|cover|shell|support|handle|retainer|post/.test(id)&&(!o.default_hidden||o.winding_part==='bobbin');
 if(o.group==='transverse')return p>=.60&&p<=.94&&id!=='side_winding_former_-1'&&!/_insulation$|cable|cartridge|cover|arm_|hanger|adjust|clamp|support|bracket|former_spacer/.test(id)&&(!o.default_hidden||o.winding_part==='bobbin');
 return false;
}
window.ferroPieceScene=Object.freeze({stateAt,cameraAt,makeGeometry,hardwareVisible});
})();
