const config = window.PANCAKE_BOYS || {};
const header = document.querySelector('.header');
const main = document.querySelector('main');
const footer = document.querySelector('footer');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('#menu-dialog');
const menuToggle = document.querySelector('.menu-toggle');
const dialogStates = new WeakMap();
const motion = new Set();

// One-line Formspree swap: set this to your form URL (e.g. 'https://formspree.io/f/xxxxxxxx')
// to POST the inquiry instead of opening a prefilled email.
const FORM_ENDPOINT = 'https://formspree.io/f/xyewgjbp';
const FORM_EMAIL = 'pancak3boys@gmail.com';

function animate(element, frames, options) {
  if (reducedMotion.matches || !element?.animate) return null;
  const animation = element.animate(frames, options);
  motion.add(animation);
  animation.finished.catch(() => {}).finally(() => motion.delete(animation));
  return animation;
}

function openDialog(dialog, trigger) {
  if (!dialog || dialog.open) return;
  header.classList.remove('is-hidden');
  dialogStates.set(dialog, { trigger: trigger || document.activeElement, closing: false });
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  if (main) main.inert = true;
  if (footer) footer.inert = true;
  header.inert = true;
  if (dialog === menu) {
    menuToggle.setAttribute('aria-expanded', 'true');
    animate(menu, [{ opacity: .8, transform: 'translateY(-32px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
    menu.querySelectorAll('nav a').forEach((link, index) => animate(link,
      [{ opacity: .35, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 360, delay: 70 + index * 55, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  }
}

function closeDialog(dialog, afterClose) {
  const state = dialogStates.get(dialog);
  if (!dialog?.open || state?.closing) return;
  state.closing = true;
  state.afterClose = afterClose;
  if (dialog === menu) {
    menu.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    const exit = animate(menu, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
    if (exit) {
      exit.finished.then(() => {
        if (dialogStates.get(dialog) === state && dialog.open) dialog.close();
        exit.cancel();
      }, () => {});
      return;
    }
  }
  dialog.close();
}

if (menuToggle && menu) {
  menuToggle.addEventListener('click', e => openDialog(menu, e.currentTarget));
}

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]')?.addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].filter(element =>
      element.tabIndex >= 0 && !element.disabled && !element.closest('[inert]') && element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    dialog.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    document.body.classList.remove('dialog-open');
    if (main) main.inert = false;
    if (footer) footer.inert = false;
    header.inert = false;
    menuToggle?.setAttribute('aria-expanded', 'false');
    const state = dialogStates.get(dialog);
    if (state?.afterClose) state.afterClose();
    else state?.trigger?.focus({ preventScroll: true });
  });
});

document.querySelectorAll('#menu-dialog nav a').forEach(link => link.addEventListener('click', e => {
  const href = link.getAttribute('href') || '';
  if (!href.startsWith('#') || href.length < 2) return;
  const target = document.querySelector(href);
  if (!target) return;
  e.preventDefault();
  closeDialog(menu, () => {
    history.replaceState(null, '', href);
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
}));

let lastScrollY = Math.max(0, window.scrollY), scrollTravel = 0, scrollFrame = null;
function updateHeader() {
  scrollFrame = null;
  const position = Math.max(0, window.scrollY), delta = position - lastScrollY;
  if (Math.sign(delta) !== Math.sign(scrollTravel)) scrollTravel = 0;
  scrollTravel += delta;
  if (position < 140 || menu?.open || header.contains(document.activeElement)) header.classList.remove('is-hidden');
  else if (scrollTravel > 20) header.classList.add('is-hidden');
  else if (scrollTravel < -12) header.classList.remove('is-hidden');
  lastScrollY = position;
}
window.addEventListener('scroll', () => { if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateHeader); }, { passive: true });
header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

function safeUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
if (config.instagramUrl && safeUrl(config.instagramUrl)) {
  document.querySelectorAll('.instagram-link').forEach(link => {
    link.href = safeUrl(config.instagramUrl);
    link.target = '_blank';
    link.rel = 'noopener';
    link.hidden = false;
  });
}

function fieldValue(form, name) {
  const field = form.elements.namedItem(name);
  if (!field) return '';
  if (field instanceof RadioNodeList) {
    const picked = [...field].find(input => input.checked);
    return (picked?.value || '').trim();
  }
  return String(field.value || '').trim();
}

function buildInquiryMailto(form) {
  const data = {
    name: fieldValue(form, 'name'),
    email: fieldValue(form, 'email'),
    phone: fieldValue(form, 'phone'),
    organization: fieldValue(form, 'organization'),
    event_type: fieldValue(form, 'event_type'),
    date: fieldValue(form, 'date'),
    location: fieldValue(form, 'location'),
    headcount: fieldValue(form, 'headcount'),
    setting: fieldValue(form, 'setting'),
    notes: fieldValue(form, 'notes')
  };
  const lines = [
    'Catering inquiry from the Pancake Boys website',
    '',
    `Name: ${data.name || '—'}`,
    `Email: ${data.email || '—'}`,
    `Phone: ${data.phone || '—'}`,
    `Organization: ${data.organization || '—'}`,
    `Event type: ${data.event_type || '—'}`,
    `Date: ${data.date || '—'}`,
    `Location: ${data.location || '—'}`,
    `Approximate headcount: ${data.headcount || '—'}`,
    `Indoor / outdoor: ${data.setting || '—'}`,
    '',
    'Notes:',
    data.notes || '—'
  ];
  const subject = data.name ? `Catering inquiry from ${data.name}` : 'Catering inquiry';
  let body = lines.join('\n');
  let url = `mailto:${FORM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (url.length > 1800 && data.notes) {
    const keep = Math.max(80, data.notes.length - Math.ceil((url.length - 1800) / 3));
    body = lines.slice(0, -1).concat([`${data.notes.slice(0, keep)}…`]).join('\n');
    url = `mailto:${FORM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return url;
}

const form = document.querySelector('#catering-form');
const formStatus = document.querySelector('#form-status');
function setStatus(message, state) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.dataset.state = state || '';
}
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!FORM_ENDPOINT) {
      setStatus('Opening your email app with the inquiry filled in…');
      window.location.href = buildInquiryMailto(form);
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    setStatus('Sending your inquiry…', 'sending');
    try {
      const data = new FormData(form);
      const email = fieldValue(form, 'email');
      if (email) data.set('_replyto', email);
      const name = fieldValue(form, 'name');
      data.set('_subject', name ? `Catering inquiry from ${name}` : 'Pancake Boys catering inquiry');
      const response = await fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (response.ok) {
        form.reset();
        setStatus("Thanks! Your inquiry is in. We'll get back to you soon with a quote.", 'success');
      } else {
        let message = '';
        try {
          const result = await response.json();
          message = (result.errors || []).map(error => error.message).filter(Boolean).join(' ');
        } catch {}
        setStatus(`${message || 'Something went wrong sending your inquiry.'} You can also email us at ${FORM_EMAIL}.`, 'error');
      }
    } catch {
      setStatus(`We couldn't send that right now. Please email us at ${FORM_EMAIL}.`, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  });
}

window.PANCAKE_CATERING_FORM = { FORM_ENDPOINT, FORM_EMAIL, buildInquiryMailto };

if (footer && 'IntersectionObserver' in window) {
  const footerObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      footerObserver.unobserve(entry.target);
      footer.classList.add('motion-entered');
      animate(footer.querySelector('.footer-wordmark'),
        [{ opacity: .65, transform: 'translateY(15px)' }, { opacity: 1, transform: 'none' }],
        { duration: 560, delay: 100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    }
  }, { threshold: .25 });
  footerObserver.observe(footer);
}
