# Edward Thomas — Portfolio v2

A one-page, Swiss-index portfolio: giant name, a numbered work index, a short
about, and a contact footer. Built with Astro (static), TypeScript and SCSS.

## Run it

```sh
nvm use            # Node 22 (see .nvmrc)
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + static build into dist/
npm run preview    # serve dist/ locally
```

Deploys to Netlify as-is (`netlify.toml`).

## Where things live

| Path | What |
| --- | --- |
| `src/content/site.ts` | All copy: name, tagline, facts, about, experience, capabilities, contact |
| `src/content/projects.ts` | The four live sites: copy, stack, links, screenshot and brand colours |
| `src/styles/_tokens.scss` | Design tokens and the light / dark / custom palettes |
| `src/styles/global.scss` | Fonts, base styles, reveals, text mode, motion switch, view transitions |
| `src/components/` | Header (name + settings), Hero, Work (+ ProjectDialog), About, Contact, StatusBar |
| `src/scripts/settings.ts` | Theme / Motion / Images settings, persistence and the circular theme wipe |
| `src/scripts/color.ts` / `picker.ts` | The custom colour picker: hex ↔ HSV maths, colour area, hue strip and hex field |
| `src/scripts/accent.ts` | Derives the custom theme's accent pair and ink from the picked colour (OKLCH, contrast-solved) |
| `src/scripts/motion/` | One rAF ticker, Lenis smooth scroll, and the `data-speed` / `data-drift` parallax |
| `src/scripts/flow/` | The drifting work carousel, its WebGL water + cursor lighting, and the overlay morph |
| `src/scripts/cursor.ts` | Open line-arrow cursor in the accent colour and the text glow (strength: `--cursor-glow` in `_tokens.scss`) |
| `src/scripts/about.ts` | Scroll-inked statement, experience cursor card, capabilities marquee (four constant-speed lines, plus category filters that slide each line's matching group to the middle of the screen) |
| `scripts/images.mjs` | Crops `media-source/*` into the 16:10 screenshots and 4:5 portrait |

## Updating screenshots

Drop a new capture (ideally 1440×900) into `media-source/`, then run
`npm run images`. Astro generates AVIF / WebP sizes at build time.

## Interaction notes

- **Settings** (header): Theme opens a panel with Light, Dark and Custom.
  Custom shows a built-in picker (no native colour input, so it looks the
  same in every browser): a saturation/brightness area, a hue strip and a hex
  field. Any colour is allowed. The area is a keyboard slider (arrows 1%,
  Shift 10%), the hue strip a native range input.
  Every option swaps CSS tokens on `<html>`. For a picked colour,
  `accent.ts` derives a split-complementary accent (emerald hue for
  near-greys): a mark colour at 3:1 and a text colour at 4.5:1 on the same
  hue, plus ink and muted ink solved to 4.5:1. The panel shows the result. Choices persist in `localStorage` and are
  applied by an inline script before first paint.
- **Images ( N )**: text mode. Screenshots become each project's brand swatch.
- **Motion ( N )**: also follows `prefers-reduced-motion` until changed.
- **Work row**: an endless carousel that drifts, rides a wave, can be dragged
  (page scrolling doesn't move it). With WebGL2 the thumbnails are drawn as water:
  a constant swell, a bow and colour split when moving fast, and a cursor
  "lamp" whose reflection and ripples play across the cards. Without WebGL a
  CSS highlight follows the cursor instead.
- **Cards** open a native `<dialog>`; the screenshot morphs into the overlay
  with a shared-element view transition (plain fade as a fallback).
- **Parallax**: add `data-speed="0.9"` (and optionally `data-drift`,
  `data-anchor="top"` or `"bottom"`) to any element; `data-parallax-img` slides an image
  inside its frame.
- **Motion ( N )** turns off Lenis, parallax, the drift, the water and the
  marquee; the work row becomes a plain sideways scroller.

## Checks at handover

- `astro check`: 0 errors, 0 warnings
- Lighthouse (mobile and desktop): 100 / 100 / 100 / 100
- axe-core (WCAG 2.2 AA + best practice): 0 violations in light, dark and
  custom themes, with images on and off, and with each project overlay open
