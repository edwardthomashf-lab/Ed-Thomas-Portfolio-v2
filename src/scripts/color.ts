/**
 * Colour conversions for the custom picker: hex ↔ RGB ↔ HSV. Plain maths, no
 * library. HSV is used because its square (saturation × brightness) plus a hue
 * strip reaches every one of the 16.7 million sRGB colours, and every colour
 * maps back onto it exactly.
 */

/** Channels 0..255. */
export type RGB = [number, number, number];
/** Hue 0..360, saturation and value 0..1. */
export interface HSV {
  h: number;
  s: number;
  v: number;
}

/**
 * Accepts `1F2A44`, `#1f2a44`, `abc` or `#abc` (surrounding spaces ignored).
 * Returns the normalised lowercase `#rrggbb`, or null if it isn't a colour.
 */
export function normaliseHex(input: string): string | null {
  let n = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(n)) n = [...n].map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(n) ? `#${n.toLowerCase()}` : null;
}

export function hexToRgb(hex: string): RGB {
  const n = (normaliseHex(hex) ?? '#000000').slice(1);
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as RGB;
}

export function rgbToHex(rgb: RGB): string {
  return `#${rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;
}

export function rgbToHsv([r, g, b]: RGB): HSV {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  let h = 0;
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255].map(Math.round) as RGB;
}

export const hsvToHex = (hsv: HSV) => rgbToHex(hsvToRgb(hsv));

/**
 * HSV for a hex value. Greys and black have no hue of their own, so the
 * caller's current hue (and saturation, for black) is kept: dragging to grey
 * never snaps the hue strip back to red.
 */
export function hexToHsv(hex: string, keep?: HSV): HSV {
  const hsv = rgbToHsv(hexToRgb(hex));
  if (keep && hsv.s === 0) hsv.h = keep.h;
  if (keep && hsv.v === 0) {
    hsv.h = keep.h;
    hsv.s = keep.s;
  }
  return hsv;
}

const NAMES: [number, string][] = [
  [15, 'red'],
  [45, 'orange'],
  [70, 'yellow'],
  [160, 'green'],
  [200, 'cyan'],
  [255, 'blue'],
  [290, 'purple'],
  [335, 'pink'],
  [360, 'red'],
];

/** A plain-language name for a hue, for screen-reader value text. */
export function hueName(h: number): string {
  return NAMES.find(([limit]) => h < limit)?.[1] ?? 'red';
}
