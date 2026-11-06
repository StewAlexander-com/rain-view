# Rain View: five-pass cinematic card typography polish

Scope: refine the captions on the four photo cards. Preserve the splash heading, italic phrase, imagery, scene order, and all bedside behavior. The user's direction is greyer text, slightly larger titles, slightly smaller explanations, and elegant separation from the photograph.

| Pass | Initial concern | Strongest objection | Refined decision |
|---|---|---|---|
| Color | Warm ivory captions compete with the photos and the main heading. | Making everything grey can flatten hierarchy or lose contrast. | Cool, restrained silver-grey for titles and a quieter grey for descriptions. Keep the levels distinct; check against the brightest permitted image rather than a favorable dark patch. |
| Title hierarchy | The 21.6px phone title is only modestly larger than its description and its medium weight feels heavy. | Oversized titles can turn subtle scene names into posters or wrap awkwardly. | Increase to 25.6px on phones and about 28.6px on a 1440px desktop, with regular Cormorant Garamond rather than medium weight. Preserve title case and the existing font family. |
| Description | The explanatory line has too much visual presence relative to the name. | Tiny “film credit” text would be stylish but difficult to use. | Reduce 12px to 11.5px, not 9–10px. Use relaxed line-height, minimal tracking, and readable contrast. |
| Photo separation | The nearly opaque caption gradient reads as a black panel beneath the image. | Removing it and relying on a blur or glow would fail over bright imagery. | Soften the scrim while keeping a controlled minimum opacity beneath text. Use small offset shadows for separation, not glow, stroke or bevel. |
| Composition | Title and explanation need to read as a single considered caption, not two unrelated text treatments. | More decoration, animation, or arbitrary alignment changes would dilute the existing design. | Preserve left alignment, refine the title-to-description gap and safe insets, and test all four names at every relevant breakpoint. No new ornament or motion. |

## Verification

Implemented as version 1.2.2 on `polish/cinematic-card-typography`. Public release remains separate from the private preview until approved.

### Final type and color

| Detail | Before | Refined |
|---|---|---|
| Phone card title | 21.6px, weight 500 | 25.6px, weight 400 |
| 1440px desktop card title | 24.8px, weight 500 | 28.64px, weight 400 |
| Short-landscape title | 20px | 24px |
| Title color | Warm ivory `#f0e9dc` | Cool silver-grey `#c6cccf` |
| Explanation | 12px, `#d2cdc4` | 11.5px, `#9ea8ab` |
| Title separation | Broad soft shadow | Small offset shadow plus restrained soft depth |
| Caption backing | Near-opaque black panel | Feathered scrim, with more photograph visible beneath the lettering |

The fifth pass rejected a fixed-height caption treatment: enlarged text clipped, especially New York Night. A sizing layer now preserves the normal photo proportions while allowing the caption's natural content height to enlarge a card when needed. This fixes text enlargement without squeezing the type or changing the normal four-choice layout.

### Checks and results

- **Contrast:** Conservative calculations use full-white image pixels behind the actual gradient and ignore the text shadows. Across the measured default viewports, title contrast is at least 4.43:1 and explanation contrast at least 4.58:1. Titles are 24px or larger; this is a targeted contrast calculation, not a full WCAG certification.
- **Responsive layout:** 320×568, 375×812, 390×844, 768×1024, 812×375, 1366×768 and 1440×900 have no intersecting cards, horizontally overflowing content or clipped captions. Once the existing arrival animation settles, both 375×812 portrait and 812×375 landscape fit the complete chooser.
- **Enlarged text and failure states:** At 320×568 with root text doubled to 200%, captions stay inside their cards. The same check passes with external fonts and images blocked, and reduced motion enabled; scene entry and keyboard return still work.
- **Touch and keyboard:** All four cards open their scene under touch emulation. Desktop focus moves to Back and returns to the correct card after using the clock.
- **Existing features:** All seven rain and seven music choices play. Pause/resume, rain mute/volume, clock sizing and dimming, fullscreen, diagnostics and Back passed regression checks. Audio and playback implementation files are unchanged.
- **Runtime:** No page errors in completed normal and fallback flows. Git whitespace checks pass. The pinned Impeccable detector returns the same three existing warning records for Inter and incumbent gradient text, not a new warning associated with the card captions.

The existing main heading, italic phrase, images, scene order, rain files, video and clock styling are untouched. No new decorative effect or animation was added. Physical-device and full assistive-technology certification are not claimed; subjective typography preference remains for the user's review.
