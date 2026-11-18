import { motionOn, onFrame, type Frame } from './motion/ticker';

/**
 * The cursor: a minimal open arrowhead in the accent colour (two lines
 * meeting at the point, no body), and a soft glow that tints the text
 * underneath as if light were reflecting off it.
 *
 * - The arrow is a real system cursor with an SVG image, so it never lags and
 *   respects the OS cursor size. The images are rebuilt whenever the theme or
 *   accent changes.
 * - The glow is two fixed layers: a `lighten` (light pages) or `darken` (dark
 *   pages) gradient that only shifts ink toward the accent, and a faint halo.
 *
 * Mouse and trackpad only; touch, pen and Windows High Contrast keep the
 * system cursor. Everything here is decorative and hidden from assistive tech.
 */

const root = document.documentElement;
const INTERACTIVE =
  'a, button, label, summary, select, [role="button"], input[type="range"], input[type="radio"], input[type="checkbox"]';

/** Areas where the text glow steps aside. */
const QUIET = '.flow, .portrait__frame, .project';

// 32×32 shapes, drawn as open strokes. The point (the hotspot) is at 6,6:
// two straight edges run out from it, like the outline of an arrow with the
// body taken away.
const ARROW = 'M22 10.5 L6 6 L10.5 22';
// Over links and buttons a second, parallel chevron sits just behind the
// first, so the arrow reads as doubled.
const ECHO = 'M24.9 14.55 L10.5 10.5 L14.55 24.9';
// Drag: two open chevrons back to back, in the same line style.
const DRAG = 'M10 11 L5 16 L10 21 M22 11 L27 16 L22 21 M5 16 L27 16';

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${body}</svg>`;
const asCursor = (markup: string, x: number, y: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(markup)}") ${x} ${y}`;

/**
 * Rebuild the cursor images in the current accent. Each line is drawn twice:
 * a wider stroke in the page colour underneath keeps it legible over images
 * and text of any colour.
 */
function paintCursors(): void {
  const style = getComputedStyle(root);
  const accent = style.getPropertyValue('--accent').trim() || '#0f7b54';
  const edge = style.getPropertyValue('--bg').trim() || '#ffffff';
  const line = (d: string, width = 2) =>
    `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${width + 2.5}" stroke-linecap="square" stroke-linejoin="miter"/>` +
    `<path d="${d}" fill="none" stroke="${accent}" stroke-width="${width}" stroke-linecap="square" stroke-linejoin="miter"/>`;
  root.style.setProperty('--cursor-arrow', asCursor(svg(line(ARROW)), 6, 6));
  root.style.setProperty('--cursor-point', asCursor(svg(line(ECHO) + line(ARROW)), 6, 6));
  root.style.setProperty('--cursor-drag', asCursor(svg(line(DRAG, 1.75)), 16, 16));
}

export function initCursor(): void {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const forced = matchMedia('(forced-colors: active)').matches;
  if (!fine || forced) return;

  const tint = document.querySelector<HTMLElement>('.cursor-tint');
  const halo = document.querySelector<HTMLElement>('.cursor-halo');
  if (!tint || !halo) return;

  paintCursors();
  root.classList.add('has-cursor');
  document.addEventListener('settings:change', paintCursors);

  // State
  const mouse = { x: -400, y: -400 };
  const glow = { x: -400, y: -400 };
  let visible = false;
  let blocked = false;

  const show = (on: boolean) => {
    visible = on;
    root.classList.toggle('cursor-on', on && !blocked);
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return show(false);
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!visible) {
        // Arrive in place rather than sweeping in from the last spot.
        glow.x = mouse.x;
        glow.y = mouse.y;
        show(true);
      }
    },
    { passive: true },
  );
  root.addEventListener('mouseleave', () => show(false));
  addEventListener('blur', () => show(false));

  // Interactive targets: the glow opens up a little.
  document.addEventListener('pointerover', (e) => {
    const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
    root.classList.toggle('cursor-active', Boolean(el));
    // Over the work carousel (which has its own WebGL lighting) and the
    // portrait, the text glow would just tint the photos: let it fade out.
    const t = e.target instanceof Element ? e.target : null;
    root.classList.toggle('cursor-quiet', Boolean(t?.closest(QUIET)));
  });

  // Overlays sit in the top layer, above anything we can draw: step aside.
  const block = (on: boolean) => {
    blocked = on;
    root.classList.toggle('cursor-on', visible && !on);
  };
  document.addEventListener('overlay:open', () => block(true));
  document.addEventListener('overlay:close', () => block(false));
  document.addEventListener(
    'toggle',
    (e) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute?.('popover')) block((e as ToggleEvent).newState === 'open');
    },
    true,
  );

  onFrame(({ delta }: Frame) => {
    const dt = delta / 16.67;
    const motion = motionOn();

    // Glow: eases after the pointer (snaps with Motion off).
    const k = motion ? 1 - Math.pow(1 - 0.22, dt) : 1;
    const dx = mouse.x - glow.x;
    const dy = mouse.y - glow.y;
    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      glow.x += dx * k;
      glow.y += dy * k;
      const t = `translate3d(${glow.x.toFixed(1)}px, ${glow.y.toFixed(1)}px, 0)`;
      tint.style.transform = t;
      halo.style.transform = t;
    }

  });
}
