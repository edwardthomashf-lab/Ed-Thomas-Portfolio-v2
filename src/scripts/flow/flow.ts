import { motionOn, onFrame, type Frame } from '../motion/ticker';
import { Water, type WaterItem } from './water';

/**
 * The work row: an endless, drifting line of projects that floats like it's
 * on water.
 *
 * - It drifts on its own at a constant pace; page scrolling doesn't affect
 *   it. It can be dragged (mouse, pen or a sideways swipe) or pushed with a
 *   sideways wheel.
 * - Each card rides a slow wave tied to where it is across the screen, so the
 *   row undulates as it travels.
 * - Hovering a card nearly stops the current so it's easy to click.
 * - When WebGL2 is available the thumbnails are redrawn as a liquid surface
 *   lit by the cursor (see water.ts); otherwise a CSS highlight follows it.
 */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function initFlow(): void {
  const flow = document.querySelector<HTMLElement>('[data-flow]');
  if (!flow) return;
  const track = flow.querySelector<HTMLElement>('[data-flow-track]')!;
  const canvas = flow.querySelector<HTMLCanvasElement>('[data-flow-gl]')!;
  const items = [...flow.querySelectorAll<HTMLElement>('[data-flow-item]')];
  const floats = items.map((i) => i.querySelector<HTMLElement>('[data-float]')!);
  const medias = items.map((i) => i.querySelector<HTMLElement>('[data-media]')!);
  const indexOf = items.map((i) => Number(i.dataset.index));
  const originals = items.filter((i) => !i.hasAttribute('data-clone')).length;
  const progress = document.querySelector<HTMLElement>('[data-flow-progress]');
  const current = document.querySelector<HTMLElement>('[data-flow-current]');
  const root = document.documentElement;

  // Layout, measured without transforms.
  let setWidth = 0;
  let flowWidth = 0;
  let lefts: number[] = [];
  let widths: number[] = [];
  function measure() {
    flowWidth = flow!.clientWidth;
    lefts = items.map((i) => i.offsetLeft);
    widths = items.map((i) => i.offsetWidth);
    setWidth = lefts[originals] - lefts[0];
    water?.resize();
  }

  // Motion state
  let offset = 0;
  let vel = 0;
  let visible = false;
  let paused = false;
  let hoverIndex = -1;
  let focusIndex = -1;
  let pointer: { x: number; y: number } | null = null;
  let light = 0;
  const hovers = new Float32Array(items.length);

  // Drag state
  let down = false;
  let dragging = false;
  let startX = 0;
  let lastX = 0;
  let suppressClick = false;

  // WebGL
  let water: Water | null = null;
  let glTried = false;
  const glItems: WaterItem[] = items.map((el, i) => ({
    el: medias[i],
    tex: indexOf[i],
    hover: 0,
    seed: indexOf[i] * 1.7 + (el.hasAttribute('data-clone') ? 0.6 : 0),
  }));

  const imagesOn = () => root.dataset.images !== 'off';
  const glActive = () => Boolean(water && !water.lost && motionOn() && imagesOn());
  const isDark = () =>
    root.dataset.theme === 'dark' || (root.dataset.theme === 'custom' && root.dataset.tone === 'dark');

  function syncGlClasses() {
    const on = glActive();
    flow!.classList.toggle('is-gl', on);
    medias.forEach((m, i) => m.classList.toggle('is-gl', on && Boolean(water?.hasTexture(indexOf[i]))));
    if (!on) water?.clear();
  }

  async function startWater() {
    if (glTried || !motionOn() || !imagesOn()) return;
    glTried = true;
    try {
      water = new Water(canvas, originals);
    } catch {
      water = null;
      return;
    }
    water.resize();
    // One texture per project, taken from the first card's own image.
    await Promise.all(
      medias.slice(0, originals).map(async (media, i) => {
        const img = media.querySelector('img');
        if (!img) return;
        img.loading = 'eager';
        try {
          await img.decode();
        } catch {
          await new Promise((r) => img.addEventListener('load', r, { once: true }));
        }
        water?.setTexture(i, img);
        syncGlClasses();
      }),
    );
  }

  function resetStatic() {
    track.style.transform = '';
    floats.forEach((f) => (f.style.translate = ''));
    flow!.style.removeProperty('--skew');
    syncGlClasses();
  }

  function frame(f: Frame) {
    if (!motionOn() || !visible || paused || !setWidth) return;
    const dt = f.delta / 16.67;
    const slow = hoverIndex >= 0 || focusIndex >= 0;
    const drift = -0.6 * (slow ? 0.08 : 1);

    if (!dragging) {
      vel += (drift - vel) * Math.min(1, 0.055 * dt);
      offset += vel * dt;
    }
    // Wrap into (-setWidth, 0] so the loop never shows a seam.
    offset = ((offset % setWidth) - setWidth) % setWidth;
    track.style.transform = `translate3d(${offset.toFixed(2)}px,0,0)`;

    // Ride the wave: height depends on where the card is across the screen.
    const t = f.time / 1000;
    const amp = clamp(flowWidth * 0.011, 8, 18);
    let nearest = 0;
    let nearestD = Infinity;
    for (let i = 0; i < items.length; i++) {
      const cx = lefts[i] + widths[i] / 2 + offset;
      const phase = (cx / flowWidth) * Math.PI * 1.6 + t * 0.75 + indexOf[i] * 0.4;
      floats[i].style.translate = `0 ${(Math.sin(phase) * amp).toFixed(2)}px`;
      const d = Math.abs(cx - flowWidth / 2);
      if (d < nearestD) {
        nearestD = d;
        nearest = indexOf[i];
      }
    }

    if (progress) progress.style.transform = `translateX(${((-offset / setWidth) * 300).toFixed(2)}%)`;
    if (current) {
      const label = String(nearest + 1).padStart(2, '0');
      if (current.textContent !== label) current.textContent = label;
    }

    // Normalised travel speed for the water: positive bows the plane right.
    const speed = clamp(-vel / 14, -1, 1);

    if (glActive()) {
      light += ((pointer ? 1 : 0) - light) * Math.min(1, 0.08 * dt);
      for (let i = 0; i < items.length; i++) {
        hovers[i] += ((i === hoverIndex ? 1 : 0) - hovers[i]) * Math.min(1, 0.09 * dt);
        glItems[i].hover = hovers[i];
      }
      water!.render(glItems, { time: f.time, velocity: speed, pointer, light, dark: isDark() });
    } else {
      // CSS fallback: lean the cards into fast movement.
      flow!.style.setProperty('--skew', `${(speed * -2.5).toFixed(2)}deg`);
    }
  }

  // Pointer: light position, hover, drag.
  flow.addEventListener('pointermove', (e) => {
    const r = flow.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (hoverIndex >= 0 && !glActive()) {
      const m = medias[hoverIndex].getBoundingClientRect();
      medias[hoverIndex].style.setProperty('--mx', `${((e.clientX - m.left) / m.width) * 100}%`);
      medias[hoverIndex].style.setProperty('--my', `${((e.clientY - m.top) / m.height) * 100}%`);
    }
    if (!down || !motionOn()) return;
    if (!dragging && Math.abs(e.clientX - startX) > 6) {
      dragging = true;
      flow.setPointerCapture(e.pointerId);
      flow.classList.add('is-dragging');
    }
    if (dragging) {
      const dx = e.clientX - lastX;
      offset += dx;
      vel = dx;
    }
    lastX = e.clientX;
  });

  flow.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    down = true;
    startX = lastX = e.clientX;
  });

  const release = () => {
    if (dragging) suppressClick = true;
    down = false;
    dragging = false;
    flow.classList.remove('is-dragging');
  };
  flow.addEventListener('pointerup', release);
  flow.addEventListener('pointercancel', release);
  flow.addEventListener('pointerleave', () => (pointer = null));

  // A drag that ends over a card must not open it.
  flow.addEventListener(
    'click',
    (e) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );

  // Sideways wheel / trackpad swipes push the current.
  flow.addEventListener(
    'wheel',
    (e) => {
      if (!motionOn() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      offset -= e.deltaX;
      vel = clamp(-e.deltaX * 0.4, -30, 30);
    },
    { passive: false },
  );

  items.forEach((item, i) => {
    const card = item.querySelector<HTMLElement>('.card')!;
    card.addEventListener('pointerenter', () => {
      hoverIndex = i;
      medias[i].style.setProperty('--sheen', '1');
    });
    card.addEventListener('pointerleave', () => {
      if (hoverIndex === i) hoverIndex = -1;
      medias[i].style.setProperty('--sheen', '0');
    });
    // Keyboard: hold the row still and bring the focused card into view.
    card.addEventListener('focus', () => {
      focusIndex = i;
      if (!motionOn()) return;
      const r = item.getBoundingClientRect();
      const f = flow.getBoundingClientRect();
      const margin = 24;
      if (r.left < f.left + margin) offset += f.left + margin - r.left;
      else if (r.right > f.right - margin) offset -= r.right - (f.right - margin);
    });
    card.addEventListener('blur', () => {
      if (focusIndex === i) focusIndex = -1;
    });
  });

  // Only animate while the row is near the screen; build WebGL lazily.
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startWater();
    },
    { rootMargin: '25% 0px' },
  ).observe(flow);

  new ResizeObserver(measure).observe(flow);
  document.fonts?.ready.then(measure);
  measure();

  document.addEventListener('overlay:open', () => (paused = true));
  document.addEventListener('overlay:close', () => {
    paused = false;
    hoverIndex = -1;
  });
  document.addEventListener('settings:change', () => {
    if (!motionOn()) resetStatic();
    else {
      measure();
      startWater();
    }
    syncGlClasses();
  });

  onFrame(frame);
}
