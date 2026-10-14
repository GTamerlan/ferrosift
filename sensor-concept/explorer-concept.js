'use strict';
(() => {
const $=id=>document.getElementById(id),scene=window.ferroScene,reduced=matchMedia('(prefers-reduced-motion: reduce)'),frame=$('sensor-concept-frame');
let enabled=false,playing=false,progress=0,last=0,raf=0,routeTimer=0,routeRevision=0;
const oldDisclaimer=document.querySelector('.scene-disclaimer').textContent;
function status(){const s=scene?.getState?.(),r=s?.researchStats,field=r?.activeField||'none',phase=field==='a'?'P17 · Tx A excites / Rx A measures · B idle':field==='b'?'P17 · Tx B excites / Rx B measures · A idle':(s?.researchProgress||0)<.2?'P17 · optical geometry + encoder registration · both Tx idle':'P17 · tracked transfer / aligned record · both Tx idle';const message=enabled?`${phase}. Research overlay: ${r?.proceduralObjects||'separate'} illustrative objects; 494 CAD components unchanged.`:'Research overlay off. Authoritative CAD assembly shown.';if($('research-readout').textContent!==message)$('research-readout').textContent=message;const host=document.querySelector('.machine-stage');host.dataset.researchField=field;host.dataset.researchProgress=String(s?.researchProgress||0);}
function play(v){playing=v;last=0;$('research-play').textContent=v?'Pause P17 sequence':'Play P17 sequence';$('research-play').setAttribute('aria-pressed',String(v));$('research-quick-play').textContent=v?'Pause P17':'Play P17';$('research-quick-play').setAttribute('aria-pressed',String(v));if(v&&!raf)raf=requestAnimationFrame(tick);if(!v&&raf){cancelAnimationFrame(raf);raf=0;}}
function enable(v,focus=false){if(!scene?.setResearchOverlay){$('research-readout').textContent='The research overlay is unavailable. Use the close-up experiment below.';return;}enabled=v;scene.setResearchOverlay(v);if(v&&focus){scene.focusResearchCell?.();progress=scene.getState?.().researchProgress||0;$('research-progress').value=String(Math.round(progress*1000));}document.querySelector('.machine-stage').classList.toggle('research-active',v);document.querySelector('.scene-disclaimer').textContent=v?'Research overlay · schematic · not CAD':oldDisclaimer;$('research-cell-toggle').setAttribute('aria-pressed',String(v));$('research-overlay-toggle').setAttribute('aria-pressed',String(v));$('research-overlay-toggle').textContent=v?'Hide research cell':'Show research cell';if(!v)play(false);status();}
function update(){scene?.setResearchProgress?.(progress);$('research-progress').value=String(Math.round(progress*1000));status();}
function tick(t){raf=0;if(!playing)return;const dt=last?Math.min((t-last)/1000,.1):0;last=t;progress=Math.min(1,progress+dt/22);if(reduced.matches){const p=progress<.25?0:progress<.55?.4:progress<.85?.889:1;scene?.setResearchProgress?.(p);$('research-progress').value=String(Math.round(p*1000));status();}else update();if(progress>=1)play(false);else raf=requestAnimationFrame(tick);}
const researchParam='multi-angle';
function routeRequested(){return new URL(location.href).searchParams.get('research')===researchParam;}
function entryMessage(message){$('research-entry-status').textContent=message;}
function restoreFocus(wasInQuickControls){if(wasInQuickControls)$('research-entry').focus({preventScroll:true});}
function reconcileRoute({focusControls=false,resetCAD=true}={}){
 const revision=++routeRevision;clearTimeout(routeTimer);routeTimer=0;
 const wantsResearch=routeRequested()&&(!location.hash||location.hash==='#machine');
 if(!wantsResearch){
  if(routeRequested()){const u=new URL(location.href);u.searchParams.delete('research');history.replaceState(history.state,'',u);}
  const wasEnabled=enabled,wasInQuickControls=!!document.activeElement?.closest('.research-quick-controls');enable(false);entryMessage('');if(wasEnabled&&resetCAD)scene?.reset?.();restoreFocus(wasInQuickControls);return;
 }
 play(false);entryMessage('Loading the 3D sensing cell…');
 function activateWhenReady(){
  if(revision!==routeRevision||!routeRequested())return;
  if(scene?.getState?.().ready){$('machine').scrollIntoView({behavior:'instant',block:'start'});scene.update?.();enable(true,true);entryMessage('');if(focusControls)$('research-quick-play').focus({preventScroll:true});return;}
  if(!$('webgl-fallback').hidden||$('assembly-status')?.classList.contains('is-error')){entryMessage('3D is unavailable here. Open “Why these views?” for the accessible close-up explanation.');return;}
  routeTimer=setTimeout(activateWhenReady,150);
 }
 activateWhenReady();
}
function requestRoute(open,{focusControls=false,resetCAD=true}={}){
 const u=new URL(location.href);
 if(open){u.searchParams.set('research',researchParam);u.hash='machine';}
 else if(u.searchParams.get('research')===researchParam)u.searchParams.delete('research');
 if(u.href!==location.href)history.pushState(history.state,'',u);
 reconcileRoute({focusControls,resetCAD});
}
$('research-entry').addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();requestRoute(true,{focusControls:true});});
$('research-cell-toggle').addEventListener('click',()=>{requestRoute(!routeRequested(),{focusControls:!enabled});$('research-tools').open=true;});
$('research-overlay-toggle').addEventListener('click',()=>requestRoute(!routeRequested(),{focusControls:!enabled}));
$('research-focus').addEventListener('click',()=>requestRoute(true,{focusControls:true}));
$('open-research-3d').addEventListener('click',()=>requestRoute(true,{focusControls:true}));
function ensureResearch(){if(!enabled){requestRoute(true);return !!enabled;}return true;}
 document.querySelectorAll('[data-research-phase]').forEach(b=>b.addEventListener('click',()=>{play(false);if(!ensureResearch())return;scene?.setResearchPhase?.(b.dataset.researchPhase);progress=b.dataset.researchPhase==='b'?560/630:b.dataset.researchPhase==='a'?250/630:0;$('research-progress').value=String(Math.round(progress*1000));status();}));
for(const id of ['research-play','research-quick-play'])$(id).addEventListener('click',()=>{if(!ensureResearch())return;if(progress>=1)progress=0;play(!playing);});
$('research-close').addEventListener('click',()=>requestRoute(false));
$('research-progress').addEventListener('input',()=>{play(false);if(!ensureResearch())return;progress=Number($('research-progress').value)/1000;update();});
$('reset-view').addEventListener('click',()=>requestRoute(false,{resetCAD:false}));
document.querySelectorAll('.view-presets [data-view]').forEach(b=>b.addEventListener('click',()=>requestRoute(false,{resetCAD:false})));
addEventListener('popstate',()=>reconcileRoute());addEventListener('hashchange',()=>reconcileRoute());
reduced.addEventListener('change',()=>play(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)play(false);});
reconcileRoute();
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='ferrosift-concept-height')return;const height=Number(event.data.height);if(Number.isFinite(height)&&height>500&&height<18000)frame.style.height=Math.ceil(height)+'px';});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)frame.contentWindow?.postMessage({type:'ferrosift-concept-pause'},location.origin);},{threshold:0}).observe(frame);new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)play(false);},{threshold:0}).observe($('machine'));
})();
