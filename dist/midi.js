// Standard MIDI file, format 1, PPQ 480. Notes and tempo are portable to a DAW.
export function midi(project, { song = true, pattern = 1 } = {}) {
  const bytes = [], push = (...v) => bytes.push(...v), word = v => [v >>> 8 & 255, v & 255];
  const dword = v => [v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255];
  const variable = n => { const a = [n & 127]; while ((n >>>= 7)) a.unshift((n & 127) | 128); return a; };
  const chunk = (tag, data) => { push(...new TextEncoder().encode(tag), ...dword(data.length)); for (const byte of data) bytes.push(byte); };
  chunk('MThd', [...word(1), ...word(9), ...word(480)]);
  const tempo = Math.round(60000000 / project.bpm);
  chunk('MTrk', [0, 255, 81, 3, ...dword(tempo).slice(1), 0, 255, 88, 4, 4, 2, 24, 8, 0, 255, 47, 0]);
  const arrangement = song ? project.arrangement : [{ pattern, bars: 4 }];
  const drums = [36, 38, 42, 46, 37];
  for (let tr = 0; tr < 8; tr++) {
    const channel = tr < 5 ? 9 : tr - 5, events = [];
    let cursor = 0;
    for (const section of arrangement) {
      for (let s = 0; s < section.bars * 16; s++) {
        const n = project.patterns[section.pattern][tr][s % 64];
        if (!n || project.mutes[tr] || project.volumes[tr] === 0) continue;
        const count = Math.round(n.roll || 1);
        for (let j = 0; j < count; j++) {
          const start = Math.round((cursor + s + (s % 2 ? project.swing / 100 : 0) + j / count) * 120 + (n.offset || 0) * project.bpm * 8);
          const length = Math.max(1, Math.round((tr < 5 ? .35 / count : n.len) * 120));
          for (const pitch of tr < 5 ? [drums[tr]] : n.chord || [n.note]) {
            events.push({ time: start, bytes: [144 + channel, Math.round(pitch), Math.max(1, Math.round(n.vel * project.volumes[tr] * 127 * (1 - j * .12)))] });
            events.push({ time: start + length, bytes: [128 + channel, Math.round(pitch), 0] });
          }
        }
      }
      cursor += section.bars * 16;
    }
    events.sort((a, b) => a.time - b.time || a.bytes[0] - b.bytes[0]);
    const data = tr < 5 ? [] : [0, 192 + channel, [38, 4, 89][tr - 5]];
    let time = 0;
    for (const event of events) { data.push(...variable(event.time - time), ...event.bytes); time = event.time; }
    data.push(0, 255, 47, 0); chunk('MTrk', data);
  }
  return new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
}
