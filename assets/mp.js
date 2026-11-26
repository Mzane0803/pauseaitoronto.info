'use strict';
(() => {
  // Write to your MP. Three steps in one card: find the MP, edit the letter, send it from your own email.
  // The Toronto list in the page (House of Commons, 16 November 2026) is the authority for who the MP is.
  // Open North's Represent API is used for two things only: postal code -> riding, and the MP's email address
  // when its record names the same person as our list. Its member list lags by-elections, so it never overrides ours.
  // Where our list carries an email (taken from the MP's House of Commons page), that address is used and Represent is not asked.
  const $ = id => document.getElementById(id);
  const data = JSON.parse($('riding-data').textContent);
  const REPRESENT = 'https://represent.opennorth.ca';
  const COMMONS = 'https://www.ourcommons.ca/Members/en';
  const SUBJECT = 'Please back an international AI treaty';

  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase();
  const bySlug = new Map(data.map(r => [r.slug, r]));
  const byName = new Map();
  data.forEach(r => { byName.set(norm(r.riding), r); if (r.formerly) byName.set(norm(r.formerly), r); });

  const card = $('tool');
  const panels = { find: $('step-find'), letter: $('step-letter'), send: $('step-send'), done: $('step-done') };
  const order = ['find', 'letter', 'send', 'done'];
  const steps = [...document.querySelectorAll('.stepper li')];
  const buttons = [...document.querySelectorAll('#ridings button')];
  const postal = $('postal');
  const findStatus = $('find-status');
  const findBtn = $('find-btn');
  const listBox = $('list-box');
  const listToggle = $('list-toggle');
  const search = $('riding-search');
  const count = $('riding-count');
  const nameInput = $('sender-name');
  const subject = $('subject');
  const letter = $('letter');
  const sendStatus = $('send-status');

  let cur = null;          // { riding, mp, url, email, listed, slug }
  let senderPostal = '';   // "M5S 1A1" once a lookup succeeds
  let edited = false;      // the visitor has typed in the letter
  const drafts = new Map();

  // ---------- steps ----------
  function show(name, focus = true) {
    const at = order.indexOf(name);
    order.forEach(k => { panels[k].hidden = k !== name; });
    steps.forEach((li, i) => {
      li.classList.toggle('is-done', i < at);
      if (i === Math.min(at, 2) && at < 3) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    if (!focus) return;
    const h = panels[name].querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    const top = card.getBoundingClientRect().top;
    if (top < 80 || top > innerHeight * 0.6) {
      window.scrollTo({ top: scrollY + top - 96, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  // ---------- step 1: postal code ----------
  const clean = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const pretty = c => (c.length > 3 ? `${c.slice(0, 3)} ${c.slice(3)}` : c);
  const valid = c => /^[ABCEGHJ-NPRSTVXY][0-9][A-Z][0-9][A-Z][0-9]$/.test(c);

  postal.addEventListener('input', () => {
    const c = clean(postal.value);
    postal.value = pretty(c);
    setFind('');
  });

  function setFind(text, bad = false) {
    findStatus.textContent = text;
    findStatus.classList.toggle('is-bad', bad);
  }

  async function getJSON(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (res.status === 404) return { missing: true };
      if (!res.ok) return { down: true };
      return { body: await res.json() };
    } catch (e) {
      return { down: true };
    } finally {
      clearTimeout(timer);
    }
  }

  const commons = list => (list || []).find(x => x.representative_set_name === 'House of Commons');
  const sameMP = (rep, r) => !!(rep && r.mp && rep.email && norm(rep.name) === norm(r.mp));

  $('find-form').addEventListener('submit', async e => {
    e.preventDefault();
    const code = clean(postal.value);
    if (!valid(code)) { setFind('That doesn’t look like a Canadian postal code. It should read like M5V 2T6.', true); postal.focus(); return; }
    findBtn.setAttribute('aria-disabled', 'true');
    findBtn.textContent = 'Looking…';
    setFind('');
    const out = await getJSON(`${REPRESENT}/postcodes/${code}/`);
    findBtn.removeAttribute('aria-disabled');
    findBtn.textContent = 'Find my MP';
    if (out.missing) { setFind('We couldn’t find that postal code. Check it, or choose your riding from the list.', true); openList(); return; }
    if (out.down) { setFind('The postal code lookup isn’t answering right now. Choose your riding from the list instead.', true); openList(); return; }
    const d = out.body;
    const bounds = [...(d.boundaries_concordance || []), ...(d.boundaries_centroid || [])];
    const bound = bounds.find(b => /federal-electoral-districts-2023-representation-order/.test(b.url || ''));
    const rep = commons(d.representatives_concordance) || commons(d.representatives_centroid);
    const riding = (bound && bound.name) || (rep && rep.district_name);
    if (!riding) { setFind('We couldn’t match that postal code to a federal riding. Choose your riding from the list.', true); openList(); return; }
    senderPostal = pretty(code);
    const local = byName.get(norm(riding));
    if (local) {
      choose({ ...local, listed: true, email: local.email || (sameMP(rep, local) ? rep.email : '') });
    } else if (rep) {
      choose({ riding, mp: rep.name, url: rep.url || COMMONS, email: rep.email || '', listed: false, slug: null });
    } else {
      setFind(`Your riding is ${riding}, but we couldn’t find its MP. Look them up on the House of Commons site.`, true);
    }
  });

  // ---------- step 1, alternative: pick from the Toronto list ----------
  function openList() {
    listBox.hidden = false;
    listToggle.setAttribute('aria-expanded', 'true');
  }
  listToggle.addEventListener('click', () => {
    const open = listBox.hidden;
    listBox.hidden = !open;
    listToggle.setAttribute('aria-expanded', String(open));
    if (open) search.focus();
  });

  search.addEventListener('input', () => {
    const q = norm(search.value);
    let n = 0;
    buttons.forEach(b => {
      const r = bySlug.get(b.dataset.slug);
      const hit = !q || norm(`${r.riding} ${r.mp || 'vacant'} ${r.formerly || ''}`).includes(q);
      b.parentElement.hidden = !hit;
      if (hit) n++;
    });
    count.textContent = n ? `${n} Toronto riding${n === 1 ? '' : 's'}` : 'No match. Try another spelling, or use your postal code.';
  });

  buttons.forEach(b => b.addEventListener('click', () => {
    const r = bySlug.get(b.dataset.slug);
    choose({ ...r, listed: true, email: r.email || '' });
    findEmail(r);
  }));

  // A riding chosen from the list has no email yet. Ask Represent for it, and keep it only if it names the same MP.
  async function findEmail(r) {
    if (!r.mp || r.email) return;
    const out = await getJSON(`${REPRESENT}/representatives/house-of-commons/?district_name=${encodeURIComponent(r.formerly || r.riding)}`);
    const rep = out.body && (out.body.objects || [])[0];
    if (cur && cur.slug === r.slug && sameMP(rep, r)) {
      cur.email = rep.email;
      if (!panels.send.hidden) fillSend();
    }
  }

  // ---------- step 2: the letter ----------
  const template = (r, name, where) => `Dear ${r.mp},

I live in ${r.riding}, and I’m writing about the race to build AI systems that are more capable than people. I don’t think that race should continue before anyone can show these systems will stay under human control.

[In a sentence or two, say why this matters to you.]

Will you support Canada proposing an international treaty that prohibits the development of superintelligence until there is broad scientific consensus that it can be done safely and controllably, and strong public support? I would also welcome a short meeting to discuss what Canada can do.

Thank you,
${name || '[Your name]'}
${where || '[Your address and postal code]'}`;

  function choose(r, push = true) {
    if (cur && !panels.letter.hidden) drafts.set(cur.riding, { text: letter.value, subject: subject.value, edited });
    cur = r;
    $('mp-riding').textContent = r.riding;
    $('mp-name').textContent = r.mp || 'Seat vacant';
    $('mp-meta').textContent = !r.mp ? `No MP currently represents ${r.riding}.`
      : r.listed ? `Member of Parliament for ${r.riding}, as listed by the House of Commons on 16 November 2026.`
        : `Listed as the MP for ${r.riding} by Open North’s Represent. Confirm on the House of Commons site before you send.`;
    $('mp-vacant').hidden = !!r.mp;
    $('letter-form').hidden = !r.mp;
    [$('mp-link'), $('mp-link-2')].forEach(a => { a.href = r.url || COMMONS; });
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.slug === r.slug)));
    if (r.mp) {
      const saved = drafts.get(r.riding);
      edited = !!(saved && saved.edited);
      subject.value = saved ? saved.subject : SUBJECT;
      letter.value = saved ? saved.text : template(r, nameInput.value.trim(), senderPostal);
    }
    if (push) {
      try {
        const u = new URL(location.href);
        if (r.slug) u.searchParams.set('riding', r.slug); else u.searchParams.delete('riding');
        history.replaceState(null, '', u);
      } catch (e) { /* file:// previews */ }
    }
    show('letter', push);
  }

  nameInput.addEventListener('input', () => {
    if (!cur || !cur.mp) return;
    const name = nameInput.value.trim();
    if (!edited) letter.value = template(cur, name, senderPostal);
    else if (name && letter.value.includes('[Your name]')) letter.value = letter.value.replace('[Your name]', name);
  });
  letter.addEventListener('input', () => { edited = true; });

  $('change-btn').addEventListener('click', () => { show('find'); postal.focus(); });

  $('to-send').addEventListener('click', () => {
    const at = letter.value.indexOf('[In a sentence');
    if (at > -1 && !edited) {
      // First pass with an untouched draft: point at the line worth rewriting, once.
      edited = true;
      letter.focus();
      letter.setSelectionRange(at, letter.value.indexOf(']', at) + 1);
      $('letter-status').textContent = 'Replace the highlighted line with your own words, or delete it. Then continue.';
      return;
    }
    $('letter-status').textContent = '';
    fillSend();
    show('send');
  });

  // ---------- step 3: send ----------
  const enc = encodeURIComponent;
  function fillSend() {
    const body = letter.value.trim();
    const subj = subject.value.trim() || SUBJECT;
    const has = !!cur.email;
    $('send-lead').textContent = has
      ? 'Your letter goes from your own email address, so your MP can reply to you. Pick how you want to send it.'
      : `We don’t have a confirmed email address for ${cur.mp}. Copy the letter, then paste it into the contact form on their House of Commons page.`;
    $('send-to').hidden = !has;
    $('send-email').textContent = cur.email || '';
    $('send-mailto').hidden = $('send-gmail').hidden = $('send-outlook').hidden = !has;
    if (has) {
      $('send-mailto').href = `mailto:${cur.email}?subject=${enc(subj)}&body=${enc(body)}`;
      $('send-gmail').href = `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(cur.email)}&su=${enc(subj)}&body=${enc(body)}`;
      $('send-outlook').href = `https://outlook.live.com/mail/0/deeplink/compose?to=${enc(cur.email)}&subject=${enc(subj)}&body=${enc(body)}`;
    }
    $('copy-btn').classList.toggle('wide', !has);
    $('copy-btn').classList.toggle('pill-orange', !has);
    $('copy-btn').classList.toggle('pill-soft', has);
    sendStatus.textContent = /\[[^\]]+\]/.test(body) ? 'Your letter still has a line in [brackets]. Go back to fill it in or remove it.' : '';
  }

  async function copy(text, done) {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(text);
      sendStatus.textContent = done;
    } catch (e) {
      sendStatus.textContent = 'Copying is blocked in this browser. Go back, select the letter and copy it by hand.';
    }
  }
  $('copy-btn').addEventListener('click', () => copy(`Subject: ${subject.value.trim() || SUBJECT}\n\n${letter.value.trim()}`, 'Letter copied. Paste it into your email or the MP’s contact form.'));
  $('copy-email').addEventListener('click', () => copy(cur.email, 'Email address copied.'));
  $('back-btn').addEventListener('click', () => { show('letter'); letter.focus(); });
  $('sent-btn').addEventListener('click', () => show('done'));

  // ---------- done ----------
  $('share-btn').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}`;
    try {
      if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(url);
      $('share-status').textContent = 'Link copied.';
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      $('share-status').textContent = url;
    }
  });
  $('again-btn').addEventListener('click', () => { show('find'); postal.focus(); });

  // Deep link: ?riding=toronto-centre opens that riding's letter
  let initial = null;
  try { initial = new URL(location.href).searchParams.get('riding'); } catch (e) { /* ignore */ }
  if (initial && bySlug.has(initial)) {
    const r = bySlug.get(initial);
    choose({ ...r, listed: true, email: r.email || '' }, false);
    findEmail(r);
  }
})();
