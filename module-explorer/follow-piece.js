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
// One intact mixed-material scrap example, never a disassembled core/coil pair.
// Seven independent closed/shorted copper turns are an explicit assumption of
// this damaged-winding illustration, not an electrically specified open helix.
const turnYs=[-21,-14,-7,0,7,14,21];
const positions=[[0,-640],[.14,-280],[.26,-280],[.41,0],[.57,0],[.69,300],[.83,300],[.90,550],[1,780]];
function positionAt(p){for(let i=0;i<positions.length-1;i++){const a=positions[i],b=positions[i+1];if(p<=b[0])return mix(a[1],b[1],ease(clamp((p-a[0])/(b[0]-a[0]))));}return 780;}
function routeAt(p){return p<.90?0:ease(clamp((p-.90)/.10));}
function stateAt(progress){const p=clamp(progress),x=positionAt(p),route=routeAt(p),y=-130*route;return{conceptual:true,id:'42',progress:p,x,y,station:p<.14?'intro':p<.30?'optical':p<.62?'bottom':p<.90?'transverse':'fusion',object:'steel core with attached copper turns',pose:{translation:[x,y,1000],coreAxis:[0,1,0],supportMinZ:1000,constantOrientation:true,wholePieceRigid:true},bottomField:[0,0,1],transverseField:[0,1,0],fieldVisible:p>=.41&&p<=.57?'bottom':p>=.69&&p<=.83?'transverse':null,bounds:{min:[x-30,y-47,1000],max:[x+30,y+47,1060]},materials:{core:'assumed steel',turns:'assumed copper',sleeve:'assumed insulating material',compositionKnownForIllustration:true,notInferredBySensors:true,steelContributesToBothChannels:true},copperPaths:{type:'seven independent assumed closed/shorted turns',axis:[0,1,0],centerZ:30,turnYs:[...turnYs],majorRadius:27,wireRadius:3,closed:true},currentLoops:{closed:true,kind:'raised surface direction glyph on front assumed shorted copper turn',centerY:-24.08,centerZ:30,majorRadius:27,strokeRadius:.65,withinCopperProjectedFootprint:true,notEntirelyInsideCopperSolid:true,sameGlyphBothStations:true,schematicNotSolved:true},routing:{active:p>=.90,schematic:true,wholePiece:true,progress:route,selected:'mixed-material stream',alternative:'steel stream',entry:[550,0,1000],selectedEndpoint:[780,-130,1000],alternativeEndpoint:[780,130,1000],noValidatedActuatorOrCapture:true},evidence:{appearance:p>=.22,bottom:p>=.50,transverse:p>=.75,fusion:p>=.90}};}
const cameraKeys=[
 {p:0,dz:30,r:250,yaw:-.83,pitch:.44},
 {p:.08,dz:40,r:340,yaw:-1.02,pitch:.41},
 {p:.16,dz:260,r:920,yaw:-1.15,pitch:.19},
 {p:.26,dz:260,r:920,yaw:-1.15,pitch:.19},
 {p:.36,dz:23,r:430,yaw:-1.0,pitch:.55},
 {p:.57,dz:23,r:430,yaw:-1.0,pitch:.55},
 {p:.66,dz:38,r:470,yaw:-.80,pitch:.60},
 {p:.83,dz:38,r:470,yaw:-.80,pitch:.60},
 {p:.90,dz:24,r:640,yaw:-.80,pitch:.75},
 {p:1,dz:24,r:640,yaw:-.80,pitch:.75}
];
function cameraAt(progress){const p=clamp(progress);let i=0;while(i<cameraKeys.length-2&&p>cameraKeys[i+1].p)i++;const a=cameraKeys[i],b=cameraKeys[i+1],t=ease(clamp((p-a.p)/(b.p-a.p))),routeFrame=ease(clamp((p-.83)/.07));return{target:[mix(positionAt(p),665,routeFrame),0,1000+mix(a.dz,b.dz,t)],radius:mix(a.r,b.r,t),yaw:mix(a.yaw,b.yaw,t),pitch:mix(a.pitch,b.pitch,t)};}
function makeGeometry(){
 const result=[];
 function mesh(id,color,tag='piece',surface=[35,.20],unlit=0){const m={id,color,tag,surface,unlit,vertices:[],indices:[],normals:[]};result.push(m);return m;}
 function tri(m,a,b,c){const n=unit(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i]))),k=m.vertices.length/3;m.vertices.push(...a,...b,...c);m.normals.push(...n,...n,...n);m.indices.push(k,k+1,k+2);}
 function quad(m,a,b,c,d){tri(m,a,b,c);tri(m,a,c,d);}
 function prism(m,poly,depth,map){const front=poly.map(p=>map(p[0],p[1],depth/2)),back=poly.map(p=>map(p[0],p[1],-depth/2));for(let i=1;i<poly.length-1;i++){tri(m,front[0],front[i],front[i+1]);tri(m,back[0],back[i+1],back[i]);}for(let i=0;i<poly.length;i++){const j=(i+1)%poly.length;quad(m,front[i],back[i],back[j],front[j]);}}
 function tube(m,a,b,r=1,n=7){const d=unit(b.map((v,i)=>v-a[i])),u=unit(cross(d,Math.abs(d[2])>.8?[0,1,0]:[0,0,1])),v=cross(d,u);for(let i=0;i<n;i++){const c=2*Math.PI*i/n,e=2*Math.PI*(i+1)/n,aa=add(a,add(scale(u,Math.cos(c)*r),scale(v,Math.sin(c)*r))),ab=add(a,add(scale(u,Math.cos(e)*r),scale(v,Math.sin(e)*r))),ba=add(b,add(scale(u,Math.cos(c)*r),scale(v,Math.sin(c)*r))),bb=add(b,add(scale(u,Math.cos(e)*r),scale(v,Math.sin(e)*r)));quad(m,aa,ba,bb,ab);tri(m,a,ab,aa);tri(m,b,ba,bb);}}
 function arrow(m,a,b,r=1.3,head=7){const d=unit(b.map((v,i)=>v-a[i])),q=add(b,scale(d,-head)),u=unit(cross(d,Math.abs(d[2])>.8?[0,1,0]:[0,0,1])),v=cross(d,u);tube(m,a,q,r,9);for(let i=0;i<10;i++){const c=i*Math.PI/5,e=(i+1)*Math.PI/5;tri(m,add(q,add(scale(u,Math.cos(c)*head*.40),scale(v,Math.sin(c)*head*.40))),add(q,add(scale(u,Math.cos(e)*head*.40),scale(v,Math.sin(e)*head*.40))),b);}}
 function torus(m,y,R,r,segments=96,sides=10){const pt=(t,a)=>[(R+r*Math.cos(a))*Math.cos(t),y+r*Math.sin(a),30+(R+r*Math.cos(a))*Math.sin(t)];for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const t=i*2*Math.PI/segments,tt=(i+1)*2*Math.PI/segments,a=j*2*Math.PI/sides,aa=(j+1)*2*Math.PI/sides;quad(m,pt(t,a),pt(tt,a),pt(tt,aa),pt(t,aa));}}
 const core=mesh('fragment-steel-core',[.47,.53,.55],'piece',[85,.42]);
 tube(core,[0,-46,30],[0,46,30],23,48);
 const sleeve=mesh('fragment-insulating-winding-sleeve',[.10,.12,.115],'piece',[16,.04]);
 tube(sleeve,[0,-26,30],[0,26,30],24,48);
 // Copper turns remain attached to the sleeved steel core for the entire path.
 // A closed torus describes each assumed shorted turn. No end is peeled away.
 const copper=mesh('fragment-seven-assumed-closed-copper-turns',[.74,.35,.12],'piece',[90,.48]);
 for(const y of turnYs)torus(copper,y,27,3);
 const wear=mesh('fragment-steel-end-wear',[.25,.31,.32],'piece',[35,.16]);
 for(const [x,z,xx,zz] of[[-9,39,7,42],[-12,23,2,26],[7,20,12,26]])tube(wear,[x,-46.04,z],[xx,-46.04,zz],.45,5);
 for(const y of[-38,38])torus(wear,y,23,.32,64,6);
 // Blue arrows indicate only an intended applied field direction, not a solved
 // field, a copper-only response, or a removal force. Steel also contributes.
 const bottom=mesh('illustrative-bottom-field',[.23,.67,.98],'bottomField',[20,.10],.55);
 for(const x of[-24,0,24])arrow(bottom,[x,-56,-24],[x,-56,65],1.3,8);
 const side=mesh('illustrative-transverse-field',[.23,.67,.98],'sideField',[20,.10],.55);
 for(const x of[-18,0,18])arrow(side,[x,-105,30],[x,-49,30],1.3,7);
 // The same orange direction glyph appears at both stations; neither count nor
 // width encodes an amplitude. It is a slightly raised, visible surface graphic
 // following one closed copper turn. Its full stroke is not claimed to be a
 // volumetric current solution inside the copper solid.
 const current=mesh('illustrative-circulation-on-short-copper-turn',[1,.61,.22],'current',[20,.08],.70);
 const currentPts=Array.from({length:97},(_,i)=>[27*Math.cos(i*2*Math.PI/96),-24.08,30+27*Math.sin(i*2*Math.PI/96)]);
 for(let i=0;i<96;i++)tube(current,currentPts[i],currentPts[i+1],.65,6);
 arrow(current,[0,-24.08,57],[-4,-24.08,56.7],.50,3.1);
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
function hardwareVisible(o,p){const id=o.id;if(p>=.90)return false;
 if(id==='host_carrying_belt'||id==='module_support_window')return true;
 if(/^lane_(guide|skirt)_/.test(id))return true;
 if(o.group==='optical')return p<.34&&!o.default_hidden&&!/carrier|lid_spacer|cable_gland|mount_screw|mount_pad|drop_arm/.test(id);
 if(o.group==='under_belt')return p>=.30&&p<=.65&&!/_insulation$|cable|height_shim|slide_|cover|shell|support|handle|retainer|post/.test(id)&&(!o.default_hidden||o.winding_part==='bobbin');
 if(o.group==='transverse')return p>=.60&&p<=.90&&id!=='side_winding_former_-1'&&!/_insulation$|cable|cartridge|cover|arm_|hanger|adjust|clamp|support|bracket|former_spacer/.test(id)&&(!o.default_hidden||o.winding_part==='bobbin');
 return false;
}
window.ferroPieceScene=Object.freeze({stateAt,cameraAt,makeGeometry,hardwareVisible});
})();
