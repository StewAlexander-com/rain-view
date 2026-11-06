# Rain View: ten-pass polish audit

Scope: refinement, not redesign. Preserve the four original scenes, recordings, brass Cinzel identity, simple selection screen and direct-media iOS compatibility. Each pass includes the strongest reason to make the change, the strongest objection, and the revised implementation decision.

## Pass decisions

| Pass | Finding and strongest case for improvement | Strongest objection | Revised plan and acceptance |
|---|---|---|---|
| 1. Bedside legibility | The 8vw default is only 30px on a 375px phone. A clock should be readable from a bed, not require a pinch first. | A huge clock can obscure the rain and abandon the existing elegance. | Preserve regular Cinzel and warm brass. Use responsive, bounded sizing, quieter bevels and a separate small AM/PM line. No date, seconds or ticking animation. |
| 2. Centering and resize | Inline AM/PM and the hint shift the perceived center; unlimited width can clip enlarged times. | New gestures or complexity would make a simple clock harder. | Keep pinch and wheel, add small ± buttons, bound size by width and height, anchor hints/tools outside the centered time. Test long times and orientation changes. |
| 3. Nighttime brightness | One fixed dim layer cannot suit different rooms or video scenes. | Web dimming is not hardware brightness; pretending otherwise is misleading. | One scene-dimming slider, default gently darker. Controls recede on idle; tap reveals, explicit clock button exits. Do not claim to control backlight or prevent OLED wear. |
| 4. Video clarity | Mobile Tokyo is 720×406 at about 477kbps versus the original 1280×720 source. Heavy compression loses rain detail. | Upscaling or sharpening would invent detail, increase battery use, or create halos. | Re-encode original 720p scenes for mobile at a reasonable quality setting, strip unused audio; retain original framing and desktop footage. No fabricated 4K, sharpen filter or replacement imagery. |
| 5. Loop continuity | Video crossfade is disabled in clock mode; its zero-delay rescheduling can spin near a loop boundary. Nested timers survive scene changes. | Longer dissolves can create ghosting and cost two decoders. | Keep the existing two-video approach, use a short head-to-tail handoff keyed to media time, run in clock mode, clean up on exit and stop visual work in hidden tabs. |
| 6. Rain mastering | Different recordings can vary in loudness and low rumble; the current rain fade-in is zero. | Aggressive denoising can erase the rain itself and turn it watery. | Measure first. Conservative high-pass and loudness alignment, no noise gate or synthetic replacement. Gentle startup on supported gain paths; retain iOS fallback. Record objective levels and listening limitations. |
| 7. Audio continuity | A 56ms linear loop crossfade can expose a level dip; eager buffering fetches all music even at zero volume. | Rebuilding the audio engine risks known iPhone regressions. | Preserve the engine. Longer equal-power handoff on Web Audio; native single-element loops on iOS to avoid doubling full-volume twins. Load chosen tracks on demand. Keep muted piano truly silent by default. |
| 8. Touch and keyboard | Tiny targets, missing slider labels/selection states, overlapping fullscreen/clock, and opacity-only hidden controls impair operation. | Larger controls can dominate an immersive app. | 44px targets, clearer labels/focus, correct pressed states and a reserved top-right slot. Hide interaction with chrome, retain keyboard reveal, use horizontal pill scrolling on phones. |
| 9. Lifecycle and recovery | Escape can leave stale clock state; asynchronous wake-lock acquisition may complete after exit; video failure has no recovery. | More status text and automatic retries would disturb sleep. | One quiet video retry state, event-based clock cleanup, single-flight wake lock with truthful status. No hidden fallback-video promise or aggressive automatic request loop. |
| 10. Regression and restraint | Improvements must work together across scenes and phone/laptop layouts. | A clean static audit cannot prove audio, motion or physical-device reliability. | Browser-test controls and states, sample loops, measure media, inspect screenshots, run Impeccable detector, test hosted preview. Explicitly distinguish emulation, objective audio checks and untested hardware. |

## Deliberately excluded

- No redesign, new scene, dashboard, date display, seconds, alarm, account, framework migration or generated media.
- No aggressive denoising, heavy sharpening, fake resolution increase or claim of studio-quality sound.
- No automatic public deployment or change to GitHub Pages without approval.
- No guarantee that mobile operating systems keep a page awake, play audio in the background, or honor hardware-independent volume.

## Implemented result

- Regular Cinzel remains the clock face. The main time is centered independently of the smaller AM/PM line; the gradient is now applied to the numeral text itself, with a quieter bevel.
- Default clock type is 71.25px at 375px portrait, versus 30px before. Pinch, wheel, ± buttons and keyboard +/− retain bounded sizing. Scene dimming adjusts from 25% to 88%, initially 52%.
- Clock controls recede after 4.5 seconds. A tap reveals controls without accidentally dismissing the clock. The clock toggle or Escape exits; another Escape leaves the scene.
- All four mobile videos are re-encoded from their existing 1280×720 originals at H.264 CRF 21. No invented detail or new footage. Mobile file sizes rise to roughly 2.7–3.7 MiB, an intentional clarity/data trade-off versus the old roughly 0.25–0.46 MiB encodes.
- Two existing video elements alternate with a 650ms dissolve driven by playback position, including while the clock is active. The incoming clip starts at its beginning rather than cutting to a random middle segment. Native looping remains a fallback if the spare element is not ready.
- Rain startup uses an 850ms fade on controllable gain paths. Loop handoff uses a 600ms equal-power curve rather than a 56ms linear fade. iOS retains direct media, using native single-element looping rather than full-volume overlapping elements.
- All tracks remain available. The landing screen fetches zero MP3 files, versus eager loading of the entire collection. Entering a scene loads its selected rain and music; unselected variants load when requested. Piano starts silent on all platforms and becomes audible when explicitly selected or played.
- Controls have labels, pressed states, focus rings and larger targets. Invisible controls no longer intercept touches. Fullscreen has its own space beside the clock button.
- Wake lock is single-flight and best-effort. It does not recursively request after every OS release; a late acquisition is released if the scene has already closed. Unsupported/denied locks give a quiet, truthful notice rather than an unreliable silent-video workaround.
- Version markers are aligned at 1.2.0, with refreshed runtime and media cache keys. GitHub Pages is not changed by the private preview.

## Rain measurements

Measured by FFmpeg loudnorm before processing and again from the final MP3 encodes. Processing: 35 Hz high-pass, two-pass loudness alignment targeting −23 LUFS, conservative true-peak headroom, 192kbps MP3 at 48kHz. No denoiser or noise gate. Existing recording provenance and licenses remain unchanged.

| Recording | Before, LUFS | After, LUFS | Final true peak, dBTP |
|---|---:|---:|---:|
| Gentle | −15.68 | −23.22 | −7.16 |
| Heavy | −14.10 | −23.16 | −8.48 |
| Window | −17.65 | −23.27 | −3.68 |
| Forest | −19.91 | −23.24 | −2.48 |
| Thunder | −17.43 | −23.46 | −3.41 |
| Leaves | −13.59 | −23.16 | −9.48 |
| Roof | −15.17 | −23.27 | −8.93 |

Integrated loudness spread narrows from 6.32 LU to 0.30 LU. Final reconstructed peaks remain below full scale; lossy encoding can overshoot the limiter's nominal target, as Forest does relative to −3 dBTP. These measurements do not repair pre-existing distortion or certify subjective sound quality. Thunder remains intentionally more dynamic than steady rain.

## Verification results

| Check | Evidence and result |
|---|---|
| Existing scene flows | All four cards opened the expected scene, video advanced, clock enabled, video handed off, and Back returned to the scene chooser. |
| Audio choices | All seven rain and seven music variants were selected through real clicks; playback time advanced on the selected element. |
| Pause, resume, mute | Both audio layers paused/resumed. Rain slider to zero stopped playback; Play restored volume and playback. All media paused after scene exit. |
| Audio seam | A live rain element was staged near its end; the real handoff completed with the old element paused and the incoming element advancing. This is structural playback verification, not a listening test. |
| Video seams | Each scene completed its first handoff with the clock active; the spare video advanced and the outgoing video paused. |
| Clock controls | ±, dimmer endpoints, Escape, resize and subsequent scene entry passed. The default phone clock's time bounds were centered at x = 187.5px in a 375px viewport. |
| Touch input | Chromium mobile emulation plus CDP-synthesized two-finger input enlarged the clock from 71.25px to its 101.25px bound. Tap controls also passed. Not physical-device evidence. |
| Orientation | Same running page checked at 1440×900, 375×812 and 812×375; portrait clock and landscape tools remained in view. |
| Time rollover | Mock clock advanced 11:59:58 PM to 12:00 AM; display updated correctly. |
| Reduced motion | Fresh reduced-motion context showed the scene poster, paused video with no video src, and a working clock. |
| Error recovery | Blocked MP4 requests exposed the poster/retry state; after network restoration, Retry advanced video playback. |
| Fullscreen and diagnostics | Desktop fullscreen entered/exited; triple-click diagnostics opened and cleared on scene exit. |
| JavaScript | Syntax checks and git whitespace checks passed; no page errors in the normal desktop and emulated-touch flows. |
| Startup requests | Fresh landing page made zero MP3 requests. |
| Hosted preview | A fresh Chromium context loaded the deployed proxy, played video and rain, resized/dimmed the clock, paused/resumed rain, played Guitar and returned to the chooser. No page errors. |
| Opaque iframe | A separate `sandbox="allow-scripts"` harness loaded the hosted app without same-origin privileges. Video and rain played after a click, clock resize worked, and the forbidden fullscreen button was hidden. No page errors. |

### Impeccable engine versus manual review

The pinned Impeccable context and source detector ran successfully. The detector returned six warning records: four gradient-text records, one wide-tracking record and one Inter-font record. These are not six verified functional defects: gradient/brass treatment and existing Inter body text are incumbent identity, explicitly preserved for this refinement; the short existing subtitle retains its established spacing. They are documented exceptions, not a claim of a clean detector scan.

The preview uploader initially rejected the existing optional fullscreen API by static inspection. Standalone fullscreen was preserved, permission-policy detection was added, and deployment validation was bypassed only for that known restriction. Both hosted content and a restricted opaque iframe were then exercised manually through Playwright; fullscreen was correctly hidden in the restricted host.

Manual browser inspection separately checked time hierarchy, touch sizing, visible controls, phone framing, landscape fit and idle chrome. The detector does not establish WCAG conformance, perceived audio quality or uninterrupted overnight operation.

### Remaining acceptance limits

- Physical iPhone Safari/PWA, Android hardware, laptop speakers/headphones and overnight operation need a real-device trial.
- The app's dimmer darkens content, not the physical backlight. It cannot prevent OLED burn-in; adjust device brightness and avoid leaving a static clock at high brightness.
- Wake lock depends on browser policy, battery conditions and page visibility. Native iOS audio looping is not claimed gapless.
- Higher-quality phone footage uses more data and may consume more decoding energy. No measured battery-life claim is made.
- Rain has been conservatively remastered and structurally tested; subjective listening quality is for the user's review in the preview.
- The user approved publishing these refinements to `main` and the public GitHub Pages site on November 5, 2026 (America/New_York). The tested implementation was prepared on `polish/bedside-refinement`; release verification follows the deployment workflow.

### Screenshot provenance

The phone before/after compares the original and refined clock layouts at 375×812 in Chromium. They are different capture times, not synchronized video frames or a pixel-level encoding comparison. The original screenshot used the desktop source after resizing the page; the final phone screenshot is a fresh mobile load of the new mobile encode. README clock captures show New York on desktop and Autumn in portrait.
