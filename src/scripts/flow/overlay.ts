import { motionOn } from '../motion/ticker';

/**
 * Opening a project grows the clicked card's screenshot into the overlay
 * with a shared-element view transition; closing reverses it into the same
 * card (it may be a copy further along the flowing row). Browsers without
 * view transitions, or visitors with Motion off, get a plain fade.
 */
const NAME = 'project-media';
const root = document.documentElement;

const canMorph = () => 'startViewTransition' in document && motionOn();
const mediaIn = (el: Element | null) => el?.querySelector<HTMLElement>('[data-media]') ?? null;

function isOnScreen(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

/** Wait (briefly) for the overlay image so the morph never lands on a blank frame. */
async function ready(dialog: HTMLDialogElement) {
  const img = dialog.querySelector('img');
  if (!img || root.dataset.images === 'off') return;
  img.loading = 'eager';
  await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
}

export function initOverlay(): void {
  /** Which card opened each dialog, so focus and the morph return to it. */
  const openers = new WeakMap<HTMLDialogElement, HTMLElement>();

  async function open(button: HTMLElement) {
    const id = button.dataset.open!;
    const dialog = document.getElementById(`project-${id}`) as HTMLDialogElement | null;
    if (!dialog || dialog.open) return;
    openers.set(dialog, button);
    document.dispatchEvent(new CustomEvent('overlay:open'));

    const from = mediaIn(button);
    const to = mediaIn(dialog);
    if (!canMorph() || !from || !to) {
      dialog.showModal();
      return;
    }

    await ready(dialog);
    from.classList.add('is-morph');
    from.style.viewTransitionName = NAME;
    const transition = document.startViewTransition(() => {
      from.style.viewTransitionName = '';
      to.style.viewTransitionName = NAME;
      dialog.showModal();
      dialog.scrollTop = 0;
    });
    transition.finished.finally(() => {
      to.style.viewTransitionName = '';
      from.classList.remove('is-morph');
    });
  }

  function close(dialog: HTMLDialogElement) {
    if (!dialog.open) return;
    const opener = openers.get(dialog);
    const from = mediaIn(dialog);
    const to = mediaIn(opener ?? null);

    if (!canMorph() || !from || !to || !isOnScreen(to)) {
      dialog.close();
      return;
    }

    to.classList.add('is-morph');
    from.style.viewTransitionName = NAME;
    const transition = document.startViewTransition(() => {
      from.style.viewTransitionName = '';
      to.style.viewTransitionName = NAME;
      dialog.close();
    });
    transition.finished.finally(() => {
      to.style.viewTransitionName = '';
      to.classList.remove('is-morph');
    });
  }

  document.querySelectorAll<HTMLElement>('[data-open]').forEach((button) => {
    const dialog = document.getElementById(`project-${button.dataset.open}`) as HTMLDialogElement | null;
    const warm = () => dialog?.querySelectorAll('img').forEach((img) => (img.loading = 'eager'));
    button.addEventListener('pointerenter', warm, { once: true });
    button.addEventListener('focus', warm, { once: true });
    button.addEventListener('click', () => open(button));
  });

  document.querySelectorAll<HTMLDialogElement>('dialog.project').forEach((dialog) => {
    // Escape runs the animated close rather than the instant native one.
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      close(dialog);
    });
    dialog.querySelector('[data-close]')?.addEventListener('click', () => close(dialog));
    // A click on the backdrop lands on the <dialog> itself.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close(dialog);
    });
    dialog.addEventListener('close', () => {
      openers.get(dialog)?.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('overlay:close'));
    });
  });
}
