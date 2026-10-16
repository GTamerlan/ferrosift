import { evaluateCase } from './revalis-economics-model.mjs?v=70687fab28f5';

// Presentation and unit conversion only. All mass/financial calculations use
// the numerically identical, reviewed revalis-economics-model.mjs supplied with the package.
const mount = document.getElementById('economics-content');
const clone = value => structuredClone(value);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const usd = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const number = (value, digits=1) => new Intl.NumberFormat('en-US', {maximumFractionDigits:digits}).format(value);
const payback = value => value === null ? 'No finite payback' : `${number(value,2)} years`;
let data, input=null, result=null, error=null, mode='matched_feed', presetId='', edited=false;
const sharedFields = [
  ['feedCopperGrade','Feed copper grade','% dry mass','pct'],
  ['copperPriceUsdPerT','Copper price assumption','USD / t Cu'],
  ['scheduledHoursPerYear','Scheduled operating hours','hours / year','hours'],
  ['availableFeedTPerYear','Available dry feed','t / year'],
  ['feedAcquisitionUsdPerFeedT','Feed acquisition','USD / dry feed t'],
  ['inboundFreightUsdPerFeedT','Inbound freight','USD / dry feed t'],
  ['electricityUsdPerKwh','Electricity','USD / kWh']
];
const operatingFields = [
  ['throughputDryTPerOperatingHour','Throughput while operating','dry t / operating hour'],
  ['availability','Availability','% of scheduled hours','pct'],
  ['copperRecoveryToProduct','Copper recovery to product','% of feed Cu','pct'],
  ['productCopperGrade','Product copper grade','% dry product mass','pct-positive'],
  ['productCopperPayability','Product copper payability','% of contained Cu value','pct'],
  ['tailCopperPayability','Tail copper payability','% of contained Cu value','pct'],
  ['residueDryMassFraction','Collected residue','% dry feed mass','pct'],
  ['copperFractionToResidue','Copper reporting to residue','% of feed Cu','pct']
];
const costFields = [
  ['feedPreparationUsdPerFeedT','Feed preparation','USD / dry feed t'],
  ['energyKwhPerFeedT','Energy, including air + extraction','kWh / dry feed t'],
  ['consumablesUsdPerFeedT','Consumables','USD / dry feed t'],
  ['productChargesUsdPerProductT','Product charges + outbound freight','USD / dry product t'],
  ['tailChargesUsdPerTailT','Tail charges + outbound freight','USD / dry tail t'],
  ['residueDisposalUsdPerResidueT','Residue disposal','USD / dry residue t'],
  ['operatorFtePerScheduledHour','Operators per scheduled hour','FTE'],
  ['loadedOperatorUsdPerHour','Loaded operator cost','USD / operator hour'],
  ['annualMaintenanceUsd','Maintenance','USD / year'],
  ['annualOtherFixedOpexUsd','Other fixed operating costs','USD / year']
];
const investmentFields = [
  ['incrementalInstalledCapexUsd','Incremental installed capital','USD'],
  ['incrementalWorkingCapitalUsd','Incremental working capital','USD'],
  ['discountRate','Discount rate','% / year','pct'],
  ['lifeYears','Economic life','years','integer'],
  ['salvageValueUsd','End-of-life salvage','USD'],
  ['targetPaybackYears','Illustrative payback gate','years','positive']
];
function field(group, spec) {
  const [key,label,unit,type='number'] = spec;
  const isPct=type.startsWith('pct');
  const val=input[group][key] * (isPct ? 100 : 1);
  const max=isPct ? ' max="100"' : type==='hours' ? ' max="8760"' : type==='integer' ? ' max="100"' : '';
  const min=type==='integer' ? 1 : type.includes('positive') ? 0.001 : 0;
  const id=`econ-${group}-${key}`;
  return `<label class="econ-field" for="${id}"><span>${esc(label)}<small>${esc(unit)}</small></span><input id="${id}" type="number" inputmode="decimal" required min="${min}"${max} step="${type==='integer'?'1':'any'}" value="${Number(val.toPrecision(12))}" data-group="${group}" data-key="${key}" data-percent="${isPct}"></label>`;
}
function pairedFields(specs) {
  return `<div class="econ-route-labels"><span>Existing route assumption</span><span>Candidate route assumption</span></div><div class="econ-paired-fields">${specs.map(spec=>`<div class="econ-field-pair">${field('baseline',spec)}${field('candidate',spec)}</div>`).join('')}</div>`;
}
function inputsHtml() {
  return `<details class="econ-assumptions" open><summary>01 / Feed &amp; operating calendar</summary><div class="econ-input-grid">${sharedFields.map(f=>field('shared',f)).join('')}</div></details>
  <details class="econ-assumptions" open><summary>02 / Joint recovery, grade &amp; buyer terms</summary><p class="econ-note">Choose a single feasible operating point. Recovery is copper mass recovered; product grade is an assay. Neither is image recall or precision. Buyer terms must be supported together with the output grade.</p>${pairedFields(operatingFields)}</details>
  <details class="econ-assumptions"><summary>03 / Route operating costs</summary><p class="econ-note">Output charges include treatment, penalties and outbound freight. Avoid charging costs already netted from a buyer quote. Energy includes compressor and extraction share; plant wages exclude startup R&amp;D payroll.</p>${pairedFields(costFields)}</details>
  <details class="econ-assumptions"><summary>04 / Incremental investment</summary><div class="econ-input-grid">${investmentFields.map(f=>field('investment',f)).join('')}</div></details>`;
}
function updateControls() {
  mount.querySelector('#econ-inputs').innerHTML=inputsHtml();
  mount.querySelector('#econ-preset').value=presetId;
  mount.querySelector('#econ-mode').value=mode;
  mount.querySelector('#econ-reset').disabled=false;
  mount.querySelector('#econ-empty').hidden=true;
  mount.querySelector('#econ-active').hidden=false;
  mount.querySelector('#econ-sensitivity').innerHTML=sensitivityHtml();
  calculate();
}
function applyPreset(id, payabilityOverride) {
  const preset=data.presets.find(p=>p.id===id);
  if (!preset) return;
  input=clone(preset);presetId=id;edited=false;
  if(payabilityOverride!==undefined){input.candidate.productCopperPayability=payabilityOverride;edited=true;}
  updateControls();
}
function calculate() {
  try {
    const invalid=mount.querySelector('#econ-inputs input:invalid');
    if(invalid) throw new RangeError(`Enter a valid value for ${invalid.closest('label').querySelector('span').firstChild.textContent}.`);
    result=evaluateCase(input,mode);
    const finiteTree=value=>typeof value==='number'?Number.isFinite(value):value&&typeof value==='object'?Object.values(value).every(finiteTree):true;
    if(!finiteTree(result))throw new RangeError('Inputs exceed the numerical range of this calculator.');
    error=null;
    mount.querySelector('#econ-error').hidden=true;
    mount.querySelector('#econ-results').hidden=false;
    mount.querySelector('#econ-export').disabled=false;
    renderResult();
  } catch(e) {
    result=null;error=e.message;
    const box=mount.querySelector('#econ-error');box.textContent=`Scenario cannot be calculated: ${error}`;box.hidden=false;
    mount.querySelector('#econ-results').hidden=true;
    mount.querySelector('#econ-export').disabled=true;
  }
  mount.querySelector('#econ-edit-status').textContent=edited?'Edited hypothetical assumptions':'Unverified preset assumptions';
  mount.querySelector('#econ-capacity-note').hidden=mode!=='capacity_with_extra_feed';
}
function renderResult() {
  const r=result,b=r.baseline,c=r.candidate;
  const sign=r.incrementalOperatingContributionUsd<0?'econ-negative':'';
  mount.querySelector('#econ-results').innerHTML=`
    <div class="econ-result-heading"><span>Hypothetical annual operator economics</span><span>${mode==='matched_feed'?'Matched feed':'Capacity with extra feed'}</span></div>
    <div class="econ-kpis"><article><span>Incremental operating contribution</span><strong class="${sign}" data-result="contribution">${usd(r.incrementalOperatingContributionUsd)}</strong><small>USD / year · candidate minus existing route</small></article><article><span>Simple payback</span><strong data-result="payback" class="${r.simplePaybackYears===null?'econ-negative':''}">${payback(r.simplePaybackYears)}</strong><small>${usd(r.initialIncrementalCashUsd)} incremental initial cash</small></article><article><span>Pre-tax, unlevered NPV</span><strong class="${r.preTaxUnleveredNpvUsd<0?'econ-negative':''}">${usd(r.preTaxUnleveredNpvUsd)}</strong><small>${number(input.investment.lifeYears,0)} years · ${number(input.investment.discountRate*100,2)}% discount rate</small></article></div>
    <p class="econ-gate">${r.clearsIllustrativePaybackGate?'Meets':'Does not meet'} the assumed ${number(input.investment.targetPaybackYears,2)}-year payback gate. Annualized economic contribution after capital and working-capital charges: <strong>${usd(r.incrementalAnnualizedEconomicContributionUsd)} / year.</strong></p>
    <div class="econ-table-wrap" tabindex="0" role="region" aria-label="Annual route comparison"><table><caption>Operator comparison · hypothetical · USD and dry metric tonnes</caption><thead><tr><th scope="col">Annual measure</th><th scope="col">Existing route assumption</th><th scope="col">Candidate route assumption</th></tr></thead><tbody>
    ${[
      ['Calculated capacity, dry t / year',number(r.baselineCapacityT),number(r.candidateCapacityT)],
      ['Feed processed, dry t / year',number(b.feedT),number(c.feedT)],
      ['Product copper grade, % dry mass',number(input.baseline.productCopperGrade*100),number(input.candidate.productCopperGrade*100)],
      ['Payable copper equivalent, t Cu / year',number(b.payableCopperT,2),number(c.payableCopperT,2)],
      ['Variable contribution, USD / dry feed t',usd(b.unit.unitContributionUsdPerFeedT),usd(c.unit.unitContributionUsdPerFeedT)],
      ['Copper settlement value, USD / year',usd(b.metalRevenueUsd),usd(c.metalRevenueUsd)],
      ['Fixed operating costs, USD / year',usd(b.fixedOpexUsd),usd(c.fixedOpexUsd)],
      ['Operating contribution, USD / year',usd(b.operatingContributionUsd),usd(c.operatingContributionUsd)]
    ].map(row=>`<tr><th scope="row">${row[0]}</th><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('')}</tbody></table></div>
    <div class="econ-table-wrap" tabindex="0" role="region" aria-label="All annual material and copper streams"><table class="econ-mass-table"><caption>Every output stream · annual dry mass and contained copper</caption><thead><tr><th rowspan="2" scope="col">Stream</th><th colspan="2" scope="colgroup">Existing route assumption</th><th colspan="2" scope="colgroup">Candidate route assumption</th></tr><tr><th scope="col">Dry t</th><th scope="col">t Cu</th><th scope="col">Dry t</th><th scope="col">t Cu</th></tr></thead><tbody>${[
      ['Input','feedT','copperFeedT'],['Product','productT','copperProductT'],['Tail','tailT','copperTailT'],['Residue','residueT','copperResidueT']
    ].map(([label,mass,cu])=>`<tr><th scope="row">${label}</th><td>${number(b[mass],2)}</td><td>${number(b[cu],2)}</td><td>${number(c[mass],2)}</td><td>${number(c[cu],2)}</td></tr>`).join('')}</tbody></table></div>
    <p class="econ-note" data-result="closure">Dry mass closure: existing ${number(b.unit.dryMassClosure*100,3)}%, candidate ${number(c.unit.dryMassClosure*100,3)}%. Copper closure: existing ${number(b.unit.copperMassClosure*100,3)}%, candidate ${number(c.unit.copperMassClosure*100,3)}%. Calculated closure is a consistency check, not a measured recovery result.</p>
    <details class="econ-assumptions"><summary>How the increment is assembled</summary><dl class="econ-decomposition"><div><dt>Same-feed variable contribution change</dt><dd>${usd(r.sameFeedVariableUpliftUsd)}</dd></div><div><dt>Extra-volume contribution change</dt><dd>${usd(r.extraVolumeContributionUsd)}</dd></div><div><dt>Less: fixed operating cost change</dt><dd>${usd(r.fixedCostDeltaUsd)}</dd></div><div><dt>Incremental operating contribution</dt><dd>${usd(r.incrementalOperatingContributionUsd)}</dd></div></dl><p class="econ-note">This exact decomposition counts each contribution once. Proposed R&amp;D teams do not add independent percentage gains to recovery.</p></details>`;
}
function sensitivityHtml() {
  if(!input)return `<div class="econ-sensitivity"><h3>Buyer terms can reverse the result.</h3><p class="econ-note">Choose a hypothetical case above to see the fixed middle-case buyer-term sensitivity, or deliberately load its assumptions below. No sensitivity result is calculated until you select assumptions.</p><button type="button" data-load-middle>Load hypothetical middle-case assumptions</button></div>`;
  const middle=data.presets.find(p=>p.id==='illustrative_middle');
  return `<div class="econ-sensitivity"><h3>Buyer terms can reverse the result.</h3><p class="econ-note">Fixed hypothetical middle case: existing-route payability 78%, matched feed, all other inputs unchanged. These are sensitivity cases, not buyer offers or forecasts.</p><div class="econ-sensitivity-grid">${[0.73,0.78,0.83].map(value=>{
    const scenario=clone(middle);scenario.candidate.productCopperPayability=value;const r=evaluateCase(scenario,'matched_feed');
    return `<button type="button" data-payability="${value}"><span>Candidate payability ${number(value*100,0)}%</span><strong class="${r.incrementalOperatingContributionUsd<0?'econ-negative':''}">${payback(r.simplePaybackYears)}</strong><small>${usd(r.incrementalOperatingContributionUsd)} / year</small><em>Load this hypothetical case ↗</em></button>`;
  }).join('')}</div></div>`;
}
function exportScenario() {
  if(!result)return;
  const payload={schemaVersion:'1.0.0',createdUtc:new Date().toISOString(),evidenceStatus:'HYPOTHETICAL_PLANNING_ASSUMPTIONS_NOT_MEASURED',scope:'Operator economics, not Revalis revenue. Not linked to video or detector metrics.',modelSource:'revalis-economics-model.mjs',presetId,edited,mode,inputs:clone(input),results:clone(result)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='Revalis_hypothetical_operator_scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function init() {
  mount.classList.add('fs-economics');
  const response=await fetch(new URL('./revalis-economics-inputs.json',import.meta.url));
  if(!response.ok)throw new Error('The scenario assumptions could not be loaded.');
  data=await response.json();
  mount.innerHTML=`<div class="econ-notice"><span>Hypothetical assumptions</span><p>Explore operator economics with a closed copper mass balance. Every preset is unverified. These values are not Revalis revenue, measured savings, price quotes or a prediction of commercial performance.</p></div>
  <div class="econ-toolbar"><label for="econ-preset">Choose a hypothetical case<select id="econ-preset"><option value="">Select assumptions to begin</option>${data.presets.map(p=>`<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')}</select></label><label for="econ-mode">Comparison basis<select id="econ-mode"><option value="matched_feed">Matched feed quantity</option><option value="capacity_with_extra_feed">Capacity with extra feed</option></select></label><button type="button" id="econ-reset" disabled>Reset selected case</button></div>
  <p id="econ-empty" class="econ-empty">Select a preset above to explicitly load its planning assumptions. No economic result is inferred from the video or detector scores.</p>
  <div id="econ-active" hidden><div class="econ-current"><span id="econ-edit-status"></span><button type="button" id="econ-export" disabled>Export assumptions + results ↓</button></div><p id="econ-capacity-note" class="econ-capacity-note" hidden>Extra processed volume requires independently verified feed supply, buyer capacity and unchanged lot quality. Capacity is an assumption, not the prototype's rated throughput.</p><div class="econ-workspace"><form id="econ-inputs" aria-label="Hypothetical economic assumptions" novalidate></form><div class="econ-output"><p id="econ-error" role="alert" hidden></p><div id="econ-results"></div></div></div></div>
  <div id="econ-sensitivity">${sensitivityHtml()}</div>
  <details class="econ-method"><summary>Formula source, uncertainty &amp; required validation</summary><div><p>Dry metric tonnes; USD. This calculator calls the supplied <a href="revalis-economics-model.mjs" download>decision model v1.0</a> without changing its formulas. <a href="revalis-economics-inputs.json" download>Download every preset and formula note.</a></p><p>Recovery, purity, payability, availability and throughput form one joint scenario. No R&amp;D team gains are stacked. Other-metal revenue is zero here. Taxes, financing and actual settlement terms are excluded. Negative contributions remain negative; a zero or negative increment has no finite simple payback.</p><p>Required before a commercial claim: representative weighed input and every output, independent copper and contaminant assays, dry-basis closure, uptime and throughput logs, measured energy and labor, buyer acceptance/payability offers and installed-equipment quotes. Bounds shown by presets are illustrative cases, not statistical confidence intervals.</p><ul>${Object.entries(data.evidenceNeeded).map(([key,note])=>`<li>${esc(note)}</li>`).join('')}</ul><dl>${data.formulas.map(f=>`<div><dt>${esc(f.id.replaceAll('_',' '))} · ${esc(f.unit)}</dt><dd><code>${esc(f.expression)}</code>${f.note?`<p>${esc(f.note)}</p>`:''}</dd></div>`).join('')}</dl></div></details>`;
  mount.querySelector('#econ-preset').addEventListener('change',e=>{
    if(e.target.value)applyPreset(e.target.value);
    else {input=null;result=null;error=null;presetId='';mount.querySelector('#econ-active').hidden=true;mount.querySelector('#econ-empty').hidden=false;mount.querySelector('#econ-reset').disabled=true;mount.querySelector('#econ-inputs').replaceChildren();mount.querySelector('#econ-results').replaceChildren();mount.querySelector('#econ-export').disabled=true;mount.querySelector('#econ-sensitivity').innerHTML=sensitivityHtml();}
  });
  mount.querySelector('#econ-mode').addEventListener('change',e=>{mode=e.target.value;if(input)calculate();});
  mount.querySelector('#econ-reset').addEventListener('click',()=>applyPreset(presetId));
  mount.querySelector('#econ-export').addEventListener('click',exportScenario);
  mount.querySelector('#econ-inputs').addEventListener('submit',e=>e.preventDefault());
  mount.querySelector('#econ-inputs').addEventListener('input',e=>{
    const el=e.target;if(!el.matches('input[data-key]'))return;
    input[el.dataset.group][el.dataset.key]=el.value===''?NaN:Number(el.value)/(el.dataset.percent==='true'?100:1);edited=true;calculate();
  });
  mount.querySelector('#econ-sensitivity').addEventListener('click',e=>{
    const button=e.target.closest('button');
    if(!button)return;
    if(button.hasAttribute('data-load-middle')){mode='matched_feed';applyPreset('illustrative_middle');}
    else if(button.hasAttribute('data-payability')){mode='matched_feed';applyPreset('illustrative_middle',Number(button.dataset.payability));}
  });
  window.ferroEconomics={getState:()=>clone({ready:true,presetId,edited,mode,input,result,error})};
  mount.dataset.ready='true';
}
if(mount)init().catch(e=>{mount.textContent=`Economics calculator unavailable: ${e.message}`;mount.setAttribute('role','alert');});
