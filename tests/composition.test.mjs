import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, varyProject, validateProject, normalizeProject, MINOR, PALETTES, midi } from '../dist/engine.js';

test('all generated chords, bass and melody stay in the selected minor key', () => {
  for (const style of Object.keys(PALETTES)) for (let key = 0; key < 12; key++) for (const mood of ['warm', 'dark', 'dreamy']) {
    const p = generate({ style, key, mood, seed: 43 + key });
    assert.ok(validateProject(p));
    for (const pattern of p.patterns) for (const tr of [5, 6, 7]) for (const n of pattern[tr]) {
      if (!n) continue;
      for (const pitch of [n.note, ...(n.chord || []), ...(n.glide ? [n.glide] : [])]) assert.ok(MINOR.includes((pitch - key + 120) % 12), `${style} key ${key} pitch ${pitch}`);
    }
    for (const n of p.patterns[1][5].filter(Boolean)) assert.ok(n.note >= 28 && n.note <= 43, 'sub bass stays in an audible register');
  }
});
test('section variations preserve the musical identity of the verse', () => {
  const p = generate({ seed: 42, fillRate: 100 });
  for (let s = 0; s < 64; s++) {
    assert.deepEqual(p.patterns[1][0][s], p.patterns[2][0][s]);
    assert.equal(p.patterns[1][6][s]?.note, p.patterns[2][6][s]?.note);
    assert.deepEqual(p.patterns[1][7][s]?.chord, p.patterns[2][7][s]?.chord);
    if (p.patterns[1][7][s]) assert.ok(p.patterns[2][7][s].vel >= p.patterns[1][7][s].vel);
  }
  const drumCount = pattern => pattern.slice(0, 5).flat().filter(Boolean).length;
  assert.ok(drumCount(p.patterns[2]) > drumCount(p.patterns[1]));
});
test('variation preserves locked notes, mix, harmony, tempo, and arrangement without mutation', () => {
  const p = generate({ seed: 41 }); p.locks[5] = p.locks[6] = true; p.bpm = 107; p.mix.drive = 77;
  p.patterns[1][6][0].note = 71; const original = structuredClone(p);
  const v = varyProject(p, 99);
  assert.deepEqual(p, original); assert.equal(v.bpm, 107); assert.deepEqual(v.mix, p.mix);
  assert.deepEqual(v.progression, p.progression); assert.deepEqual(v.arrangement, p.arrangement);
  for (let section = 0; section < 4; section++) for (const tr of [5, 6]) assert.deepEqual(v.patterns[section][tr], p.patterns[section][tr]);
  assert.notDeepEqual(v.patterns[1][2], p.patterns[1][2]);
});
test('manual palette wins when idea interpretation is switched off', () => {
  assert.equal(generate({ style: 'lofi', idea: 'space trap', interpretIdea: false }).style, 'lofi');
  const p = generate({ idea: 'heavy drill with bells, minimal, 148 bpm' });
  assert.equal(p.style, 'drill'); assert.equal(p.kit, 'heavy'); assert.equal(p.melodyTone, 'bell'); assert.equal(p.bpm, 148); assert.equal(p.density, 30);
});
test('new controls are validated and old project controls get safe defaults', () => {
  const p = generate(); delete p.mix; delete p.locks; delete p.mood; assert.ok(validateProject(p));
  const normalized = normalizeProject(p); assert.equal(normalized.locks.length, 8); assert.equal(normalized.mix.drive, 20);
  for (const field of ['roll', 'offset', 'glide']) { const bad = generate(); bad.patterns[1][0][0][field] = Infinity; assert.equal(validateProject(bad), false); }
  const bad = generate(); bad.mix.reverb = 'loud'; assert.equal(validateProject(bad), false);
});

function readMidi(data) {
  const v = new DataView(data), bytes = new Uint8Array(data); let offset = 14; const tracks = [];
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd'); assert.equal(v.getUint16(10), 9); assert.equal(v.getUint16(12), 480);
  while (offset < bytes.length) {
    assert.equal(String.fromCharCode(...bytes.slice(offset, offset + 4)), 'MTrk');
    const end = offset + 8 + v.getUint32(offset + 4); offset += 8;
    const events = []; let time = 0;
    while (offset < end) {
      let delta = 0, b; do { b = bytes[offset++]; delta = delta * 128 + (b & 127); } while (b & 128);
      time += delta; const status = bytes[offset++];
      if (status === 255) { const kind = bytes[offset++], len = bytes[offset++]; events.push({ time, status, kind, data: [...bytes.slice(offset, offset + len)] }); offset += len; }
      else { const length = (status & 240) === 192 ? 1 : 2; events.push({ time, status, data: [...bytes.slice(offset, offset + length)] }); offset += length; }
    }
    assert.equal(offset, end); tracks.push(events);
  }
  return tracks;
}
test('MIDI encodes tempo, notes, swing and note-off events in separate tracks', async () => {
  const p = generate({ bpm: 120, seed: 12 }); p.patterns.forEach(pattern => pattern.forEach(row => row.fill(null)));
  p.swing = 25; p.patterns[1][0][1] = { note: 60, vel: .8, len: 1 }; p.patterns[1][6][0] = { note: 64, vel: .5, len: 2 };
  const tracks = readMidi(await midi(p, { song: false }).arrayBuffer());
  assert.deepEqual(tracks[0][0].data, [7, 161, 32]);
  assert.deepEqual(tracks[1][0], { time: 150, status: 153, data: [36, Math.round(.8 * p.volumes[0] * 127)] });
  assert.equal(tracks[7].find(e => e.status === 145).data[0], 64);
  assert.equal(tracks[7].find(e => e.status === 129).time, 240);
});
test('MIDI survives a dense maximum-length arrangement without argument overflow', async () => {
  const p = generate({ seed: 4 }); p.arrangement = Array.from({ length: 24 }, () => ({ pattern: 2, bars: 32 }));
  const blob = midi(p); assert.ok(blob.size > 100000); assert.equal(readMidi(await blob.arrayBuffer()).length, 9);
});
