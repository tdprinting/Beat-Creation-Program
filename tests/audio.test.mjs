import test from 'node:test';
import assert from 'node:assert/strict';
import webAudio from 'web-audio-engine';
import { AudioEngine, generate, PALETTES, wav } from '../dist/engine.js';

async function render(p, steps = 16) {
  const step = 60 / p.bpm / 4, sampleRate = 22050;
  const ctx = new webAudio.OfflineAudioContext(2, Math.ceil((step * steps + 2) * sampleRate), sampleRate);
  const engine = new AudioEngine(ctx, p);
  for (let s = 0; s < steps; s++) engine.schedule(1, s % 64, s * step + (s % 2 ? p.swing / 100 * step : 0), step);
  const buffer = await ctx.startRendering(); engine.dispose(); return buffer;
}
function metrics(buffer) {
  let sum = 0, peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) for (const sample of buffer.getChannelData(ch)) {
    assert.ok(Number.isFinite(sample), 'no NaN or infinite audio samples'); sum += sample * sample; peak = Math.max(peak, Math.abs(sample));
  }
  return { rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)), peak };
}
test('all five palettes render non-silent, finite audio without clipping', async () => {
  for (const style of Object.keys(PALETTES)) {
    const p = generate({ style, seed: 29, energy: 90, density: 85 });
    const buffer = await render(p), m = metrics(buffer);
    assert.ok(m.rms > .005, style + ' is audible'); assert.ok(m.peak < 1, style + ' has headroom: ' + m.peak);
    assert.ok(wav(buffer).size > 100000);
  }
});
test('each voice renders and all-muted projects remain silent including effects', async () => {
  for (let tr = 0; tr < 8; tr++) {
    const p = generate({ seed: 5 }); p.mutes = Array(8).fill(true); p.mutes[tr] = false;
    p.patterns[1][tr][0] ||= { vel: .8, note: tr === 5 ? 36 : 60, len: 2 };
    assert.ok(metrics(await render(p, 4)).rms > .0001, 'voice ' + tr + ' renders');
  }
  const p = generate(); p.mutes.fill(true); assert.equal(metrics(await render(p, 4)).peak, 0);
});
test('bell, pluck and keys produce different waveforms', async () => {
  const waves = [];
  for (const melodyTone of ['keys', 'bell', 'pluck']) {
    const p = generate({ seed: 4, melodyTone }); p.mutes = p.mutes.map((_, i) => i !== 6);
    waves.push([...((await render(p, 4)).getChannelData(0).slice(0, 4096))]);
  }
  assert.notDeepEqual(waves[0], waves[1]); assert.notDeepEqual(waves[0], waves[2]);
});
