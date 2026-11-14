/* ==========================================================================
   Get in Touch → WhatsApp
   Validates the form, builds a neatly formatted message and opens
   https://wa.me/<number>?text=<message> (app on mobile, WhatsApp Web on desktop).
   No server needed: works on GitHub Pages.
   ========================================================================== */
import { WHATSAPP_NUMBER } from './config.js';

const MESSAGES = {
  name: 'Please tell me your name.',
  phone: 'Please enter a valid WhatsApp number, e.g. +91 98765 43210.',
  email: "That email doesn't look right. Fix it or leave it empty.",
  service: 'Please choose the service you need.',
  message: 'Please add a few more words (at least 15 characters) so I understand your project.',
};

/** Accepts Indian numbers (+91 / 91 / 0 prefix, 10 digits starting 6–9) or any +country number */
export function normalisePhone(raw) {
  const v = raw.trim().replace(/[\s\-().]/g, '');
  const digits = v.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;
  const local = digits.replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
  if (/^[6-9]\d{9}$/.test(local)) return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  if (v.startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function buildMessage(d) {
  return [
    'Hi Ranojoy! 👋 New project enquiry from your portfolio:',
    '',
    `*Name:* ${d.name}`,
    `*Phone:* ${d.phone}`,
    `*Email:* ${d.email || '-'}`,
    `*Service:* ${d.service}`,
    `*Budget:* ${d.budget || 'Not specified'}`,
    `*Deadline:* ${d.deadline || 'Flexible'}`,
    '',
    '*Project details:*',
    d.message,
  ].join('\n');
}

export function initContactForm() {
  const form = document.querySelector('.form');
  if (!form) return;
  const status = form.querySelector('.form__status');
  const submit = form.querySelector('.form__submit');
  const submitLabel = submit.querySelector('.form__submit-label');
  const defaultLabel = submitLabel.textContent;
  let attempted = false;

  const fields = {
    name: form.elements.name,
    phone: form.elements.phone,
    email: form.elements.email,
    service: form.elements.service,
    message: form.elements.message,
  };

  const rules = {
    name: (v) => v.trim().length >= 2,
    phone: (v) => normalisePhone(v) !== null,
    email: (v) => !v.trim() || isEmail(v.trim()),
    service: (v) => v !== '',
    message: (v) => v.trim().length >= 15,
  };

  function setError(key, show) {
    const input = fields[key];
    const wrap = input.closest('.field');
    const err = wrap.querySelector('.field__error');
    wrap.classList.toggle('has-error', show);
    input.setAttribute('aria-invalid', String(show));
    err.textContent = show ? MESSAGES[key] : '';
  }

  const validateField = (key) => {
    const ok = rules[key](fields[key].value);
    setError(key, !ok);
    return ok;
  };

  // Validate live only after the first submit attempt (less shouting at people)
  Object.keys(fields).forEach((key) => {
    const ev = fields[key].tagName === 'SELECT' ? 'change' : 'input';
    fields[key].addEventListener(ev, () => { if (attempted) validateField(key); });
    fields[key].addEventListener('blur', () => { if (attempted || fields[key].value) validateField(key); });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    attempted = true;
    status.className = 'form__status';
    status.textContent = '';

    // Honeypot: bots fill hidden fields. Pretend success, send nothing.
    if (form.elements.website.value) { status.textContent = 'Thanks!'; return; }

    const invalid = Object.keys(fields).filter((k) => !validateField(k));
    if (invalid.length) {
      status.textContent = `Please check ${invalid.length === 1 ? '1 field' : `${invalid.length} fields`} above.`;
      fields[invalid[0]].focus();
      return;
    }

    const data = {
      name: fields.name.value.trim(),
      phone: normalisePhone(fields.phone.value),
      email: fields.email.value.trim(),
      service: fields.service.value,
      budget: form.elements.budget.value,
      deadline: form.elements.deadline.value.trim(),
      message: fields.message.value.trim(),
    };
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage(data))}`;

    // Loading state
    submit.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Opening WhatsApp…';

    // Must open synchronously inside the submit event, or browsers block the popup
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else window.location.href = url;

    setTimeout(() => {
      submit.removeAttribute('aria-busy');
      submitLabel.textContent = defaultLabel;
      status.className = 'form__status is-success';
      status.innerHTML = '';
      const msg = document.createElement('span');
      msg.textContent = 'Your message is ready in WhatsApp. Just hit send ✓ ';
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = "Didn't open? Tap here.";
      status.append(msg, link);
    }, 900);
  });
}
