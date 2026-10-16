// Presentation of archived evidence only. No inference or re-evaluation runs here.
export function buildCumulative(samples) {
  const sum = { copper_annotations: 0, candidate_found: 0, reference_found: 0, candidate_steel_matches: 0, reference_steel_matches: 0, candidate_unmatched_alarms: 0, reference_unmatched_alarms: 0 };
  return samples.map(sample => {
    for (const key of Object.keys(sum)) sum[key] += sample[key] || 0;
    return { time: sample.time, ...sum };
  });
}
export function atOrBefore(items, time) {
  let lo = 0, hi = items.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (items[mid].time <= time) lo = mid + 1; else hi = mid; }
  return lo - 1;
}
export function scoreAt(prefix, time, model) {
  const row = prefix[atOrBefore(prefix, time)];
  const denominator = row?.copper_annotations || 0;
  const found = row?.[`${model}_found`] || 0;
  return { denominator, found, recall: denominator > 0 ? found / denominator : null,
    steel: row?.[`${model}_steel_matches`] || 0, unmatched: row?.[`${model}_unmatched_alarms`] || 0 };
}

if (typeof document !== 'undefined') {
  const mount = document.querySelector('[data-recorded-cv]');
  if (mount) boot(mount);
}
function boot(mount) {
  let initialized = false;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting) && !initialized) { initialized = true; initialize(mount); }
  }, { rootMargin: '500px' });
  observer.observe(mount);
}
async function initialize(mount) {
  const app = mount.querySelector('.rcv-app');
  const base = new URL('../model-demo/', import.meta.url);
  const fetchJSON = async url => { const response = await fetch(url); if (!response.ok) throw new Error('A saved evidence file could not be loaded.'); return response.json(); };
  try {
    const [catalog, metricFile] = await Promise.all([fetchJSON(new URL('catalog.json', base)), fetchJSON(new URL(mount.dataset.metrics, document.baseURI))]);
    app.innerHTML = `<div class="rcv-picker"><label for="rcv-clip">Choose footage</label><select id="rcv-clip" aria-label="Choose recorded footage"></select></div><p class="rcv-exposure"></p><div class="rcv-pair">${['reference', 'candidate'].map(model => `<article class="rcv-pane" data-model="${model}"><div class="rcv-model-title"><h3>${model === 'reference' ? 'YOLO11s reference' : 'Ferrosift model'}</h3><span title="Frozen threshold ${catalog.models[model].threshold}">Copper threshold ≈${catalog.models[model].threshold.toFixed(6)}</span></div><div class="rcv-frame"><canvas role="img" aria-label="${model === 'reference' ? 'Reference' : 'Candidate'} model copper alarms on an exact saved frame"></canvas></div><div class="rcv-score"><p class="rcv-score-label">Cumulative copper-annotation recall</p><div class="rcv-score-main"><strong class="rcv-score-value">—</strong><span class="rcv-score-fraction">Loading recording</span></div><p class="rcv-score-alarms"></p></div></article>`).join('')}</div><div class="rcv-controls"><button type="button" data-action="play" disabled>Play</button><button type="button" data-action="restart" disabled>Restart</button><div class="rcv-timeline"><input type="range" min="0" max="1" value="0" step="0.01" aria-label="Recorded replay position" disabled><output class="rcv-time">0:00 / 0:00</output></div></div><div class="rcv-status"><span class="rcv-sample">Loading exact saved frame…</span><span class="rcv-play-state">Paused · one shared clock</span></div><p class="rcv-score-scope">Recall counts labeled copper annotations found across sampled frames, including repeated views of the same piece. It is not continuous accuracy, chemical composition or physical recovery. Scores change only at evaluated sample times; no curve is interpolated. Seven scored clips: six candidate wins and one reference win.</p><div class="rcv-links"><a class="rcv-source" href="model-demo/">Full source recording &amp; samples ↗</a><a href="training.html">Training details ↗</a><a href="model-demo/historical.html">Earlier evaluation &amp; methods ↗</a></div><span class="rcv-live" role="status" aria-live="polite"></span>`;
    const select = app.querySelector('select'), play = app.querySelector('[data-action="play"]'), restart = app.querySelector('[data-action="restart"]'), range = app.querySelector('input');
    const timeOutput = app.querySelector('.rcv-time'), sampleOutput = app.querySelector('.rcv-sample'), stateOutput = app.querySelector('.rcv-play-state'), live = app.querySelector('.rcv-live');
    const panes = Object.fromEntries(['reference', 'candidate'].map(model => [model, app.querySelector(`[data-model="${model}"]`)]));
    for (const scored of [true, false]) {
      const group = document.createElement('optgroup'); group.label = scored ? 'Scored recordings · 7' : 'Unscored recordings · 31';
      for (const clip of catalog.clips.filter(c => c.metrics.available === scored)) {
        const option = document.createElement('option'); option.value = clip.id;
        option.textContent = clip.title + (clip.id === 'steelds_a3_test' ? ' · reference wins' : ''); group.append(option);
      }
      select.append(group);
    }
    let clip, frames = [], prefix = [], available = false, time = 0, playing = false, raf = 0, tickAt = 0, generation = 0, selection = 0, busy = false, frameIndex = -1, scoreKey = '', imageCache = new Map();
    const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
    function stop() { playing = false; cancelAnimationFrame(raf); play.textContent = time >= (clip?.duration || Infinity) ? 'Replay' : 'Play'; play.setAttribute('aria-pressed', 'false'); stateOutput.textContent = time >= (clip?.duration || Infinity) ? (available ? 'Complete · final clip scores' : 'Complete · unscored recording') : 'Paused · one shared clock'; }
    function status() { play.textContent = playing ? 'Pause' : time >= clip.duration ? 'Replay' : 'Play'; play.setAttribute('aria-pressed', String(playing)); stateOutput.textContent = busy ? 'Loading saved frame…' : playing ? 'Playing · one shared clock' : time >= clip.duration ? (available ? 'Complete · final clip scores' : 'Complete · unscored recording') : 'Paused · one shared clock'; }
    function imageFor(index) {
      if (imageCache.has(index)) return imageCache.get(index);
      const url = new URL(frames[index].image, base), promise = new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('The saved sample image could not be loaded.')); img.src = url.href; });
      imageCache.set(index, promise);
      while (imageCache.size > 12) imageCache.delete(imageCache.keys().next().value);
      return promise;
    }
    function draw(index, img) {
      const frame = frames[index];
      for (const model of ['reference', 'candidate']) {
        const canvas = panes[model].querySelector('canvas'), context = canvas.getContext('2d');
        canvas.width = frame.width || img.naturalWidth; canvas.height = frame.height || img.naturalHeight;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        context.strokeStyle = model === 'reference' ? '#f6c66d' : '#64e3bc'; context.lineWidth = Math.max(2.5, canvas.width / 400);
        for (const alarm of frame[model] || []) { const [x1, y1, x2, y2] = alarm.box; context.strokeRect(x1, y1, x2 - x1, y2 - y1); }
        canvas.setAttribute('aria-label', `${model === 'reference' ? 'Reference' : 'Candidate'}: ${(frame[model] || []).length} saved copper alarms at ${frame.time.toFixed(2)} seconds`);
      }
      frameIndex = index;
      sampleOutput.textContent = `Saved frame ${frame.time.toFixed(2)} s · ${index === frames.length - 1 ? 'last saved sample' : 'held until the next saved sample'}`;
    }
    function scores() {
      const final = time >= clip.duration;
      const key = `${atOrBefore(prefix, time)}:${final}:${available}`; if (key === scoreKey) return; scoreKey = key;
      for (const model of ['reference', 'candidate']) {
        const pane = panes[model], s = scoreAt(prefix, time, model);
        pane.querySelector('.rcv-score-label').textContent = !available ? 'Copper-annotation recall · unavailable' : final ? 'Final clip copper-annotation recall' : 'Cumulative copper-annotation recall';
        pane.querySelector('.rcv-score-value').textContent = available && s.recall !== null ? `${(s.recall * 100).toFixed(2)}%` : '—';
        pane.querySelector('.rcv-score-fraction').textContent = !available ? 'Unscored · no verified labels' : s.denominator ? `${s.found.toLocaleString('en-US')} / ${s.denominator.toLocaleString('en-US')} labeled copper found` : 'Awaiting labeled copper';
        pane.querySelector('.rcv-score-alarms').textContent = available ? `Copper alarms: ${s.steel.toLocaleString('en-US')} matched steel · ${s.unmatched.toLocaleString('en-US')} unmatched` : 'Saved detections are visible; performance is unavailable.';
      }
      if (final) live.textContent = available ? `Replay complete. Reference ${(scoreAt(prefix, time, 'reference').recall * 100).toFixed(2)} percent. Candidate ${(scoreAt(prefix, time, 'candidate').recall * 100).toFixed(2)} percent. Final clip copper-annotation recall.` : 'Replay complete. This clip has no verified labels and remains unscored.';
    }
    function commit(next) { time = next; range.value = String(time); range.setAttribute('aria-valuetext', `${time.toFixed(2)} seconds of ${clip.duration.toFixed(2)} seconds`); timeOutput.textContent = `${clock(time)} / ${clock(clip.duration)}`; scores(); status(); }
    async function setTime(next) {
      next = Math.max(0, Math.min(clip.duration, next));
      const index = atOrBefore(frames, next);
      const token = ++generation;
      if (index < 0) { busy = false; frameIndex = -1; for (const pane of Object.values(panes)) { const canvas = pane.querySelector('canvas'); canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); canvas.setAttribute('aria-label', 'No saved sample at or before the playback position'); } sampleOutput.textContent = 'Awaiting the first saved sample'; commit(next); return; }
      if (index === frameIndex) { busy = false; commit(next); return; }
      busy = true; status();
      try {
        const img = await imageFor(index); if (token !== generation) return;
        draw(index, img); busy = false; commit(next); tickAt = performance.now();
        if (index + 1 < frames.length) imageFor(index + 1).catch(() => {});
      } catch (error) { if (token !== generation) return; busy = false; stop(); stateOutput.textContent = error.message; }
    }
    function tick(now) {
      if (!playing) return;
      const delta = Math.min((now - tickAt) / 1000, .25); tickAt = now;
      if (!busy) setTime(time + delta);
      if (time >= clip.duration) { stop(); return; }
      raf = requestAnimationFrame(tick);
    }
    async function start() { if (busy) return; const selected = selection; if (time >= clip.duration) await setTime(0); if (selected !== selection || busy) return; playing = true; status(); tickAt = performance.now(); raf = requestAnimationFrame(tick); }
    async function choose(id) {
      stop(); const selected = ++selection; const token = ++generation; busy = true; app.setAttribute('aria-busy', 'true'); play.disabled = restart.disabled = range.disabled = true;
      clip = catalog.clips.find(c => c.id === id); select.value = id; time = 0; frameIndex = -1; scoreKey = ''; imageCache = new Map();
      app.querySelector('.rcv-exposure').textContent = `${clip.exposure}. ${clip.independence_note}`;
      app.querySelector('.rcv-source').href = `model-demo/?clip=${encodeURIComponent(id)}`;
      sampleOutput.textContent = 'Loading exact saved frame…';
      for (const pane of Object.values(panes)) { const canvas = pane.querySelector('canvas'); canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); canvas.setAttribute('aria-label', 'Loading saved frame'); pane.querySelector('.rcv-score-value').textContent = '—'; pane.querySelector('.rcv-score-fraction').textContent = 'Loading recording'; pane.querySelector('.rcv-score-alarms').textContent = ''; pane.querySelector('.rcv-score-label').textContent = 'Cumulative copper-annotation recall'; }
      try {
        const predictions = await fetchJSON(new URL(clip.predictions_url, base)); if (token !== generation) return;
        frames = predictions.frames; available = Boolean(clip.metrics.available && metricFile.clips[id]?.available); prefix = buildCumulative(metricFile.clips[id]?.samples || []);
        range.max = String(clip.duration); busy = false; await setTime(0); if (selected !== selection) return;
        play.disabled = restart.disabled = range.disabled = false; app.setAttribute('aria-busy', 'false');
        live.textContent = `${clip.title} loaded. ${available ? 'Cumulative recall uses the archived evaluated samples.' : 'No verified labels; this clip is unscored.'}`;
      } catch (error) { if (token !== generation) return; busy = false; stateOutput.textContent = error.message; app.setAttribute('aria-busy', 'false'); }
    }
    play.addEventListener('click', () => playing ? stop() : start());
    restart.addEventListener('click', () => { stop(); setTime(0); });
    range.addEventListener('input', () => { stop(); setTime(Number(range.value)); });
    select.addEventListener('change', () => choose(select.value));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }, { threshold: 0 }).observe(mount);
    await choose('steelds_a3_val');
  } catch (error) {
    app.setAttribute('aria-busy', 'false'); app.innerHTML = '<p class="rcv-error">The recorded preview could not load. <a href="model-demo/">Open the preserved recording catalog ↗</a></p>';
  }
}
