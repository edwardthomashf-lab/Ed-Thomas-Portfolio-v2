import { motionOn, onFrame, type Frame } from './ticker';

/**
 * Scroll parallax: different layers of the page travel at different speeds.
 *
 *   data-speed="0.85"   vertical speed relative to the page (1 = normal,
 *                       < 1 lags behind, > 1 runs ahead)
 *   data-drift="-0.2"   horizontal travel per pixel scrolled
 *   data-anchor="top"   measure from the top of the page instead of from the
 *                       viewport centre, so first-screen elements start at
 *                       rest exactly where the layout put them
 *   data-anchor="bottom" the same from the end of the page, so the last
 *                       screen comes to rest exactly as laid out
 *   data-parallax-img   on a frame: its image slides inside the mask
 *
 * Transforms use the individual `translate` property, so they compose with
 * any `transform` animation or hover already on the element.
 *
 * Strength depends on the layout. On phones (one column) any speed difference
 * between stacked blocks makes them collide, so only the top-anchored name
 * and image-in-frame parallax run there; drift is desktop-only. Travel is
 * capped so neighbours can never close the gap between them.
 */

interface Layer {
  el: HTMLElement;
  speed: number;
  drift: number;
  anchor: 'top' | 'bottom' | 'centre';
  /** Natural (untransformed) document position. */
  y: number;
  h: number;
}

interface Mask {
  el: HTMLElement;
  img: HTMLElement;
  y: number;
  h: number;
}

const MAX = 140;
/** Bottom-anchored layers sit near the page's end; keep their travel small. */
const MAX_BOTTOM = 56;
let layers: Layer[] = [];
let masks: Mask[] = [];
let vh = innerHeight;
let maxScroll = 0;
/** 0 on phones, 0.6 on tablets, 1 on desktop. */
let strength = 1;
let driftOn = true;

/** Document offset ignoring transforms: offsetTop walks the layout, not paint. */
function docTop(el: HTMLElement): number {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

function measure(): void {
  vh = innerHeight;
  strength = innerWidth < 720 ? 0 : innerWidth < 1024 ? 0.6 : 1;
  driftOn = innerWidth >= 1024;
  maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
  layers = [...document.querySelectorAll<HTMLElement>('[data-speed], [data-drift]')].map((el) => ({
    el,
    speed: Number(el.dataset.speed ?? 1),
    drift: Number(el.dataset.drift ?? 0),
    anchor: el.dataset.anchor === 'top' || el.dataset.anchor === 'bottom' ? el.dataset.anchor : 'centre',
    y: docTop(el),
    h: el.offsetHeight,
  }));
  masks = [...document.querySelectorAll<HTMLElement>('[data-parallax-img]')].flatMap((el) => {
    const img = el.querySelector<HTMLElement>('img');
    return img ? [{ el, img, y: docTop(el), h: el.offsetHeight }] : [];
  });
}

function reset(): void {
  layers.forEach((l) => (l.el.style.translate = ''));
  masks.forEach((m) => (m.img.style.translate = ''));
}

const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));

function update({ scroll }: Frame): void {
  if (!motionOn()) return;
  const centre = scroll + vh / 2;

  for (const l of layers) {
    // Skip layers far off screen; they'll be correct before they arrive.
    if (l.y + l.h < scroll - vh || l.y > scroll + vh * 2) continue;
    let x: number;
    let y: number;
    const drift = driftOn ? l.drift : 0;
    if (l.anchor === 'top') {
      // The landing screen lifting away: runs everywhere (it only moves up and
      // out), but is capped like the rest.
      // Lifting faster than the page always moves away from what's below; lagging
      // behind closes the gap, so that follows the layout's strength.
      y = l.speed > 1 ? clamp(scroll * (1 - l.speed), MAX * 2) : clamp(scroll * (1 - l.speed) * strength, MAX * 0.5);
      x = clamp(scroll * drift, MAX);
    } else if (l.anchor === 'bottom') {
      // Distance still to scroll: zero offset once the page bottoms out.
      const left = Math.max(0, maxScroll - scroll);
      y = clamp(-left * (1 - l.speed) * strength, MAX_BOTTOM);
      x = clamp(-left * drift, MAX_BOTTOM);
    } else {
      const travel = centre - (l.y + l.h / 2);
      y = clamp(travel * (1 - l.speed) * strength, MAX * 0.5);
      x = clamp(travel * drift, MAX);
    }
    l.el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
  }

  for (const m of masks) {
    if (m.y + m.h < scroll - 100 || m.y > scroll + vh + 100) continue;
    // -1 as the frame enters at the bottom, +1 as it leaves at the top.
    const p = clamp((centre - (m.y + m.h / 2)) / (vh / 2 + m.h / 2), 1);
    m.img.style.translate = `0 ${(p * 6).toFixed(3)}%`;
  }
}

export function initParallax(): void {
  measure();
  // Fonts and images change heights; re-measure whenever layout settles.
  document.fonts?.ready.then(measure);
  addEventListener('load', measure);
  let t = 0;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = window.setTimeout(measure, 120);
  }).observe(document.body);

  onFrame(update);
  document.addEventListener('settings:change', () => {
    if (!motionOn()) reset();
  });
}
