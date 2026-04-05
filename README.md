# Rain View

**Find stillness in the rain.**

An ambient rain simulator with four cinematic looping scenes, five rain soundscapes, and a generative piano engine. Built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools.

This **`README.md` at the root of [StewAlexander-com/rain-view](https://github.com/StewAlexander-com/rain-view)** is the canonical project documentation. Edit this file in the repository (not a duplicate elsewhere) so GitHub and clones stay in sync.

[**Live demo**](https://stewalexander-com.github.io/rain-view/)

---

## Screenshots

**Splash & scene picker** — choose a scene; audio starts after you tap a card (browser autoplay policy).

![Rain View splash and scene selection](screenshots/rain-view/splash-rain-window.jpg)

**Scene thumbnails** (Tokyo, New York, Autumn Forest, Zen Garden):

| Tokyo Evening | New York Night |
|:---:|:---:|
| ![Tokyo Evening](screenshots/rain-view/thumb-tokyo.jpg) | ![New York Night](screenshots/rain-view/thumb-nyc.jpg) |

| Autumn Forest | Zen Garden |
|:---:|:---:|
| ![Autumn Forest](screenshots/rain-view/thumb-autumn.jpg) | ![Zen Garden](screenshots/rain-view/thumb-garden.jpg) |

---

## Scenes

| Scene | Setting | Default pairing |
|-------|---------|-----------------|
| **Tokyo Evening** | Neon-lit streets through rain-kissed glass | Window rain, Contemplative piano |
| **New York Night** | Manhattan skyline, steam, and amber light | Heavy rain, Jazz piano |
| **Autumn Forest** | Fall foliage and mountain mist | Forest rain, Melancholic piano |
| **Zen Garden** | Cherry blossoms and rain on still water | Gentle rain, Ethereal piano |

Each scene loads a looping MP4 video background with a cinematic vignette overlay. Selecting a scene automatically sets its curated rain and piano defaults, though both can be changed freely.

## Features

- **Five rain soundscapes** — Gentle, Heavy, Window, Forest, and Thunder. Each is a dedicated audio track with crossfade transitions between variants.
- **Generative piano** — Real-time synthesis via the Web Audio API. Five distinct voicings (Contemplative, Jazz, Melancholic, Ethereal, Pastoral), each with its own note set, tempo, chord probability, and convolution reverb.
- **Independent volume control** — Separate sliders for rain and piano allow any mix from rain-only ambience to a piano-forward session.
- **Auto-hiding controls** — Glassmorphism control panel fades out after four seconds of inactivity and reappears on mouse movement or touch.
- **PWA-ready** — Web app manifest, full icon set, and mobile meta tags for home-screen installation on iOS and Android.
- **Mobile responsive** — Single-column layout and horizontally scrollable pill selectors on small screens. Touch-optimized with `prefers-reduced-motion` support.
- **Keyboard navigation** — Press **Escape** to return to the splash screen from any scene.

## Architecture

```
rain-view/
├── index.html          # Splash screen + scene viewer markup
├── style.css           # All styles (glassmorphism, animations, responsive)
├── app.js              # Scene management, UI state, auto-hide logic
├── audio-engine.js     # Rain playback + procedural piano synthesis
├── manifest.json       # PWA manifest
├── screenshots/        # README images (splash + scene thumbnails)
├── assets/
│   ├── scene-*.mp4     # Looping video backgrounds (4 scenes)
│   ├── rain-*.mp3      # Rain audio variants (5 tracks)
│   ├── thumb-*.jpg     # Scene card thumbnails
│   └── splash-rain-window.jpg
└── icons/              # Favicons, touch icons, OG image
```

### Audio engine

The audio engine (`audio-engine.js`) has two independent layers:

- **Rain** — HTML `<audio>` elements loaded from MP3 files. Variants crossfade with an eased volume ramp over 800 ms. All five tracks are preloaded on page init.
- **Piano** — A Web Audio API synthesizer. Each note is a detuned oscillator pair (triangle + sine) routed through a biquad lowpass filter, an ADSR-style gain envelope, and a generated convolution reverb. Note selection, velocity, sustain, rest probability, and chord voicing are driven by per-variant configuration objects.

## Run locally

1. **Get the project**
   - Clone: `git clone https://github.com/StewAlexander-com/rain-view.git`
   - Or download the repository as a ZIP from GitHub and extract it.

2. **Serve over HTTP** (do not open `index.html` directly as `file://` — ES modules and audio policies expect a real origin).

```bash
cd rain-view

npx serve .
# or
python3 -m http.server 8000
```

3. Open `http://localhost:3000` or `http://localhost:8000` in your browser. **Audio requires a user gesture** (e.g. choosing a scene) before playback, per browser autoplay rules.

### Network requirements for a local build

- **Localhost is enough** for app code and bundled assets (HTML, CSS, JS, MP4, MP3, images).
- **Internet access** is still needed on first load if you use the stock `index.html`, because **Google Fonts** are loaded from `fonts.googleapis.com` / `fonts.gstatic.com`. Without network, fonts fall back to system fonts; the app still runs.
- **No npm install** is required unless you choose a dev server like `npx serve`.

## Credits

- **Rain audio** — MP3 recordings included in `assets/`.
- **Scene videos** — Looping video clips included in `assets/`.
- **Piano** — Procedurally generated at runtime with the Web Audio API (no piano samples).
- **Fonts** — [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts.

## License

MIT — see [LICENSE](https://github.com/StewAlexander-com/rain-view/blob/main/LICENSE) in the repository.
