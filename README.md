# Rain View

**Find stillness in the rain.**

An ambient rain simulator with four cinematic looping scenes, five rain soundscapes, and five looping piano tracks (recorded music). Built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools.

Project documentation for **[StewAlexander-com/rain-view](https://github.com/StewAlexander-com/rain-view)** lives in this `README.md` at the repository root.

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

Defaults match `app.js` (`SCENES`):

| Scene | Setting | Default pairing |
|-------|---------|-----------------|
| **Tokyo Evening** | Neon-lit streets through rain-kissed glass | Window rain, Contemplative piano |
| **New York Night** | Manhattan skyline, steam, and amber light | Heavy rain, Jazz piano |
| **Autumn Forest** | Fall foliage and mountain mist | Forest rain, Melancholic piano |
| **Zen Garden** | Cherry blossoms and rain on still water | Gentle rain, Ethereal piano |

Each scene loads a looping MP4 (`assets/scene-*.mp4`) with a vignette overlay. Choosing a scene applies its default rain and piano variants; both can be changed with the pill selectors.

## Features

- **Five rain soundscapes** — Gentle, Heavy, Window, Forest, and Thunder (`assets/rain-*.mp3`). Switching variants crossfades: previous track fades out (~600 ms), new track fades in (~800 ms), ease-in-out stepped ramp (`audio-engine.js`).
- **Five piano loops** — Real recorded tracks (`assets/piano-*.mp3`): Contemplative, Jazz, Melancholic, Ethereal, Pastoral. Variant switches use the same crossfade as rain. Entering a scene starts rain at volume **0.7** and piano at **0** until you raise the piano slider (`app.js`). Attribution: see `AUDIO-CREDITS.txt` (CC BY 4.0, Kevin MacLeod / incompetech.com).
- **Independent volume** — Separate sliders for rain and piano.
- **Auto-hiding controls** — Control panel hides after **4 seconds** of inactivity; mouse move or touch shows it again (`app.js`).
- **PWA-ready** — `manifest.json`, icons under `icons/`, mobile meta tags.
- **Mobile responsive** — Touch-friendly layout and pill controls; see `style.css` for `prefers-reduced-motion` handling.
- **Keyboard** — **Escape** returns to the splash screen when a scene is active (`app.js`).

## Architecture

`index.html` loads **`audio-engine.js`** then **`app.js`** as plain scripts (no bundler, no ES module graph).

```
rain-view/
├── index.html          # Splash + scene shell, control panel, script tags
├── style.css           # Layout, glass UI, responsive rules
├── app.js              # SCENES map, enter/exit, pills, auto-hide, Escape
├── audio-engine.js     # Rain + piano MP3 preload and crossfade
├── AUDIO-CREDITS.txt   # Piano track titles and CC BY attribution
├── manifest.json
├── screenshots/        # Images for this README (GitHub rendering)
├── assets/
│   ├── scene-*.mp4     # Four looping videos
│   ├── rain-*.mp3      # Five rain tracks
│   ├── piano-*.mp3     # Five piano loops (see AUDIO-CREDITS.txt)
│   ├── thumb-*.jpg     # Splash card thumbnails
│   └── splash-rain-window.jpg
└── icons/              # PWA / favicon / OG assets
```

### Audio engine (`audio-engine.js`)

- **Rain** — Five `<audio>` elements, `loop` + `preload`, created in `preload()`. `setRainVariant` fades out the current track then fades in the new one.
- **Piano** — Five more `<audio>` elements (`assets/piano-*.mp3`), same crossfade behavior via `setPianoVariant`. `start()` marks the engine ready after a user gesture; playback is still driven by HTML5 audio (no Web Audio synthesis for piano).

## Run locally

1. **Get the project** — `git clone https://github.com/StewAlexander-com/rain-view.git` or download the ZIP from GitHub.

2. **Serve over HTTP** — Do not rely on `file://` for normal use; use a static server so media and script behavior match a deployed site.

```bash
cd rain-view

npx serve .
# or
python3 -m http.server 8000
```

3. Open `http://localhost:3000` or `http://localhost:8000`. Rain and piano playback expect a **user gesture** (e.g. clicking a scene card) due to browser autoplay policy.

### Network requirements for a local build

- **Same-origin assets** (HTML, CSS, JS, MP4, MP3, images) are all local under the repo.
- **Google Fonts** load from `fonts.googleapis.com` / `fonts.gstatic.com` on first load; offline, the UI still runs with fallback fonts.
- **No `npm install`** is required unless you use a tool like `npx serve`.

## Credits

- **Rain audio** — MP3 files in `assets/`.
- **Scene videos** — MP4 files in `assets/`.
- **Piano** — Kevin MacLeod (incompetech.com), CC BY 4.0; titles and filenames in `AUDIO-CREDITS.txt`.
- **Fonts** — [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts.

## License

MIT — see [LICENSE](https://github.com/StewAlexander-com/rain-view/blob/main/LICENSE).
