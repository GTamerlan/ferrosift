(() => {
'use strict';
const $=id=>document.getElementById(id), tour=$('machine'), stage=document.querySelector('.stage'), button=$('tour-play'), reduced=matchMedia('(prefers-reduced-motion: reduce)'), api=()=>window.ferroWalkthrough;
const clamp=x=>Math.max(0,Math.min(1,x));
let mode='piece', playing=false, manual=false, hardwareProgress=0, pieceProgress=0, targetProgress=0, active=-1, piecePhase=-1, scrollFrame=0, playFrame=0, lastPlay=0, playPosition=0, top=0, travel=1, fallback=false, labelKey='';
const chapters=[
 ['Follow one <br>mixed piece.','Steel + attached copper. One damaged winding fragment travels through the module.'],
 ['See its <br>shape.','The camera records the steel and visible winding. Optional 3D adds exterior height.'],
 ['One direction. <br>Still uncertain.','The bottom station probes a metal response. Steel, copper and geometry all affect it.'],
 ['Add a second <br>direction.','The transverse station probes the same piece from another intended direction. Extra evidence is possible, not guaranteed.'],
 ['Route the <br>whole piece.','Illustrative host routing: steel and attached copper stay together. Downstream separation is a different process.']
];
function label(){
 const key=[mode,playing,manual,fallback,reduced.matches,hardwareProgress>=.83,hardwareProgress>.995,pieceProgress>=.995].join('|');
 if(key===labelKey)return;
 labelKey=key;
 button.hidden=mode==='piece'&&!manual;
 button.disabled=fallback;
 if(mode==='piece'||manual)button.removeAttribute('aria-pressed');
 else button.setAttribute('aria-pressed',String(playing));
 $('play-label').textContent=manual?'Resume guided view':reduced.matches?(hardwareProgress>=.83?'Restart walkthrough':'Next cue'):playing?'Pause walkthrough':hardwareProgress>.995?'Replay walkthrough':'Play walkthrough';
 button.querySelector('.play-icon').textContent=manual?'↗':reduced.matches?'→':playing?'Ⅱ':'▶';
 $('scroll-hint').textContent=mode==='piece'?(manual?'Scroll moves the piece ↓':pieceProgress>=.995?'Scroll back to revisit ↑':'Scroll to follow ↓'):(manual?'Manual view':'or scroll to explore ↓');
}
function stop(){playing=false;lastPlay=0;if(playFrame)cancelAnimationFrame(playFrame);playFrame=0;label()}
function progressData(key,value){if(tour.dataset[key]!==value)tour.dataset[key]=value}
function cue(id,value,ready){const row=$('cue-'+id);if(row.dataset.ready!==String(ready)){row.dataset.ready=String(ready);$('cue-'+id+'-value').textContent=ready?value:({optical:'Awaiting the camera',bottom:'Not yet illustrated',transverse:'Not yet illustrated'})[id]}}
function presentPiece(p,{inputProgress=targetProgress,settling=false}={}){
 p=clamp(p);pieceProgress=p;
 const phase=p<.12?0:p<.40?1:p<.66?2:p<.90?3:4;
 progressData('pieceProgress',p.toFixed(5));
 progressData('pieceInputProgress',inputProgress.toFixed(5));
 progressData('pieceSettling',String(settling));
 if(phase!==piecePhase){piecePhase=phase;tour.dataset.piecePhase=String(phase);$('piece-title').innerHTML=chapters[phase][0];$('piece-description').textContent=chapters[phase][1]}
 cue('optical','Steel + visible copper winding',p>=.22);
 cue('bottom','Metal response · composition uncertain',p>=.50);
 cue('transverse','Possible extra evidence · to test',p>=.75);
 if($('piece-outcome').hidden!==(p<.90))$('piece-outcome').hidden=p<.90;
 label();
}
function requestPiece(p,{resumeOnProgressChange=false,immediate=false}={}){
 const changed=Math.abs(p-targetProgress)>1e-7;
 if(changed&&resumeOnProgressChange)manual=false;
 targetProgress=p;
 // Native scroll hands off its target directly. Only the renderer schedules
 // presentation frames; its post-draw event synchronizes captions and cues.
 if(!api()||fallback)presentPiece(p);
 else if(changed||immediate)api().setPieceProgress(p,{resumeOnProgressChange,immediate});
}
function updateHardware(){
 const p=hardwareProgress*2,index=p<.62?0:p<1.65?1:2;
 if(!manual&&index!==active){active=index;document.querySelectorAll('[data-caption]').forEach(c=>c.hidden=Number(c.dataset.caption)!==index)}
 $('tour-progress').style.transform='scaleX('+hardwareProgress+')';
 document.querySelector('.progress-track').setAttribute('aria-valuenow',String(Math.round(hardwareProgress*100)));
 api()?.setProgress(p);label();
}
function updateFromScroll(fromScroll=false){
 const p=clamp((scrollY-top)/travel);
 if(mode==='piece'){
  requestPiece(p,{resumeOnProgressChange:fromScroll,immediate:!fromScroll});
 }
 else{hardwareProgress=p;updateHardware();if(p>=.999&&playing)stop()}
}
function measure(){
 top=tour.getBoundingClientRect().top+scrollY-parseFloat(getComputedStyle(stage).top);
 travel=Math.max(1,tour.offsetHeight-stage.offsetHeight);
 updateFromScroll();
}
function schedule(){
 if(mode==='piece'){updateFromScroll(true);return}
 if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateFromScroll(true)});
}
function hardwareGo(p){
 if(mode!=='hardware')return;
 scrollTo({top:top+travel*clamp(p),behavior:'instant'});
 hardwareProgress=clamp(p);updateHardware();
}
function setMode(next){
 if(!['piece','hardware'].includes(next))return;
 if(scrollFrame){cancelAnimationFrame(scrollFrame);scrollFrame=0}
 stop();manual=false;mode=next;tour.dataset.mode=mode;
 $('mode-piece').setAttribute('aria-pressed',String(mode==='piece'));$('mode-hardware').setAttribute('aria-pressed',String(mode==='hardware'));
 document.querySelector('.scene-captions').hidden=mode!=='hardware';document.querySelector('.piece-story').hidden=mode!=='piece';
 $('piece-marker').hidden=mode!=='piece';document.querySelector('.progress-track').hidden=mode!=='hardware';
 $('direction-legend').hidden=mode!=='piece'||fallback;
 $('tour-kicker').textContent=mode==='piece'?'M02 / Conceptual piece journey':'M02 / Proposed retrofit module';
 document.querySelector('.research-note').textContent=mode==='piece'?'Conceptual cues · no measured outputs':'Design study · not a measured demonstration';
 api()?.setMode(mode);api()?.resume();
 // Both modes share the same sticky section: no scroll writes or progress reset.
 measure();label();
}
function tick(now){
 playFrame=0;
 if(!playing||mode!=='hardware')return;
 const dt=lastPlay?Math.min(now-lastPlay,80):0;lastPlay=now;
 playPosition=clamp(playPosition+dt/30000);hardwareGo(playPosition);
 if(playPosition>=1){stop();return}
 if(playing)playFrame=requestAnimationFrame(tick);
}
button.addEventListener('click',()=>{
 if(manual){manual=false;api()?.resume();label();return}
 // A piece journey has no time-based advance, even after a synthetic button click.
 if(mode==='piece')return;
 if(reduced.matches){stop();hardwareGo(hardwareProgress<.31?.48:hardwareProgress<.83?.95:0);return}
 if(playing){stop();return}
 if(hardwareProgress>.995)hardwareGo(0);
 playPosition=hardwareProgress;playing=true;lastPlay=0;label();playFrame=requestAnimationFrame(tick);
});
$('mode-piece').addEventListener('click',()=>setMode('piece'));
$('mode-hardware').addEventListener('click',()=>setMode('hardware'));
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);addEventListener('wheel',()=>{if(playing)stop()},{passive:true});
addEventListener('touchstart',e=>{if(playing&&!e.target.closest?.('.stage-controls')&&!e.target.closest?.('.tour-modes'))stop()},{passive:true});
addEventListener('keydown',e=>{if(playing&&['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)&&!(e.target===button&&e.key===' '))stop()});
addEventListener('ferrosift-manual',()=>{manual=true;stop()});
addEventListener('ferrosift-resume',()=>{manual=false;mode==='piece'?label():updateHardware()});
addEventListener('ferrosift-piece-presented',e=>{
 if(mode==='piece'&&Number.isFinite(e.detail?.progress))presentPiece(e.detail.progress,e.detail);
});
// Loading CAD must not reroute the page after the visitor has started scrolling.
addEventListener('ferrosift-ready',()=>{fallback=false;$('direction-legend').hidden=mode!=='piece';if(!manual)api()?.setMode(mode);measure()});
addEventListener('ferrosift-fallback',()=>{fallback=true;$('direction-legend').hidden=true;stop();measure()});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop()},{threshold:0}).observe(stage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
reduced.addEventListener('change',()=>{stop();mode==='piece'?requestPiece(targetProgress,{immediate:true}):updateHardware()});
function route(){
 let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
 stop();
 if(new URL(location.href).searchParams.get('research')==='multi-angle'&&(!id||id==='machine')){setMode('hardware');hardwareGo(.48);return}
 if(id==='sensor-research')id='technical-details';const target=$(id);if(!target)return;
 const details=target.closest('details');if(details)details.open=true;if(id==='technical-details')target.open=true;
 requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));
}
addEventListener('pageshow',()=>requestAnimationFrame(measure));
addEventListener('hashchange',route);addEventListener('popstate',route);
$('technical-details').addEventListener('toggle',()=>{if($('technical-details').open)stop()});
window.ferroJourney={getState:()=>({mode,playing,manual,pieceProgress,targetProgress,hardwareProgress,phase:piecePhase,reducedMotion:reduced.matches,scrollLinked:mode==='piece',scrollStart:top,scrollTravel:travel,durationMs:mode==='piece'?null:30000})};
setMode('piece');route();
})();
