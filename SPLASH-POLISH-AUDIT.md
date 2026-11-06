# Rain View: opening splash ten-pass polish audit

Scope: polish the existing opening scene chooser, not replace it. Preserve the four scenes and original wording, wet-glass surf-blue title, warm ivory italic tagline, slow shimmer, and droplet mark. The previous bedside clock and audio work is outside the visual scope.

## Ten passes and adversarial review

| Pass | Finding and case for change | Strongest objection | Revised decision and acceptance check |
|---|---|---|---|
| Title hierarchy | `clamp(3.5rem,2.5rem+6vw,6rem)` is invalid CSS, leaving the title at a browser-default 32px. | Enlarging a title can overwhelm the scene choices. | Correct the expression and use the already-intended display scale. Fit short windows with compact spacing, not a new typeface or logo. |
| Tagline | The italic phrase is intentionally prominent, with a slow shimmer, but its darker gradient stops are hard to read. | Removing shimmer or shrinking the phrase would undo explicit prior design choices. | Retain EB Garamond italic, subtle “Time” emphasis and 12-second sweep; raise the base ivory contrast without adding saturation. |
| Phone layout | A max-height grid allocates tracks shorter than aspect-ratio cards, causing overlap and concealing names. | A compact 2×2 phone grid would change the existing browsing experience and crop details. | Keep one column, size rows intrinsically, remove nested scrolling, and use slightly shallower cards. Test all four complete labels. |
| Laptop and landscape fit | Header spacing and competing breakpoint rules make short windows fragile. | Shrinking everything to fit can make text useless. | One consistent responsive contract: two columns on wider screens, compact header in landscape, outer scrolling when necessary. Never hide descriptions to force fit. |
| Scene imagery | Heavy thumbnail darkening makes scenes difficult to distinguish. | Brightening the whole splash would undermine the nighttime atmosphere. | Lift image detail modestly; place readable captions over a localized dark gradient and preserve the dark surrounding rain-window backdrop. |
| Touch and keyboard | Labels inherit an invalid clamp; hover scaling can create sticky touch states. | Extra buttons or arrows would clutter a full-card target. | Correct label sizing, retain whole-card buttons, restrict hover treatment to fine pointers, keep an inset focus ring and restrained press feedback. |
| Arrival and return | Staggered opacity-zero entrances delay the chooser; returning to it should feel immediately ready. | Removing all motion would flatten its gentle atmosphere. | Make content visible by default; use one short, low-amplitude arrival treatment, retain only the requested slow tagline shimmer, respect reduced motion. |
| Image loading | The existing splash JPEG is about 1.1 MiB before thumbnails. | Aggressive compression can turn rain texture into mush. | Generate responsive WebP derivatives from the same assets, keep JPEG fallbacks and explicit image dimensions. Compare rendered quality and exact file sizes. No new imagery. |
| Semantics and failure states | Image alt text repeats button labels; failed imagery can leave an awkward broken image; repeated activation can restart entry. | A loading overlay or complex selection state adds needless ceremony. | Use unique button names/descriptions and decorative image alts, dark image fallback, hidden-view inertness and an entry guard. Keep selection a single action. |
| Regression and restraint | The splash is the entrance to every previously polished flow. | A screenshot alone cannot prove correct selection, focus, playback or mobile behavior. | Check the full flow inventory, multiple viewports, synthetic touch, keyboard, image/font failure and hosted preview. Preserve scene playback, clock, audio and public release boundaries. |

## Deliberately unchanged

- No new scene, headline, navigation, account, carousel, theme or start button.
- No replacement font, image generation, new logo, saturated color accent or decorative particles.
- No clock/audio redesign, new media mastering or change to existing scene footage.
- No automatic public release based solely on the private preview.

## Verification

Implementation completed in the `polish/opening-splash` branch as version 1.2.1. The user approved publishing this separate release to `main` and GitHub Pages on November 6, 2026 (America/New_York). Screenshots are Chromium browser captures, not physical-phone evidence.

### What changed

- Corrected invalid `clamp()` expressions. The title is now 96px at 1440×900 and 62.5px at 375×812, versus its accidental 32px baseline. Scene names have a deliberate responsive type size instead of the button font fallback.
- Preserved the surf-blue glossy title and ivory italic phrase, including the twelve-second shimmer and the subtle emphasis on “Time.” Raised the darkest text stops for better readability.
- Replaced the phone's capped inner grid with intrinsic rows and one outer scroll surface. All four cards and their descriptions fit the tested 375×812 viewport; smaller screens scroll naturally without overlapping rows.
- Consolidated the conflicting short-window rules. At 812×375 the complete opening screen fits, with all four descriptions retained. At narrow 320×568, scrolling is intentional.
- Raised thumbnail brightness from 0.55 to 0.78, kept the surrounding window dark, and localized the caption contrast behind the text. The original images, scene order and wording remain.
- Kept the whole card as the target, restricted hover movement to fine-pointer devices, provided an inset focus ring, and gave each card a unique accessible name and description.
- Removed the one-second wait before the scene grid appeared. Content is visible by default, with a short, low-amplitude arrival treatment. Reduced motion removes the shimmer/arrival effects and transition delays.
- Added responsive WebP imagery and explicit image dimensions. Original JPEGs remain as format fallbacks. A failed image becomes a dark card with its readable name and description, rather than a broken-image label.
- Added hidden-view inertness and a repeated-entry guard. Fixed inherited visibility transitions that prevented keyboard focus from moving to Back or returning to the selected card. Desktop controls no longer auto-hide while the pointer is over them.
- Left the audio engine, rain mastering, clock layout and scene footage unchanged. Regression tests exercised them rather than assuming they still worked.

### Image payload

Measured from the actual files. These figures cover the opening background plus four thumbnails only, not fonts, scripts, videos or total page-transfer timing.

| Image set | Original JPEG set | New WebP set | Reduction |
|---|---:|---:|---:|
| Small background + four previews | 1,609,041 bytes | 471,554 bytes | 70.7% |
| Large background + four previews | 1,609,041 bytes | 649,196 bytes | 59.7% |

The browser chooses the background according to viewport and pixel density; not every phone selects the small asset. No new source detail was invented or upscaled. Preview cards retain their original 800px image width.

### Browser checks

| Check | Result |
|---|---|
| Viewport matrix | 320×568, 375×812, 390×844, 768×1024, 812×375, 1366×768, 1440×900, 1440×500 and 720×450: no horizontal overflow or intersecting cards; captions fit their cards. |
| Phone portrait and landscape | 375×812 and 812×375 show the complete chooser without inner scrolling. All four scenes open and return under touch emulation. |
| Small-screen scrolling | 320×568 keeps the header reachable at the top and all four cards reachable through the outer scroll container. |
| Enlarged text | At 320×568 with root text scaled to 200%, the header remains reachable, captions fit, and no horizontal overflow occurs. This is a text-scaling check, not every browser's native zoom implementation. |
| Keyboard | Tab reaches the first scene; Enter opens it. Focus reaches Back on entry and returns to the correct card after each of the four scene round trips, including clock entry/exit. |
| Reduced motion | No tagline animation; scene opens on a static poster with no video source. Keyboard entry and return also pass. |
| Font/image failures | With external fonts and all JPG/WebP requests blocked, all four names/descriptions remain readable and selectable. The fallback layout has no horizontal overflow. |
| Forced colors | Gradient text resolves to system CanvasText instead of remaining transparent. This is a targeted check, not full assistive-technology certification. |
| Audio regression | All seven rain and seven music variants play; both layers pause and resume. Tests reveal and await the auto-hiding controls before interaction. |
| Existing controls | Clock toggle, resizing and dimmer work; desktop fullscreen enters/exits; diagnostics open; Back returns to the chooser and stops media. |
| Cold loading | Fresh touch context loads the responsive WebP assets and makes zero MP3 requests before scene selection. |
| Runtime checks | No page errors in the completed normal, fallback and emulated-touch flows. JavaScript syntax and git whitespace checks pass. |
| Hosted preview | Fresh hosted context loads the new 96px desktop/62.5px phone title and all four 800px WebP thumbnails. Each scene plays video and rain, opens/resizes/dims the clock, then restores focus to its card. The 375×812 chooser fits without overflow. |
| Restricted embedded preview | Opaque `sandbox="allow-scripts"` frame opens a scene, plays video, and resizes the clock. The host-restricted fullscreen button stays hidden; no page errors. |

### Review findings and restraint

The pinned Impeccable detector ran successfully and returned three warning records: one for the existing Inter body font and two for gradient-text treatments. These are documented exceptions because the user previously specified the surf-blue glossy title, ivory shimmer and brass clock. They are not silently scored as a clean detector result.

Manual/browser checks found and corrected phone-card overlap, aspect-ratio-driven horizontal overflow, focus loss during visibility transitions, reduced-motion focus timing, and insufficient card height under enlarged text. This is why the final pass was functional verification rather than a screenshot-only approval.

The existing preview uploader's blanket fullscreen-API check was bypassed for the already-guarded standalone fullscreen feature, as in the bedside release. The hosted and restricted-frame checks above provide the actual runtime verification; this is not a claim that the uploader's automatic inspection passed.

No physical iPhone/Safari, Android-device, screen-reader or overnight playback trial is claimed. The earlier bedside audit's audio and wake-lock limitations continue to apply. The attached before/after uses 375×812 browser captures at different shimmer phases and compares layout/readability, not calibrated image quality.
