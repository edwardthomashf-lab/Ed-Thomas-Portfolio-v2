import { motionOn, onFrame } from './motion/ticker';
import { scrollToElement } from './motion/smooth';

/**
 * The About section's three moving parts:
 *
 * - Ink: the statement's words darken from muted to full ink as it scrolls
 *   through the viewport, and each chip pops in as the reading reaches it.
 * - Peek: over the experience rows, a small card trails the cursor with the
 *   role's summary and tools.
 * - Marquee: four lines of capabilities glide at a constant pace in
 *   alternating directions, independent of scrolling; hovering a line slows it.
 *   Selecting a category slides every line so its group of that category sits
 *   in the middle of the screen (shrinking a line slightly if the group would
 *   be wider than the screen), lights the matches in the accent and holds
 *   there until the category is cleared.
 */
export function initAbout(): void {
  // Ink
  const statement = document.querySelector<HTMLElement>('[data-ink]');
  const pieces = statement ? [...statement.querySelectorAll<HTMLElement>('.w, .chip')] : [];
  const last = new Float32Array(pieces.length).fill(-1);

  function ink(vh: number) {
    if (!statement) return;
    const r = statement.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 2) return;
    // 0 as the statement's top reaches 85% of the screen, 1 as its bottom passes 45%.
    const p = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
    const lit = p * pieces.length * 1.08;
    pieces.forEach((el, i) => {
      const v = Math.max(0, Math.min(1, lit - i));
      if (Math.abs(v - last[i]) < 0.004) return;
      last[i] = v;
      if (el.classList.contains('chip')) el.style.setProperty('--pop', String(Math.min(1, v * 1.6)));
      else el.style.setProperty('--ink', v.toFixed(3));
    });
  }

  function clearInk() {
    pieces.forEach((el) => {
      el.style.removeProperty('--ink');
      el.style.removeProperty('--pop');
    });
    last.fill(-1);
  }

  // Odometer windows: a strip of 0-9 is as wide as its widest digit, which
  // leaves a "1" floating in space. Size each window to its final digit.
  const sizeDigits = () =>
    document.querySelectorAll<HTMLElement>('.odo__digit').forEach((digit) => {
      const strip = digit.firstElementChild as HTMLElement | null;
      const d = Number(strip?.style.getPropertyValue('--d') || 0);
      const glyph = strip?.children[d] as HTMLElement | undefined;
      if (glyph) digit.style.width = `${glyph.getBoundingClientRect().width}px`;
    });
  document.fonts?.ready.then(sizeDigits);
  addEventListener('resize', sizeDigits);

  // Peek
  const roles = document.querySelector<HTMLElement>('[data-roles]');
  const peek = document.querySelector<HTMLElement>('[data-peek]');
  const cards = peek ? [...peek.querySelectorAll<HTMLElement>('[data-peek-card]')] : [];
  let target = { x: 0, y: 0 };
  const pos = { x: 0, y: 0 };
  let peeking = false;

  if (roles && peek && matchMedia('(hover: hover)').matches) {
    roles.querySelectorAll<HTMLElement>('[data-role]').forEach((row) => {
      row.addEventListener('pointerenter', (e) => {
        cards.forEach((c) => c.classList.toggle('is-active', c.dataset.peekCard === row.dataset.role));
        if (!peeking) {
          // Start from the cursor rather than flying in from the last spot.
          pos.x = target.x = e.clientX;
          pos.y = target.y = e.clientY;
        }
        peeking = true;
        peek.classList.add('is-on');
      });
    });
    roles.addEventListener('pointermove', (e) => (target = { x: e.clientX, y: e.clientY }));
    roles.addEventListener('pointerleave', () => {
      peeking = false;
      peek.classList.remove('is-on');
    });
  }

  function trail(dt: number) {
    if (!peek || !peeking) return;
    const k = motionOn() ? Math.min(1, 0.16 * dt) : 1;
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    const w = peek.offsetWidth;
    const h = peek.offsetHeight;
    // Sit below-right of the cursor, flipping at the screen edges.
    const x = pos.x + 24 + w > innerWidth ? pos.x - w - 24 : pos.x + 24;
    const y = pos.y + 24 + h > innerHeight - 50 ? pos.y - h - 16 : pos.y + 24;
    peek.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }

  // Marquee
  interface Tween {
    fromX: number;
    toX: number;
    fromS: number;
    toS: number;
    t0: number;
    dur: number;
  }
  const rows = [...document.querySelectorAll<HTMLElement>('[data-marquee]')].map((row) => ({
    row,
    inner: row.querySelector<HTMLElement>('[data-marquee-inner]')!,
    /** Items in the first copy: used to measure where each category's group sits. */
    items: [...row.querySelectorAll<HTMLElement>('[data-copy="0"] .marquee__item')],
    dir: Number(row.dataset.marquee),
    x: 0,
    width: 0,
    slow: 1,
    scale: 1,
    hover: false,
    anim: null as Tween | null,
  }));
  const measureRows = () => rows.forEach((r) => (r.width = r.inner.scrollWidth / 2));
  rows.forEach((r) => {
    r.row.addEventListener('pointerenter', () => (r.hover = true));
    r.row.addEventListener('pointerleave', () => (r.hover = false));
  });
  measureRows();
  document.fonts?.ready.then(measureRows);

  /** Wrap into (-width, 0] so the doubled line never shows a seam. */
  const wrapX = (x: number, w: number) => ((x % w) - w) % w;
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  // Category filter
  const wrap = document.querySelector<HTMLElement>('[data-marquee-wrap]');
  const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-cap-filter]')];
  const status = document.querySelector<HTMLElement>('[data-caps-status]');
  const allItems = wrap ? [...wrap.querySelectorAll<HTMLElement>('.marquee__item')] : [];
  let active: string | null = null;

  /** Where a line should stop, and how far to shrink it, to centre its group. */
  function targetFor(r: (typeof rows)[number]) {
    const matches = r.items.filter((i) => i.dataset.cat === active);
    if (!matches.length || !r.width) return { x: r.x, s: 1 };
    const first = matches[0];
    const last = matches[matches.length - 1];
    const left = first.offsetLeft;
    const right = last.offsetLeft + last.offsetWidth;
    const rowW = r.row.clientWidth;
    // Shortest way round the loop to put the group's centre mid-screen.
    let delta = wrapX(rowW / 2 - (left + right) / 2 - r.x, r.width);
    if (delta < -r.width / 2) delta += r.width;
    const room = rowW - 2 * (8 + rowW * 0.03);
    return { x: r.x + delta, s: Math.min(1, room / (right - left)) };
  }

  function retarget(dur = 850) {
    if (!motionOn()) return;
    const now = performance.now();
    rows.forEach((r) => {
      if (!r.width) return;
      const t = active ? targetFor(r) : { x: r.x, s: 1 };
      r.anim = { fromX: r.x, toX: t.x, fromS: r.scale, toS: t.s, t0: now, dur };
      // Coming off a filter, ease back up to the usual pace.
      if (!active) r.slow = 0;
    });
  }

  function select(id: string) {
    active = active === id ? null : id;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.capFilter === active)));
    wrap?.classList.toggle('is-filtered', Boolean(active));
    allItems.forEach((i) => i.classList.toggle('is-match', i.dataset.cat === active));
    if (status) {
      const button = filters.find((b) => b.dataset.capFilter === active);
      const names = rows.flatMap((r) => r.items.filter((i) => i.dataset.cat === active).map((i) => i.textContent));
      status.textContent = active ? `${button?.textContent?.trim()}: ${names.join(', ')}.` : 'Showing all capabilities.';
    }
    if (active && wrap) scrollToElement(wrap);
    retarget();
  }
  filters.forEach((b) => b.addEventListener('click', () => select(b.dataset.capFilter!)));

  addEventListener('resize', () => {
    measureRows();
    if (active) retarget(300);
  });

  function slide(dt: number) {
    const now = performance.now();
    for (const r of rows) {
      if (!r.width) continue;
      if (r.anim) {
        const p = Math.min(1, (now - r.anim.t0) / r.anim.dur);
        const e = ease(p);
        r.x = r.anim.fromX + (r.anim.toX - r.anim.fromX) * e;
        r.scale = r.anim.fromS + (r.anim.toS - r.anim.fromS) * e;
        if (p >= 1) {
          r.anim = null;
          r.x = wrapX(r.x, r.width);
        }
      } else if (active) {
        continue; // holding on the selected category
      } else {
        const rect = r.row.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) continue;
        r.slow += ((r.hover ? 0.2 : 1) - r.slow) * Math.min(1, 0.08 * dt);
        r.x = wrapX(r.x + r.dir * 0.55 * r.slow * dt, r.width);
      }
      r.inner.style.transform = `translate3d(${wrapX(r.x, r.width).toFixed(2)}px,0,0)`;
      r.row.style.scale = r.scale < 0.999 ? r.scale.toFixed(4) : '';
    }
  }

  onFrame((f) => {
    if (!motionOn()) return;
    const dt = f.delta / 16.67;
    ink(innerHeight);
    trail(dt);
    slide(dt);
  });

  document.addEventListener('settings:change', () => {
    if (motionOn()) {
      measureRows();
      if (active) retarget(0);
      return;
    }
    clearInk();
    rows.forEach((r) => {
      r.anim = null;
      r.scale = 1;
      r.inner.style.transform = '';
      r.row.style.scale = '';
    });
  });

  // Peek still follows instantly with Motion off.
  roles?.addEventListener('pointermove', () => {
    if (!motionOn()) trail(1);
  });

}
