'use strict';
(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('.top');
  const menu = document.querySelector('.menu');
  const nav = document.getElementById('nav');

  // Mobile menu
  const setNavTop = () => { if (header) root.style.setProperty('--nav-top', `${header.getBoundingClientRect().bottom}px`); };
  const closeMenu = () => { if (!menu) return; menu.setAttribute('aria-expanded', 'false'); body.classList.remove('nav-open'); };
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      setNavTop();
      menu.setAttribute('aria-expanded', String(open));
      body.classList.toggle('nav-open', open);
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && body.classList.contains('nav-open')) { closeMenu(); menu.focus(); } });
    matchMedia('(min-width: 941px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  }

  // Hero drawing: lines race in, then the pause bars appear
  const art = document.querySelector('.hero-art');
  if (art) {
    art.querySelectorAll('.rl').forEach((l, i) => { l.style.transitionDelay = `${i * 22}ms`; });
    requestAnimationFrame(() => requestAnimationFrame(() => art.classList.add('is-in')));
  }

  // Copy the e-Transfer address
  const copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    const input = document.getElementById('etransfer');
    const status = document.getElementById('email-status');
    copyBtn.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard) throw new Error('no clipboard');
        await navigator.clipboard.writeText(input.value);
        status.textContent = 'Copied. Open your banking app to send.';
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2400);
      } catch (e) {
        input.focus(); input.select();
        status.textContent = 'Selected. Press Ctrl+C or ⌘C to copy.';
      }
    });
  }
})();
