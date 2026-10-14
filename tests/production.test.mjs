import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, varyProject, validateProject, normalizeProject, PALETTES } from '../dist/engine.js';

test('phrase-end fills respect amount and genre while the backbeat remains stable', () => {
  for (const style of Object.keys(PALETTES)) for (let seed = 0; seed < 20; seed++) {
    const dry = generate({ style, seed, fillRate: 0 }), filled = generate({ style, seed, fillRate: 100 });
    assert.ok(validateProject(filled));
    for (const row of dry.patterns[2]) assert.ok(row.every(n => !n?.roll));
    for (let s = 0; s < 64; s++) {
      if (JSON.stringify(dry.patterns[2][2][s]) !== JSON.stringify(filled.patterns[2][2][s])) assert.ok([30,31,62,63].includes(s));
      if (filled.patterns[2][2][s]?.roll) assert.ok(['orbit', 'drill'].includes(style));
    }
    for (let bar = 0; bar < 4; bar++) for (const s of style === 'orbit' || style === 'drill' ? [8] : [4,12]) {
      assert.ok(filled.patterns[1][1][bar * 16 + s]);
      assert.ok(filled.patterns[2][1][bar * 16 + s]);
    }
    assert.deepEqual(dry.patterns[1], filled.patterns[1], 'changing fill amount only changes the hook fills');
  }
});
test('vocal space leaves phrase-end breathing room without changing drums or bass', () => {
  for (let seed = 0; seed < 30; seed++) {
    const full = generate({ seed, vocalSpace: 0, density: 100 }), open = generate({ seed, vocalSpace: 100, density: 100 });
    for (const tr of [0,1,2,3,4,5]) assert.deepEqual(full.patterns[1][tr], open.patterns[1][tr]);
    assert.ok(open.patterns[1][6].filter(Boolean).length <= full.patterns[1][6].filter(Boolean).length);
    for (const bar of [1,3]) for (let s = 0; s < 16; s++) {
      const n = open.patterns[1][6][bar * 16 + s]; if (n) assert.ok(s + n.len <= 12);
    }
  }
});
test('808 phrasing varies independently of kicks and has no overlapping generated notes', () => {
  for (const style of Object.keys(PALETTES)) for (let seed = 0; seed < 12; seed++) {
    const short = generate({ style, seed, bassStyle: 'bouncy' }), long = generate({ style, seed, bassStyle: 'sustained' });
    assert.deepEqual(short.patterns[1][0], long.patterns[1][0]);
    assert.ok(short.patterns[1][5].filter(Boolean).every(n => n.len <= 1.6));
    assert.ok(long.patterns[1][5].some(n => n?.len > 8));
    assert.notDeepEqual(short.patterns[1][0].map(Boolean), short.patterns[1][5].map(Boolean));
    for (const p of [short, long]) {
      const hits = p.patterns[1][5].flatMap((n, s) => n ? [{ ...n, s }] : []);
      hits.forEach((n, i) => assert.ok(n.s + n.len < (hits[i+1]?.s ?? 64)));
    }
  }
});
test('new production settings survive variation and legacy migration', () => {
  const p = generate({ vocalSpace: 90, fillRate: 0, bassStyle: 'bouncy', seed: 99 }); p.locks[6] = true;
  const next = varyProject(p, 100); assert.equal(next.vocalSpace, 90); assert.equal(next.fillRate, 0); assert.equal(next.bassStyle, 'bouncy');
  assert.deepEqual(next.patterns[1][6], p.patterns[1][6]);
  delete p.vocalSpace; delete p.fillRate; delete p.bassStyle;
  assert.ok(validateProject(p)); assert.equal(normalizeProject(p).vocalSpace, 60);
  const invalid = { ...p, bassStyle: 'anything' }; assert.equal(validateProject(invalid), false);
});

test('melodic rhythm repeats and strong positions resolve to the current chord', () => {
  for (const style of Object.keys(PALETTES)) for (let seed = 0; seed < 20; seed++) {
    const p = generate({ style, seed, density: 85 });
    const melody = p.patterns[1][6];
    assert.deepEqual(melody.slice(0,16).map(Boolean), melody.slice(32,48).map(Boolean));
    assert.deepEqual(melody.slice(16,32).map(Boolean), melody.slice(48,64).map(Boolean));
    for (let s = 0; s < 64; s += 4) if (melody[s]) {
      assert.ok(p.harmony[Math.floor(s / 16)].chord.some(n => n % 12 === melody[s].note % 12));
    }
  }
});
