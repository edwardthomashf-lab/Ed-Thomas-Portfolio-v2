import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { motionOn, onFrame, setScrollSource } from './ticker';

/**
 * Lenis smooth scrolling, the weighted "glide" most of the Awwwards
 * portfolios share. It only runs while Motion is on, and pauses while a
 * project overlay is open so the page underneath stays put.
 */
let lenis: Lenis | null = null;
let stopFrame: (() => void) | null = null;

function start(): void {
  if (lenis) return;
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.95,
    anchors: { offset: -16 },
    // The visitor's Motion setting already decides this (it defaults to the
    // OS preference), so a deliberate "Motion: Y" is respected.
    respectReducedMotion: false,
  });
  const instance = lenis;
  setScrollSource(() => instance.animatedScroll);
  stopFrame = onFrame(({ time }) => instance.raf(time));
}

function stop(): void {
  stopFrame?.();
  stopFrame = null;
  lenis?.destroy();
  lenis = null;
  setScrollSource(null);
}

export function initSmoothScroll(): void {
  const sync = () => (motionOn() ? start() : stop());
  sync();
  document.addEventListener('settings:change', sync);

  // Freeze the page behind a modal; resume when it closes.
  document.addEventListener('overlay:open', () => lenis?.stop());
  document.addEventListener('overlay:close', () => lenis?.start());
}

/**
 * Bring an element fully into view, centred in the space above the status
 * bar. Uses Lenis when it's running so the glide matches the rest of the
 * page; otherwise a native scroll. Does nothing if it's already in view.
 */
export function scrollToElement(el: HTMLElement): void {
  const statusBar = 44;
  const room = innerHeight - statusBar;
  const r = el.getBoundingClientRect();
  if (r.top >= 8 && r.bottom <= room - 8) return;
  const offset = -Math.max(8, (room - r.height) / 2);
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.1 });
  } else {
    window.scrollTo({ top: r.top + scrollY + offset, behavior: motionOn() ? 'smooth' : 'auto' });
  }
}
