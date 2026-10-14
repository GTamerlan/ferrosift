'use strict';
(() => {
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1';
if (embedded) document.documentElement.classList.add('embedded');
const state = {catalog: null, clip: null, predictions: null, sampleIndex: -1, request: 0, imageRequest: 0, error: null};
const cache = new Map();
let pendingSeek = null;
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const count = value => Number.isInteger(value) && value >= 0;
const fmt = value => Number(value).toLocaleString('en-US');
const clock = value => {const n=Math.max(0,number(value));return `${Math.floor(n/60)}:${(n%60).toFixed(2).padStart(5,'0')}`;};
const text = (id, value) => { $(id).textContent = value == null ? '' : String(value); };
const make = (tag, value) => {const el=document.createElement(tag);if(value!=null)el.textContent=String(value);return el;};
const frameTime = frame => number(frame.time ?? frame.timestamp_seconds);
const modelName = id => id==='candidate' ? 'Ferrosift model' : 'YOLO11s reference model';
const threshold = id => state.catalog?.models?.[id]?.threshold;
function note(id, message) {text(id,message);$(id).hidden=!message;}
function safeLink(id, href, label) {const a=$(id);if(label)a.textContent=label;try{const u=new URL(href,location.href);if(!['https:','http:'].includes(u.protocol))throw new Error('protocol');a.href=u.href;a.hidden=false;}catch{a.removeAttribute('href');a.hidden=true;}}
function ready(enabled) {for(const id of ['clipSearch','datasetFilter','coverageFilter','clipPicker','resetFilters'])$(id).disabled=!enabled;}
function sampleReady(enabled) {for(const id of ['samplePicker','previousSample','nextSample'])$(id).disabled=!enabled;}
function updateLocation(id) {const u=new URL(location.href);u.searchParams.set('clip',id);history.replaceState(null,'',u);const full=new URL(location.href);full.searchParams.delete('embed');$('clipPermalink').href=full.href;}
function clearSamples(message) {state.predictions=null;state.sampleIndex=-1;state.imageRequest++;sampleReady(false);$('truthToggle').checked=false;$('truthToggle').disabled=true;$('samplePicker').replaceChildren(make('option',message));text('sampleTimestamp',message);text('samplePosition','');for(const model of ['candidate','reference']){$(model+'Image').removeAttribute('src');$(model+'Image').hidden=true;$(model+'Overlay').replaceChildren();text(model+'FrameCount','—');}note('sampleWarning','');}
function renderFilters() {
  const all=state.catalog.clips,q=$('clipSearch').value.trim().toLowerCase(),dataset=$('datasetFilter').value,coverage=$('coverageFilter').value;
  const filtered=all.filter(c=>(!dataset||c.dataset===dataset)&&(!coverage||(coverage==='scored' ? c.metrics?.available===true : c.metrics?.available!==true))&&(!q||[c.id,c.title,c.dataset,c.exposure,c.description,c.content_summary,c.independence_note].join(' ').toLowerCase().includes(q)));
  const picker=$('clipPicker');picker.replaceChildren();
  const contains=filtered.some(c=>c.id===state.clip?.id);
  if(!contains){const o=make('option',filtered.length?'Choose a filtered recording…':'No matching recordings');o.value='';picker.append(o);}
  for(const c of filtered){const o=make('option',`${c.title || c.id}${c.metrics?.available===true?' · verified score':''}`);o.value=c.id;picker.append(o);}
  picker.value=contains?state.clip.id:'';picker.disabled=!filtered.length;
  text('filterCount',`${filtered.length} of ${all.length}`);$('emptyResults').hidden=filtered.length>0;
  return filtered;
}
function metricsValid(m) {
  const fields=['copper_found','copper_missed','steel_matches','unmatched_alarms'];
  return m?.available===true && ['sampled_frames','labeled_frames','copper_annotations','steel_annotations'].every(k=>count(m[k])) && m.labeled_frames>0 && m.labeled_frames<=m.sampled_frames && ['candidate','reference'].every(id=>m[id]&&fields.every(k=>count(m[id][k]))&&m[id].copper_found+m[id].copper_missed===m.copper_annotations);
}
function renderMetrics(clip) {
  const m=clip.metrics||{};const available=metricsValid(m);
  $('scoreResults').hidden=!available;$('scoreUnavailable').hidden=available;
  text('sampleCount',count(m.sampled_frames)?fmt(m.sampled_frames):'Loading');text('labeledCount',count(m.labeled_frames)?fmt(m.labeled_frames):'0');
  text('scoreScope',available?`${fmt(m.labeled_frames)} verified labeled frames of ${fmt(m.sampled_frames)} sampled frames · ${fmt(m.copper_annotations)} copper and ${fmt(m.steel_annotations)} steel annotations. Custom routing diagnostic: all post-NMS proposals, including steel and subthreshold proposals, are assigned to labels before copper thresholds are applied.`:'Saved detections are available to inspect. Unverified frames do not enter the score.');
  text('scoreUnavailable',m.available===true&&!available?'Score unavailable: incomplete verified metric record.':m.reason || 'Accuracy unavailable: no verified labels.');
  for(const id of ['candidate','reference']){text(id+'Recall','—');text(id+'Fraction','');}
  $('metricRows').replaceChildren();text('scoreDifference','');
  if(!available)return;
  const total=m.copper_annotations;
  for(const id of ['candidate','reference']){text(id+'Recall',total?`${(100*m[id].copper_found/total).toFixed(2)}%`:'Undefined');text(id+'Fraction',total?`${fmt(m[id].copper_found)} of ${fmt(total)} copper annotations matched`:'No verified copper annotations in this sample');}
  const rows=[['Copper annotations matched','copper_found'],['Copper annotations missed','copper_missed'],['Steel matched by copper alarms','steel_matches'],['Unmatched copper alarms','unmatched_alarms'],['Other-class matches','other_matches']];
  for(const [label,key] of rows){if(key==='other_matches'&&!number(m.candidate[key])&&!number(m.reference[key]))continue;const tr=make('tr');tr.append(make('td',label),make('td',fmt(m.candidate[key]||0)),make('td',fmt(m.reference[key]||0)));$('metricRows').append(tr);}
  const delta=m.candidate.copper_found-m.reference.copper_found;
  text('scoreDifference',total?`Ferrosift matched ${fmt(Math.abs(delta))} ${delta<0?'fewer':delta>0?'more':'different'} copper annotations${delta===0?' (the same total as the reference)':` · ${Math.abs(100*delta/total).toFixed(2)} percentage points ${delta<0?'lower':'higher'} recall`}.`:'Copper recall is undefined when the verified sample contains no copper annotations.');
  if(delta===0&&total)text('scoreDifference','Both models matched the same number of copper annotations.');
  text('metricCaveat',m.notes || 'Frozen thresholds and class/score-blind maximum-cardinality matching at IoU ≥ 0.5, then maximum summed IoU. These annotation counts are not standard precision/AP, a conventional false-positive rate or physical steel loss. Missing labels are excluded.');
}
function renderProtocol() {
  const holder=$('protocolDetails');holder.replaceChildren();
  holder.append(make('p','Ferrosift’s custom-trained vision model is fine-tuned from pretrained YOLO26s. The reference uses a separately fine-tuned YOLO11s checkpoint. A matched YOLO26s baseline would be needed to isolate architecture from custom-training effects; that comparison has not been run.'));
  for(const id of ['candidate','reference']){const m=state.catalog.models?.[id]||{};holder.append(make('p',`${modelName(id)} · frozen copper threshold ${m.threshold ?? 'not supplied'}`));const p=make('p',`Checkpoint SHA-256: ${m.sha256 || 'not supplied'}`);p.className='model-id';holder.append(p);text(id+'Threshold',`Threshold ${Number.isFinite(Number(m.threshold))?Number(m.threshold).toFixed(6):'—'}`);}
  const p=state.catalog.protocol||{};holder.append(make('p',`${p.input_size || 640} px inputs · confidence floor ${p.confidence_floor ?? 0.001} · class-aware NMS IoU ${p.nms_iou ?? 0.7} · maximum ${p.max_det ?? 1000} detections. ${p.matching_note || 'All proposals use class/score-blind maximum-cardinality matching at IoU ≥ 0.5, then maximum summed IoU.'}`));if(p.notes)holder.append(make('p',p.notes));
}
function copperTruth(frame) {return frame.labels_verified===true && Array.isArray(frame.truth) ? frame.truth.filter(b=>b.class_id===1||String(b.class_name||'').toLowerCase()==='copper') : [];}
function draw(svg, frame, model) {
  svg.replaceChildren();const w=number(frame.width || state.predictions.width || state.clip.width),h=number(frame.height || state.predictions.height || state.clip.height);
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  function box(value,truth=false){const b=Array.isArray(value)?value:value.box;if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite))return;const r=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v] of Object.entries({x:b[0],y:b[1],width:Math.max(0,b[2]-b[0]),height:Math.max(0,b[3]-b[1]),fill:'none',stroke:truth?'#bfe8b7':'#ffad72','stroke-width':2,'vector-effect':'non-scaling-stroke'}))r.setAttribute(k,v);if(truth)r.setAttribute('stroke-dasharray','6 4');const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=truth?'Verified copper annotation':`Saved copper alarm${Number.isFinite(value.confidence)?` · confidence ${value.confidence.toFixed(4)}`:''}`;r.append(title);svg.append(r);}
  if($('truthToggle').checked)copperTruth(frame).forEach(b=>box(b,true));(frame[model]||[]).forEach(b=>box(b));
}
function showSample(index,seek=false) {
  const frames=state.predictions?.frames;if(!frames?.length)return;
  index=Math.max(0,Math.min(frames.length-1,index));const frame=frames[index];
  if(seek){const v=$('sourceVideo');v.pause();pendingSeek=frameTime(frame);if(v.readyState>=1){v.currentTime=Math.min(pendingSeek,Number.isFinite(v.duration)?v.duration:pendingSeek);pendingSeek=null;}}
  if(index===state.sampleIndex){renderSampleOverlays();return;}
  state.sampleIndex=index;$('samplePicker').value=String(index);const request=++state.imageRequest;
  for(const id of ['candidateImage','referenceImage']){$(id).hidden=true;}
  for(const id of ['candidateOverlay','referenceOverlay'])$(id).replaceChildren();
  text('sampleTimestamp',`Loading frozen sample at ${clock(frameTime(frame))}…`);text('samplePosition',`${index+1} / ${frames.length}${Number.isInteger(frame.source_frame_index)?` · viewing frame ${frame.source_frame_index}`:''}`);
  $('truthToggle').disabled=frame.labels_verified!==true;if($('truthToggle').disabled)$('truthToggle').checked=false;
  const image=new Image();image.onload=()=>{if(request!==state.imageRequest)return;for(const id of ['candidateImage','referenceImage']){$(id).src=frame.image;$(id).hidden=false;}text('sampleTimestamp',`Frozen sample · ${clock(frameTime(frame))} · ${frame.labels_verified===true?'verified labels':'no verified labels'}`);renderSampleOverlays();note('sampleWarning','');};image.onerror=()=>{if(request!==state.imageRequest)return;text('sampleTimestamp',`Sample image unavailable at ${clock(frameTime(frame))}`);note('sampleWarning','This saved sample image could not load. Try another sample or reload the page.');};image.src=frame.image;
  $('previousSample').disabled=index===0;$('nextSample').disabled=index===frames.length-1;
}
function renderSampleOverlays(){const frame=state.predictions?.frames?.[state.sampleIndex];if(!frame)return;for(const id of ['candidate','reference']){draw($(id+'Overlay'),frame,id);text(id+'FrameCount',`${fmt((frame[id]||[]).length)} copper alarms at the frozen threshold${frame.labels_verified===true?` · ${fmt(copperTruth(frame).length)} verified copper annotations`:''}`);}}
function nearestFrame(time){const f=state.predictions?.frames;if(!f?.length)return-1;let low=0,high=f.length;while(low<high){const mid=(low+high)>>1;if(frameTime(f[mid])<time)low=mid+1;else high=mid;}if(low===0)return 0;if(low===f.length)return f.length-1;return time-frameTime(f[low-1])<=frameTime(f[low])-time?low-1:low;}
async function selectClip(id) {
  const clip=state.catalog?.clips.find(c=>c.id===id);if(!clip)return;
  state.clip=clip;state.error=null;const request=++state.request;const video=$('sourceVideo');video.pause();pendingSeek=null;clearSamples('Loading saved predictions…');renderMetrics(clip);renderFilters();updateLocation(id);
  text('clipDataset',clip.dataset);text('clipTitle',clip.title||clip.id);text('clipDescription',clip.description||clip.content_summary||'');text('sourceDuration',clock(clip.duration ?? clip.duration_seconds));text('exposure',clip.exposure||'Exposure history unresolved');text('independence',clip.independence_note||clip.domain_warning||'Independent holdout status is not established.');text('samplingNote',clip.sampling_note||state.catalog.protocol?.sampling_note||'Saved samples from this recording; both models use identical input frames.');text('attribution',clip.attribution||'');text('mediaChanges',clip.media_changes||clip.preview_changes||'');text('recordingNote',clip.recording_note||'Source footage may contain original author overlays. Added Ferrosift and reference detections appear only in the saved sample panels.');text('mediaStatus','');safeLink('sourceLink',clip.source_url,'Source record ↗');safeLink('licenseLink',clip.license_url,`${clip.license||'Source license'} ↗`);
  if(clip.poster)video.poster=clip.poster;else video.removeAttribute('poster');video.src=clip.video;video.playbackRate=1;video.load();
  try{let predictions=cache.get(id);if(!predictions){const response=await fetch(clip.predictions_url);if(!response.ok)throw new Error(`Saved predictions returned ${response.status}`);predictions=await response.json();if(!Array.isArray(predictions.frames))throw new Error('Invalid prediction record');predictions.frames.sort((a,b)=>frameTime(a)-frameTime(b));cache.set(id,predictions);}if(request!==state.request)return;state.predictions=predictions;if(!predictions.frames.length){clearSamples('No saved sample frames for this recording');note('sampleWarning','Source playback is available. No saved prediction samples were supplied for this recording.');return;}$('samplePicker').replaceChildren();predictions.frames.forEach((f,i)=>{const o=make('option',`${i+1}. ${clock(frameTime(f))}${f.labels_verified===true?' · verified labels':''}`);o.value=String(i);$('samplePicker').append(o);});text('sampleCount',fmt(predictions.frames.length));sampleReady(true);showSample(nearestFrame(video.currentTime));}
  catch(error){if(request!==state.request)return;state.error=String(error);clearSamples('Saved predictions unavailable');note('sampleWarning','The prediction file could not load. Source playback remains available; reload to retry.');}
}
$('clipPicker').addEventListener('change',()=>selectClip($('clipPicker').value));
for(const id of ['clipSearch','datasetFilter','coverageFilter'])$(id).addEventListener('input',renderFilters);
$('resetFilters').addEventListener('click',()=>{text('emptyResults','No matching recordings. Reset the filters to see all clips.');$('clipSearch').value='';$('datasetFilter').value='';$('coverageFilter').value='';renderFilters();});
$('samplePicker').addEventListener('change',()=>showSample(Number($('samplePicker').value),true));$('previousSample').addEventListener('click',()=>showSample(state.sampleIndex-1,true));$('nextSample').addEventListener('click',()=>showSample(state.sampleIndex+1,true));$('truthToggle').addEventListener('change',renderSampleOverlays);
const video=$('sourceVideo');video.addEventListener('timeupdate',()=>{const index=nearestFrame(video.currentTime);if(index>=0&&index!==state.sampleIndex)showSample(index);});video.addEventListener('seeked',()=>{const index=nearestFrame(video.currentTime);if(index>=0)showSample(index);});video.addEventListener('loadedmetadata',()=>{if(pendingSeek!==null){video.currentTime=Math.min(pendingSeek,video.duration);pendingSeek=null;}text('mediaStatus','');});video.addEventListener('error',()=>text('mediaStatus','This video could not load. Check your connection or choose another recording.'));document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='ferrosift-picker-pause')video.pause();});
window.ferroVideoLab={getState:()=>({ready:!!state.catalog,clipId:state.clip?.id,clipCount:state.catalog?.clips.length,sampleIndex:state.sampleIndex,sampleTime:state.predictions?.frames[state.sampleIndex]?frameTime(state.predictions.frames[state.sampleIndex]):null,frameCount:state.predictions?.frames.length||0,metricsAvailable:metricsValid(state.clip?.metrics),error:state.error}),selectClip,selectSample:index=>showSample(index,true)};
fetch('catalog.json').then(response=>{if(!response.ok)throw new Error(`Catalog returned ${response.status}`);return response.json();}).then(catalog=>{if(!Array.isArray(catalog.clips)||!catalog.clips.length)throw new Error('Empty recording catalog');state.catalog=catalog;const datasets=[...new Set(catalog.clips.map(c=>c.dataset))];for(const dataset of datasets){const o=make('option',dataset);o.value=dataset;$('datasetFilter').append(o);}const scored=catalog.clips.filter(c=>c.metrics?.available===true).length;text('catalogSize',`${catalog.clips.length} recordings · ${datasets.length} datasets · ${scored} with verified scores`);renderProtocol();ready(true);const first=catalog.clips.find(c=>c.id===params.get('clip'))||catalog.clips.find(c=>c.id==='steelds_a3_val')||catalog.clips.find(c=>c.metrics?.available===true)||catalog.clips[0];return selectClip(first.id);}).catch(error=>{state.error=String(error);ready(false);note('loadingError','The recording catalog could not load. Reload this page to retry.');clearSamples('Catalog unavailable');text('catalogSize','Recording catalog unavailable');});
if(embedded){let lastHeight=0;const postHeight=()=>{const height=Math.ceil(document.querySelector('main').getBoundingClientRect().height)+2;if(height!==lastHeight){lastHeight=height;parent.postMessage({type:'ferrosift-picker-height',height},location.origin);}};new ResizeObserver(postHeight).observe(document.querySelector('main'));window.addEventListener('load',postHeight);}
})();
