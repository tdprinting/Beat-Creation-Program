# Pocket — Beat Studio

A responsive browser-based beat maker, created as the first implementation for the empty tdprinting/Beat-Creation-Program repository.

## Run

Requires Node.js 18+; the browser app has no runtime dependencies or build step.

```sh
npm start
```

Open http://127.0.0.1:4173. The optional `PORT` environment variable selects a different local port. For a phone, deploy `dist/` to an HTTPS static host. Microphone recording requires HTTPS (or localhost).

For development checks, run `npm ci` and `npm test`. Development dependencies provide DOM integration tests and a JavaScript Web Audio renderer. They are not shipped to the browser. Audio tests check finite output, silence handling, distinct voices, and headroom; they do not establish subjective sound quality or replace native-browser and iPhone testing.

## Features

- Eight synthesized voices: kick, snare, closed/open hats, percussion, tuned 808, plucked keys, atmospheric chords.
- Five production palettes: melodic rap, atmospheric trap, boom bap, drill, and lo-fi. Seeded composition uses diatonic triads/sevenths, voice-led inversions, chord-tone motifs, a controlled sub-bass register, and coherent intro/verse/hook/outro variations.
- Research-informed v3 generation adds repeating melodic contours, phrase-ending fills suited to each palette, independent 808 pickups/rests, and a clean-sub/upper-bass split. [Research and source notes](docs/production-research.md) explain the production guidance and implementation choices.
- Producer controls: Vocal space reduces melody activity and leaves two-bar phrase-ending gaps; Fill amount controls hook fills; 808 phrasing offers balanced, bouncy, and sustained parts. These apply to new beats or unlocked layers during variation. Existing saved notes are preserved on load.
- Idea cues for palette, mood, tempo, sparse arrangements, heavier drums, bells, and plucks. Disable keyword interpretation to use manual controls. Energy, complexity, and human-feel controls shape new compositions.
- Lock individual layers and regenerate the rest while preserving tempo, key, progression, arrangement, and mix. New-beat generation replaces the entire composition; variation preserves locks.
- Four-bar, 16-step-per-bar sequencer, velocity selection, track volume/mute, swing, live pads, keyboard shortcuts, and tap tempo.
- Song arrangement with configurable pattern sections and lengths.
- Individual note editing for pitch, velocity, length, repeats, and 808 slide targets; chord transposition; bar copy/paste/clear; undo and redo.
- Three drum characters and three melody voices. Live space, echo, warmth, and bass-drive controls, stereo synthesized ambience, filtered tempo delay, open-hat choking, monophonic 808s, and kick-triggered ducking.
- Microphone recording, transient detection, approximate kick/snare/hat classification, quantization, and editable results. Audio remains on device.
- Autosave, backward-compatible project JSON import/export, stereo WAV mixes and individual stems, and standard MIDI export for DAWs.
- Look-ahead Web Audio scheduling and OfflineAudioContext rendering.

## Practical limits

The generator is a procedural musical engine, not a trained generative audio model. Text supports documented keywords and explicit BPM; arbitrary prose is not fully interpreted. No artist recordings or Jee Juh audio were downloaded, trained on, or included. Microphone classification uses transient energy and zero-crossing estimates; it is approximate and works best in a quiet room. First detected hit is aligned to beat one at the chosen tempo. Recordings do not estimate tempo automatically. MIDI contains tempo, notes, swing, microtiming, velocities, and repeats; it does not include synthesized sounds, effects, or 808 pitch slides. Muted tracks are excluded from MIDI. WAV stem processing includes the master compressor, so summed stems may differ slightly from the full mix.

Keep the page foreground for playback. iOS requires a user gesture to start audio. Bluetooth audio can add latency. Full exports run in memory; use loop export on memory-limited devices. Render is capped at ten minutes. Browser-local storage is device-specific; download projects for backup and transfer. Real-device iPhone microphone and audio QA remains necessary.

## Source

`dist/composer.js` contains composition, project migration, and validation. `dist/audio.js` contains synthesis and effects. `dist/midi.js` writes MIDI files. `dist/engine.js` exposes these modules and provides transient detection and WAV encoding. `dist/app.js` contains the studio interface and session state. The app runs without any paid API keys, backend, or account.
