> **Revision 2:** Read `TESTER_BUILD_NOTES.md` for new JD-XA identity check, read-only parameter inspector, model-isolated MIDI sending and SysEx address fixes.

# JD-Xi / JD-XA Remote — enhanced tester build (2026-11-10)

## Start

Upload **all files together** to an HTTPS web host (or serve on localhost). Open `index.html` in desktop Chrome or Edge. Grant Web MIDI **including SysEx**; choose the correct JD-XA MIDI input/output in the existing MIDI connection settings. Switch JD-Xi / JD-XA in the title bar. JD-Xi pages and original code/data remain intact. Do not open straight from `file://` if MIDI, caching or JSON loading fails.

## JD-XA features in this build

- **16-part routing**: four Analog parts (default channels 1–4), four Digital parts (5–8), eight additional MIDI CTRL tracks (9–16 default for this application's local sequencer; actual JD-XA MIDI CTRL channels may be configured differently). Eight mixer strips with volume, expression, pan, modulation and sustain; user-selectable channels.
- **Documented tone control maps**: analog two oscillators with pitch/fine/PW/PWM and crossmod; pitch envelopes, mixer levels, two LFOs, filter cutoff/resonance/drive/ENV and amp ENV. Digital four parts, each with three partials, per-partial pitch/detune/pulse width, filter, amp, envelopes and LFO. All extended parameters use CCs or NRPN 0:LSB from Roland's Parameter Guide CC Assignments (pp. 68–73). Program FX CC controls for TFX1/2, delay, reverb, mic. Part/channel and group selector. **Important**: patch-level values shown in controls are unverified defaults until changed; a complete patch dump is not decoded to these sliders.
- **Programs**: INT and USB banks A–P, slots 01–16 (256 per memory), MIDI Bank Select MSB 85; INT LSB 0/1, USB LSB 32/33. Program Control receive channel is selectable; must correspond to hardware setup.
- **Sound library**: 512 named slots (256 INT + 256 USB), editable/JSON import-export. All slots begin unnamed because names depend on firmware/Factory Reset/user customizations; deliberately no invented preset labels. `READ NAME` uses JD-XA RQ1 at 18 00 00 00 with length 12 (documented program-name ASCII), and displays the current temporary program name for user confirmation before saving it against the selected slot. This is **not** an exhaustive factory sound catalog.
- **Sequencer**: 16 MIDI tracks, 1–4 bars × 16 steps, selectable note, per-part channel, BPM and velocity; browser local save/load, live MIDI play and SMF type-1 export. The JD-XA itself has much richer sequencer automation, ties and event types; this browser-local editor is not a binary representation of internal JD-XA patterns. It does not write patterns to JD-XA memory.
- **SysEx**: Model ID 00 00 00 0F, Roland checksum, RQ1 requests to specified regions, checksum validation for DT1, dump monitor. No arbitrary SysEx writes to patch memory, no flash write/factory reset.
- **Test functions**: short audition note, MIDI log export, CC/NRPN event trace in log, original JD-Xi routines stay on their own page and JD-Xi SysEx is blocked in JD-XA mode.

## Critical limitations

**Not tested against real JD-XA hardware. Not a complete lossless tone/patch/pattern editor or official full preset-name list.** We could verify Roland's published MIDI specification and run static JavaScript/HTML checks, but hardware response, timing, channel assignments and firmware cannot be certified from here. CV/Gate, arpeggio template manipulation, vocoder routing, all MFX types and parameters, fully specified waveform selection and internal pattern writes require additional specialized hardware validation and/or safe exhaustive mappings. Never treat the app's local editor values as current hardware readback.

## Quick tester acceptance checklist

1. Select JD-XA; confirm only `JD-XA STUDIO` is visible. Select JD-Xi; original pages must return.
2. Connect MIDI input/output with SysEx permission. Press `TEST RQ1` and verify a `DT1` with matching checksum, or capture the exported log.
3. Load `INT:A01` on the hardware's **Program Ctrl Ch**; press `READ NAME` and verify the temporary name. Name the slot if correct.
4. Test Analog 1 CC7 and one direct CC102 filter cutoff, then a filter ENV NRPN value. Test Digital 1 partial 1 CC102 and an NRPN. Copy/back up your program first; changes to the temporary tone may sound different.
5. Try a 4-bar pattern, local save/reload and MIDI export. Verify the resulting file in a MIDI editor; do **not** assume it can be loaded into the JD-XA's internal pattern storage without conversion/import steps.
6. Switch models, confirm no JD-Xi SysEx 0E command is emitted in XA mode; send logs and firmware version with bugs.

## Official references

Roland JD-XA MIDI Implementation: https://cdn.roland.com/assets/media/pdf/JD-XA_MIDI_Imple_e01_W.pdf

Roland JD-XA Parameter Guide: https://static.roland.com/assets/media/pdf/JD-XA_ParameterGuide_e01_W.pdf

Roland JD-XA Version 1.50 addendum: https://cdn.roland.com/assets/media/pdf/JD-XA_V150_e01_W.pdf

Roland JD-XA Owner's Manual: https://static.roland.com/assets/media/pdf/JD-XA_eng02_W.pdf
