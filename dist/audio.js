import { TRACKS, rng, clamp } from './composer.js';

const cache = new WeakMap();
function buffers(ctx) {
  if (cache.has(ctx)) return cache.get(ctx);
  const random = rng(421), noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  const room = ctx.createBuffer(2, Math.round(ctx.sampleRate * 1.8), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const a = room.getChannelData(ch);
    for (let i = 0; i < a.length; i++) a[i] = (random() * 2 - 1) * (1 - i / a.length) ** 3 * .4;
  }
  const result = { noise, room }; cache.set(ctx, result); return result;
}

export class AudioEngine {
  constructor(ctx, project) {
    this.ctx = ctx; this.project = project; this.nodes = []; this.activeSources = new Set();
    this.master = this.own(ctx.createGain()); this.master.gain.value = .72;
    this.filter = this.own(ctx.createBiquadFilter()); this.filter.type = 'lowpass'; this.filter.Q.value = .4;
    this.comp = this.own(ctx.createDynamicsCompressor());
    Object.assign(this.comp.threshold, { value: -12 }); this.comp.knee.value = 12;
    this.comp.ratio.value = 4; this.comp.attack.value = .004; this.comp.release.value = .18;
    this.master.connect(this.filter).connect(this.comp).connect(ctx.destination);
    this.duck = this.own(ctx.createGain()); this.duck.connect(this.master);
    this.saturation = this.own(ctx.createWaveShaper()); this.saturation.oversample = '2x'; this.saturation.connect(this.duck);
    this.bus = TRACKS.map((_, i) => {
      const g = this.own(ctx.createGain()); g.gain.value = project.mutes[i] ? 0 : project.volumes[i];
      g.connect(i === 5 ? this.saturation : i === 7 ? this.duck : this.master); return g;
    });
    const { noise, room } = buffers(ctx); this.noise = noise;
    this.delay = this.own(ctx.createDelay(2)); this.delay.delayTime.value = 60 / project.bpm * .75;
    this.feedback = this.own(ctx.createGain()); this.feedback.gain.value = .27;
    const delayFilter = this.own(ctx.createBiquadFilter()); delayFilter.frequency.value = 2800;
    this.delayWet = this.own(ctx.createGain());
    this.delay.connect(delayFilter).connect(this.feedback).connect(this.delay);
    this.delay.connect(this.delayWet).connect(this.master);
    this.reverb = this.own(ctx.createConvolver()); this.reverb.buffer = room;
    this.reverbWet = this.own(ctx.createGain()); this.reverb.connect(this.reverbWet).connect(this.master);
    this.bus[6].connect(this.delay); this.bus[6].connect(this.reverb); this.bus[7].connect(this.reverb);
    this.setMix(project.mix);
  }
  own(node) { this.nodes.push(node); return node; }
  setMix(mix = {}) {
    const t = this.ctx.currentTime;
    this.delayWet.gain.setTargetAtTime((mix.delay ?? 24) / 100 * .65, t, .025);
    this.reverbWet.gain.setTargetAtTime((mix.reverb ?? 25) / 100 * .8, t, .025);
    this.filter.frequency.setTargetAtTime(Math.min(this.ctx.sampleRate * .45, 18000 - (mix.warmth ?? 25) / 100 * 14000), t, .025);
    const drive = 1 + (mix.drive ?? 20) / 100 * 4, curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) { const x = i * 2 / (curve.length - 1) - 1; curve[i] = Math.tanh(x * drive) / Math.tanh(drive) / (1 + (drive - 1) * .3); }
    this.saturation.curve = curve;
  }
  startSource(src, t, duration, nodes = []) {
    this.activeSources.add(src); src.onended = () => { src.disconnect(); nodes.forEach(n => n.disconnect()); this.activeSources.delete(src); };
    src.start(t); src.stop(t + duration + .04); return src;
  }
  choke(src, time) { if (src) { try { src.stop(time + .006); } catch {} } }
  hit(track, n, time, step) {
    const c = this.ctx, t = Math.max(time, c.currentTime), v = n.vel, bus = this.bus[track];
    const kit = this.project.kit || 'crisp';
    const tone = (freq, end, dur, type = 'sine', vol = 1, attack = .004) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (end) o.frequency.exponentialRampToValueAtTime(end, t + Math.min(dur * .7, .14));
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, v * vol), t + Math.min(attack, dur / 2));
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(bus); this.startSource(o, t, dur, [g]); return { o, g };
    };
    const noise = (dur, freq, type, vol) => {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); src.buffer = this.noise;
      f.type = type; f.frequency.value = freq; g.gain.setValueAtTime(v * vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      src.connect(f).connect(g).connect(bus); return this.startSource(src, t, dur, [f, g]);
    };
    if (track === 0) {
      tone(kit === 'heavy' ? 165 : 140, kit === 'warm' ? 48 : 43, kit === 'heavy' ? .42 : .3, 'sine', .9);
      noise(.012, kit === 'warm' ? 1000 : 2300, 'lowpass', .13);
    }
    if (track === 1) {
      noise(kit === 'warm' ? .12 : .19, kit === 'warm' ? 1300 : 1900, 'highpass', .43);
      tone(185, 125, .11, 'triangle', .21);
    }
    if (track === 2) { this.choke(this.openHat, t); noise(.045, kit === 'warm' ? 5500 : 7600, 'highpass', .25); }
    if (track === 3) { this.choke(this.openHat, t); this.openHat = noise(.28, 6500, 'highpass', .24); }
    if (track === 4) { tone(780, 380, .09, 'triangle', .3); noise(.025, 2400, 'bandpass', .2); }
    if (track === 5) {
      const freq = 440 * 2 ** ((n.note - 69) / 12), duration = Math.max(.06, n.len * step);
      for (const voice of this.bass || []) {
        voice.g.gain.cancelScheduledValues(t); voice.g.gain.setTargetAtTime(.0001, t, .004); this.choke(voice.o, t);
      }
      const sub = tone(freq, 0, duration, 'sine', .64, .009), harmonic = tone(freq * 2, 0, duration * .8, 'triangle', .1, .009);
      if (n.glide) for (const [voice, octave] of [[sub, 1], [harmonic, 2]]) {
        voice.o.frequency.setValueAtTime(freq * octave, t + duration * .35);
        voice.o.frequency.exponentialRampToValueAtTime(440 * 2 ** ((n.glide - 69) / 12) * octave, t + duration * .75);
      }
      this.bass = [sub, harmonic];
    }
    if (track === 6) {
      const freq = 440 * 2 ** ((n.note - 69) / 12), duration = Math.max(.06, n.len * step), sound = this.project.melodyTone;
      tone(freq, 0, duration, sound === 'pluck' ? 'triangle' : 'sine', .32);
      tone(freq * (sound === 'bell' ? 2.76 : 2.002), 0, duration * .65, 'sine', sound === 'bell' ? .12 : .09);
      if (sound === 'keys' || !sound) tone(freq * 3, 0, duration * .3, 'sine', .025);
    }
    if (track === 7) for (const [i, note] of (n.chord || [n.note, n.note + 7]).entries()) {
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), pan = c.createStereoPanner();
      o.type = 'triangle'; o.frequency.value = 440 * 2 ** ((note - 69) / 12); o.detune.value = i % 2 ? 3 : -3;
      f.frequency.value = 1400; pan.pan.value = (i % 2 ? 1 : -1) * .38;
      const dur = n.len * step; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .14, t + Math.min(.12, dur / 3));
      g.gain.setTargetAtTime(.0001, t + Math.max(.15, dur - .3), .15);
      o.connect(f).connect(g).connect(pan).connect(bus); this.startSource(o, t, dur + .8, [g, f, pan]);
    }
  }
  schedule(pattern, s, time, step, mult = 1) {
    const kick = this.project.patterns[pattern][0][s];
    if (kick && !this.project.mutes[0]) {
      const t = Math.max(time, this.ctx.currentTime);
      this.duck.gain.cancelScheduledValues(t); this.duck.gain.setValueAtTime(.57, t); this.duck.gain.linearRampToValueAtTime(1, t + Math.min(.16, step * .8));
    }
    for (let tr = 0; tr < 8; tr++) {
      const n = this.project.patterns[pattern][tr][s];
      if (n && !this.project.mutes[tr]) {
        const count = Math.round(clamp(n.roll || 1, 1, 4));
        for (let j = 0; j < count; j++) this.hit(tr, { ...n, vel: n.vel * mult * (1 - j * .12) }, time + (n.offset || 0) + j * step / count, step);
      }
    }
  }
  stop() { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setTargetAtTime(0, this.ctx.currentTime, .015); }
  dispose() {
    for (const src of this.activeSources) this.choke(src, this.ctx.currentTime);
    this.nodes.forEach(n => n.disconnect()); this.nodes = [];
  }
}
