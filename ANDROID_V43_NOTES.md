# Android v43 - JD-XA connection / SysEx fixes (web Revisions 15-18 ported) + native MIDI hardening

Web files were taken from the web build (`jdxa_full`, Revision 18). Android-only parts were kept: `android-midi.js` tag and
"Android" titles in `jdxa.html`, the `|Roland` port alternative for JD-Xi mode in `app.js`, `index.html`, `jdxi.html`,
`sw.js` (not registered in the app).

## Ported from the web build (assets/web)

Checked against Roland JD-XA MIDI Implementation v1.00. Full reasoning is in the web notes `REVISION_16/17/18_NOTES.md`.

- **Identity Reply** (`jd-xa.js`, `jdxa-xa.js`): a real reply is 15 bytes, the code required 16, so identification always failed
  ("Fel MIDI-enhet svarade"). Now `>=15`.
- **RQ1 sizes**: the JD-XA only answers RQ1 for the exact block start and exact block size from the Parameter Address Map.
  - Test RQ1 / "Read temporary program": 0x6B (Program Common) instead of 1 / 16 bytes (`jd-xa.js`, `jdxa-xa.js`).
  - Length limit raised from 64 to 512 so blocks such as Reverb 0x64 and MFX 0x91 can be read.
  - Program name read uses the whole 0x6B block and takes the name from the first 12 bytes (`jdxa-patches.js`, `jd-xa-extended.js`).
  - Mixer reads the whole Program Part block (0x4F bytes, start = part address - 9) instead of 1 byte per part (`jdxa-mixer.js`).
  - Inspector reads the whole block and cuts the value out (`jd-xa-inspector.js`).
  - Deep module uses the documented block sizes (`jd-xa-deep.js`). **Corrected here, differs from the web build:** MFX is 145 bytes (0x91),
    not 0x111. The document gives sizes as 7-bit bytes, so `Total Size 00 00 01 11` = 1*128+0x11 = 145; 0x111 (273) would be sent as `00 00 02 11`,
    which the synth does not answer. (`jd-xa-patch.js` already uses `B+0x11` = 145.) Same one-line change is needed in the web build, `jd-xa-deep.js` line 38.
- **Temporary Tone addresses** (`jdxa-synth.js`, `jd-xa-deep.js`): Analog tone base 19 xx 00 00 + 02 00 00, Digital tone base 1A xx 00 00 + 01 00 00;
  analog partial at tone + 00 01 00 (was + 01 00 00).
- **Port choice** (`app.js`, `jdxa-app.js`): software / virtual ports (wavetable, GS synth, Microsoft, loopMIDI, IAC, virtual) are chosen last,
  and Connect warns when the chosen port is not called JD-Xi / JD-XA.
- **JD-XA page** (`jdxa.html`): JD-XA STUDIO tab removed (section stays hidden in the DOM, the scripts bind to it).
- **PCM Wave Number** (`parameters.json`, `app.js`, `jdxa-app.js`): range 0-453, number field / "OFF" + 001-453 display; choosing PCM with an unread wave
  number reads the partial first instead of guessing.

## Native MIDI layer (Kotlin / android-midi.js) - Android only

- `MidiEngine.defaultSend()`: the native sequencer's output is now chosen JD-Xi/JD-XA by name, then anything with manufacturer Roland
  (with USB Drv = GENERIC the product string does not always contain the model), then any real port. Through / peripheral / virtual /
  wavetable / GS ports come last (same idea as web Revision 17 point 5).
- Failed device opens are retried: `openDevice` returning `null` (device still enumerating or briefly busy) is retried up to 3 times
  (after 1.2 / 2.4 / 3.6 s) while the device is still attached.
- Ports that could not be opened are no longer listed to the page (they could only produce "Port busy"). Ports of a device that is still
  opening stay listed and `openPort()` waits for them as before. The status line now says "found, but no port could be opened (is another app using it?)"
  instead of "No MIDI device found" when a device exists but is unusable.
- `MidiEngine.sendTo()` / `WebMidiBridge.send()` return whether the message was written. `Output.send()` in `android-midi.js` throws
  `InvalidStateError` when it was not, like Web MIDI does, so the page's existing "Send failed" log appears instead of a silent loss
  (previously every exception was swallowed and the page believed the SysEx had been sent).

## Not changed

Incoming SysEx is already reassembled and split in the page (`handleMidiEvent` in `app.js` / `jdxa-app.js`: fragments, several messages per chunk,
real-time bytes in the middle), so the native bridge forwards raw chunks as before.

## Checked against the Roland document

JD-XA MIDI Implementation v1.00 (13 May 2015) was compared with the code: model ID `00 00 00 0F`, RQ1/DT1 command bytes, Identity Request/Reply (15 bytes),
device ID range, Bank Select 85 + LSB 0/1 (INT) and 32/33 (USB), Temporary Tone addresses and offsets, and all block sizes used by `jd-xa-patch.js`
and `jd-xa-deep.js` match, except the MFX size above. JD-Xi-derived code in `jdxa-app.js` (program name read of 12 bytes, arp zone read 0x23,
partial read 0x39) does not use JD-XA block sizes; it is believed unreachable on the JD-XA page and was left unchanged.

## Validation limits

Static checks only: every JS file passes `node --check`; `tests-validate.mjs` and `test-patch-regions.cjs` from the web build pass against these assets;
`tools/check_theme_parity.py` passes. The Kotlin changes were **not compiled** and nothing was tested with a USB connection or a real JD-XA.
The address / block-size fixes follow the MIDI implementation document and the JD-Xi layout and are unproven on hardware (see the web notes).

JD-XA on Android: Android only talks to class-compliant USB MIDI, so set the JD-XA's USB Drv to GENERIC (System Write + restart),
and SYSTEM > MIDI RX > Rx Exclusive must be ON for SysEx to be received.
