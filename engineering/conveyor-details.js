/* On-demand engineering notes for the frozen CAD assembly. No inferred hardware. */
(function (win) {
  'use strict';
  const doc=win.document,inspector=doc.querySelector('.assembly-inspector'),body=inspector&&inspector.querySelector('.assembly-inspector-body');
  if(!body)return;
  const data={
    optical:{stage:1,title:'Optical inspection',role:'Measurement · concept',summary:'A camera and diffuse lights observe pieces above the belt. The crossrails, slotted height plate and carriage reserve adjustment for a selected lens.',facts:[['RGB centre','x = 1300 mm'],['Example footprint','400 × 300 mm on a 600 mm belt'],['Lens envelope lower face','z = 1582.5 mm; belt top z = 1000 mm']],limit:'The optical outline is an illustrative sight path, not calibrated coverage. The depth device and its mount are optional, unbuilt envelopes; no laser or depth hardware is selected.',parts:[['camera_rgb_housing','RGB camera'],['camera_height_adjust_plate','Height adjustment'],['light_bar_near','Light & mount'],['depth_optional_housing','Optional depth device']]},
    induction:{stage:2,title:'Inductive measurement',role:'Measurement · concept',summary:'The removable cassette reserves space below the belt for a sensor that measures an electromagnetic response. Air jets sort downstream.',facts:[['Cassette envelope','350 × 600 × 200 mm'],['Reserved centre','x = 1600 mm'],['Coil topology / coverage','Unselected / unknown']],limit:'The highlighted window marks a reserved measurement location, not a simulated field. No coils, frequency, channel count or usable gap are specified. Response is not validated hidden-copper quantity.',parts:[['induction_cassette_tray','Cassette enclosure'],['induction_nonconductive_cap','Nonconductive cap'],['sensor_drawer_rail_in','Drawer support'],['sensor_connector_panel','Signal / power interface']]},
    tracking:{stage:3,title:'Position & timing',role:'Calculated travel · concept',summary:'A head-shaft encoder supplies a proposed belt-position reference. Associate each camera observation and inductive response with an object position before scheduling the downstream valve.',facts:[['Last sensing datum','x = 1750 mm'],['Discharge lip','x = 3000 mm'],['Sensor → lip','1250 mm; 1.250 s at 1.00 m/s']],limit:'Roller rotation is not a measurement of object slip. Encoder resolution, synchronization, association accuracy and latency remain unvalidated. Sensor-to-lip travel excludes free flight and pneumatic delay.',parts:[['encoder_body','Encoder envelope'],['encoder_coupling','Flexible coupling'],['encoder_bracket','Encoder bracket'],['roller_head','Head roller']]},
    sorting:{stage:4,title:'Pneumatic sorting',role:'Actuation · concept',summary:'Timed valve commands feed the nozzle bank to divert a target toward concentrate. The balance path continues to a gate that can divert an entire group to review.',facts:[['Nozzle bank','12 envelopes; 50 mm pitch'],['Timing model','Arrival estimate − measured actuation delay'],['Collection','Concentrate / balance / review']],limit:'Valve delay, hose fill, pulse length, pressure and object flight require measurement. The gate needs feed inhibit, a clearing gap and position feedback; it does not recover targets already ejected. There is no eddy-current separator rotor in this model.',parts:[['valve_pack','Valve bank'],['nozzle_05','Nozzle envelope'],['review_gate_plate','Review gate'],['bin_concentrate','Concentrate bin'],['bin_balance','Balance bin'],['bin_review','Review bin']]}
  };
  const section=doc.createElement('section');section.className='assembly-technical';section.setAttribute('aria-labelledby','technical-title');
  section.innerHTML='<div class="assembly-technical-heading"><h2 id="technical-title">Technical inspection</h2><span class="assembly-technical-status">Concept</span></div><p class="assembly-technical-intro">Select a subsystem or click a CAD component.</p><nav class="assembly-topic-nav" aria-label="Inspect a subsystem"></nav><div id="technical-detail" hidden></div>';
  body.prepend(section);
  const nav=section.querySelector('nav'),detail=section.querySelector('#technical-detail');
  let currentTopic='',currentPart=null;
  function node(tag,text,className){const n=doc.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;}
  function topicFor(part){if(!part)return'';if(part.topic&&data[part.topic])return part.topic;const id=part.id||'',category=part.category||'';if(/encoder|roller_head|shaft_head/.test(id))return'tracking';if(['sensor','window'].includes(category)||/induction|sensor_/.test(id))return'induction';if(['camera','light','hood'].includes(category)||/camera|optical|light_|depth_/.test(id))return'optical';if(['airjet','gate','chute','bin'].includes(category)||/nozzle|air_|valve|gate|bin_/.test(id))return'sorting';return'';}
  function commandTopic(topic){const scene=win.ferroScene;if(scene&&scene.inspectTopic)scene.inspectTopic(topic);else{if(scene&&scene.setStage)scene.setStage(data[topic].stage);open(topic);}}
  for(const[topic,label]of[['optical','Optical'],['induction','Induction'],['tracking','Tracking'],['sorting','Sorting']]){const button=node('button',label);button.type='button';button.dataset.inspectTopic=topic;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>commandTopic(topic));nav.append(button);}
  function render(){
    detail.replaceChildren();detail.hidden=false;
    const topic=data[currentTopic],part=currentPart;
    const heading=node('h3',topic?topic.title:'CAD component');detail.append(heading);
    detail.append(node('p',topic?topic.role:'Mechanical concept','assembly-technical-role'));
    if(part){detail.append(node('p',part.name||part.id,'assembly-technical-part'));if(part.optional||part.installed===false||/^depth_optional/.test(part.id||''))detail.append(node('p','Optional provision · not installed','assembly-technical-limit'));}
    if(topic){
      detail.append(node('p',topic.summary));const dl=node('dl',null,'assembly-technical-facts');
      for(const[label,value]of topic.facts){dl.append(node('dt',label));const dd=node('dd',value);if(currentTopic==='tracking'&&label==='Sensor → lip')dd.id='technical-travel';dl.append(dd);}detail.append(dl);
      detail.append(node('p',topic.limit,'assembly-technical-limit'));
      const links=node('div',null,'assembly-part-links');links.setAttribute('aria-label','Related CAD components');
      for(const[id,label]of topic.parts){const b=node('button',label+' ↗');b.type='button';b.dataset.inspectPart=id;b.setAttribute('aria-pressed',String(!!part&&part.id===id));b.addEventListener('click',()=>{const scene=win.ferroScene;if(scene&&scene.selectPart)scene.selectPart(id);else{const select=doc.getElementById('component-select');if(select){select.value=id;select.dispatchEvent(new Event('change'));}}});links.append(b);}detail.append(links);
    }else if(part){
      detail.append(node('p',part.note||part.notes||part.description||'A named solid from the concept CAD assembly. Dimensions describe the model and do not establish a selected production component.'));
      if(part.bbox&&part.bbox.min&&part.bbox.max){const size=part.bbox.max.map((v,i)=>v-part.bbox.min[i]).map(v=>Number(v.toFixed(1)));detail.append(node('p','CAD bounding box: '+size.join(' × ')+' mm','assembly-technical-limit'));}
    }
    for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.inspectTopic===currentTopic));
    updateTravel();
  }
  function updateTravel(){const output=doc.getElementById('technical-travel'),scene=win.ferroScene;if(!output||!scene||!scene.getState)return;const speed=scene.getState().speed||1;output.textContent='1250 mm; '+(1.25/speed).toFixed(3)+' s at '+speed.toFixed(2)+' m/s';}
  function open(topic,part){currentTopic=data[topic]?topic:topicFor(part);currentPart=part||null;render();inspector.open=true;body.scrollTop=0;}
  function close(){inspector.open=false;}
  inspector.addEventListener('toggle',()=>{if(!inspector.open){currentTopic='';currentPart=null;detail.hidden=true;for(const b of nav.querySelectorAll('button'))b.setAttribute('aria-pressed','false');if(win.ferroScene&&win.ferroScene.clearTechnical)win.ferroScene.clearTechnical();}});
  doc.addEventListener('ferro:inspect',event=>{const part=event.detail||{};open(part.topic||topicFor(part),part.id?part:null);});
  const speed=doc.getElementById('belt-speed');if(speed)speed.addEventListener('input',updateTravel);
  doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&inspector.open){close();inspector.querySelector('summary').focus();}});
  win.ferroTechnical={open,close,topicFor,data,getState:()=>({topic:currentTopic,part:currentPart&&currentPart.id,open:inspector.open})};
})(window);
