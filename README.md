
<p align="center">
  <img
    src="https://github.com/user-attachments/assets/5bbbf0cc-18fa-4696-aebb-1d595308bffb"
    alt="Retro JD-Xi Remote Synth Banner"
    width="100%"
  />
</p>

# JD-Xi Remote

**A powerful MIDI controller, sound editor, performance tool and step sequencer for the Roland JD-Xi, with beta support for the Roland JD-XA.**

JD-Xi Remote brings deeper control of your Roland synthesizer to your Android phone or tablet. Edit sounds, control effects, manage patches, create sequences and perform live using an interface designed to make the hardware more accessible and enjoyable.

## 🌐 Web App & Downloads

### Web App — No Installation Required

**Use JD-Xi Remote directly in your browser on any supported platform!**

### [🚀 Launch JD-Xi Remote Web App](https://jdxi-remote.wasmer.app/)

No installation required. Web MIDI support and a compatible browser are needed for direct MIDI communication.

### Android App

Download the latest Android APK from GitHub:

**[📥 Download JD-Xi Remote for Android](https://github.com/quadpunk/JD-XI-Remote/releases)**

> [!IMPORTANT]
> **Experiencing freezes or USB connection issues?**
>
> Make sure your Roland JD-Xi is configured to use **Generic USB Driver Mode** instead of the Roland vendor-specific driver.

---

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/f773ddb4-96bf-4a07-927b-c616f8f5698e"
    alt="JD-Xi Remote"
    width="600"
  />
</p>

---

## 🎹 Overview

JD-Xi Remote communicates directly with the synthesizer over USB MIDI, using standard MIDI messages and Roland SysEx for detailed parameter control.

Whether you're designing sounds, building patterns or performing live, JD-Xi Remote gives you more hands-on control without constantly navigating the synthesizer's small display and menus.

### Key Features

- Visual synthesizer and sound editor
- Real-time MIDI and SysEx parameter control
- Mixer and effects management
- Native 4-track JD-Xi step sequencer
- Live performance and pattern launcher
- Queued pattern switching
- Punch In FX performance pads
- Patch management and local storage
- Yamaha DX7 patch import
- MIDI player
- Audio visualizer
- Customizable themes and interface scaling
- Roland JD-XA beta support
- Browser-based web application

---

## 🎛️ Choose Your Synth

The app opens on a landing page where you choose **JD-Xi** or **JD-XA**.

The synth you used last is marked, and a model switch at the top of each page lets you change between the two at any time.

The Android Back button returns from a synth page to the landing page.

### Supported Synthesizers

| Feature | JD-Xi | JD-XA |
|---------|-------|-------|
| Support status | Full support | Beta |
| Parts | 4 | 8 |
| Analog parts | 1 | 4 |
| Digital parts | 2 | 4 |
| Drum part | 1 | — |
| Step sequencer | Native 4-track | Web-based 16-track |
| Pattern chaining | A01–H64 | INT / USB A01–P16 |
| DX7 import | Yes | Not available |

> [!NOTE]
> JD-XA support is currently in beta. See [JD-XA Support](#jd-xa-support-beta) for details and limitations.

---

## ✨ Features

### 🎚️ Synthesizer & Sound Editor

Explore and edit the JD-Xi's sound engine through a visual interface.

**Sound editing features:**

- Control Digital Synth 1, Digital Synth 2 and Analog Synth parts.
- Read the currently active sound directly from the JD-Xi.
- Edit oscillator, filter, amplifier and LFO parameters.
- Adjust cutoff, resonance and envelope settings.
- Access detailed ADSR controls.
- Edit individual digital partials or link partials together.
- Access advanced sound parameters through the full parameter editor.
- Send parameter changes directly to the synthesizer using MIDI SysEx.
- Edit arpeggio settings.
- Play and audition sounds using the on-screen keyboard.

The editor provides both simplified controls for quick adjustments and advanced editing for detailed sound design.

### 🎛️ Mixer & Effects

Control your synth's mix and effects without navigating through hardware menus.

- Adjust levels for individual synthesizer parts.
- Read current mixer settings from the connected synth.
- Control effect parameters from the dedicated FX interface.
- Make adjustments while playing.
- Optionally retain your preferred mixer settings when switching patterns.

Designed for quick adjustments during sound design, rehearsals and live performance.

---

### 🎼 Native 4-Track Step Sequencer (JD-Xi)

JD-Xi Remote includes a native Android step sequencer built with **Kotlin and Jetpack Compose**.

The sequencer follows the JD-Xi's four-part architecture.

#### Track Configuration

| Track | MIDI Channel |
|-------|--------------|
| Digital Synth 1 | 1 |
| Digital Synth 2 | 2 |
| Drums | 10 |
| Analog Synth | 3 |

#### Sequencer Features

- 16, 32, 48 or 64 steps.
- Piano-roll style note editing.
- Dedicated drum grid with JD-Xi drum sounds.
- Adjustable note velocity and duration.
- Tempo control from 40 to 240 BPM.
- Swing adjustment.
- Individual track mute controls.
- Play and stop controls.
- Optional MIDI clock and transport synchronization.
- Eight local pattern memory slots.
- Automatic local storage of the current sequence.
- Ability to send sequencer playback to the JD-Xi for recording into its internal pattern sequencer.

Create musical ideas on your phone or tablet and hear them immediately through the connected synthesizer.

---

### 🎤 Live Performance & Pattern Launcher

The Performance section is designed for playing and arranging patterns live.

Assign up to **six programs** to performance slots and switch between them during playback.

#### Performance Features

- Six configurable pattern slots.
- Visual indication of the current and next pattern.
- Queued pattern changes synchronized with musical timing, with a visible queue.
- Pattern transitions at the end of the current pattern.
- Adjustable tempo and timing options.
- MIDI clock synchronization, either generated by the app or followed from the synth.
- MIDI panic / all-notes-off function.

#### Punch In FX

Hold a performance pad to trigger temporary effects and release it to return to normal.

Available effects include:

- Drum rolls
- Filter sweeps
- Pitch dives
- Stutters
- Gates

This makes it possible to create longer musical arrangements from existing patterns and move between sections during a live performance.

#### How Pattern Switching Works

A Program Change makes the synthesizer load a whole program and stop its sequencer.

The synth's own smooth queued switch cannot be triggered over MIDI, so the app emulates the queue:

1. The app counts MIDI clock.
2. Bank Select and Program Change are sent shortly before the downbeat.
3. The timing is determined by the **Switch Lead** setting.
4. MIDI Start is sent on the downbeat.

**Switch Lead timing:**

| Synth | Default Switch Lead |
|-------|---------------------|
| JD-Xi | 170 ms |
| JD-XA | 200 ms |

The default lead allows enough time for the synthesizer to load a program.

**Automatic measurement:**

The **Measure** function plays a few test switches on the first slot, measures when the first note arrives and sets the Switch Lead to the shortest value that produces a clean start, plus a small safety margin.

After every switch, the status line shows how long the first note took to arrive, making timing problems easier to identify.

> [!TIP]
> The synthesizer mutes the last part of the previous pattern during a switch.
>
> For smoother transitions, leave the final step or two of a pattern empty, or experiment with a smaller Switch Lead.

> [!IMPORTANT]
> **Pattern chaining requires the app clock.**
>
> - **Synth Sync = SLAVE:** Pattern chaining works with the app generating MIDI clock.
> - **Synth Sync = MASTER:** When following the synth's clock, the synth ignores MIDI Start after a program switch.
>
> In MASTER mode, the pattern must be started manually on the synthesizer after switching.

---

### 💾 Patch Management

Manage your own sounds directly from the app.

- Read the current sound from the synth.
- Save custom patches locally.
- Name and organize your sounds.
- Mark favorite patches.
- Search and filter saved sounds.
- Restore saved patches to the synthesizer.
- Export patch collections as JSON files.
- Import previously saved patch collections.

Experiment with sound design while keeping a personal collection of your favorite patches.

---

### 🎹 Yamaha DX7 Patch Import (JD-Xi)

Explore classic FM synthesizer sounds with the integrated DX7 import tool.

#### Supported Features

- Import Yamaha DX7 `.syx` files.
- Support for individual voices and 32-voice banks.
- Inspect the structure of imported DX7 sounds.
- Convert selected voice characteristics into JD-Xi-compatible digital tone parameters.
- Transfer the resulting tone to the JD-Xi's temporary sound memory.

> [!NOTE]
> The Yamaha DX7 and Roland JD-Xi use fundamentally different synthesis architectures.
>
> Imported DX7 sounds are approximations rather than exact reproductions.

---

### 🎵 MIDI Player

A dedicated MIDI Player section provides additional ways to work with MIDI material and the connected synthesizer.

---

### 🌈 Audio Visualizer

The Remote interface includes a visualizer for displaying animated audio-related graphics.

#### Features

- Multiple visualization modes.
- Start and stop the visualizer independently.
- Full-screen visualization.
- Optional audio analysis using a supported audio input.
- Visual feedback while performing.

> [!NOTE]
> Audio-based visualization depends on the availability of a compatible audio input and Android permissions.

---

### 🎨 Customizable Interface

JD-Xi Remote offers several visual themes to suit different preferences and environments.

#### Available Themes

| Theme | Theme |
|-------|-------|
| Android | Cybergreen |
| Studio Keys | Pocket LCD |
| Dark | Light |
| Ocean | KO Light |
| KO Dark | |

The native step sequencer follows the selected theme.

#### Interface Scaling

Use **Size** next to Appearance to select:

- **Auto** — Responsive layout (default)
- **50–150%** — Manual scaling in 10% steps

Your selection is saved on the device.

The interface is designed for Android phones and tablets, with dedicated layouts for different screen sizes.

---

## 🎹 JD-XA Support (Beta)

JD-XA support is new and currently in **beta**.

It is built from Roland's published MIDI documentation using **SysEx Model ID 0F**, but has had limited testing on real hardware.

Behavior may differ between units and firmware versions.

> [!WARNING]
> JD-XA support is experimental.
>
> Test the app using a copy of your program before editing important sounds or performances.

### Available JD-XA Features

#### 8-Part Synthesizer Control

- Four analog parts.
- Four digital parts.
- Eight-part mixer and visualizer.

#### Live Performance

- Six performance slots.
- Queued pattern switching.
- Programs INT / USB A01–P16.
- Bank Select MSB 85.
- Punch In pads using documented JD-XA program addresses.

#### 16-Track Step Sequencer

- Eight synthesizer tracks.
- Eight MIDI Control tracks.
- Live playback.
- Standard MIDI File (SMF) export.

#### Additional Tools

- Tone editor.
- FX controls.
- Patch browser.
- MIDI Player.
- Customizable themes.
- Interface Size settings.
- Audio visualizer.

### JD-XA Beta Limitations

- The JD-XA step sequencer is a local editor and does not write patterns directly to the synthesizer's internal pattern memory.
- Use MIDI file export and the synth's own SMF import instead.
- The native Android step sequencer supports the JD-Xi only.
- DX7 import is not enabled for the JD-XA.
- Edits are sent to the temporary program memory.
- Use the JD-XA's own **WRITE** function to permanently save changes.
- Some displayed editor values are local and are not read back from the synthesizer.

For more information, see:

**[📖 JD-XA Documentation](docs/JD-XA_README.md)**

### Beta Feedback

Bug reports and testing feedback are welcome!

When reporting JD-XA issues, please include:

- Your JD-XA firmware version.
- A description of the unexpected behavior.
- Steps to reproduce the problem.
- An exported MIDI log, if available.

---

## 🔌 USB MIDI Connection

JD-Xi Remote communicates with the synthesizer through a direct USB connection.

### Android Requirements

- Android 7.0 or newer.
- Roland JD-Xi or JD-XA synthesizer.
- USB cable and USB-OTG adapter, or a compatible USB-C connection.
- Android device with USB host support.

### Connecting Your Synthesizer

1. Connect the synthesizer to your Android device using a suitable USB cable or OTG adapter.
2. Make sure the synthesizer is powered on.
3. Configure the JD-Xi to use Generic USB MIDI driver mode if necessary.
4. Open JD-Xi Remote.
5. Select your synthesizer model.
6. Allow USB MIDI access when Android requests permission.

Once connected, the app can exchange MIDI messages with the synthesizer, including Roland SysEx messages for detailed sound editing.

> [!IMPORTANT]
> **JD-Xi USB Driver Setting**
>
> If the application freezes, fails to communicate or cannot detect the synth, check that the JD-Xi is configured for **Generic USB Driver Mode**.

### Model-Specific MIDI Communication

Only the page for the selected synthesizer model sends MIDI commands to that model.

JD-Xi commands are not sent while you are on the JD-XA page.

---

## 🛠️ How the App Works

JD-Xi Remote combines two technologies within one Android application.

### Web-Based Remote Interface

The following features use an embedded web-based interface running inside an Android WebView:

- Sound editor
- Performance tools
- Mixer
- Effects
- JD-XA support
- Patch management
- Other controller functions

A custom MIDI bridge connects the interface to Android's native MIDI API.

This allows the interface to communicate with the synthesizer using standard MIDI messages and Roland SysEx.

### Native Android Sequencer

The four-track JD-Xi step sequencer is implemented natively in Kotlin using Jetpack Compose.

It communicates with the synthesizer through the same underlying USB MIDI connection.

### Hybrid Architecture

This hybrid design combines:

- A flexible web-based editing interface.
- Native Android MIDI communication.
- Detailed MIDI SysEx parameter control.
- A dedicated native Android step sequencer.

The result is a powerful companion interface for hardware synthesizer control.

---

## 👥 Who Is It For?

JD-Xi Remote is designed for a wide range of musicians and synthesizer enthusiasts.

**Sound Designers**

Explore synthesizer parameters and build custom patches through a more accessible editing interface.

**Live Performers**

Switch between patterns, use punch-in effects and control mixer settings during a performance.

**Electronic Musicians**

Create sequences, beats and arrangements using the step sequencer and performance tools.

**JD-Xi and JD-XA Owners**

Discover more of your synthesizer's capabilities through visual parameter editing and MIDI control.

**Mobile Musicians**

Use an Android phone or tablet as an additional controller in your hardware setup.

> [!NOTE]
> JD-Xi Remote is a companion application for the physical Roland synthesizer.
>
> It is **not** a standalone software synthesizer or a replacement for the hardware sound engine.

---

## 📱 Compatibility

| Component | Compatibility |
|-----------|---------------|
| Roland JD-Xi | Full support |
| Roland JD-XA | Beta support |
| Android | Android 7.0+ |
| Web Application | Browser with supported Web MIDI functionality |
| MIDI Communication | USB MIDI |
| Parameter Control | Roland System Exclusive (SysEx) |
| Android Interface | WebView |
| Native Sequencer | Kotlin / Jetpack Compose |

Some features require an active connection to the synthesizer.

Functionality may depend on the Android device, USB implementation, browser compatibility and synthesizer configuration.

---

## 🚧 Project Status

JD-Xi Remote is an independently developed project.

| Component | Status |
|-----------|--------|
| JD-Xi support | Stable core |
| JD-XA support | Beta |
| Native JD-Xi sequencer | Available |
| Web interface | Available |
| DX7 import | JD-Xi only |

The application is intended for experimentation, music production, sound design and live performance.

Features and compatibility may evolve as development continues.

### Feedback & Bug Reports

Feedback, bug reports and feature suggestions are welcome through GitHub Issues.

**[🐛 Report a Bug or Suggest a Feature](https://github.com/quadpunk/JD-XI-Remote/issues)**

For JD-XA reports, please include your firmware version and an exported MIDI log if possible.

---

## ⚖️ Disclaimer

JD-Xi Remote is an independent, unofficial application.

It is **not affiliated with, endorsed by or sponsored by Roland Corporation**.

Roland, JD-Xi and JD-XA are trademarks of Roland Corporation.

Yamaha and DX7 are trademarks of Yamaha Corporation.

All trademarks belong to their respective owners.

---

<p align="center">
  <strong>JD-Xi Remote</strong>
</p>

<p align="center">
  <strong>More control. More creativity. More from your synth.</strong>
</p>

<p align="center">
  <a href="https://jdxi-remote.wasmer.app/">Launch Web App</a>
  &nbsp;•&nbsp;
  <a href="https://github.com/quadpunk/JD-XI-Remote/releases">Download Android App</a>
  &nbsp;•&nbsp;
  <a href="https://github.com/quadpunk/JD-XI-Remote/issues">Report an Issue</a>
</p>
