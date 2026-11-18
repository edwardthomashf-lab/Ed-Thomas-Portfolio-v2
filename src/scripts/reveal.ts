/**
 * Scroll reveals: anything marked `data-reveal` fades up (or, for
 * `data-reveal="clip"`, wipes open) the first time it enters the viewport.
 * The CSS only hides elements while `html.js[data-motion=on]`, so with motion
 * off, or before this runs, everything is simply there.
 */
export function initReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  targets.forEach((el) => observer.observe(el));
}
