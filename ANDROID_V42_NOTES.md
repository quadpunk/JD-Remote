# Android v42 - landing page, JD-XA support and pattern-chaining lead (web Revision 14 ported)

Brings the changes of the web test platform (JD-Xi / JD-XA Revision 14) into the Android app.

## What changed

- **Landing page.** `index.html` is now the landing page (JD-Xi or JD-XA). The former Android JD-Xi page is `jdxi.html`; `MainActivity` still opens `index.html`. Back from a synth page returns to the landing page (`web.canGoBack()`), and every page load resets the native-sequencer state (`onPageStarted`).
- **JD-XA support.** New `jdxa.html` plus `jdxa-*.js`, `jd-xa*.js` and `jd-xa.css` (model ID 0F, 8 parts, 16-track web sequencer, programs INT/USB A01-P16, tone editor, FX, patch manager, inspector). `jdxi.html` got the model switch and the XA hooks of the web page.
- **Model isolation in `app.js` / `mixer.js`.** The JD-Xi transmitter is blocked while the page is in XA mode, wrong-model SysEx is blocked, and XA mode matches only `JD-XA` ports. In JD-Xi mode the Android-specific `Roland` port alternative is kept.
- **Pattern chaining (`performance.js`).** Switch lead default 170 ms (old stored 30 is replaced), new **Measure** button, clock/pump timers in a Web Worker, mixer read-back 1.6 s after a program change (120 ms apart in `mixer.js`), "went quiet" limit 3 s / 1.5 bars, switch log. See `docs/PATTERN_SWITCH_NOTES.md`.
- **`android-midi.js`.** The native sequencer takeover of the "Step sequencer" tab only happens on `jdxi.html`. On `jdxa.html` the web 16-track sequencer is used, because the native sequencer is the 4-track JD-Xi one.
- **`MidiEngine.kt`.** The default MIDI output of the native sequencer now also prefers `JD-XA` ports; the "no device" message mentions both synths.
- `sw.js` (not registered in the app) and `manifest.webmanifest` are in sync with the web. `tools/check_theme_parity.py` now checks both `jdxi.html` and `jdxa.html`.

## Not changed on purpose

Android-only parts are untouched: `android-midi.js` bridge, native sequencer and Compose themes, Size selector text, installed-app UI hiding, KO themes.

## Known issue carried over from the web build

On `jdxa.html` the page flips to `data-model="xi"` right after loading: `jdxa-xa.js` starts with `let model='xi'`, while `build-jdxa.py` expects to replace it with `let model='xa'`. The script reads `jd-xa.js` after it has already overwritten it, so the replacement only works on the first run. Effects: the header says "JD-Xi Remote", and the `JD-XA STUDIO` tab (patch manager, inspector, program library) is hidden. Setting `model='xa'` alone is not enough, because `jd-xa.css` then hides every tab except `JD-XA STUDIO`; the CSS in `jdxa.html` has to be adjusted at the same time. This port keeps the web behaviour as it is.

## Validation limits

Static checks only: every JS file passes `node --check`, the web test scripts (`tests-validate.mjs`, `test-patch-regions.cjs`) pass against these assets, and `tools/check_theme_parity.py` passes. The three pages were also loaded in headless Chromium with an emulated `AndroidMidi` bridge (page boot, model switch, native-sequencer signalling, port connection, Measure run against a simulated synth). The Kotlin changes were not compiled, and no Android build, USB-MIDI test or JD-XA/JD-Xi hardware test was done.
