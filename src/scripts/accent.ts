/**
 * Derives the accent for a visitor-picked page colour, standing in for the
 * emerald the fixed Light and Dark themes use.
 *
 * 1. Read the pick in OKLCH (perceptual lightness, chroma, hue).
 * 2. Hue: split-complementary, 150° either side of the pick, keeping the side
 *    that can hold more colour. Near-grey picks have no hue to work from, so
 *    they fall back to the brand emerald's hue.
 * 3. Chroma: the pick's own, nudged up, kept between 0.09 and 0.16 so the
 *    accent reads as a colour even on a muted page.
 * 4. Lightness: walked away from the page (darker on light pages, lighter on
 *    dark ones) until it reaches the contrast target, stopping at the first
 *    step that passes so it stays as vivid as possible. Out-of-gamut colours
 *    lose chroma until the screen can show them.
 *
 * Two values come out, like the fixed Dark theme's pair:
 * - `fill` (dots, rules, underlines): 3:1, WCAG's bar for non-text marks.
 *   On mid-tone pages this is what keeps the accent a real colour.
 * - `text` (accent text, the accent card): 4.5:1, WCAG AA for text, on the
 *   same hue.
 */

export interface Accent {
  fill: string;
  text: string;
  /** Contrast ratios against the picked page colour. */
  fillRatio: number;
  textRatio: number;
}

type Vec3 = [number, number, number];

const EMERALD_HUE = 162;
const NEUTRAL_CHROMA = 0.03;
const FILL_TARGET = 3;
const TEXT_TARGET = 4.5;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex: string): Vec3 | null {
  let n = hex.trim().replace('#', '');
  if (n.length === 3) n = [...n].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(n)) return null;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as Vec3;
}

function toHex(rgb: Vec3): string {
  return (
    '#' +
    rgb
      .map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** WCAG relative luminance of gamma-encoded sRGB. */
export function relativeLuminance([r, g, b]: Vec3): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrast(a: Vec3, b: Vec3): number {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** sRGB (gamma) → OKLCH, hue in degrees. */
function toOklch([r, g, b]: Vec3): Vec3 {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), (h + 360) % 360];
}

/** OKLCH → linear sRGB (may fall outside 0..1 when out of gamut). */
function oklchToLinear([L, C, H]: Vec3): Vec3 {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: Vec3) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** The displayable colour at (L, H) with the most chroma up to `C`. */
function mapToGamut(L: number, C: number, H: number): { rgb: Vec3; chroma: number } {
  let c = C;
  let lin = oklchToLinear([L, c, H]);
  while (!inGamut(lin) && c > 0) {
    c = Math.max(0, c - 0.004);
    lin = oklchToLinear([L, c, H]);
  }
  return { rgb: lin.map(toGamma) as Vec3, chroma: c };
}

interface Candidate {
  rgb: Vec3;
  chroma: number;
  ratio: number;
  hue: number;
}

/** Walk lightness away from the page until the colour passes `target`. */
function solve(
  bg: Vec3,
  startL: number,
  chroma: number,
  hue: number,
  darken: boolean,
  target: number,
): Candidate | null {
  for (let i = 0; i <= 100; i++) {
    const L = darken ? startL - i * 0.01 : startL + i * 0.01;
    if (L < 0 || L > 1) break;
    const { rgb, chroma: c } = mapToGamut(L, chroma, hue);
    const ratio = contrast(rgb, bg);
    if (ratio >= target) return { rgb, chroma: c, ratio, hue };
  }
  return null;
}

export function accentFor(pickHex: string, tone: 'light' | 'dark'): Accent {
  const bg = parseHex(pickHex) ?? [0.9, 0.88, 0.83];
  const [L, C, H] = toOklch(bg);
  const darken = tone === 'light';
  const chroma = Math.max(0.09, Math.min(0.16, C + 0.05));
  // Start a step away from the page so the walk is short and stays vivid.
  const startL = darken ? Math.min(L, 0.78) : Math.max(L, 0.45);

  const hues = C < NEUTRAL_CHROMA ? [EMERALD_HUE] : [(H + 150) % 360, (H + 210) % 360];

  const muddy = (h: number) => darken && h >= 85 && h <= 125;
  const score = (c: Candidate) => c.chroma - (muddy(c.hue) ? 0.06 : 0);

  // The hue is chosen on the fill (the colour people mostly see), then the
  // text value is solved on the same hue so the pair always matches.
  const fill = hues
    .map((h) => solve(bg, startL, chroma, h, darken, FILL_TARGET))
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => score(b) - score(a))[0];
  const text = fill ? solve(bg, startL, chroma, fill.hue, darken, TEXT_TARGET) : null;

  // Last resort (shouldn't happen: pure black or white always passes).
  const ink: Vec3 = darken ? [0, 0, 0] : [1, 1, 1];
  const f = fill ?? { rgb: ink, ratio: contrast(ink, bg) };
  const t = text ?? { rgb: ink, ratio: contrast(ink, bg) };
  return { fill: toHex(f.rgb), text: toHex(t.rgb), fillRatio: f.ratio, textRatio: t.ratio };
}

export interface Ink {
  fg: string;
  muted: string;
}

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => a.map((v, i) => v + (b[i] - v) * t) as Vec3;

/**
 * Text colours for a picked page. The house inks (#141414 / #f3f2ee) are used
 * when they reach 7:1, otherwise pure black or white. Muted text is the ink
 * eased toward the page as far as it can go while keeping 4.5:1, measured
 * against the darker hover surface too (the page mixed 12% toward the ink).
 */
export function inkFor(pickHex: string, tone: 'light' | 'dark'): Ink {
  const bg = parseHex(pickHex) ?? [0.9, 0.88, 0.83];
  const house = parseHex(tone === 'light' ? '#141414' : '#f3f2ee')!;
  const pure: Vec3 = tone === 'light' ? [0, 0, 0] : [1, 1, 1];
  const fg = contrast(house, bg) >= 7 ? house : pure;
  const hover = mix(bg, fg, 0.12);
  let muted = fg;
  for (let t = 0.6; t >= 0; t -= 0.02) {
    const candidate = mix(fg, bg, t);
    if (Math.min(contrast(candidate, bg), contrast(candidate, hover)) >= TEXT_TARGET) {
      muted = candidate;
      break;
    }
  }
  return { fg: toHex(fg), muted: toHex(muted) };
}
