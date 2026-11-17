'use strict';
(() => {
  const data = JSON.parse(document.getElementById('riding-data').textContent);
  const bySlug = new Map(data.map(r => [r.slug, r]));
  const buttons = [...document.querySelectorAll('#ridings button')];
  const search = document.getElementById('riding-search');
  const count = document.getElementById('riding-count');
  const empty = document.getElementById('panel-empty');
  const panel = document.getElementById('panel-mp');
  const letterBox = document.getElementById('letter-box');
  const letter = document.getElementById('letter');
  const status = document.getElementById('copy-status');
  const draftBtn = document.getElementById('draft-btn');
  const drafts = new Map();
  let current = null;

  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();

  search.addEventListener('input', () => {
    const q = norm(search.value);
    let n = 0;
    buttons.forEach(b => {
      const r = bySlug.get(b.dataset.slug);
      const hay = norm(`${r.riding} ${r.mp || 'vacant'} ${r.formerly || ''}`);
      const hit = !q || hay.includes(q);
      b.parentElement.hidden = !hit;
      if (hit) n++;
    });
    count.textContent = n ? `${n} Toronto riding${n === 1 ? '' : 's'}` : 'No match. Try another spelling, or look it up by postal code above.';
  });

  const template = r => `Subject: Please back an international AI treaty

Dear ${r.mp},

I live in ${r.riding}, and I’m writing about the race to build AI systems that are more capable than people. I don’t think that race should continue before anyone can show these systems will stay under human control.

[In a sentence or two, say why this matters to you.]

Will you support Canada proposing an international treaty that prohibits the development of superintelligence until there is broad scientific consensus that it can be done safely and controllably, and strong public support? I would also welcome a short meeting to discuss what Canada can do.

Thank you,
[Your name]
[Your address and postal code]`;

  function select(slug, push = true) {
    const r = bySlug.get(slug);
    if (!r) return;
    if (current && !letterBox.hidden) drafts.set(current.slug, letter.value);
    current = r;
    status.textContent = '';
    empty.hidden = true;
    panel.hidden = false;
    document.getElementById('mp-riding').textContent = r.riding;
    document.getElementById('mp-name').textContent = r.mp || 'Seat vacant';
    document.getElementById('mp-desc').textContent = r.mp ? `Member of Parliament for ${r.riding}.` : `No MP currently represents ${r.riding}.`;
    document.getElementById('mp-vacant').hidden = !!r.mp;
    document.getElementById('mp-link').href = r.url;
    document.getElementById('mp-link-2').href = r.url;
    draftBtn.hidden = !r.mp;
    if (r.mp && drafts.has(r.slug)) { letter.value = drafts.get(r.slug); letterBox.hidden = false; }
    else { letterBox.hidden = true; }
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.slug === slug)));
    if (push) {
      try { const u = new URL(location.href); u.searchParams.set('riding', slug); history.replaceState(null, '', u); } catch (e) { /* file:// previews */ }
    }
  }

  buttons.forEach(b => b.addEventListener('click', () => {
    select(b.dataset.slug);
    // Show the draft straight away, so there is one less step
    if (current && current.mp && letterBox.hidden) { letter.value = drafts.get(current.slug) || template(current); drafts.set(current.slug, letter.value); letterBox.hidden = false; }
    if (matchMedia('(max-width: 1000px)').matches) {
      document.getElementById('panel').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }));

  draftBtn.addEventListener('click', () => {
    if (!current || !current.mp) return;
    letter.value = drafts.get(current.slug) || template(current);
    drafts.set(current.slug, letter.value);
    letterBox.hidden = false;
    letter.focus();
    const i = letter.value.indexOf('[In a sentence');
    if (i > -1) letter.setSelectionRange(i, letter.value.indexOf(']', i) + 1);
  });

  letter.addEventListener('input', () => { if (current) drafts.set(current.slug, letter.value); status.textContent = ''; });

  document.getElementById('copy-btn').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(letter.value);
      status.textContent = letter.value.includes('[') ? 'Copied. Remember to fill in the brackets.' : 'Copied. Paste it into your email.';
    } catch (e) {
      letter.focus(); letter.select();
      status.textContent = 'Selected. Press Ctrl+C or ⌘C to copy.';
    }
  });

  const initial = new URL(location.href).searchParams.get('riding');
  if (initial) select(initial, false);
})();
