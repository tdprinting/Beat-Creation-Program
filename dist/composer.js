export const TRACKS = ['Kick', 'Snare', 'Closed hat', 'Open hat', 'Percussion', '808 bass', 'Keys', 'Atmosphere'];
export const COLORS = ['#f09b70', '#e8bc74', '#b6cb87', '#78c4b3', '#77abc8', '#a997dc', '#dba2bf', '#8299b4'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const noteName = n => NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
export const PALETTES = {
  nocturnal: { bpm: 92, progressions: [[0, 5, 3, 6], [0, 3, 5, 4]], kicks: [[0, 6, 14], [0, 7, 10], [0, 6, 11]], snares: [4, 12], swing: 9 },
  orbit: { bpm: 140, progressions: [[0, 0, 5, 3], [0, 6, 5, 5]], kicks: [[0, 7, 11], [0, 10, 14], [0, 3, 11]], snares: [8], swing: 0 },
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
  let { vocalSpace = 60, fillRate = 40, bassStyle = 'balanced' } = options;
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
    if (/room for vocals|freestyle|rap over|vocal.focus/.test(text)) vocalSpace = Math.max(vocalSpace, 80);
    if (/busy hats|lots of fills/.test(text)) fillRate = Math.max(fillRate, 75);
    if (/no fills|no rolls/.test(text)) fillRate = 0;
    if (/bouncy|staccato bass/.test(text)) bassStyle = 'bouncy';
    if (/sustained|long 808|sub drone/.test(text)) bassStyle = 'sustained';
  }
  style = PALETTES[style] ? style : 'nocturnal';
  key = clamp(Math.round(key), 0, 11); energy = clamp(energy, 0, 100); density = clamp(density, 0, 100);
  vocalSpace = clamp(vocalSpace, 0, 100); fillRate = clamp(fillRate, 0, 100);
  bassStyle = ['balanced', 'bouncy', 'sustained'].includes(bassStyle) ? bassStyle : 'balanced';
  const cfg = PALETTES[style], r = rng(seed), e = energy / 100, d = density / 100;
  // Independent streams keep changes in one control from shuffling unrelated parts.
  const drumRandom = rng(seed ^ 0x12ad), bassRandom = rng(seed ^ 0x41bc), melodicRandom = rng(seed ^ 0x7e15), fillRandom = rng(seed ^ 0x912a);
  const bpm = clamp(Math.round(options.bpm ?? Number(text.match(/\b(\d{2,3})\s*bpm/)?.[1] || cfg.bpm)), 55, 180);
  const degrees = options.progression || cfg.progressions[Math.floor(r() * cfg.progressions.length)];
  const harmony = buildHarmony(key, degrees, mood);
  const patterns = Array.from({ length: 4 }, () => TRACKS.map(() => Array(64).fill(null)));
  const contour = [[0, 2, 4, 3, 1, 0], [2, 1, 0, 2, 4, 2], [0, 0, 3, 4, 2, 0]][Math.floor(melodicRandom() * 3)];
  const rhythm = [[0, 3, 6, 8, 10, 14], [0, 2, 7, 8, 11, 14], [0, 4, 6, 8, 12, 15]][Math.floor(melodicRandom() * 3)];
  const motifMask = rhythm.map((_, i) => i === 0 ? 0 : melodicRandom());
  const template = cfg.kicks[Math.floor(r() * cfg.kicks.length)];
  // One coherent verse is the source for all section variations.
  const verse = patterns[1];
  for (let bar = 0; bar < 4; bar++) {
    const base = bar * 16, h = harmony[bar];
    const put = (tr, s, vel = .8, note = 60, len = 1) => {
      const loose = style === 'dust' || style === 'lofi';
      const timing = rng((seed ^ (tr * 7919 + s * 31 + bar * 101)) >>> 0)();
      const hit = { vel: clamp(vel, .1, 1), note, len, offset: tr === 0 || tr === 5 || tr === 7 ? 0 : (tr === 1 && loose ? .012 : 0) * humanize / 100 + timing * .012 * humanize / 100 };
      verse[tr][base + s] = hit; return hit;
    };
    template.forEach((s, i) => put(0, s, i ? .78 + drumRandom() * .15 : .96));
    if (bar % 2 && drumRandom() < e * .8) put(0, 15, .72);
    cfg.snares.forEach(s => { if (style !== 'drill' || s !== 14 || bar % 2) put(1, s, s === 14 && style === 'drill' ? .55 : .84); });
    if (style === 'dust' || style === 'lofi') put(1, 11, .22 + e * .1);
    for (let s = 0; s < 16; s++) {
      const chance = drumRandom(), accent = drumRandom();
      if (s % 2 === 0 || chance < d * .24) put(2, s, (s % 4 === 0 ? .56 : .32) + accent * .1);
    }
    // Fills are added later at phrase boundaries, rather than on every bar.
    if (bar % 2 || e > .65) { put(3, 6, .35); verse[2][base + 6] = null; }
    if (drumRandom() < d + .2) put(4, [3, 7, 15][bar % 3], .36);
    const kickSteps = verse[0].slice(base, base + 16).flatMap((n, i) => n ? [i] : []);
    // The bass supports strong kicks, but has its own rests and pickups.
    const bassSet = new Set(bassStyle === 'sustained' ? [0, ...(bar % 2 ? [10] : [])] : kickSteps.filter((_, i) => i === 0 || i % 2 === 0));
    if (bassStyle !== 'sustained') bassSet.add(bar % 2 ? 13 : 9);
    if (bassStyle === 'bouncy') bassSet.add(6);
    const bassSteps = [...bassSet].sort((a, b) => a - b);
    bassSteps.forEach((s, i) => {
      const useFifth = i > 0 && (bar % 2 || bassRandom() < .35);
      let note = useFifth ? degreeNote(h.degree + 4, key, 24) : h.root;
      while (note > 43) note -= 12; while (note < 28) note += 12;
      const gap = (bassSteps[i + 1] ?? 16) - s;
      const len = Math.min(bassStyle === 'bouncy' ? 1.6 : bassStyle === 'sustained' ? 15.5 : 5.5, gap - .18);
      const n = put(5, s, i === 0 ? .74 : .64 + bassRandom() * .08, note, len);
      if (style === 'drill' && i === bassSteps.length - 1 && bar % 2) { n.glide = note + 12; n.len = Math.min(3, len); }
    });
    put(7, 0, (mood === 'dark' ? .45 : .55) * (1 - vocalSpace / 100 * .25), h.root, vocalSpace >= 70 ? 11.5 : 15.5).chord = h.chord;
    let previousNote = 60 + key;
    rhythm.forEach((s, i) => {
      if (i > 0 && motifMask[i] > .38 + d * .55) return;
      if (bar % 2 && s >= 12 && vocalSpace >= 50) return;
      if (i > 0 && motifMask[i] < vocalSpace / 100 * .3) return;
      const target = degreeNote(contour[i] + (bar % 2 ? -1 : 0), key, 60);
      const strong = s % 4 === 0 || i === 0;
      const pitchClasses = strong ? h.chord.map(n => n % 12) : MINOR.map(n => (n + key) % 12);
      const candidates = Array.from({ length: 25 }, (_, n) => 60 + n).filter(n => pitchClasses.includes(n % 12));
      const score = n => Math.abs(n - target) + Math.abs(n - previousNote) * .6;
      const note = candidates.sort((a, b) => score(a) - score(b))[0]; previousNote = note;
      put(6, s, (.46 + (i % 2 ? -.05 : .05)) * (1 - vocalSpace / 100 * .12), note, Math.min(style === 'lofi' ? 3 : 2.4, (rhythm[i + 1] ?? 16) - s));
    });
    // End the response before the next lyric phrase, including the note's tail.
    if (bar % 2 && vocalSpace >= 50) for (let s = 0; s < 12; s++) {
      const n = verse[6][base + s]; if (n) n.len = Math.min(n.len, 12 - s);
    }
  }
  patterns[0] = structuredClone(verse); patterns[2] = structuredClone(verse); patterns[3] = structuredClone(verse);
  for (let s = 0; s < 64; s++) {
    for (const tr of [0, 1, 3, 4, 5]) patterns[0][tr][s] = null;
    if (s % 4) patterns[0][2][s] = null;
    for (let tr = 0; tr < 6; tr++) patterns[3][tr][s] = null;
    if (s >= 48) patterns[3][6][s] = null;
    if (patterns[2][6][s]) patterns[2][6][s].vel = Math.min(.85, patterns[2][6][s].vel * 1.12);
  }
  for (const end of [31, 63]) {
    const chance = fillRandom();
    if (fillRate === 0 || chance >= fillRate / 100) continue;
    const modern = style === 'orbit' || style === 'drill';
    const tr = modern ? 2 : 1;
    patterns[2][tr][end - 1] = { vel: .32 + e * .12, note: 60, len: 1, ...(modern ? { roll: d > .65 ? 3 : 2 } : {}) };
    patterns[2][tr][end] = { vel: .24 + e * .1, note: 60, len: 1, ...(modern ? { roll: 2 } : {}) };
    if (modern) patterns[2][1][end - 2] = { vel: .32, note: 60, len: 1 };
  }
  // Thin the outro progressively, and let the hook's harmony sustain again.
  for (let bar = 0; bar < 4; bar++) {
    patterns[2][7][bar * 16].len = 15.5;
    patterns[2][7][bar * 16].vel = Math.min(.65, patterns[2][7][bar * 16].vel * 1.18);
    patterns[3][7][bar * 16].vel *= 1 - bar * .2;
  }
  return {
    version: 1, engineVersion: 3, name: idea.trim().slice(0, 45) || 'After hours', idea, style, seed: seed >>> 0, key, bpm, mood, vocalSpace, fillRate, bassStyle,
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
  next.engineVersion = generated.engineVersion;
  for (let p = 0; p < 4; p++) for (let tr = 0; tr < 8; tr++) {
    if (!project.locks?.[tr]) next.patterns[p][tr] = generated.patterns[p][tr];
  }
  next.harmony = generated.harmony; next.progression = generated.progression;
  return next;
}
export function normalizeProject(p) {
  return { ...p, vocalSpace: p.vocalSpace ?? 60, fillRate: p.fillRate ?? 40, bassStyle: p.bassStyle || 'balanced', progression: p.progression || ({ orbit: [0, 0, 5, 3], dust: [0, 3, 5, 4] }[p.style] || [0, 5, 3, 6]), locks: p.locks || Array(8).fill(false), mix: p.mix || { reverb: 25, delay: 24, warmth: 25, drive: 20 }, mood: p.mood || 'dreamy', melodyTone: p.melodyTone || 'keys', kit: p.kit || 'crisp', energy: p.energy ?? 55, density: p.density ?? 45, humanize: p.humanize ?? 35 };
}
export function validateProject(p) {
  const number = (v, a, b) => Number.isFinite(v) && v >= a && v <= b;
  const optional = (v, a, b) => v === undefined || number(v, a, b);
  const note = n => n === null || (n && number(n.vel, 0, 1) && number(n.note, 12, 108) && number(n.len, .01, 32)
    && optional(n.roll, 1, 4) && optional(n.offset, 0, .05) && optional(n.glide, 12, 108)
    && (n.chord === undefined || (Array.isArray(n.chord) && n.chord.length > 0 && n.chord.length <= 8 && n.chord.every(x => number(x, 12, 108)))));
  return !!(p?.version === 1 && typeof p.name === 'string' && p.name.length <= 200 && (p.idea === undefined || typeof p.idea === 'string')
    && number(p.bpm, 55, 180) && number(p.swing, 0, 60) && optional(p.key, 0, 11)
    && ['energy', 'density', 'humanize', 'vocalSpace', 'fillRate'].every(k => optional(p[k], 0, 100))
    && (p.bassStyle === undefined || ['balanced', 'bouncy', 'sustained'].includes(p.bassStyle))
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
