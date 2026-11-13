const form = document.querySelector('#book-form');
const status = document.querySelector('#book-status');
const endpoint = 'https://formspree.io/f/xyewgjbp';

function setStatus(message) {
  if (status) status.textContent = message;
}

if (form) {
  form.addEventListener('submit', async event => {
    if (!window.fetch) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    setStatus('Sending your inquiry…');
    try {
      const data = new FormData(form);
      data.delete('_next');
      const email = String(form.elements.email?.value || '').trim();
      const name = String(form.elements.name?.value || '').trim();
      if (email) data.set('_replyto', email);
      data.set('_subject', name ? `Catering inquiry from ${name}` : 'Pancake Boys catering inquiry');
      const response = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        window.location.href = 'thanks/';
        return;
      }
      setStatus('Something went wrong sending that. Email pancak3boys@gmail.com and we will write back.');
    } catch {
      setStatus('We could not send that just now. Email pancak3boys@gmail.com and we will write back.');
    }
    if (button) button.disabled = false;
  });
}
