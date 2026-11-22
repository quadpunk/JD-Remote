# Pattern switching: findings (Revision 11)

## Hardware limit
A Program Change makes the JD-Xi and JD-XA load a whole program and STOP the sequencer. The synth is unresponsive for some milliseconds and cuts sound (long tails at the end of a pattern). Roland support has confirmed that patterns stop on a PC message. The panel's smooth "queued" switch is internal; no MIDI message for it is documented, so it cannot be triggered from an app.

## What the app does
The app emulates the queue: it counts clock ticks, sends Bank Select + PC `Switch lead` ms before the downbeat and sends Start on the downbeat (app clock mode). That is the best that can be done over MIDI.

## Causes of lag found in the code (and what changed)
1. Switch lead was a fixed guess (30 ms). If the program load takes longer, Start is lost or late. -> New `Measure` button (app clock mode): runs test switches on the first slot (clock, PC, Start `lead` ms later), times the first note that comes back and shortens the lead from 200 ms until the start is late or missing. Switch lead = shortest working lead x1.3 + 4 ms. (A SysEx round trip was tried first but only measured USB latency, about 4 ms, so it was replaced.)
2. Mixer read-back (4 SysEx requests + level writes) started 450 ms after the PC, i.e. right at the start of the new pattern. -> now 1600 ms later, 120 ms apart.
3. Clock/pump timers were setInterval on the page: throttled when the tab is hidden or busy (clock stalls, tempo wobble). -> now run in a Web Worker.
4. "Went quiet" auto-stop could stop playback after 1 s without notes (quiet bar, long pad). -> now 3 s or 1.5 bars, whichever is longer.
5. After every switch the app now logs the time from the downbeat to the first incoming note (status line and `window.JDXiSwitchLog` in the browser console) so a bad lead is visible.

## Not fixable from the app
- Follow mode (synth is Sync MASTER): the synth ignores Start, so after a PC the pattern stops and must be started on the synth. Chaining needs the app clock mode (synth = SLAVE).
- The synth mutes the last `lead` ms of the old pattern. Leave the last step(s) of a pattern empty or trade a bigger lead against cut tails.

## Measured on the user's synth (Revision 12 runs)
First note after Start: lead 200 ms -> about 134 ms, 150 ms -> 134-137 ms, 100 ms -> 256-266 ms. The jump of about 125 ms is exactly one 16th at 120 BPM: with a lead of 100 ms the synth was still loading, missed Start and began one step late. Program load time is therefore roughly 100-150 ms. Revision 13 measures finer (170/150/130/115/100/85/70/50/30 ms), uses two 200 ms reference runs, accepts anything within half a 16th of the reference, and sets lead = shortest working lead + 15 ms.
