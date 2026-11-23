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

## Motion: sweeping pages and drop-downs

New files `motion.js` and `motion.css` (loaded by `jdxi.html` and `jdxa.html`; `index.html` loads the CSS), plus a small hook in `collapse.js`.

- **Tab to tab:** the page sweeps sideways, left or right depending on the tab order (View Transitions API). Without support the incoming page slides in instead.
- **Landing, JD-Xi and JD-XA:** soft rise and fade between the three documents (cross-document view transition, ignored where unsupported).
- **Folding sections** (the chevron headings), **drop-down panels** (`<details>`: the mixer, Advanced, Performance settings, Info panels) and **Hide top** (title bar and mixer) animate their height. Rapid taps end in a consistent state and the saved fold state is unchanged.
- **Native sequencer:** `AnimatedVisibility` in `MainActivity.kt` sweeps it in from the right. The web sweep is skipped for that tab so the page does not resize during a transition.
- **Reduce motion:** with Android's "remove animations" / reduce-motion setting everything switches instantly as before.
- Native `<select>` menus (Appearance, Size, View) are drawn by Android and are not animated.

For the web build: copy `motion.js`, `motion.css`, add them to the loader/`<head>`, and apply the two-line change in `collapse.js` (`folding` class in `set`, and `JDMotion.fold` in `toggle`).

## Not changed on purpose

Android-only parts are untouched: `android-midi.js` bridge, native sequencer and Compose themes, Size selector text, installed-app UI hiding, KO themes.

## Fixed on top of the web build: JD-XA page flipped back to JD-Xi

On `jdxa.html` the page changed itself to JD-Xi mode a few hundred milliseconds after loading (header "JD-Xi Remote", JD-Xi selected, `JD-XA STUDIO` tab hidden). Cause: `jdxa-xa.js` started with `let model='xi'`, while `build-jdxa.py` expects to replace it with `let model='xa'`. The script reads `jd-xa.js` after it has already overwritten it, so the replacement only works the first time it is run. Two changes fix it:

- `jdxa-xa.js`: `let model='xa';` (and the write of `jd-remote-model="xi"` to localStorage is removed).
- `jdxa.html`: `html body[data-model="xa"] #nav button:not(.xa-only){display:block!important}`. Without it `jd-xa.css` hides every tab except `JD-XA STUDIO` in XA mode.

The same two changes are needed in the web build (and a check in `build-jdxa.py` that each replacement actually matched).

## Validation limits

Static checks only: every JS file passes `node --check`, the motion layer was exercised in headless Chromium (tab sweep with and without View Transitions, reduced motion, folding, details, Hide top, JD-XA page), the web test scripts (`tests-validate.mjs`, `test-patch-regions.cjs`) pass against these assets, and `tools/check_theme_parity.py` passes. The three pages were also loaded in headless Chromium with an emulated `AndroidMidi` bridge (page boot, model switch, native-sequencer signalling, port connection, Measure run against a simulated synth). The Kotlin changes were not compiled, and no Android build, USB-MIDI test or JD-XA/JD-Xi hardware test was done.
