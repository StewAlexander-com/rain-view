# Rain View

**Find stillness in the rain.**

A contemplative ambient rain simulator — 4 cozy cinematic scenes with real rain audio, gentle piano, and looping video. Built for mobile, optimized for iOS PWA. No frameworks, no dependencies, no ads.

[**Live Demo →**](https://stewalexander-com.github.io/rain-view/)

---

## Scenes

| Scene | Setting | Mood |
|-------|---------|------|
| **Tokyo Evening** | Cozy room overlooking Shibuya neon streets | Rain on glass, warm lamp, urban calm |
| **New York Night** | Manhattan apartment window, Empire State | Steam, taxis, amber bokeh through rain |
| **Autumn Forest** | Log cabin porch, New England fall foliage | Rain in the trees, lantern glow, solitude |
| **Zen Garden** | Japanese engawa, cherry blossoms, koi pond | Gentle rain, mist, stillness |

## Features

- **AI-generated looping video** — each scene is an 8-second cinematic loop with rain baked into the animation (rain on glass, falling through trees, rippling on water)
- **5 rain audio variants** — Gentle, Heavy, Window, Forest, Thunder (real recordings from Pixabay, professionally cleaned and seamless-looped)
- **5 piano variants** — Contemplative, Jazz, Melancholic, Ethereal, Pastoral (real recordings, normalized to sit under rain)
- **Mobile-first** — 720p mobile video variants (~400KB vs ~7MB desktop), compact touch-friendly controls
- **iOS PWA optimized** — auto-recovery from MEDIA_ERR_DECODE on cold start, Web Audio API bypassed on iOS, plain src URLs instead of blob URLs
- **Installable** — PWA manifest, home screen icon, standalone display mode
- **Social sharing** — Open Graph + Twitter Card meta tags with preview image
- **Auto-hiding controls** — glassmorphism UI fades after 4 seconds, reappears on touch
- **Zero dependencies** — vanilla HTML/CSS/JS, no build tools, no npm

## Audio Selection

Each scene has a default rain + piano pairing, but you can mix and match:

| Rain Variant | Character |
|---|---|
| Gentle | Light, soft patter |
| Heavy | Full, immersive downpour |
| Window | Rain tapping on glass |
| Forest | Rain on leaves and canopy |
| Thunder | Rain with distant rumble |

| Piano Variant | Character |
|---|---|
| Contemplative | Sparse, minor key, cinematic |
| Jazz | Warm, major 7th chords, nostalgic |
| Melancholic | Emotional, modern classical |
| Ethereal | Ambient, spacious, slow |
| Pastoral | Light, meditative, Satie-like |

Piano starts muted — slide the volume up to layer it in.

## Running Locally

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Tech Notes

### iOS Audio Architecture

iOS Safari and PWA mode have strict audio restrictions. Rain View handles them:

1. **No Web Audio API on iOS** — `AudioContext` and `MediaElementSource` are bypassed entirely. Volume is controlled via `HTMLAudioElement.volume` (iOS overrides this with physical volume buttons).
2. **No blob URLs on iOS** — `fetch()→blob→createObjectURL` causes `MEDIA_ERR_DECODE` in PWA mode. Plain src URLs are used instead.
3. **MEDIA_ERR_DECODE auto-recovery** — on PWA cold start, iOS sometimes fails to decode audio before the media session is initialized. When detected, the tainted `<audio>` element is destroyed and replaced with a fresh one that loads and plays successfully.
4. **Silent MP3 activation** — a tiny data URI MP3 is played on first touch to activate the iOS audio session.
5. **Retry cascade** — after entering a scene, playback is retried at 50/150/350/700/1200/2000/3500ms to catch various iOS timing windows.

### Diagnostic Panel

Triple-tap the scene title to show a real-time audio diagnostic overlay. Shows AudioContext state, element playback state, MES connection status, errors, and version number. Useful for debugging audio issues on specific devices.

### Performance

- Desktop video: ~7MB per scene (1080p)
- Mobile video: ~400KB per scene (720p, auto-detected)
- Audio: 5 rain + 5 piano MP3s, professionally EQ'd and seamless-looped
- Total mobile payload: ~3MB for first scene load

## Audio Credits

Rain recordings from [Pixabay](https://pixabay.com/sound-effects/) (Pixabay Content License).
Piano recordings from [Pixabay Music](https://pixabay.com/music/) (Pixabay Content License).
All audio professionally cleaned: high-pass filtered (60Hz), low-pass filtered (14kHz), normalized to -18dB RMS (rain) / -22dB RMS (piano), seamless crossfade loop spliced.

See [AUDIO-CREDITS.txt](AUDIO-CREDITS.txt) for individual track attributions.

## Image / Video Credits

Scene backgrounds and videos generated using AI image and video generation tools.

## License

MIT — see [LICENSE](LICENSE).

---

*Built with stillness in mind.*
