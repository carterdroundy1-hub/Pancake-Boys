const config = window.PANCAKE_BOYS || {};
const header = document.querySelector('.header');
const main = document.querySelector('main');
const footer = document.querySelector('footer');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('#menu-dialog');
const menuToggle = document.querySelector('.menu-toggle');
const dialogStates = new WeakMap();
const motion = new Set();
function animate(element, frames, options) {
  if (reducedMotion.matches || !element.animate) return null;
  const animation = element.animate(frames, options);
  motion.add(animation);
  animation.finished.catch(() => {}).finally(() => motion.delete(animation));
  return animation;
}
function openDialog(dialog, trigger) {
  if (dialog.open) return;
  dialogStates.set(dialog, { trigger: trigger || document.activeElement, closing: false });
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  main.inert = true;
  footer.inert = true;
  header.inert = true;
  syncHeroVideo();
  if (dialog === menu) {
    menuToggle.setAttribute('aria-expanded', 'true');
    animate(menu, [{ opacity: .25, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
    menu.querySelectorAll('nav a').forEach((link, index) => animate(link,
      [{ opacity: .35, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 280, delay: 45 + index * 35, easing: 'ease-out', fill: 'backwards' }));
  }
}
function closeDialog(dialog, afterClose) {
  const state = dialogStates.get(dialog);
  if (!dialog.open || state?.closing) return;
  state.closing = true;
  state.afterClose = afterClose;
  if (dialog === menu) {
    menu.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    const exit = animate(menu, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
    if (exit) {
      // Keep the native modal and focus trap until the panel has finished leaving.
      exit.finished.then(() => {
        if (dialogStates.get(dialog) === state && dialog.open) dialog.close();
        exit.cancel();
      }, () => {});
      return;
    }
  }
  dialog.close();
}
menuToggle.addEventListener('click', e => openDialog(menu, e.currentTarget));
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => openDialog(document.getElementById(button.dataset.dialog), button)));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => closeDialog(dialog));
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(dialog); });
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href], button, [tabindex]')].filter(element =>
      element.tabIndex >= 0 && !element.disabled && !element.closest('[inert]') && element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  });
  dialog.addEventListener('close', () => {
    dialog.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    document.body.classList.remove('dialog-open');
    main.inert = false; footer.inert = false; header.inert = false;
    menuToggle.setAttribute('aria-expanded', 'false');
    const state = dialogStates.get(dialog);
    if (state?.afterClose) state.afterClose();
    else state?.trigger?.focus({ preventScroll: true });
    syncHeroVideo();
  });
  dialog.addEventListener('click', e => { if (e.target === dialog && dialog !== menu) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(dialog); } });
});
document.querySelectorAll('#menu-dialog nav a').forEach(link => link.addEventListener('click', e => {
  e.preventDefault();
  const target = document.querySelector(link.getAttribute('href'));
  closeDialog(menu, () => {
    history.replaceState(null, '', link.getAttribute('href'));
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
  });
}));
const photos = [...document.querySelectorAll('[data-photo]')];
const photoDialog = document.querySelector('#photo-dialog');
const galleryViewport = photoDialog.querySelector('.gallery-viewport');
const track = photoDialog.querySelector('.gallery-track');
let photoIndex = 0;
function selectPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  track.style.transform = `translateX(${-photoIndex * 100}%)`;
  [...track.children].forEach((slide, i) => { slide.inert = i !== photoIndex; slide.setAttribute('aria-hidden', String(i !== photoIndex)); });
  document.querySelector('#photo-caption').textContent = photos[photoIndex].dataset.caption;
  document.querySelector('#photo-count').textContent = `${photoIndex + 1} / ${photos.length}`;
}
photos.forEach((button, index) => button.addEventListener('click', () => {
  if (!track.children.length) photos.forEach(photo => {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';
    const image = document.createElement('img');
    image.src = photo.dataset.photo; image.alt = photo.querySelector('img').alt; image.draggable = false;
    slide.append(image); track.append(slide);
  });
  photoDialog.classList.add('gallery-opening');
  selectPhoto(index);
  openDialog(photoDialog, button);
  requestAnimationFrame(() => requestAnimationFrame(() => photoDialog.classList.remove('gallery-opening')));
}));
photoDialog.querySelector('[data-gallery-prev]').addEventListener('click', () => selectPhoto(photoIndex - 1));
photoDialog.querySelector('[data-gallery-next]').addEventListener('click', () => selectPhoto(photoIndex + 1));
photoDialog.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const destinations = { ArrowLeft: photoIndex - 1, ArrowRight: photoIndex + 1, Home: 0, End: photos.length - 1 };
  if (e.key in destinations) { e.preventDefault(); selectPhoto(destinations[e.key]); }
});
let swipe = null;
galleryViewport.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' || !e.isPrimary) return;
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
  galleryViewport.setPointerCapture(e.pointerId);
});
galleryViewport.addEventListener('pointerup', e => {
  if (!swipe || swipe.id !== e.pointerId) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) selectPhoto(photoIndex + (dx < 0 ? 1 : -1));
  swipe = null;
});
galleryViewport.addEventListener('pointercancel', () => { swipe = null; });
photoDialog.addEventListener('close', () => { swipe = null; });

// Animate only when content enters the viewport. Nothing starts hidden, so
// content stays readable without JavaScript or IntersectionObserver support.
let revealObserver;
function prepareReveals() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    revealObserver.unobserve(entry.target);
    if (entry.target.dataset.revealed) return;
    entry.target.dataset.revealed = 'true';
    animate(entry.target, [{ opacity: .65, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 580, easing: 'cubic-bezier(.22,1,.36,1)' });
  }), { threshold: .12 });
  document.querySelectorAll('main h2, .story-photo, .photo-grid figure, .merch-image').forEach(element => {
    if (!element.dataset.revealed) revealObserver.observe(element);
  });
}

const video = document.querySelector('.hero-video');
const videoToggle = document.querySelector('.video-toggle');
const videoSource = typeof config.heroVideoSrc === 'string' && /^assets\/[\w./-]+\.(mp4|webm)$/i.test(config.heroVideoSrc) && !config.heroVideoSrc.split('/').includes('..') ? config.heroVideoSrc : null;
let heroVisible = true, userPaused = false, videoFailed = false;
function updateVideoControl() {
  videoToggle.setAttribute('aria-label', video.paused ? 'Play background video' : 'Pause background video');
  videoToggle.innerHTML = video.paused ? 'PLAY FILM <span aria-hidden="true">▶</span>' : 'PAUSE FILM <span aria-hidden="true">Ⅱ</span>';
}
function syncHeroVideo() {
  if (!videoSource || videoFailed || reducedMotion.matches) {
    video.pause(); video.hidden = true; videoToggle.hidden = true;
    return;
  }
  if (!video.getAttribute('src')) { video.muted = true; video.src = videoSource; }
  if (!heroVisible || document.hidden || document.body.classList.contains('dialog-open') || userPaused) video.pause();
  else video.play().catch(() => {
    // Autoplay may be blocked. Keep the mountain photo and offer manual play.
    if (!videoFailed && !reducedMotion.matches) { videoToggle.hidden = false; updateVideoControl(); }
  });
}
video.addEventListener('playing', () => {
  if (reducedMotion.matches) { syncHeroVideo(); return; }
  video.hidden = false; videoToggle.hidden = false; updateVideoControl();
});
video.addEventListener('pause', updateVideoControl);
video.addEventListener('error', () => { videoFailed = true; syncHeroVideo(); });
videoToggle.addEventListener('click', () => { userPaused = !video.paused; syncHeroVideo(); });
document.addEventListener('visibilitychange', syncHeroVideo);
if ('IntersectionObserver' in window) {
  const heroObserver = new IntersectionObserver(([entry]) => header.classList.toggle('on-light', !entry.isIntersecting), { rootMargin: '-70px 0px 0px 0px' });
  heroObserver.observe(document.querySelector('.hero'));
  const videoObserver = new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; syncHeroVideo(); });
  videoObserver.observe(document.querySelector('.hero'));
}
reducedMotion.addEventListener('change', () => {
  revealObserver?.disconnect();
  if (reducedMotion.matches) motion.forEach(animation => animation.finish());
  else prepareReveals();
  syncHeroVideo();
});
prepareReveals();
syncHeroVideo();
function safeUrl(value) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : null; } catch { return null; } }
if (config.instagramUrl && safeUrl(config.instagramUrl)) document.querySelectorAll('.instagram-link').forEach(link => { link.href = safeUrl(config.instagramUrl); link.target = '_blank'; link.rel = 'noopener'; link.hidden = false; });
if (config.contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail)) document.querySelectorAll('.contact-link').forEach(link => { link.href = `mailto:${config.contactEmail}`; link.hidden = false; });
if (config.nextHike) {
  const event = config.nextHike;
  document.querySelector('#event-status').textContent = event.tentative ? 'TENTATIVE / DETAILS TO COME' : 'THE NEXT HIKE';
  document.querySelector('#event-title').textContent = event.title || 'The next hike';
  document.querySelector('#event-description').textContent = event.description || 'Come hungry. Pancakes are free.';
  const details = document.querySelector('#event-details');
  for (const [key, label] of [['date','DATE'],['time','MEET AT'],['trailhead','TRAILHEAD'],['distance','DISTANCE'],['elevationGain','ELEVATION GAIN'],['difficulty','DIFFICULTY']]) if (event[key]) { const row = document.createElement('div'); const term = document.createElement('dt'); const value = document.createElement('dd'); term.textContent = label; value.textContent = event[key]; row.append(term,value); details.append(row); }
  details.hidden = !details.children.length;
  if (safeUrl(event.directionsUrl)) { const link = document.querySelector('#event-directions'); link.href = safeUrl(event.directionsUrl); link.target = '_blank'; link.rel = 'noopener'; link.hidden = false; }
}

// Decorative entrance: finite duration, no scroll/focus lock, no dependency on media.
const brandIntro = document.querySelector('#brand-intro');
let introTimer;
let introExitTimer;
function dismissBrandIntro() {
  clearTimeout(introTimer); clearTimeout(introExitTimer);
  if (!brandIntro) return;
  brandIntro.hidden = true;
  brandIntro.getAnimations({subtree:true}).forEach(animation => animation.cancel());
}
function playBrandIntro() {
  if (!brandIntro || !brandIntro.hidden) return;
  brandIntro.hidden = false;
  const duration = reducedMotion.matches ? 120 : 1000;
  const bar = brandIntro.querySelector('.brand-intro-bar i');
  if (!reducedMotion.matches && bar.animate) {
    bar.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}], {duration:800,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
  }
  introTimer = setTimeout(() => {
    if (!reducedMotion.matches && brandIntro.animate) {
      brandIntro.animate([{opacity:1},{opacity:0}], {duration:180,fill:'forwards'});
      introExitTimer = setTimeout(dismissBrandIntro,180);
    } else dismissBrandIntro();
  }, duration);
}
document.addEventListener('click', event => {
  const homeLink = event.target.closest?.('a[href="#home"]');
  if (homeLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) playBrandIntro();
},true);
window.addEventListener('hashchange', () => { if (location.hash === '#home') playBrandIntro(); });
window.addEventListener('pageshow', event => { if (event.persisted) playBrandIntro(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') dismissBrandIntro(); });
reducedMotion.addEventListener('change', dismissBrandIntro);
playBrandIntro();
