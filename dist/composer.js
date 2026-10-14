export const TRACKS = ['Kick', 'Snare', 'Closed hat', 'Open hat', 'Percussion', '808 bass', 'Keys', 'Atmosphere'];
export const COLORS = ['#f09b70', '#e8bc74', '#b6cb87', '#78c4b3', '#77abc8', '#a997dc', '#dba2bf', '#8299b4'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteName = n => NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
export const PALETTES = {
  nocturnal: { bpm: 92, progressions: [[0, 5, 3, 6], [0, 3, 5, 4]], kicks: [[0, 6, 14], [0, 7, 10], [0, 6, 11]], snares: [4, 12], swing: 9 },
  orbit: { bpm: 140, progressions: [[0, 0, 5, 3], [0, 6, 5, 5]], kicks: [[0, 7, 11], [0, 10, 14], [0, 3, 11]], snares: [8], swing: 3 },
  dust: { bpm: 86, progressions: [[0, 3, 5, 4], [0, 5, 1, 4]], kicks: [[0, 6, 10], [0, 3, 10], [0, 7, 10]], snares: [4, 12], swing: 22 },
  drill: { bpm: 144, progressions: [[0, 0, 5, 4], [0, 1, 0, 5]], kicks: [[0, 6, 11], [0, 7, 14], [0, 10, 13]], snares: [8, 14], swing: 5 },
  lofi: { bpm: 78, progressions: [[0, 3, 6, 5], [0, 5, 3, 4]], kicks: [[0, 6, 10], [0, 7], [0, 6, 14]], snares: [4, 12], swing: 26 }
};
export function rng(seed) {
  let x = seed >>> 0;
  return () => { x += 0x6D2B79F5; let t = Math.imul(x ^ x >>> 15, 1 | x); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const degreeNote = (degree, key, octave = 48) => octave + key + MINOR[((degree % 7) + 7) % 7] + 12 * Math.floor(degree / 7);
export function buildHarmony(key, degrees, mood = 'dreamy') {
  let previous;
  return degrees.map(degree => {
    const root = degreeNote(degree, key, 36);
    const raw = [0, 2, 4, ...(mood === 'dark' ? [] : [6])].map(d => degreeNote(degree + d, key));
    // Choose an inversion in the same register with the smallest total voice movement.
    const candidates = [];
    for (let inversion = 0; inversion < raw.length; inversion++) {
      const notes = raw.map((n, i) => n + (i < inversion ? 12 : 0)).sort((a, b) => a - b);
      for (const octave of [-12, 0]) candidates.push(notes.map(n => n + octave));
    }
    const score = notes => notes.reduce((sum, n, i) => sum + Math.abs(n - (previous?.[i] ?? (48 + i * 4))), 0) + (notes[0] < 43 ? 15 : 0);
    const chord = candidates.sort((a, b) => score(a) - score(b))[0];
    previous = chord;
    const suffix = mood === 'dark'
      ? ([0, 3, 4].includes(degree) ? 'm' : degree === 1 ? 'dim' : '')
      : ['m7', 'm7♭5', 'maj7', 'm7', 'm7', 'maj7', '7'][degree];
    return { degree, root, chord, label: NOTE_NAMES[root % 12] + suffix };
  });
}
export function generate(options = {}) {
  let { idea = '', style = 'nocturnal', energy = 55, density = 45, seed = Date.now(), key = 0, mood = 'dreamy', humanize = 35, melodyTone = 'keys', kit = 'crisp' } = options;
  const text = idea.toLowerCase();
  if (options.interpretIdea !== false) {
    if (/travis|psychedelic|space|trap/.test(text)) style = 'orbit';
    if (/drake|rnb|r&b|smooth|late.night/.test(text)) style = 'nocturnal';
    if (/boom bap|jazzy|old school/.test(text)) style = 'dust';
    if (/drill/.test(text)) style = 'drill';
    if (/lo.?fi/.test(text)) style = 'lofi';
    if (/dark|ominous|menacing/.test(text)) mood = 'dark';
    else if (/warm|soulful|nostalgic/.test(text)) mood = 'warm';
    if (/bell/.test(text)) melodyTone = 'bell';
    if (/pluck/.test(text)) melodyTone = 'pluck';
    if (/aggressive|hard.hitting|heavy/.test(text)) { energy = Math.max(energy, 78); kit = 'heavy'; }
    if (/sparse|minimal|room for vocals/.test(text)) density = Math.min(density, 30);
  }
  style = PALETTES[style] ? style : 'nocturnal';
  key = clamp(Math.round(key), 0, 11); energy = clamp(energy, 0, 100); density = clamp(density, 0, 100);
  const cfg = PALETTES[style], r = rng(seed), e = energy / 100, d = density / 100;
  const bpm = clamp(Math.round(options.bpm ?? Number(text.match(/\b(\d{2,3})\s*bpm/)?.[1] || cfg.bpm)), 55, 180);
  const degrees = options.progression || cfg.progressions[Math.floor(r() * cfg.progressions.length)];
  const harmony = buildHarmony(key, degrees, mood);
  const patterns = Array.from({ length: 4 }, () => TRACKS.map(() => Array(64).fill(null)));
  const motif = [0, 2, 1, 2, 0, 1].map((n, i) => i === 0 ? 0 : (n + Math.floor(r() * 2)) % 3);
  const rhythm = [[0, 3, 6, 10, 12, 14], [0, 2, 7, 8, 11, 14], [0, 4, 6, 10, 12, 15]][Math.floor(r() * 3)];
  const template = cfg.kicks[Math.floor(r() * cfg.kicks.length)];
  // One coherent verse is the source for all section variations.
  const verse = patterns[1];
  for (let bar = 0; bar < 4; bar++) {
    const base = bar * 16, h = harmony[bar];
    const put = (tr, s, vel = .8, note = 60, len = 1) => {
      const hit = { vel: clamp(vel, .1, 1), note, len, offset: tr === 0 || tr === 5 || tr === 7 ? 0 : r() * .016 * humanize / 100 };
      verse[tr][base + s] = hit; return hit;
    };
    template.forEach((s, i) => put(0, s, i ? .78 + r() * .15 : .96));
    if (bar % 2 && r() < e * .8) put(0, 15, .72);
    cfg.snares.forEach(s => put(1, s, s === 14 && style === 'drill' ? .55 : .84));
    if (style === 'dust' || style === 'lofi') put(1, 11, .22 + e * .1);
    for (let s = 0; s < 16; s++) {
      if (s % 2 === 0 || r() < d * .32) put(2, s, (s % 4 === 0 ? .56 : .34) + r() * .1);
    }
    if ((style === 'orbit' || style === 'drill') && bar % 2) put(2, 14, .48).roll = d > .65 ? 4 : 3;
    if (bar % 2 || e > .65) { put(3, 6, .35); verse[2][base + 6] = null; }
    if (r() < d + .2) put(4, [3, 7, 15][bar % 3], .36);
    const bassSteps = verse[0].slice(base, base + 16).flatMap((n, i) => n ? [i] : []);
    bassSteps.forEach((s, i) => {
      let note = h.root; while (note > 43) note -= 12; while (note < 28) note += 12;
      const len = Math.min(12, (bassSteps[i + 1] ?? 16) - s - .15);
      const n = put(5, s, .72, note, len);
      if (style === 'drill' && i === bassSteps.length - 1 && bar % 2) { n.glide = note + 12; n.len = Math.min(3, len); }
    });
    put(7, 0, mood === 'dark' ? .45 : .55, h.root, 15.5).chord = h.chord;
    rhythm.forEach((s, i) => {
      if (i > 0 && r() > .38 + d * .55) return;
      let note = h.chord[motif[i] % h.chord.length]; while (note < 60 + key) note += 12;
      if (bar % 2 && i === rhythm.length - 1) note = h.chord[0] + 12 * Math.ceil((60 - h.chord[0]) / 12);
      put(6, s, .42 + r() * .16, note, Math.min(style === 'lofi' ? 3 : 2.4, (rhythm[i + 1] ?? 16) - s));
    });
  }
  patterns[0] = structuredClone(verse); patterns[2] = structuredClone(verse); patterns[3] = structuredClone(verse);
  for (let s = 0; s < 64; s++) {
    for (const tr of [0, 1, 3, 4, 5]) patterns[0][tr][s] = null;
    if (s % 4) patterns[0][2][s] = null;
    for (let tr = 0; tr < 6; tr++) patterns[3][tr][s] = null;
    if (s >= 48) patterns[3][6][s] = null;
    if (patterns[2][6][s]) patterns[2][6][s].vel = Math.min(.85, patterns[2][6][s].vel * 1.12);
  }
  for (const s of [15, 31, 47, 61, 63]) {
    patterns[2][2][s] = { vel: .35 + e * .2, note: 60, len: 1, roll: e > .7 ? 3 : 2 };
  }
  patterns[2][1][62] = { vel: .35, note: 60, len: 1 };
  return {
    version: 1, engineVersion: 2, name: idea.trim().slice(0, 45) || 'After hours', idea, style, seed: seed >>> 0, key, bpm, mood,
    energy, density, humanize, melodyTone, kit, harmony, progression: degrees, locks: Array(8).fill(false),
    mix: { reverb: mood === 'dreamy' ? 35 : 20, delay: 24, warmth: style === 'lofi' ? 68 : 25, drive: kit === 'heavy' ? 45 : 20 },
    swing: cfg.swing, patterns, volumes: [.85, .7, .52, .4, .5, .7, .65, .65], mutes: Array(8).fill(false),
    arrangement: [{ pattern: 0, bars: 4 }, { pattern: 1, bars: 16 }, { pattern: 2, bars: 8 }, { pattern: 1, bars: 16 }, { pattern: 2, bars: 8 }, { pattern: 3, bars: 4 }]
  };
}
export function varyProject(project, seed) {
  const generated = generate({ ...project, seed, interpretIdea: false });
  const next = structuredClone(project);
  next.seed = seed >>> 0;
  for (let p = 0; p < 4; p++) for (let tr = 0; tr < 8; tr++) {
    if (!project.locks?.[tr]) next.patterns[p][tr] = generated.patterns[p][tr];
  }
  next.harmony = generated.harmony; next.progression = generated.progression;
  return next;
}
export function normalizeProject(p) {
  return { ...p, progression: p.progression || ({ orbit: [0, 0, 5, 3], dust: [0, 3, 5, 4] }[p.style] || [0, 5, 3, 6]), locks: p.locks || Array(8).fill(false), mix: p.mix || { reverb: 25, delay: 24, warmth: 25, drive: 20 }, mood: p.mood || 'dreamy', melodyTone: p.melodyTone || 'keys', kit: p.kit || 'crisp', energy: p.energy ?? 55, density: p.density ?? 45, humanize: p.humanize ?? 35 };
}
export function validateProject(p) {
  const number = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  const optional = (v, a, b) => v === undefined || number(v, a, b);
  const note = n => n === null || (n && number(n.vel, 0, 1) && number(n.note, 12, 108) && number(n.len, .01, 32)
    && optional(n.roll, 1, 4) && optional(n.offset, 0, .05) && optional(n.glide, 12, 108)
    && (n.chord === undefined || (Array.isArray(n.chord) && n.chord.length > 0 && n.chord.length <= 8 && n.chord.every(x => number(x, 12, 108)))));
  return !!(p?.version === 1 && typeof p.name === 'string' && p.name.length <= 200 && (p.idea === undefined || typeof p.idea === 'string')
    && number(p.bpm, 55, 180) && number(p.swing, 0, 60) && optional(p.key, 0, 11)
    && ['energy', 'density', 'humanize'].every(k => optional(p[k], 0, 100))
    && (p.style === undefined || Object.hasOwn(PALETTES, p.style))
    && (p.mood === undefined || ['dark', 'warm', 'dreamy'].includes(p.mood))
    && (p.melodyTone === undefined || ['keys', 'bell', 'pluck'].includes(p.melodyTone))
    && (p.kit === undefined || ['crisp', 'warm', 'heavy'].includes(p.kit))
    && (p.progression === undefined || (Array.isArray(p.progression) && p.progression.length === 4 && p.progression.every(n => Number.isInteger(n) && number(n, 0, 6))))
    && (p.mix === undefined || (p.mix && ['reverb', 'delay', 'warmth', 'drive'].every(k => number(p.mix[k], 0, 100))))
    && Array.isArray(p.volumes) && p.volumes.length === 8 && p.volumes.every(v => number(v, 0, 1))
    && ['mutes', ...(p.locks === undefined ? [] : ['locks'])].every(k => Array.isArray(p[k]) && p[k].length === 8 && p[k].every(v => typeof v === 'boolean'))
    && Array.isArray(p.patterns) && p.patterns.length === 4 && p.patterns.every(a => Array.isArray(a) && a.length === 8 && a.every(row => Array.isArray(row) && row.length === 64 && row.every(note)))
    && Array.isArray(p.arrangement) && p.arrangement.length > 0 && p.arrangement.length <= 24 && p.arrangement.every(s => Number.isInteger(s.pattern) && number(s.pattern, 0, 3) && Number.isInteger(s.bars) && number(s.bars, 1, 32)));
}
