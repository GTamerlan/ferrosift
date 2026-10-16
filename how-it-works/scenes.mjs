export const scenes = [
  {id:'camera',short:'See',duration:5,title:'First, find the fragment.',caption:'The camera detects a piece and separates its visible outline from the belt.',note:'An outline describes appearance. It does not reveal composition.'},
  {id:'identity',short:'Track',duration:5,title:'Give it a temporary identity.',caption:'Software calls this fragment “42” and links its observations as it travels.',note:'42 is a temporary ID for this tracked piece—not a physical tag or proof of correct matching.'},
  {id:'depth',short:'Shape',duration:5,title:'Add geometry, if depth is available.',caption:'Optional depth sensing could estimate surface height and pose to help account for distance and orientation.',note:'Proposed, unselected sensor. Surface geometry is not hidden-metal depth or automatic calibration.'},
  {id:'timing',short:'Time',duration:5,title:'Predict when 42 reaches each station.',caption:'An encoder measures belt travel. Software predicts station arrival.',note:'A prediction still needs an association check: pieces can slip, overlap or rotate.'},
  {id:'induction',short:'Excite',duration:7,title:'A changing magnetic field induces currents.',caption:'AC in the coil creates a changing magnetic field. It induces closed current loops inside conducting scrap.',note:'No current jumps from a coil or cover into scrap. A nonconductive sensing window is not metal shielding.'},
  {id:'response',short:'Measure',duration:6,title:'Measure the electrical response.',caption:'The fragment’s secondary field changes receive-coil voltage. Timing and tracking would associate a reading with piece 42.',note:'Amplitude and phase are relative to the drive. Calibration would use known samples; no measurements are shown.'},
  {id:'direction',short:'Compare',duration:6,title:'Try another field direction.',caption:'For this assumed patch, the transverse magnetic field crosses its face more directly. The response could be stronger.',note:'Fixed pose; conceptual cutaway, not an interior scan. Actual response depends on transmitter and receiver geometry.'},
  {id:'fusion',short:'Combine',duration:6,title:'Combine observations. Keep uncertainty.',caption:'Camera appearance, optional surface geometry and directional responses would inform a routing class and uncertainty.',note:'Copper and aluminium both conduct. Pose and distance change response; stronger does not mean more copper.'},
  {id:'host',short:'Output',duration:5,title:'Send a decision to the existing sorter.',caption:'The host receives a proposed route—or recheck—with the piece ID and timing information.',note:'The host actuator, collection and recovery must be tested. This is an unvalidated concept.'}
];
export const duration = scenes.reduce((n,s)=>n+s.duration,0);
export function locate(time){let start=0;for(let i=0;i<scenes.length;i++){if(time<start+scenes[i].duration||i===scenes.length-1)return {scene:scenes[i],index:i,local:Math.max(0,Math.min(1,(time-start)/scenes[i].duration)),start};start+=scenes[i].duration;}}
const C={ink:'#17333d',muted:'#52686f',line:'#cfddd9',paper:'#f8faf6',white:'#ffffff',blue:'#187baf',paleBlue:'#e5f2f9',orange:'#d17a24',paleOrange:'#f6d7a9',green:'#18756b',paleGreen:'#e1f0e9'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(x,y,t,size=22,color=C.ink,weight=500,anchor='start')=>`<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${esc(t)}</text>`;
const rect=(x,y,w,h,fill=C.white,stroke=C.line,r=16)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const line=(x,y,x2,y2,color=C.line,w=3,dash='')=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const arrow=(x,y,x2,y2,color=C.blue,w=3)=>{const a=Math.atan2(y2-y,x2-x),l=10;return line(x,y,x2,y2,color,w)+`<path d="M${x2-l*Math.cos(a-.5)} ${y2-l*Math.sin(a-.5)} L${x2} ${y2} L${x2-l*Math.cos(a+.5)} ${y2-l*Math.sin(a+.5)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;};
function label(x,y,t,color=C.green){return rect(x,y,150,42,C.white,color,21)+text(x+75,y+28,t,20,color,700,'middle');}
function piece(x,y,scale=1,id=true){return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-95 -36 L-68 -59 L18 -52 L40 -34 L89 -39 L102 12 L76 49 L-5 58 L-38 39 L-92 35Z" fill="${C.paleOrange}" stroke="${C.orange}" stroke-width="3"/>${id?text(0,12,'42',42,C.ink,700,'middle'):''}</g>`;}
function belt(y=245){return rect(100,y,800,85,'#eaf0ed',C.line,42)+line(120,y+42,880,y+42,'#b5c7c1',2,'8 12')+arrow(805,y+62,860,y+62,C.muted,2);}
function camera(x,y){return rect(x-34,y-24,68,48,C.ink,C.ink,10)+`<circle cx="${x}" cy="${y}" r="15" fill="${C.paleBlue}" stroke="${C.blue}" stroke-width="3"/>`+line(x,y-25,x,y-47,C.ink,7);}
function coil(x,y,orientation='horizontal',color=C.green){return `<g transform="translate(${x} ${y}) ${orientation==='vertical'?'rotate(90)':''}">${[0,1,2].map(i=>`<ellipse cx="0" cy="${i*6}" rx="65" ry="${17-i*2}" fill="none" stroke="${color}" stroke-width="4"/>`).join('')}</g>`;}
function loop(cx,cy,rx,ry,phase,color=C.orange,direction=1){const a=phase*Math.PI*2,px=cx+rx*Math.cos(a),py=cy+ry*Math.sin(a),ang=Math.atan2(direction*ry*Math.cos(a),-direction*rx*Math.sin(a));return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="3.5"/>`+`<path d="M${px-9*Math.cos(ang-.5)} ${py-9*Math.sin(ang-.5)} L${px} ${py} L${px-9*Math.cos(ang+.5)} ${py-9*Math.sin(ang+.5)}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linejoin="round"/>`;}
function linesText(x,y,str,width=86,size=22,color=C.ink){const words=str.split(' '),lines=[];let s='';for(const w of words){if((s+' '+w).length>width){lines.push(s);s=w;}else s+=(s?' ':'')+w;}if(s)lines.push(s);return lines.map((v,i)=>text(x,y+i*(size+8),v,size,color)).join('');}
function directionalPatch(cx,cy,field,time){
 // An assumed thin rectangular conductor, fixed in both panels. Its plane is
 // tilted 10 degrees from XZ about X, so Bz is almost in-plane and By is
 // closer to the normal. No receiver, field solution or calibrated amplitude
 // is specified. The drawing shows a qualitative induction hypothesis only.
 const a=Math.PI/18,project=([x,y,z])=>[cx+x+.7*y,cy+.25*x-.38*y-z];
 const patch=(u,v)=>[u,-v*Math.sin(a),v*Math.cos(a)];
 const poly=(points,fill,stroke,w=2,dash='')=>`<polygon points="${points.map(q=>project(q).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 let s='';
 // A dashed generic fragment envelope is an explicit illustrative cutaway,
 // not a camera/induction reconstruction or a second conducting plate.
 const corners=[];for(const z of [-80,80])for(const y of [-28,28])for(const x of [-65,65])corners.push([x,y,z]);
 const edges=[[0,1],[0,2],[1,3],[2,3],[4,5],[4,6],[5,7],[6,7],[0,4],[1,5],[2,6],[3,7]];
 for(const [j,k] of edges){const p=project(corners[j]),q=project(corners[k]);s+=line(...p,...q,'#c2cfca',1.5,'5 5');}
 s+=poly([patch(-45,-65),patch(45,-65),patch(45,65),patch(-45,65)],C.paleOrange,C.orange,2.3);
 // Every current loop, including its arrowhead, lies in and within the patch.
 const phase=time*.45,direction=Math.sin(time*2.2)>=0?1:-1;
 for(const [rx,rz] of [[32,45],[18,27]]){
  const points=Array.from({length:65},(_,j)=>project(patch(rx*Math.cos(j*2*Math.PI/64),rz*Math.sin(j*2*Math.PI/64))));
  s+=`<polygon points="${points.map(q=>q.join(',')).join(' ')}" fill="none" stroke="${C.orange}" stroke-width="${field==='bottom'?1.6:2.8}" opacity="${field==='bottom'?0.6:1}"/>`;
  const t=phase*2*Math.PI,p=project(patch(rx*Math.cos(t),rz*Math.sin(t))),q=project(patch(rx*Math.cos(t-.07*direction),rz*Math.sin(t-.07*direction)));
  const ang=Math.atan2(p[1]-q[1],p[0]-q[0]);s+=`<path d="M${p[0]-5*Math.cos(ang-.5)} ${p[1]-5*Math.sin(ang-.5)} L${p[0]} ${p[1]} L${p[0]-5*Math.cos(ang+.5)} ${p[1]-5*Math.sin(ang+.5)}" fill="none" stroke="${C.orange}" stroke-width="2"/>`;
 }
 if(field==='bottom'){
  for(const x of [-105,105]){const p=project([x,0,-80]),q=project([x,0,-5]);s+=arrow(...p,...q,C.blue,3);}
 }else{
  for(const z of [-55,0,55]){const p=project([0,-180,z]),q=project([0,-105,z]);s+=arrow(...p,...q,C.blue,3);}
 }
 return s;
}
function sceneMarkup(i,p,time){let s='';const phase=(time*.45)%1;
 if(i<=2){
  s+=belt()+camera(295,95)+`<path d="M275 120 L175 260 L415 260 L315 120" fill="${C.paleBlue}" fill-opacity=".65" stroke="${C.blue}" stroke-dasharray="6 8"/>`;
  s+=piece(295,272,1,false);
  s+=`<path d="M195 231 L222 207 L313 214 L337 230 L388 226 L403 284 L375 324 L289 334 L252 313 L198 309Z" fill="none" stroke="${C.green}" stroke-width="3" stroke-dasharray="${i===0?'8 5':'0'}"/>`;
  s+=text(295,35,'Camera',22,C.ink,600,'middle');
  if(i===0){s+=rect(550,160,330,148,C.white)+text(575,199,'Visible observation',23,C.green,700)+text(575,241,'Outline • position',23)+text(575,278,'No composition result',19,C.muted);}
  if(i===1){s+=label(335,150,'Piece 42')+line(350,193,330,214,C.green,2,'5 5')+rect(550,145,330,177,C.white)+text(575,186,'Temporary record',23,C.green,700)+text(575,231,'ID 42',30,C.ink,700)+text(575,271,'Camera observation linked',18,C.muted)+text(575,299,'Software identity only',18,C.muted);}
  if(i===2){s+=label(335,150,'Piece 42')+rect(550,125,330,210,C.white)+text(575,164,'Optional depth',23,C.green,700)+`<path d="M610 258 L686 218 L800 245 L724 287Z" fill="${C.paleOrange}" stroke="${C.orange}" stroke-width="2"/><path d="M610 258 L610 277 L724 306 L724 287 M724 306 L800 265 L800 245" fill="none" stroke="${C.orange}" stroke-width="2"/>`+arrow(826,295,826,245,C.blue,2)+text(825,222,'Height',18,C.blue,500,'middle')+text(575,364,'External shape only',21,C.muted);}
 }
 if(i===3){
  s+=belt(235);const x=195+Math.min(p,.9)*620;s+=piece(x,275,.57,true);
  for(const [x,t] of [[195,'Camera'],[490,'Station A'],[790,'Station B']])s+=line(x,140,x,225,C.line,2,'5 6')+text(x,118,t,23,C.ink,600,'middle');
  s+=line(195,165,790,165,C.green,3)+arrow(195,165,x,165,C.green,3)+label(105,342,'Encoder');
  s+=`<circle cx="295" cy="364" r="27" fill="${C.white}" stroke="${C.green}" stroke-width="3"/>`;
  for(let q=0;q<8;q++){const a=q*Math.PI/4+p*12;s+=line(295+16*Math.cos(a),364+16*Math.sin(a),295+24*Math.cos(a),364+24*Math.sin(a),C.green,2);}
  s+=text(358,372,'Belt travel → predicted arrival',23,C.muted);
 }
 if(i===4||i===5){
  s+=rect(65,70,520,330,C.white,C.line,22)+text(325,108,'Conducting scrap · piece 42',22,C.ink,600,'middle');
  s+=rect(185,155,280,100,C.paleOrange,C.orange,18)+text(325,194,'42',28,C.ink,700,'middle');
  // All orange eddy-current loops and their arrowheads remain inside the metal rectangle.
  s+=loop(325,218,85,20,phase,C.orange,Math.sin(time*2.2)>=0?1:-1)+loop(325,218,57,12,phase+.25,C.orange,Math.sin(time*2.2)>=0?1:-1);
  s+=coil(325,333)+text(325,382,'Transmit coil · AC drive',21,C.green,600,'middle');
  // Blue arrows are a symbolic sample of the primary field in air, not current paths or solved streamlines.
  for(const x of [205,325,445]){const up=Math.sin(time*2.2)>=0;s+=up?arrow(x,310,x,275,C.blue,3):arrow(x,275,x,310,C.blue,3);}
  if(i===4){s+=rect(625,100,305,245,C.paleBlue,C.line,20)+text(650,143,'Changing magnetic field',20,C.blue,700)+text(650,190,'↓',36,C.blue,700)+text(650,231,'Electric field circulates',20,C.ink,600)+text(650,272,'↓',36,C.orange,700)+text(650,312,'Current inside scrap',22,C.orange,700);}
  if(i===5){
   // Separate functional inset: no receiver position, orientation, or spatial cable is implied.
   s+=rect(615,70,320,330,C.white,C.line,20)
     +text(775,109,'Receiver / readout',24,C.blue,700,'middle')
     +text(775,140,'Non-spatial schematic',18,C.muted,600,'middle')
     +line(637,157,913,157,C.line,2)
     +text(775,191,'Receive-coil voltage',21,C.ink,500,'middle')
     +arrow(775,205,775,225,C.muted,2)
     +text(775,253,'Amplitude + phase',21,C.ink,500,'middle')
     +text(775,299,'Record 42',25,C.green,700,'middle')
     +text(775,338,'Timing + association: to verify',16,C.muted,500,'middle')
     +text(775,374,'No measured data',19,C.muted,500,'middle');
  }
 }
 if(i===6){
  s+=text(500,43,'Piece 42 · assumed copper patch · conceptual cutaway',21,C.muted,600,'middle');
  for(const [x,t,kind,response] of [[270,'Bottom direction','bottom','Potentially weaker'],[730,'Transverse direction','side','Potentially stronger']]){
   s+=rect(x-205,70,410,325,C.white,C.line,22)+text(x,105,t,23,C.blue,700,'middle')+directionalPatch(x,225,kind,time);
   s+=rect(x-118,350,236,34,C.paleGreen,C.paleGreen,17)+text(x,374,response,20,C.green,600,'middle');
  }
  s+=text(500,421,'Blue: magnetic field in air. Orange: closed currents inside the patch.',19,C.muted,500,'middle');
 }
 if(i===7){
  for(const [y,t,sub] of [[80,'Geometry','Visible shape + pose'],[180,'Induction','Directional response'],[280,'Association','Does this belong to 42?']])s+=rect(80,y,335,83,C.white,C.line,16)+text(104,y+34,t,24,C.green,700)+text(104,y+64,sub,19,C.muted)+arrow(425,y+42,515,220,C.green,2);
  s+=rect(540,105,380,245,C.white,C.green,22)+text(565,148,'Proposed inference · ID 42',23,C.ink,700)+text(565,194,'Routing class: pending',22)+text(565,234,'Uncertainty: pending',22)+line(565,260,895,260,C.line,2)+text(565,299,'Uncertain? Recheck.',24,C.green,700)+text(565,326,'No composition or price result',18,C.muted);
 }
 if(i===8){
  s+=rect(65,130,365,210,C.white,C.green,22)+text(90,173,'Proposed output',25,C.green,700)+text(90,216,'Piece ID 42',24,C.ink,700)+text(90,257,'Route or recheck',23)+text(90,297,'Timing + uncertainty',21,C.muted)+arrow(450,230,545,230,C.green,4)+rect(565,95,365,280,C.white,C.line,22)+text(747,139,'Existing host sorter',25,C.ink,700,'middle');
  s+=rect(595,235,300,65,'#eaf0ed',C.line,32)+piece(673,265,.38,true)+line(805,228,805,183,C.ink,12)+rect(779,162,52,27,C.ink,C.ink,5)+text(747,342,'Actuator interface to validate',21,C.muted,500,'middle');
 }
 return s;
}
export function renderSvg(time,{video=false}={}){
 const {scene,index,local}=locate(time),height=video?562.5:430;
 let content=sceneMarkup(index,local,time);
 if(video){content=`<g transform="translate(20 17) scale(.96 .88)">${content}</g>`+line(45,402,955,402,C.line,1)+text(45,435,`${index+1}. ${scene.title}`,25,C.ink,700)+linesText(45,469,scene.caption,96,19,C.ink)+linesText(45,530,scene.note,117,15,C.muted)+text(45,26,'Illustration only · no solved fields or measured output',14,C.muted,500)+text(955,26,'FERROSIFT',14,C.muted,700,'end')+rect(45,559,910,2,C.line,C.line,1)+rect(45,559,Math.max(.1,910*time/duration),2,C.green,C.green,1);}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${height}" width="${video?1280:1000}" height="${video?720:430}" role="img" aria-labelledby="sceneTitle sceneDescription"><title id="sceneTitle">${esc(scene.title)}</title><desc id="sceneDescription">${esc(scene.caption+' '+scene.note+' Schematic only; no solved field or measured signal.')}</desc><rect width="1000" height="${height}" fill="${C.paper}"/>${content}</svg>`;
}
