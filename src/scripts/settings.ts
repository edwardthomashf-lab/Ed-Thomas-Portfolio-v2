/**
 * Display settings: theme, motion and images. Each one is a data attribute on
 * <html> that swaps a set of CSS tokens, so the whole page re-themes without
 * touching a single component. Choices persist in localStorage; the inline
 * script in Base.astro applies them before first paint.
 */

import { accentFor, inkFor } from './accent';

export type Theme = 'light' | 'dark' | 'custom';
export type OnOff = 'on' | 'off';

export interface Settings {
  theme: Theme;
  pick: string;
  tone: 'light' | 'dark';
  /** Derived from the pick (see accent.ts): marks at 3:1, text at 4.5:1. */
  accent: string;
  accentText: string;
  /** Ink and muted ink, solved for contrast on the pick. */
  ink: string;
  muted: string;
  motion: OnOff;
  images: OnOff;
}

const KEY = 'et:settings';
const root = document.documentElement;
const DEFAULT_PICK = '#e6e1d3';

/** The last custom colour, remembered while Light or Dark is showing. */
let lastPick = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')?.pick || DEFAULT_PICK;
  } catch {
    return DEFAULT_PICK;
  }
})();

/** What is on <html> right now: the source of truth after the inline script. */
export function current(): Settings {
  return {
    theme: (root.dataset.theme as Theme) || 'light',
    pick: root.style.getPropertyValue('--pick').trim() || lastPick,
    tone: root.dataset.tone === 'dark' ? 'dark' : 'light',
    accent: root.style.getPropertyValue('--pick-accent').trim(),
    accentText: root.style.getPropertyValue('--pick-accent-text').trim(),
    ink: root.style.getPropertyValue('--pick-fg').trim(),
    muted: root.style.getPropertyValue('--pick-muted').trim(),
    motion: root.dataset.motion === 'off' ? 'off' : 'on',
    images: root.dataset.images === 'off' ? 'off' : 'on',
  };
}

function save(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private mode or storage disabled: the setting still applies for this visit.
  }
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Dark ink or light ink, whichever contrasts more with the picked colour.
 * 0.179 is where black and white text give the same contrast ratio.
 */
export function toneFor(hex: string): 'light' | 'dark' {
  return luminance(hex) > 0.179 ? 'light' : 'dark';
}

function write(settings: Settings): void {
  root.dataset.theme = settings.theme;
  root.dataset.motion = settings.motion;
  root.dataset.images = settings.images;
  if (settings.theme === 'custom') {
    root.style.setProperty('--pick', settings.pick);
    root.style.setProperty('--pick-accent', settings.accent);
    root.style.setProperty('--pick-accent-text', settings.accentText);
    root.style.setProperty('--pick-fg', settings.ink);
    root.style.setProperty('--pick-muted', settings.muted);
    root.dataset.tone = settings.tone;
  } else {
    root.style.removeProperty('--pick');
    root.style.removeProperty('--pick-accent');
    root.style.removeProperty('--pick-accent-text');
    root.style.removeProperty('--pick-fg');
    root.style.removeProperty('--pick-muted');
    delete root.dataset.tone;
  }
  const meta = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  meta.forEach((m) => (m.content = bg));
}

interface ApplyOptions {
  /** Element the circular theme wipe grows from. */
  origin?: Element | null;
  /** Skip the view transition (e.g. while dragging the colour picker). */
  instant?: boolean;
  persist?: boolean;
}

/** Apply a partial change, persist it, and tell the rest of the page. */
export function apply(patch: Partial<Settings>, options: ApplyOptions = {}): void {
  const next = { ...current(), ...patch };
  if (patch.pick) {
    next.tone = toneFor(patch.pick);
    lastPick = patch.pick;
  }
  if (next.theme === 'custom') {
    const accent = accentFor(next.pick, next.tone);
    next.accent = accent.fill;
    next.accentText = accent.text;
    const ink = inkFor(next.pick, next.tone);
    next.ink = ink.fg;
    next.muted = ink.muted;
  }

  const themeChanged =
    next.theme !== current().theme || (next.theme === 'custom' && next.pick !== current().pick);

  const commit = () => {
    write(next);
    document.dispatchEvent(new CustomEvent('settings:change', { detail: next }));
  };

  const canAnimate =
    themeChanged && !options.instant && next.motion === 'on' && 'startViewTransition' in document;

  if (canAnimate) {
    circularWipe(options.origin ?? null, commit);
  } else {
    commit();
  }

  if (options.persist !== false) save(next);
}

/** Theme change as a circle growing out of the control that caused it. */
function circularWipe(origin: Element | null, update: () => void): void {
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  root.classList.add('vt-theme');
  const transition = document.startViewTransition(update);
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 750,
          easing: 'cubic-bezier(0.83, 0, 0.17, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove('vt-theme'));
}

/** Follow the OS while the visitor hasn't chosen for themselves. */
export function watchSystem(): void {
  const hasSaved = () => {
    try {
      return Boolean(localStorage.getItem(KEY));
    } catch {
      return false;
    }
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!hasSaved()) apply({ theme: e.matches ? 'dark' : 'light' }, { persist: false });
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (!hasSaved()) apply({ motion: e.matches ? 'off' : 'on' }, { persist: false });
  });
}
