export const scenes = [
  {id:'camera',short:'See',duration:5,title:'First, find the fragment.',caption:'The camera detects a piece and separates its visible outline from the belt.',note:'An outline describes appearance. It does not reveal composition.'},
  {id:'identity',short:'Track',duration:5,title:'Give it a temporary identity.',caption:'Software calls this fragment “42” and links its observations as it travels.',note:'42 is a software record—not a tag attached to the metal.'},
  {id:'depth',short:'Shape',duration:5,title:'Add geometry, if depth is available.',caption:'Optional depth sensing could estimate external height and pose.',note:'Surface geometry is not an elemental map or a view inside the fragment.'},
  {id:'timing',short:'Time',duration:5,title:'Predict when 42 reaches each station.',caption:'An encoder measures belt travel. Software predicts station arrival.',note:'A prediction still needs an association check: pieces can slip, overlap or rotate.'},
  {id:'induction',short:'Excite',duration:7,title:'A changing magnetic field induces currents.',caption:'AC in a transmit coil creates a changing field. Closed eddy-current loops form inside a conductor.',note:'Blue arrows: magnetic field. Orange loops: electrical current inside metal.'},
  {id:'response',short:'Measure',duration:6,title:'Measure the electrical response.',caption:'The conductor’s secondary magnetic field changes the receive-coil voltage. Link the measurement to 42.',note:'Amplitude and phase are measured relative to the drive; this illustration contains no measured data.'},
  {id:'direction',short:'Compare',duration:6,title:'Try another field direction.',caption:'A second station gives another directional view of the same fragment’s response.',note:'Another projection may help. Two directions do not recover an interior map or a full tensor.'},
  {id:'fusion',short:'Combine',duration:6,title:'Combine observations. Keep uncertainty.',caption:'A proposed model combines shape, response and association quality to estimate a routing class.',note:'Low confidence or uncertain identity should lead to recheck. No assay or value is inferred here.'},
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
  s+=rect(65,70,520,330,C.white,C.line,22)+text(325,108,'Generic conductor · piece 42',22,C.ink,600,'middle');
  s+=rect(185,155,280,100,C.paleOrange,C.orange,18)+text(325,194,'42',28,C.ink,700,'middle');
  // All orange eddy-current loops and their arrowheads remain inside the metal rectangle.
  s+=loop(325,218,85,20,phase,C.orange,Math.sin(time*2.2)>=0?1:-1)+loop(325,218,57,12,phase+.25,C.orange,Math.sin(time*2.2)>=0?1:-1);
  s+=coil(325,333)+text(325,382,'Transmit coil · AC drive',21,C.green,600,'middle');
  // Blue arrows are a symbolic sample of the primary field in air, not current paths or solved streamlines.
  for(const x of [205,325,445]){const up=Math.sin(time*2.2)>=0;s+=up?arrow(x,310,x,275,C.blue,3):arrow(x,275,x,310,C.blue,3);}
  if(i===4){s+=rect(625,100,305,245,C.paleBlue,C.line,20)+text(650,143,'Changing magnetic field',20,C.blue,700)+text(650,190,'↓',36,C.blue,700)+text(650,231,'Electric field circulates',20,C.ink,600)+text(650,272,'↓',36,C.orange,700)+text(650,312,'Current in the metal',22,C.orange,700);}
  if(i===5){s+=coil(510,286,'vertical',C.blue)+text(525,385,'Receive',20,C.blue,600,'middle')+line(534,299,613,299,C.muted,3)+line(613,299,613,188,C.muted,3)+line(613,188,645,188,C.muted,3)+rect(645,130,290,223,C.white,C.line,20)+text(669,170,'Record 42',26,C.green,700)+text(669,211,'Receive-coil voltage',20,C.ink)+text(669,250,'Amplitude + phase',20,C.ink)+text(669,295,'No measured data',19,C.muted)+text(669,326,'Association: to verify',18,C.muted);}
 }
 if(i===6){
  for(const [x,t] of [[270,'A · intended vertical view'],[730,'B · intended side view']])s+=rect(x-205,80,410,285,C.white,C.line,22)+text(x,122,t,22,C.ink,600,'middle')+piece(x,217,.85,true);
  s+=coil(270,315)+coil(545,220,'vertical');
  for(const x of [190,270,350])s+=arrow(x,300,x,277,C.blue,3);
  for(const y of [175,220,265])s+=arrow(570,y,610,y,C.blue,3);
  s+=text(500,402,'Same ID, different station; association must be checked.',23,C.muted,500,'middle');
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
