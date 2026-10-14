# Pocket — Beat Studio

A responsive browser-based beat maker, created as the first implementation for the empty tdprinting/Beat-Creation-Program repository.

## Run

Requires Node.js 18+; no dependencies or build step.

```sh
npm start
```

Open http://127.0.0.1:4173. For a phone, deploy `dist/` to an HTTPS static host. Microphone recording requires HTTPS (or localhost). Test with `npm test`.

## Features

- Eight synthesized voices: kick, snare, closed/open hats, percussion, tuned 808, plucked keys, atmospheric chords.
- Seeded composition with three production palettes, idea keyword cues, tempo extraction, energy, density, minor-key roots, repeated melodic motifs, chord-linked bass, and four pattern variants.
- Four-bar, 16-step-per-bar sequencer, velocity selection, track volume/mute, swing, live pads, keyboard shortcuts, and tap tempo.
- Song arrangement with configurable pattern sections and lengths.
- Microphone recording, transient detection, approximate kick/snare/hat classification, quantization, and editable results. Audio remains on device.
- Autosave, project JSON import/export, undo, stereo WAV mixes and individual stems.
- Look-ahead Web Audio scheduling and OfflineAudioContext rendering.

## Practical limits

The generator is a procedural musical engine, not a trained generative audio model. Text supports palette keywords and explicit BPM; arbitrary prose is not fully interpreted. No artist recordings or Jee Juh audio were downloaded, trained on, or included. Microphone classification uses transient energy and zero-crossing estimates; it is approximate and works best in a quiet room. First detected hit is aligned to beat one at the chosen tempo. Recordings do not estimate tempo automatically.

Keep the page foreground for playback. iOS requires a user gesture to start audio. Bluetooth audio can add latency. Full exports run in memory; use loop export on memory-limited devices. Render is capped at ten minutes. Browser-local storage is device-specific; download projects for backup and transfer. Real-device iPhone microphone and audio QA remains necessary.

## Source

`dist/engine.js` contains composition, synthesis, detection, validation, and WAV encoding. `dist/app.js` contains the studio interface and session state. The app runs without any paid API keys, backend, or account.
