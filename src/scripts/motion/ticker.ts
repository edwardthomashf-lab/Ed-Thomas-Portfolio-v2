/**
 * One requestAnimationFrame loop for everything that moves: smooth scroll,
 * parallax, the work carousel, the WebGL water and the marquee. Subscribers
 * get the frame time, the delta since the last frame, and the scroll velocity
 * (px per frame, smoothed), so effects can react to how fast you scroll.
 */

export interface Frame {
  /** ms since page load */
  time: number;
  /** ms since the previous frame, clamped so a background tab doesn't jump */
  delta: number;
  /** Current scroll position, from Lenis when it is running. */
  scroll: number;
  /** Smoothed scroll velocity in px/frame; positive when scrolling down. */
  velocity: number;
}

type Callback = (frame: Frame) => void;

const subscribers = new Set<Callback>();
let rafId = 0;
let last = 0;
let lastScroll = scrollY;
let velocity = 0;
let scrollSource: (() => number) | null = null;

/** Lenis registers itself here so everyone reads the same, smoothed position. */
export function setScrollSource(source: (() => number) | null): void {
  scrollSource = source;
}

export function currentScroll(): number {
  return scrollSource ? scrollSource() : scrollY;
}

export function currentVelocity(): number {
  return velocity;
}

function loop(now: number): void {
  const delta = Math.min(now - (last || now), 64);
  last = now;
  const scroll = currentScroll();
  const raw = scroll - lastScroll;
  lastScroll = scroll;
  // Normalise to a 60fps frame so effects feel the same on 120Hz screens.
  const perFrame = delta > 0 ? (raw * 16.67) / delta : 0;
  velocity += (perFrame - velocity) * 0.18;
  if (Math.abs(velocity) < 0.001) velocity = 0;

  const frame: Frame = { time: now, delta, scroll, velocity };
  subscribers.forEach((cb) => cb(frame));
  rafId = subscribers.size ? requestAnimationFrame(loop) : 0;
}

export function onFrame(cb: Callback): () => void {
  subscribers.add(cb);
  if (!rafId) {
    last = 0;
    rafId = requestAnimationFrame(loop);
  }
  return () => {
    subscribers.delete(cb);
  };
}

export const motionOn = (): boolean => document.documentElement.dataset.motion === 'on';
