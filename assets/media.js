'use strict';
(() => {
  // Video posters load only as the films come near the screen, so they don't weigh on first load.
  const films = [...document.querySelectorAll('video[data-poster]')];
  const dress = v => { v.poster = v.dataset.poster; };
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { dress(e.target); near.unobserve(e.target); } });
    }, { rootMargin: '900px 0px' });
    films.forEach(v => near.observe(v));
  } else films.forEach(dress);

  // Quiet fade as frames and sections scroll into view. Without IntersectionObserver everything simply shows.
  const rise = [...document.querySelectorAll('.frames li, .stills li, .clips li, .reel-meta, .media-quote, .kit, .kit-team')];
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    rise.forEach(el => { el.classList.add('rise'); io.observe(el); });
  }

  // Photo viewer: a native <dialog>, so Esc closes it and the page behind is inert.
  const shots = [...document.querySelectorAll('a.shot')];
  const box = document.getElementById('lightbox');
  if (!shots.length || !box || typeof box.showModal !== 'function') return; // links still open the photo
  const img = box.querySelector('.lb-stage img');
  const cap = box.querySelector('.lb-cap');
  const count = box.querySelector('.lb-count');
  let at = 0;
  let opener = null;

  const show = n => {
    at = (n + shots.length) % shots.length;
    const a = shots[at];
    img.src = a.href;
    img.alt = a.querySelector('img').alt;
    cap.textContent = a.dataset.caption || '';
    count.textContent = `${at + 1} / ${shots.length}`;
    new Image().src = shots[(at + 1) % shots.length].href; // warm the next one
  };

  shots.forEach((a, n) => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    opener = a;
    show(n);
    box.showModal();
  }));
  box.querySelector('.lb-prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(at + 1));
  box.querySelector('.lb-close').addEventListener('click', () => box.close());
  box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lb-stage')) box.close(); });
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });
  box.addEventListener('close', () => {
    img.removeAttribute('src');
    if (opener) opener.focus();
  });
})();
