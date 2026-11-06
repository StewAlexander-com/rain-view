# Rain View

**Find stillness in the rain.**

A contemplative ambient rain simulator — 4 cozy cinematic scenes with real rain audio, gentle piano, a resizable sleep clock, and looping video. Built for mobile, optimized for iOS PWA. No frameworks, no dependencies, no ads.

[**Live Demo →**](https://stewalexander-com.github.io/rain-view/)

![Rain View — Splash Screen](screenshots/splash.jpg)

---

## Scenes

| Scene | Setting | Mood |
|-------|---------|------|
| **Tokyo Evening** | Cozy room overlooking Shibuya neon streets | Rain on glass, warm lamp, urban calm |
| **New York Night** | Manhattan apartment window, Empire State | Steam, taxis, amber bokeh through rain |
| **Autumn Forest** | Log cabin porch, New England fall foliage | Rain in the trees, lantern glow, solitude |
| **Zen Garden** | Japanese engawa, cherry blossoms, koi pond | Gentle rain, mist, stillness |

![Tokyo Evening — Scene Controls](screenshots/scene-tokyo.jpg)

---

## Sleep Clock

Tap the clock icon in the upper right to activate an elegant overlay clock — perfect for bedside use while rain plays in the background.

![Sleep Clock — New York Night](screenshots/clock-nyc.jpg)

- **Cinzel typeface** — Roman-proportioned serif with a brushed brass metallic finish (regular weight, not bold)
- **Embossed gold effect** — gradient text fill sweeping from warm ruddy brass to lighter gold, with bevel shadows creating a raised stamped-metal appearance
- **Pinch to resize** — two-finger pinch or scroll wheel, plus accessible ± buttons and keyboard +/−. Sizing is bounded by the viewport and stays centered after rotation.
- **Adjustable background dimming** — 25%–88% content dimming; this does not change hardware screen brightness.
- **Tap to reveal** — tap the background to reveal clock controls; use the clock button or Escape to close the clock.
- **Always accessible** — clock button stays visible in the top-right even when audio controls auto-hide
- **Controls suppressed** — audio controls hide while the clock is active so pinch gestures aren't intercepted
- **Quiet controls** — size/dimmer controls and the resize hint disappear after 4.5 seconds of inactivity.
- **Screen wake lock** — best-effort while the page is visible; a quiet status indicates whether the browser granted it. Battery policy and device settings can override it.

![Sleep Clock — Mobile Portrait](screenshots/clock-mobile.jpg)

---

## Audio

### Rain Variants

| Variant | Character |
|---|---|
| Gentle | Light, soft patter |
| Heavy | Full, immersive downpour |
| Window | Rain tapping on glass |
| Forest | Rain on leaves and canopy |
| Thunder | Rain with distant rumble |
| Leaves | Soft rain through foliage |
| Roof | Rain pattering overhead |

### Piano Variants

| Variant | Character |
|---|---|
| Contemplative | Sparse, minor key, cinematic |
| Jazz | Warm, major 7th chords, nostalgic |
| Melancholic | Emotional, modern classical |
| Ethereal | Ambient, spacious, slow |
| Pastoral | Light, meditative, Satie-like |
| Guitar | Gentle guitar ambience |
| Cello | Cello and synth ambience |

Piano starts muted. Select a music variant, press its Play button or raise its volume to layer it in. Each scene has a default rain and music pairing, but you can mix and match freely. On iOS, use device volume controls; the direct-media compatibility path is preserved.

---

## Features

- **Polished opening screen** — original surf-blue title, ivory italic shimmer and four scene previews, with legible captions, non-overlapping phone cards and reliable keyboard focus.
- **Lighter splash images** — responsive WebP versions of the existing images, with JPEG fallbacks for browsers without WebP support. Failed images retain readable scene names.
- **AI-generated looping video** — each scene is an 8-second cinematic loop with rain baked into the animation
- **7 rain + 7 music variants** — existing recordings retained; rain conservatively remastered near −23 LUFS with a 35 Hz high-pass.
- **Sleep clock** — elegant resizable brass clock overlay for bedside use
- **Mobile-first** — clearer 1280×720 mobile encodes (~2.7–3.7 MiB), touch-friendly controls, portrait and landscape clock sizing.
- **iOS PWA optimized** — auto-recovery from MEDIA_ERR_DECODE on cold start, Web Audio API bypassed on iOS
- **Installable** — PWA manifest, home screen icon, standalone display mode
- **Social sharing** — Open Graph + Twitter Card meta tags with preview image
- **Auto-hiding controls** — audio controls fade after 5.5 seconds and clock adjustments after 4.5 seconds, with keyboard-focus protection.
- **Reduced motion** — static scene poster instead of moving video when the system requests reduced motion.
- **Zero dependencies** — vanilla HTML/CSS/JS, no build tools, no npm

---

## Running Locally

```bash
npx serve .
# or
python3 -m http.server 8000
```

---

## Tech Notes

### iOS Audio Architecture

iOS Safari and PWA mode have strict audio restrictions. Rain View handles them:

1. **No Web Audio API on iOS** — `AudioContext` and `MediaElementSource` are bypassed entirely. Volume is controlled via `HTMLAudioElement.volume` (iOS overrides with physical volume buttons).
2. **No blob URLs on iOS** — `fetch()→blob→createObjectURL` causes `MEDIA_ERR_DECODE` in PWA mode. Plain src URLs are used instead.
3. **MEDIA_ERR_DECODE auto-recovery** — on PWA cold start, iOS sometimes fails to decode audio before the media session initializes. When detected, the tainted `<audio>` element is destroyed and replaced with a fresh one.
4. **Silent MP3 activation** — a tiny data URI MP3 is played on first touch to activate the iOS audio session.
5. **Retry cascade** — after entering a scene, playback is retried at 50/150/350/700/1200/2000/3500ms.

### Diagnostic Panel

Triple-tap the scene title to show a real-time audio diagnostic overlay. Shows AudioContext state, element playback state, MES connection status, errors, and version number.

### Performance

- Desktop video: ~6–7 MiB per scene (1280×720 originals).
- Mobile video: ~2.7–3.7 MiB per scene (1280×720, H.264 CRF 21).
- Audio: seven rain and seven music MP3s. The landing page fetches none; entering a scene loads its selected pair, other choices load on selection.
- Video uses a 650ms two-element dissolve; rain uses a 600ms equal-power Web Audio handoff. iOS uses native media loops to avoid overlapping uncontrollable-volume elements.
- See [the ten-pass polish audit](POLISH-AUDIT.md) for measured loudness, trade-offs, QA and real-device limitations.
- See [the opening-screen audit](SPLASH-POLISH-AUDIT.md) for its ten reviewed refinements, responsive checks and image-payload measurements.
- See [the card typography audit](CARD-TYPOGRAPHY-AUDIT.md) for the five-pass cinematic caption refinement, color choices and contrast checks.

---

## Credits

**Rain audio** — [Pixabay Sound Effects](https://pixabay.com/sound-effects/) (Pixabay Content License)
**Piano audio** — [Pixabay Music](https://pixabay.com/music/) (Pixabay Content License)
**Scene video/images** — AI-generated

The bedside refinement applies a conservative 35 Hz high-pass and measured loudness alignment to the existing rain tracks. It does not add new recordings or claim to remove existing distortion. See [AUDIO-CREDITS.txt](AUDIO-CREDITS.txt) for individual track attribution and provenance limits; the files have mixed source licenses.

## License

MIT — see [LICENSE](LICENSE).

---

*Built with stillness in mind.*
