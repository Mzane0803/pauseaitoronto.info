'use strict';
// Monthly / one-off giving. Each choice opens a Stripe-hosted checkout page.
(() => {
  const el = document.getElementById('giver');
  const data = JSON.parse(document.getElementById('give-data').textContent);
  if (!el || !data) return;
  const tabs = [...el.querySelectorAll('.tab')];
  const chips = document.getElementById('amounts');
  const btn = document.getElementById('give-btn');
  const state = { mode: location.hash === '#once' ? 'once' : 'monthly', amount: { monthly: 25, once: 50 } };

  const hrefFor = (mode, amt) => mode === 'monthly'
    ? data.monthly[amt]
    : (amt === 'other' ? data.once : `${data.once}?prefilled_amount=${amt * 100}`);

  const render = () => {
    const { mode } = state; const amt = state.amount[mode];
    tabs.forEach(t => { const on = t.dataset.mode === mode; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    const list = mode === 'monthly' ? Object.keys(data.monthly).map(Number) : [...data.onceAmounts, 'other'];
    chips.innerHTML = ''; chips.style.setProperty('--cols', mode === 'monthly' ? 3 : 4);
    list.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-amt'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(a === amt));
      b.textContent = a === 'other' ? 'Other' : `C$${a}`;
      b.addEventListener('click', () => { state.amount[mode] = a; render(); });
      chips.appendChild(b);
    });
    btn.href = hrefFor(mode, amt);
    btn.textContent = mode === 'monthly' ? `Donate C$${amt} a month` : (amt === 'other' ? 'Choose your own amount' : `Donate C$${amt}`);
  };
  tabs.forEach(t => t.addEventListener('click', () => { state.mode = t.dataset.mode; render(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    state.mode = state.mode === 'monthly' ? 'once' : 'monthly'; render();
    tabs.find(t => t.dataset.mode === state.mode).focus();
  });
  addEventListener('hashchange', () => { if (location.hash === '#once' || location.hash === '#monthly') { state.mode = location.hash.slice(1); render(); } });
  render();

  // Donor wall: show the empty note only while the list is empty
  const list = document.getElementById('donor-list'); const empty = document.getElementById('donors-empty');
  if (list && empty) empty.hidden = list.children.length > 0;
})();
