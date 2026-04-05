# Rain View

**Find stillness in the rain.**

A contemplative ambient rain experience — 4 cozy scenes with procedural rain effects, generative piano, and spatial audio. No frameworks, no dependencies, just vanilla HTML/CSS/JS and the Web Audio API.

![Rain View Splash Screen](assets/splash-rain-window.jpg)

## Scenes

| Scene | Setting | Mood |
|-------|---------|------|
| **Tokyo Evening** | Cozy room overlooking Shibuya at night | Neon glow, rain on glass, urban calm |
| **New York Night** | Manhattan apartment window view | Amber warmth, steam, city bokeh |
| **Autumn Cabin** | Log cabin porch, New England mountains | Fall foliage, misty rain, solitude |
| **Zen Garden** | Japanese engawa, cherry blossoms | Sakura petals, koi pond, stillness |

## Features

- **Procedural rain-on-glass effect** — 2D Canvas rendering with static droplets, trickling trails, refraction highlights, and falling rain streaks. Each scene has unique rain characteristics.
- **Generative ambient piano** — Web Audio API synthesis with scene-specific scales (D minor pentatonic for Tokyo, Bb major 7th for New York, A minor for Autumn Cabin, Miyako-bushi for Zen Garden). Notes are generated in real-time with harmonics and delay-based reverb.
- **Procedural rain audio** — Multi-layer filtered noise with amplitude modulation for natural variation. City scenes include distant thunder rumbles with lightning flashes.
- **Cherry blossom petals** — Floating petal particles in the Zen Garden scene.
- **Fog and mist** — Drifting fog layers for forest and garden scenes.
- **Auto-hiding controls** — Glassmorphism UI that fades after 3 seconds of inactivity.
- **Mobile responsive** — Touch-optimized, full-screen experience on any device.
- **Zero dependencies** — No npm, no build tools, no external libraries.

## How It Works

The app uses several cognitive illusions to create depth and atmosphere from static images:

1. **Rain-on-glass overlay** — Canvas-rendered droplets with refraction glows create the illusion of looking through wet glass
2. **Procedural audio layering** — Multiple filtered noise bands with amplitude modulation produce convincing rain without audio files
3. **Scene-appropriate parameters** — Each scene tunes rain density, angle, speed, and audio frequency to match its environment
4. **Subtle motion** — Fog drift, petal fall, and trickling drops add life to static background paintings

## Running Locally

```bash
# Any static server will do
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:3000` (or 8000) in your browser.

## Live Demo

[**rain-view on GitHub Pages**](https://stewalexander.github.io/rain-view/)

## Audio Credits

All audio is procedurally generated using the Web Audio API — no audio files are used. The rain sounds are created from filtered white noise, and the piano notes are synthesized from sine oscillators with harmonic overtones.

## Image Credits

Scene backgrounds were generated using AI image generation and are included in this repository.

## License

MIT — see [LICENSE](LICENSE).

---

Built with stillness in mind. 🌧
