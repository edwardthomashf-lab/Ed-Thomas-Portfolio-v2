import { apply, current } from './settings';
import { hexToHsv, hsvToHex, hueName, normaliseHex, type HSV } from './color';

/**
 * The custom colour picker: a saturation × brightness area and a hue strip,
 * plus a hex field. Replaces the browser's native colour input so it looks
 * the same in every browser and sits inside the Theme panel.
 *
 * Accessibility
 * - Area: one focusable `role="slider"` announcing "Saturation 40%,
 *   brightness 70%". Arrows move 1% (Shift: 10%); left/right change
 *   saturation, up/down brightness.
 * - Hue: a native range input, so keyboard, touch and screen readers work
 *   without extra code; its value text names the hue ("220°, blue").
 * - Hex: a labelled text field; invalid input is flagged with a hint, and
 *   Escape restores the last valid colour.
 *
 * Dragging previews the theme live (at most once per frame); the choice is
 * saved when the drag ends or a typed hex is complete.
 */
export function initPicker(root: HTMLElement): void {
  const area = root.querySelector<HTMLElement>('[data-picker-area]')!;
  const handle = root.querySelector<HTMLElement>('[data-picker-handle]')!;
  const hue = root.querySelector<HTMLInputElement>('[data-picker-hue]')!;
  const hex = root.querySelector<HTMLInputElement>('[data-picker-hex]')!;
  const hint = root.querySelector<HTMLElement>('[data-picker-hint]')!;

  let hsv: HSV = hexToHsv(current().pick);
  /** The hex this picker last applied, so its own updates don't echo back. */
  let applied = hsvToHex(hsv);

  // Paint the controls from the current HSV.
  function render(syncHex = true) {
    const colour = hsvToHex(hsv);
    root.style.setProperty('--picker-hue', `hsl(${Math.round(hsv.h)} 100% 50%)`);
    root.style.setProperty('--picker-colour', colour);
    handle.style.left = `${(hsv.s * 100).toFixed(2)}%`;
    handle.style.top = `${((1 - hsv.v) * 100).toFixed(2)}%`;

    const sat = Math.round(hsv.s * 100);
    const bright = Math.round(hsv.v * 100);
    area.setAttribute('aria-valuenow', String(sat));
    area.setAttribute('aria-valuetext', `Saturation ${sat}%, brightness ${bright}%`);

    hue.value = String(Math.round(hsv.h));
    hue.setAttribute('aria-valuetext', `${Math.round(hsv.h)}°, ${hueName(hsv.h)}`);

    if (syncHex) {
      hex.value = colour.slice(1).toUpperCase();
      setInvalid(false);
    }
  }

  function setInvalid(invalid: boolean) {
    hex.setAttribute('aria-invalid', String(invalid));
    hint.hidden = !invalid;
  }

  // Apply to the page: previews are throttled to one per frame.
  let frame = 0;
  function preview() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      applied = hsvToHex(hsv);
      apply({ theme: 'custom', pick: applied }, { instant: true, persist: false });
    });
  }

  function commit() {
    cancelAnimationFrame(frame);
    frame = 0;
    applied = hsvToHex(hsv);
    apply({ theme: 'custom', pick: applied }, { instant: true });
  }

  // Area: pointer
  function fromPointer(e: PointerEvent) {
    const r = area.getBoundingClientRect();
    hsv.s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    hsv.v = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    render();
    preview();
  }

  let dragging = false;
  area.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    area.setPointerCapture(e.pointerId);
    area.focus({ preventScroll: true });
    fromPointer(e);
  });
  area.addEventListener('pointermove', (e) => dragging && fromPointer(e));
  const end = () => {
    if (!dragging) return;
    dragging = false;
    commit();
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
  area.addEventListener('lostpointercapture', end);

  // Area: keyboard
  area.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    hsv.s = Math.max(0, Math.min(1, hsv.s + move[0]));
    hsv.v = Math.max(0, Math.min(1, hsv.v + move[1]));
    render();
    preview();
  });
  area.addEventListener('keyup', (e) => e.key.startsWith('Arrow') && commit());

  // Hue strip
  hue.addEventListener('input', () => {
    hsv.h = Number(hue.value);
    render();
    preview();
  });
  hue.addEventListener('change', commit);

  // Hex field
  hex.addEventListener('input', () => {
    // The field already shows a '#', so drop any typed or pasted one.
    if (hex.value.includes('#')) hex.value = hex.value.replace(/#/g, '');
    const value = normaliseHex(hex.value);
    if (!value) {
      // Only complain once the entry is long enough to be judged.
      const digits = hex.value.trim();
      setInvalid(digits.length >= 6 || /[^0-9a-f\s]/i.test(digits));
      return;
    }
    hsv = hexToHsv(value, hsv);
    render(false);
    setInvalid(false);
    commit();
  });

  const restore = () => render(true);
  hex.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!normaliseHex(hex.value)) setInvalid(true);
      else restore();
    }
    // Escape puts the last valid colour back (and only then closes the panel).
    if (e.key === 'Escape' && normaliseHex(hex.value) !== hsvToHex(hsv)) {
      e.preventDefault();
      e.stopPropagation();
      restore();
    }
  });
  hex.addEventListener('blur', () => {
    if (!normaliseHex(hex.value)) restore();
  });

  // Follow changes made elsewhere (e.g. a saved colour loading, or a reset).
  document.addEventListener('settings:change', () => {
    const s = current();
    if (s.theme !== 'custom' || s.pick === applied) return;
    applied = s.pick;
    hsv = hexToHsv(s.pick, hsv);
    render();
  });

  render();
}
