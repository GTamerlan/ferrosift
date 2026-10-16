(() => {
'use strict';
const $=id=>document.getElementById(id), tour=$('machine'), stage=document.querySelector('.stage'), button=$('tour-play'), reduced=matchMedia('(prefers-reduced-motion: reduce)'), api=()=>window.ferroWalkthrough;
const clamp=x=>Math.max(0,Math.min(1,x));
let mode='piece', playing=false, manual=false, hardwareProgress=0, pieceProgress=0, active=-1, piecePhase=-1, scrollFrame=0, playFrame=0, lastPlay=0, playPosition=0, top=0, travel=1, fallback=false;
const chapters=[
 ['Follow one <br>mixed piece.','A steel core with attached copper turns. It travels as one whole piece.'],
 ['See its <br>shape.','The camera records appearance. Optional 3D adds the exterior height profile.'],
 ['One direction. <br>Still uncertain.','The metal response depends on the steel, copper and their geometry. It is not a copper assay.'],
 ['Add a second <br>direction.','The same mixed piece meets another intended field direction. It may add useful evidence.'],
 ['Route the <br>whole piece.','Illustrative host routing: the attached steel and copper stay together. Downstream separation is a different process.']
];
function label(){
 button.disabled=fallback;
 button.setAttribute('aria-pressed',String(playing));
 const p=mode==='piece'?pieceProgress:hardwareProgress;
 $('play-label').textContent=manual?'Resume guided view':reduced.matches?(p>.995?'Replay journey':'Next cue'):playing?(mode==='piece'?'Pause journey':'Pause walkthrough'):p>.995?(mode==='piece'?'Replay journey':'Replay walkthrough'):(mode==='piece'?'Play piece journey':'Play walkthrough');
 button.querySelector('.play-icon').textContent=manual?'↗':reduced.matches?'→':playing?'Ⅱ':'▶';
 $('scroll-hint').textContent=manual?'manual view':mode==='piece'?'26-second illustration':'or scroll to explore ↓';
}
function stop(){playing=false;lastPlay=0;if(playFrame)cancelAnimationFrame(playFrame);playFrame=0;label()}
function cue(id,value,ready){const row=$('cue-'+id);if(row.dataset.ready!==String(ready)){row.dataset.ready=String(ready);$('cue-'+id+'-value').textContent=ready?value:({optical:'Awaiting the camera',bottom:'Not yet illustrated',transverse:'Not yet illustrated'})[id]}}
function updatePiece(){
 const p=pieceProgress;
 const phase=p<.12?0:p<.40?1:p<.66?2:p<.90?3:4;
 if(phase!==piecePhase){piecePhase=phase;tour.dataset.piecePhase=String(phase);$('piece-title').innerHTML=chapters[phase][0];$('piece-description').textContent=chapters[phase][1]}
 cue('optical','Visible winding + core · exterior only',p>=.22);
 cue('bottom','Metal response · composition uncertain',p>=.50);
 cue('transverse','Possible additional evidence · to test',p>=.75);
 $('piece-outcome').hidden=p<.90;
 document.querySelector('.piece-legend').hidden=!(p>=.40&&p<.90);
 $('piece-scrub').value=String(Math.round(p*1000));
 $('piece-scrub').setAttribute('aria-valuetext',Math.round(p*100)+' percent through conceptual journey');
 api()?.setPieceProgress(p);
 label();
}
function updateHardware(){
 const p=hardwareProgress*2,index=p<.62?0:p<1.65?1:2;
 if(!manual&&index!==active){active=index;document.querySelectorAll('[data-caption]').forEach(c=>c.hidden=Number(c.dataset.caption)!==index)}
 $('tour-progress').style.transform='scaleX('+hardwareProgress+')';
 document.querySelector('.progress-track').setAttribute('aria-valuenow',String(Math.round(hardwareProgress*100)));
 api()?.setProgress(p); label();
}
function measure(){top=tour.getBoundingClientRect().top+scrollY-parseFloat(getComputedStyle(stage).top);travel=Math.max(1,tour.offsetHeight-stage.offsetHeight);if(mode==='hardware')updateFromScroll()}
function updateFromScroll(){scrollFrame=0;if(mode!=='hardware')return;hardwareProgress=clamp((scrollY-top)/travel);updateHardware();if(hardwareProgress>=.999&&playing)stop()}
function schedule(){if(mode==='hardware'&&!scrollFrame)scrollFrame=requestAnimationFrame(updateFromScroll)}
function hardwareGo(p){scrollTo({top:top+travel*p,behavior:'instant'});hardwareProgress=clamp(p);updateHardware()}
function setMode(next,resetScroll=true){
 stop();manual=false;mode=next;tour.dataset.mode=mode;
 $('mode-piece').setAttribute('aria-pressed',String(mode==='piece'));$('mode-hardware').setAttribute('aria-pressed',String(mode==='hardware'));
 document.querySelector('.scene-captions').hidden=mode!=='hardware';document.querySelector('.piece-story').hidden=mode!=='piece';
 $('piece-scrub').hidden=mode!=='piece';$('piece-marker').hidden=mode!=='piece';
 document.querySelector('.piece-legend').hidden=true;document.querySelector('.progress-track').hidden=mode!=='hardware';
 $('tour-kicker').textContent=mode==='piece'?'M02 / Conceptual piece journey':'M02 / Proposed retrofit module';
 document.querySelector('.research-note').textContent=mode==='piece'?'Conceptual cues · no measured outputs':'Design study · not a measured demonstration';
 api()?.setMode(mode);api()?.resume();measure();
 if(resetScroll)scrollTo({top:Math.max(0,top),behavior:'instant'});
 if(mode==='piece')updatePiece();else{hardwareProgress=0;hardwareGo(0)}
 label();
}
function tick(now){
 playFrame=0;if(!playing)return;
 const dt=lastPlay?Math.min(now-lastPlay,80):0;lastPlay=now;
 playPosition=clamp(playPosition+dt/(mode==='piece'?26000:30000));
 if(mode==='piece'){pieceProgress=playPosition;updatePiece()}else hardwareGo(playPosition);
 if(playPosition>=1){stop();return}if(playing)playFrame=requestAnimationFrame(tick);
}
button.addEventListener('click',()=>{
 if(manual){manual=false;api()?.resume();label();return}
 if(reduced.matches){stop();if(mode==='piece'){pieceProgress=[.22,.50,.75,1].find(p=>p>pieceProgress+.001)??0;updatePiece()}else hardwareGo(hardwareProgress<.31?.48:hardwareProgress<.83?.95:0);return}
 if(playing){stop();return}
 if(mode==='piece'){if(pieceProgress>.995)pieceProgress=0;updatePiece();playPosition=pieceProgress}else{if(hardwareProgress>.995)hardwareGo(0);playPosition=hardwareProgress}
 playing=true;lastPlay=0;label();playFrame=requestAnimationFrame(tick);
});
$('mode-piece').addEventListener('click',()=>setMode('piece'));
$('mode-hardware').addEventListener('click',()=>setMode('hardware'));
$('piece-scrub').addEventListener('input',()=>{stop();manual=false;api()?.resume();pieceProgress=Number($('piece-scrub').value)/1000;updatePiece()});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',measure);addEventListener('wheel',stop,{passive:true});
addEventListener('touchstart',e=>{if(!e.target.closest('.stage-controls')&&!e.target.closest('.tour-modes'))stop()},{passive:true});
addEventListener('keydown',e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)&&e.target!==button)stop()});
addEventListener('ferrosift-manual',()=>{manual=true;stop()});addEventListener('ferrosift-resume',()=>{manual=false;mode==='piece'?updatePiece():updateHardware()});
addEventListener('ferrosift-ready',()=>{fallback=false;api()?.setMode(mode);measure();route();mode==='piece'?updatePiece():updateHardware()});
addEventListener('ferrosift-fallback',()=>{fallback=true;stop();$('piece-scrub').disabled=true;measure();route()});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop()},{threshold:0}).observe(stage);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});reduced.addEventListener('change',()=>{stop();mode==='piece'?updatePiece():updateHardware()});
function route(){
 let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}
 if(new URL(location.href).searchParams.get('research')==='multi-angle'&&(!id||id==='machine')){setMode('hardware');hardwareGo(.48);return}
 if(id==='sensor-research')id='technical-details';const target=$(id);if(!target)return;
 const details=target.closest('details');if(details)details.open=true;if(id==='technical-details')target.open=true;
 requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));
}
addEventListener('pageshow',()=>requestAnimationFrame(()=>{measure();route()}));addEventListener('hashchange',route);addEventListener('popstate',route);
$('technical-details').addEventListener('toggle',()=>{if($('technical-details').open)stop()});
window.ferroJourney={getState:()=>({mode,playing,manual,pieceProgress,hardwareProgress,phase:piecePhase,reducedMotion:reduced.matches,durationMs:26000})};
setMode('piece',false);route();
})();
