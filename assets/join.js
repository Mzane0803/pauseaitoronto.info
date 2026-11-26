'use strict';
(() => {
  // Join form.
  // If the form has a data-endpoint (any service that accepts a JSON POST and answers 2xx), answers are sent there.
  // With no endpoint, the form opens a pre-filled email to the organising team in the visitor's own mail app,
  // so it works with no server and no third party. Set the endpoint in join.html to switch.
  const form = document.getElementById('join-form');
  if (!form) return;
  const endpoint = (form.dataset.endpoint || '').trim();
  const inbox = form.dataset.inbox;
  const status = document.getElementById('join-status');
  const go = document.getElementById('join-go');
  const how = document.getElementById('join-how');
  const done = document.getElementById('join-done');
  const doneLead = document.getElementById('join-done-lead');
  const mailBox = document.getElementById('join-mail');

  if (endpoint) how.textContent = 'Your answers go to the PauseAI Toronto organising team and nowhere else.';

  const read = () => {
    const f = new FormData(form);
    return {
      name: String(f.get('name') || '').trim(),
      email: String(f.get('email') || '').trim(),
      postal: String(f.get('postal') || '').trim(),
      interests: f.getAll('interests').map(String),
      note: String(f.get('note') || '').trim(),
      updates: f.get('updates') === 'yes',
    };
  };

  const asText = a => [
    `Name: ${a.name}`,
    `Email: ${a.email}`,
    a.postal ? `Postal code or neighbourhood: ${a.postal}` : '',
    `I'd like to: ${a.interests.length ? a.interests.join(', ') : 'not sure yet'}`,
    `Email me about events and actions: ${a.updates ? 'yes' : 'no'}`,
    a.note ? `\n${a.note}` : '',
  ].filter(Boolean).join('\n');

  function finish(a, mailed) {
    form.hidden = true;
    done.hidden = false;
    doneLead.textContent = mailed
      ? `Thanks, ${a.name.split(' ')[0]}. An email to our team should have opened in your mail app. Press send there and you’re in.`
      : `Thanks, ${a.name.split(' ')[0]}. We’ve got your details and someone from the team will be in touch.`;
    mailBox.hidden = !mailed;
    if (mailed) document.getElementById('join-text').textContent = asText(a);
    const h = done.querySelector('h2');
    h.setAttribute('tabindex', '-1');
    h.focus();
  }

  const mailto = a => `mailto:${inbox}?subject=${encodeURIComponent(`Join PauseAI Toronto: ${a.name}`)}&body=${encodeURIComponent(asText(a))}`;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (form.elements.website && form.elements.website.value) return; // bots fill the hidden field
    const a = read();
    if (!endpoint) {
      location.href = mailto(a);
      finish(a, true);
      return;
    }
    go.setAttribute('aria-disabled', 'true');
    go.textContent = 'Sending…';
    status.textContent = '';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...a, interests: a.interests.join(', '), _subject: `Join PauseAI Toronto: ${a.name}`, source: 'pauseaitoronto.info/join' }),
      });
      if (!res.ok) throw new Error(String(res.status));
      finish(a, false);
    } catch (err) {
      go.removeAttribute('aria-disabled');
      go.textContent = 'Join PauseAI Toronto';
      status.textContent = 'That didn’t go through. Try again, or ';
      const link = document.createElement('a');
      link.href = mailto(a);
      link.textContent = 'send it by email instead';
      status.append(link, '.');
    }
  });

  const copyBtn = document.getElementById('join-copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const out = document.getElementById('join-copy-status');
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(document.getElementById('join-text').textContent);
      out.textContent = `Copied. Paste it into an email to ${inbox}.`;
    } catch (e) {
      out.textContent = `Select the text above and email it to ${inbox}.`;
    }
  });
})();
