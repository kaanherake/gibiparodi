(() => {
  'use strict';
  const config = window.GIBIPARODI_CONTACT || {};
  const active = config.enabled === true && /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(config.endpoint || '');
  const preview = new URLSearchParams(window.location.search).get('iletisim-onizleme') === '1';
  const area = document.getElementById('contact-area');
  const dialog = document.getElementById('contact-dialog');
  const open = document.getElementById('contact-open');
  const close = document.getElementById('contact-close');
  const form = document.getElementById('contact-form');
  const send = document.getElementById('contact-send');
  const status = document.getElementById('contact-status');
  const topic = document.getElementById('contact-topic');
  const email = document.getElementById('contact-email');
  if (!active && !preview) return;
  if (typeof dialog.showModal !== 'function') return;
  area.hidden = false;
  document.getElementById('contact-preview-note').hidden = active;
  send.disabled = !active;
  let busy = false;
  let previousOverflow = '';
  open.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    open.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  function setReplyRequirement() {
    email.required = topic.value === 'İş birliği';
    document.getElementById('contact-email-note').textContent = email.required ? '· geri dönüş için gerekli' : '· yanıt istiyorsan';
  }
  topic.addEventListener('change', setReplyRequirement);
  setReplyRequirement();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!active) { status.textContent = 'Önizleme: Mesaj gönderimi henüz etkin değil.'; return; }
    if (busy || !form.reportValidity()) return;
    if (form.elements._gotcha.value) { status.textContent = 'Mesaj gönderilemedi.'; return; }
    const message = form.elements.message.value.trim();
    if (message.length < 5) { status.textContent = 'Mesajına birkaç kelime daha ekler misin?'; form.elements.message.focus(); return; }
    busy = true;
    send.disabled = true;
    send.textContent = 'Gönderiliyor…';
    status.textContent = '';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(config.endpoint, {
        method:'POST',
        headers:{'Accept':'application/json','Content-Type':'application/json'},
        credentials:'omit',
        signal:controller.signal,
        body:JSON.stringify({
          name:form.elements.name.value.trim(),
          email:email.value.trim(),
          topic:topic.value,
          message,
          _gotcha:'',
          _subject:'GibiParodi — ' + topic.value
        })
      });
      if (!response.ok) throw new Error('submission_rejected');
      const result = await response.json();
      if (result.ok !== true) throw new Error('submission_unconfirmed');
      status.textContent = 'Notun bize ulaştı. Teşekkürler!';
      form.reset();
      setReplyRequirement();
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'Bağlantı zaman aşımına uğradı; gönderimin tamamlandığını doğrulayamadık. Mesajın burada duruyor.'
        : 'Gönderim onaylanamadı. Mesajın silinmedi; bağlantını kontrol edip yeniden deneyebilirsin.';
    } finally {
      window.clearTimeout(timeout);
      busy = false;
      send.disabled = false;
      send.textContent = 'Gönder';
    }
  });
})();
