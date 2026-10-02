const config = window.PANCAKE_BOYS || {};
const mediaBase = new URL('.', document.currentScript?.src || document.baseURI);
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
  header.classList.remove('is-hidden');
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
    animate(menu, [{ opacity: .8, transform: 'translateY(-32px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
    menu.querySelectorAll('nav a').forEach((link, index) => animate(link,
      [{ opacity: .35, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 360, delay: 70 + index * 55, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
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

// A short first-visit entrance, never a loading screen or navigation delay.
function heroEntrance() {
  let seen = false;
  try { seen = sessionStorage.getItem('pancake-boys-intro') === 'seen'; sessionStorage.setItem('pancake-boys-intro', 'seen'); } catch { /* Storage can be disabled; the page still works. */ }
  document.documentElement.dataset.intro = reducedMotion.matches ? 'reduced' : seen ? 'seen' : 'played';
  if (seen || reducedMotion.matches || window.scrollY > 100) return;
  const rise = [{ opacity: .65, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }];
  animate(header.querySelector('.brand'), [{ opacity: .6, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
  animate(document.querySelector('#hero-title'), rise, { duration: 520, delay: 180, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
  animate(document.querySelector('.hero-intro'), rise, { duration: 420, delay: 320, easing: 'ease-out', fill: 'backwards' });
  animate(document.querySelector('.hero-baseline'), rise, { duration: 450, delay: 500, easing: 'ease-out', fill: 'backwards' });
}

// Measure the existing rendered lines instead of changing the approved breaks.
// Rebuild on resize, using the original text, without replaying the entrance.
const headlineOriginals = new Map([...document.querySelectorAll('main h2')].map(heading => [heading, heading.innerHTML]));
function splitHeadlines() {
  headlineOriginals.forEach((html, heading) => {
    heading.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    heading.innerHTML = html;
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const lines = [];
    let node;
    while ((node = walker.nextNode())) {
      for (const word of node.textContent.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
        const top = range.getBoundingClientRect().top;
        let line = lines[lines.length - 1];
        if (!line || Math.abs(top - line.top) > 2) { line = { top, words: [] }; lines.push(line); }
        line.words.push(word[0]);
      }
    }
    heading.replaceChildren();
    lines.forEach((line, index) => {
      if (index) heading.append(document.createTextNode(' '));
      const span = document.createElement('span'); span.className = 'headline-line'; span.textContent = line.words.join(' ');
      heading.append(span);
    });
  });
}
let resizeFrame;
window.addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(splitHeadlines); });

// Nothing starts hidden. Animation failure leaves all copy and images readable.
let revealObserver;
function prepareReveals() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    revealObserver.unobserve(entry.target);
    if (entry.target.dataset.revealed) return;
    entry.target.dataset.revealed = 'true';
    if (entry.target.matches('h2')) {
      const section = entry.target.closest('section');
      section.dataset.revealed = 'true';
      entry.target.querySelectorAll('.headline-line').forEach((line, index) => animate(line,
        [{ opacity: .65, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 600, delay: index * 65, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      section.querySelectorAll('p:not(.eyebrow)').forEach(paragraph => animate(paragraph,
        [{ opacity: .75, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 480, delay: 140, easing: 'ease-out', fill: 'backwards' }));
    } else animate(entry.target, [{ opacity: .8, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 580, easing: 'cubic-bezier(.22,1,.36,1)' });
  }), { threshold: .12 });
  document.querySelectorAll('main h2, .story-photo, .photo-grid figure, .merch-image').forEach(element => {
    if (!element.dataset.revealed) revealObserver.observe(element);
  });
}

// A passive scroll listener: normal page scrolling, with a small direction threshold.
let lastScrollY = Math.max(0, window.scrollY), scrollTravel = 0, scrollFrame = null;
function updateHeader() {
  scrollFrame = null;
  const position = Math.max(0, window.scrollY), delta = position - lastScrollY;
  if (Math.sign(delta) !== Math.sign(scrollTravel)) scrollTravel = 0;
  scrollTravel += delta;
  if (position < 140 || menu.open || header.contains(document.activeElement)) header.classList.remove('is-hidden');
  else if (scrollTravel > 20) header.classList.add('is-hidden');
  else if (scrollTravel < -12) header.classList.remove('is-hidden');
  lastScrollY = position;
}
window.addEventListener('scroll', () => { if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateHeader); }, { passive: true });
header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

// One slow moving strip, only while visible and idle. Native overflow is the
// no-JavaScript and mobile swipe fallback; controls also work with reduced motion.
const strip = document.querySelector('.trail-strip');
const stripViewport = strip.querySelector('.trail-viewport');
const stripGroup = strip.querySelector('.trail-group');
const stripClone = stripGroup.cloneNode(true);
stripClone.inert = true; stripClone.setAttribute('aria-hidden', 'true');
strip.querySelector('.trail-track').append(stripClone);
const stripPause = strip.querySelector('[data-strip-pause]');
strip.querySelectorAll('button').forEach(button => { button.hidden = false; });
let stripPaused = false, stripHover = false, stripFocus = false, stripVisible = false, stripDrag = null, stripCooldown = 0;
let stripFrame = null, stripLastTime = 0, stripPosition = 0;
function updateStripControl() {
  stripPause.disabled = reducedMotion.matches;
  stripPause.setAttribute('aria-pressed', String(stripPaused || reducedMotion.matches));
  stripPause.setAttribute('aria-label', reducedMotion.matches ? 'Photo strip motion disabled by reduced-motion preference' : stripPaused ? 'Play hike photo strip' : 'Pause hike photo strip');
  stripPause.innerHTML = reducedMotion.matches ? 'MOTION OFF' : stripPaused ? 'PLAY STRIP <span aria-hidden="true">▶</span>' : 'PAUSE STRIP <span aria-hidden="true">Ⅱ</span>';
}
function stripCanMove() {
  return stripVisible && !stripPaused && !reducedMotion.matches && !stripHover && !stripFocus && !stripDrag && !document.hidden && !document.querySelector('dialog[open]');
}
function stripTick(time) {
  stripFrame = null;
  if (!stripCanMove()) { stripLastTime = 0; return; }
  if (stripLastTime && time >= stripCooldown) {
    const loopWidth = stripGroup.getBoundingClientRect().width;
    stripPosition += Math.min(time - stripLastTime, 50) * .014;
    if (loopWidth > 0 && stripPosition >= loopWidth) stripPosition -= loopWidth;
    stripViewport.scrollLeft = stripPosition;
  }
  if (time < stripCooldown) stripPosition = stripViewport.scrollLeft;
  stripLastTime = time;
  stripFrame = requestAnimationFrame(stripTick);
}
function syncStrip() {
  if (stripFrame !== null) { cancelAnimationFrame(stripFrame); stripFrame = null; }
  stripLastTime = 0;
  stripPosition = stripViewport.scrollLeft;
  if (stripCanMove()) stripFrame = requestAnimationFrame(stripTick);
}
function moveStrip(distance) {
  stripCooldown = performance.now() + 3000;
  stripViewport.scrollBy({ left: distance, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
stripPause.addEventListener('click', () => { stripPaused = !stripPaused; updateStripControl(); syncStrip(); });
strip.querySelector('[data-strip-prev]').addEventListener('click', () => moveStrip(-stripViewport.clientWidth * .65));
strip.querySelector('[data-strip-next]').addEventListener('click', () => moveStrip(stripViewport.clientWidth * .65));
stripViewport.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); moveStrip((e.key === 'ArrowLeft' ? -1 : 1) * stripViewport.clientWidth * .65); }
  else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); moveStrip((e.key === 'Home' ? 0 : stripGroup.offsetWidth - stripViewport.clientWidth) - stripViewport.scrollLeft); }
});
strip.addEventListener('mouseenter', () => { stripHover = true; syncStrip(); });
strip.addEventListener('mouseleave', () => { stripHover = false; syncStrip(); });
strip.addEventListener('focusin', () => { stripFocus = true; syncStrip(); });
strip.addEventListener('focusout', () => queueMicrotask(() => { stripFocus = strip.contains(document.activeElement); syncStrip(); }));
stripViewport.addEventListener('wheel', () => { stripCooldown = performance.now() + 3000; }, { passive: true });
stripViewport.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button !== 0) return;
  stripDrag = { id: e.pointerId, x: e.clientX, left: stripViewport.scrollLeft, manual: e.pointerType !== 'touch' };
  if (stripDrag.manual) { stripViewport.setPointerCapture(e.pointerId); stripViewport.classList.add('dragging'); }
  syncStrip();
});
stripViewport.addEventListener('pointermove', e => {
  if (stripDrag?.manual && stripDrag.id === e.pointerId) stripViewport.scrollLeft = stripDrag.left + stripDrag.x - e.clientX;
});
function endStripDrag() {
  stripDrag = null; stripViewport.classList.remove('dragging'); stripCooldown = performance.now() + 3000; syncStrip();
}
stripViewport.addEventListener('pointerup', endStripDrag);
stripViewport.addEventListener('pointercancel', endStripDrag);
stripViewport.addEventListener('lostpointercapture', endStripDrag);
document.addEventListener('visibilitychange', syncStrip);
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', syncStrip);
  new MutationObserver(syncStrip).observe(dialog, { attributes: true, attributeFilter: ['open'] });
});
if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { stripVisible = entry.isIntersecting; syncStrip(); }, { threshold: .1 }).observe(strip);
updateStripControl();

const video = document.querySelector('.hero-video');
const videoToggle = document.querySelector('.video-toggle');
const videoSource = typeof config.heroVideoSrc === 'string' && /^assets\/[\w./-]+\.(mp4|webm)$/i.test(config.heroVideoSrc) && !config.heroVideoSrc.split('/').includes('..') ? config.heroVideoSrc : null;
let heroVisible = true, userPaused = false, videoFailed = false;
function updateVideoControl() {
  videoToggle.setAttribute('aria-label', video.paused ? 'Play background video' : 'Pause background video');
  videoToggle.innerHTML = video.paused ? 'PLAY FILM <span aria-hidden="true">▶</span>' : 'PAUSE FILM <span aria-hidden="true">Ⅱ</span>';
}
function syncHeroVideo() {
  if (!videoSource || videoFailed || reducedMotion.matches || navigator.connection?.saveData) {
    video.pause(); video.hidden = true; videoToggle.hidden = true;
    return;
  }
  if (!video.getAttribute('src')) { video.muted = true; video.src = new URL(videoSource, mediaBase).href; }
  if (!heroVisible || document.hidden || document.body.classList.contains('dialog-open') || userPaused) video.pause();
  else video.play().catch(() => {
    // Autoplay may be blocked. Keep the mountain photo and offer manual play.
    if (!videoFailed && !reducedMotion.matches) { videoToggle.hidden = false; updateVideoControl(); }
  });
}
video.addEventListener('playing', () => {
  if (reducedMotion.matches || !heroVisible || document.hidden || document.querySelector('dialog[open]') || userPaused) { syncHeroVideo(); return; }
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
  updateStripControl(); syncStrip();
});
splitHeadlines();
heroEntrance();
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
