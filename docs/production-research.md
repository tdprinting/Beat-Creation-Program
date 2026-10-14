# Production research → generator v3

Researched October 14, 2026. These are production heuristics, not universal rules or proof of subjective audio quality. The project uses original synthesis and procedural composition; it was not trained on artist recordings. Sources were read, not auditioned through their embedded players.

## Rhythm and bass

[Native Instruments: How to make a trap beat](https://blog.native-instruments.com/how-to-make-a-trap-beat/) describes a half-time backbeat, an eighth-note hat foundation, restrained accompaniment, and occasional phrase-ending rolls with velocity changes. It also emphasizes how a simple bass part interacts with the drums.

Implementation: Orbit defaults to zero swing and retains the beat-three snare. Fills are now controlled and placed at two-/four-bar boundaries instead of forcing rolls into every hook bar. Boom-bap/lo-fi use ghost-snare pickups rather than trap rolls. Bass supports the downbeat while adding independent pickups, chord-derived pitches and deliberate rests. Bouncy, balanced and sustained settings change note lengths and rhythmic activity.

## Melodic identity

[Ableton: Creating Melodies 1—Contour](https://makingmusic.ableton.com/creating-melodies-1-contour) discusses balancing upward/downward motion and steps/leaps. [Ableton: Mutation Over Generations](https://makingmusic.ableton.com/creating-variation-2-mutation-over-generations) advocates developing an idea through meaningful, limited changes.

Implementation: one contour and rhythm mask recur across the phrase. Strong positions choose chord tones; weaker positions may use scale tones. Pitch selection penalizes unnecessary jumps. Alternate bars answer the opening gesture. Locked-layer variation still preserves the chosen progression and user edits. These algorithms are our interpretation of the guidance, not algorithms provided by Ableton.

## Vocal space and arrangement

[iZotope: Beat Making 101](https://www.izotope.com/community/blog/beat-making-101-how-to-make-a-beat) describes building around drums, bass and melody, then creating arrangement contrast by removing elements from repeated sections.

Implementation: Vocal space reduces verse melody activity and pad sustain. At 50% or more it leaves the last beat of each two-bar melodic phrase empty, including note durations. Hooks sustain the harmony longer; outro pad velocity recedes over four bars. The exact thresholds are design choices, not claims about all rap music.

## Low-end clarity

[iZotope: 8 Tips for Mixing Rap and Hip-Hop](https://www.izotope.com/community/blog/8-tips-for-mixing-rap-and-hip-hop) recommends preserving headroom and separating clean sub energy from the textured upper bass.

Implementation: the bass bus splits around 90 Hz, sending its lower branch directly to the ducked mix and its upper branch through saturation. Melody/pad dry signals and reverb returns receive low cuts. This is a lightweight synthesis implementation, not a substitute for mixing a vocal recording or mastering against monitored references.

## Verification and limits

Tests cover repeatability, scale membership, protected backbeats, phrase-end fill placement, bass rests/non-overlap, vocal gaps, lock behavior, MIDI encoding, DOM controls and finite audio output. The JavaScript renderer checks headroom but does not establish listener preference. Native Safari/iPhone microphone, real-device timing, and visual browser QA remain unverified.
