// Local browser regression checks. Requires Playwright in the test environment;
// the website itself remains dependency-free. Start the static server first.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { checkCinematic } = require('./cinematic-checks.cjs');
const base = process.env.PANCAKE_TEST_URL || 'http://127.0.0.1:4174/';
const output = process.env.PANCAKE_TEST_OUTPUT || __dirname;
const results = [];
const check = (condition, message) => assert.ok(condition, message);

async function settled(page) {
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
}
async function noOverflow(page) {
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
}
async function swipe(page, direction, vertical = false) {
  const box = await page.locator('.gallery-viewport').boundingBox();
  const x = box.x + box.width * (direction < 0 ? .8 : .2);
  const y = box.y + box.height * .5;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 5; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (vertical ? 4 : direction * step * 25), y: y + (vertical ? step * 20 : 0) }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: process.env.PANCAKE_ORIGIN_IP ? [`--host-resolver-rules=MAP pancak3boys.com ${process.env.PANCAKE_ORIGIN_IP}`] : [] });
  try {
    for (const mobile of [false, true]) for (const reduced of [false, true]) {
      const name = `${mobile ? 'mobile' : 'desktop'}-${reduced ? 'reduced' : 'motion'}`;
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      console.log(`Checking ${name} at ${base}`);
      const errors = [], badResponses = [], videoRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url()); });
      page.on('request', request => { if (/\.(mp4|webm)(\?|$)/.test(request.url())) videoRequests.push(request.url()); });
      await page.goto(base);
      check((await page.locator('html').getAttribute('data-intro')) === (reduced ? 'reduced' : 'played'), 'First-session intro state');
      await noOverflow(page);
      check(await page.locator('.hero-image').evaluate(image => image.complete && image.naturalWidth > 0), 'Hero photo loaded');
      if (reduced) {
        check(await page.locator('.hero-video').evaluate(video => video.hidden && !video.getAttribute('src')), 'Reduced motion keeps still image and requests no video');
        check(!(await page.locator('.video-toggle').isVisible()), 'No reduced-motion video control');
      } else {
        await page.waitForFunction(() => !document.querySelector('.hero-video').hidden && document.querySelector('.hero-video').currentTime > 0);
        check(await page.locator('.hero-video').evaluate(video => video.autoplay && video.muted && video.loop && video.playsInline), 'Actual silent inline looping footage plays');
        await page.getByRole('button', { name: 'Pause background video' }).click();
        check(await page.locator('.hero-video').evaluate(video => video.paused), 'Video pause works');
        await page.getByRole('button', { name: 'Play background video' }).click();
        await page.waitForFunction(() => !document.querySelector('.hero-video').paused);
      }
      check((await page.locator('#event-status').textContent()).includes('TENTATIVE'), 'Hike stays tentative');
      check((await page.locator('.instagram-link').first().getAttribute('href')).endsWith('/pancak3boys/'), 'Instagram preserved');

      await page.locator('.menu-toggle').evaluate(button => button.addEventListener('click', () => { window.__menuEntranceCount = document.querySelector('#menu-dialog').getAnimations({ subtree: true }).length; }, { once: true }));
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      const menu = page.locator('#menu-dialog');
      check(await menu.evaluate(dialog => dialog.open), 'Menu opened');
      check(await page.locator('main').evaluate(main => main.inert), 'Background inert while menu is open');
      check((await page.locator('.menu-toggle').getAttribute('aria-expanded')) === 'true', 'Expanded state');
      if (reduced) check(await menu.evaluate(dialog => dialog.getAnimations({ subtree: true }).length === 0), 'No reduced-motion menu animations');
      else check(await page.evaluate(() => window.__menuEntranceCount > 0), 'Menu entrance and stagger animate');
      await settled(page);
      for (let i = 0; i < 9; i++) {
        await page.keyboard.press('Tab');
        check(await page.evaluate(() => document.activeElement.closest('#menu-dialog') !== null), 'Keyboard focus remains in menu');
      }
      await page.keyboard.press('Escape');
      if (!reduced) check(await menu.evaluate(dialog => dialog.open), 'Menu stays modal during exit');
      await page.waitForFunction(() => !document.querySelector('#menu-dialog').open);
      await page.waitForFunction(() => document.activeElement.matches('.menu-toggle'));
      check(!(await page.locator('main').evaluate(main => main.inert)), 'Background released');
      // An early close must cancel entrance animations and remain responsive.
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#menu-dialog').open);
      await page.waitForFunction(() => document.activeElement.matches('.menu-toggle'));

      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      await settled(page);
      check(await menu.evaluate(dialog => dialog.open), 'Menu can reopen after rapid Escape presses');
      await menu.getByRole('link', { name: '03 FIELD NOTES' }).click();
      await page.waitForFunction(() => document.activeElement.id === 'field-notes');
      check(new URL(page.url()).hash === '#field-notes', 'Menu link anchors and focuses section after closing');
      await settled(page);
      await noOverflow(page);
      const photos = page.locator('[data-photo]');
      await photos.nth(0).click();
      await settled(page);
      const gallery = page.locator('#photo-dialog');
      check(await gallery.evaluate(dialog => dialog.open), 'Photo viewer opens');
      check((await page.locator('#photo-count').textContent()) === '1 / 3', 'Gallery opens on selected photo');
      await page.getByRole('button', { name: 'Next photograph', exact: true }).click();
      check((await page.locator('#photo-count').textContent()) === '2 / 3', 'Manual next');
      check((await page.locator('#photo-caption').textContent()) === 'The breakfast part of the hike.', 'Caption follows slide');
      await page.keyboard.press('ArrowRight');
      check((await page.locator('#photo-count').textContent()) === '3 / 3', 'Keyboard next');
      await page.keyboard.press('ArrowRight');
      check((await page.locator('#photo-count').textContent()) === '1 / 3', 'Wrap at end');
      await page.keyboard.press('End');
      check((await page.locator('#photo-count').textContent()) === '3 / 3', 'End selects last');
      await page.keyboard.press('Home');
      check((await page.locator('#photo-count').textContent()) === '1 / 3', 'Home selects first');
      await page.keyboard.press('ArrowLeft');
      check((await page.locator('#photo-count').textContent()) === '3 / 3', 'Wrap at start');
      check(await gallery.evaluate(dialog => [...dialog.querySelectorAll('.gallery-slide')].filter(slide => !slide.inert && slide.getAttribute('aria-hidden') === 'false').length === 1), 'Only selected slide exposed to assistive technology');
      if (reduced) check((await page.locator('.gallery-track').evaluate(track => getComputedStyle(track).transitionDuration)) === '0s', 'Reduced-motion gallery is instant');
      await settled(page);
      if (mobile) {
        await swipe(page, -1);
        await page.waitForFunction(() => document.querySelector('#photo-count').textContent === '1 / 3');
        await settled(page);
        await swipe(page, 1);
        await page.waitForFunction(() => document.querySelector('#photo-count').textContent === '3 / 3');
        await settled(page);
        await swipe(page, -1, true);
        check((await page.locator('#photo-count').textContent()) === '3 / 3', 'Vertical gestures do not change slides');
      }
      await noOverflow(page);
      await gallery.screenshot({ path: path.join(output, `tested-gallery-${name}.png`) });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.matches('[data-photo]'));
      await photos.nth(1).click();
      check((await page.locator('#photo-count').textContent()) === '2 / 3', 'Reopening starts on clicked photo');
      await page.getByRole('button', { name: 'Close photograph', exact: true }).click();
      await page.waitForFunction(() => document.activeElement === document.querySelectorAll('[data-photo]')[1]);

      for (const [triggerName, dialogId] of [['THE WHOLE STORY', 'story-dialog'], ['HELP MAKE THE NEXT ONE HAPPEN', 'support-dialog']]) {
        const trigger = page.getByRole('button', { name: triggerName });
        await trigger.click();
        check(await page.locator(`#${dialogId}`).evaluate(dialog => dialog.open), `${dialogId} opens`);
        await page.keyboard.press('Escape');
        await page.waitForFunction(id => !document.getElementById(id).open, dialogId);
        await page.waitForFunction(id => document.activeElement === document.querySelector(`[data-dialog="${id}"]`), dialogId);
        check(await trigger.evaluate(button => document.activeElement === button), `${dialogId} restores focus`);
      }
      // Trigger each reveal, then return and verify it is never scheduled again.
      for (const heading of await page.locator('main h2').all()) { await heading.scrollIntoViewIfNeeded(); await settled(page); }
      if (reduced) check(await page.locator('main').evaluate(main => main.getAnimations({ subtree: true }).length === 0), 'No reduced-motion reveals');
      else {
        check(await page.locator('main h2').evaluateAll(headings => headings.every(h => h.dataset.revealed === 'true')), 'Headlines revealed once');
        await page.locator('#next-title').scrollIntoViewIfNeeded();
        check(await page.locator('#next-title').evaluate(h => h.getAnimations().length === 0), 'No repeated reveal');
      }
      for (const image of await page.locator('main img').all()) {
        await image.scrollIntoViewIfNeeded();
        await page.waitForFunction(src => [...document.querySelectorAll('main img')].some(image => image.src === src && image.complete && image.naturalWidth > 0), await image.getAttribute('src').then(src => new URL(src, base).href));
      }
      check(reduced ? videoRequests.length === 0 : videoRequests.length > 0, 'Expected real-video/reduced-motion media requests');
      await checkCinematic(page, { mobile, reduced, output });
      check(errors.length === 0, `No console/runtime errors: ${errors.join('; ')}`);
      check(badResponses.length === 0, `No broken resources: ${badResponses.join('; ')}`);
      results.push({ name, status: 'passed', checks: 'intro/session, header direction/focus, line reveals, strip pause/drag/swipe/keyboard, actual video/play/pause/loop, gallery/menu/dialogs, media/overflow/errors' });
      console.log(`Passed ${name}`);
      await context.close();
    }

    // Changing the preference while an animation is running must not strand a modal.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base);
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('#menu-dialog').open);
    await page.waitForFunction(() => document.activeElement.matches('.menu-toggle'));
    for (const [width, height] of [[320, 740], [768, 1024], [1024, 768], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await noOverflow(page);
      await page.getByRole('button', { name: 'Open menu', exact: true }).click();
      check(await page.getByRole('link', { name: '05 KEEP IT GOING' }).isVisible(), 'All menu links accessible at breakpoint');
      await page.getByRole('link', { name: '05 KEEP IT GOING' }).click();
      await page.waitForFunction(() => document.activeElement.id === 'support');
    }
    await context.close();
    results.push({ name: 'preference-change-and-breakpoints', status: 'passed' });

    // A configured missing clip must leave the existing photo visible. Under
    // reduced motion it must not be requested at all. No test footage is made.
    for (const reduced of [false, true]) {
      const context = await browser.newContext({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      let requested = false;
      await page.route('**/content.js', async route => {
        // Supply this isolated fixture directly: route.fetch runs outside Chrome's
        // temporary DNS override and would otherwise fetch the GoDaddy response.
        const body = await fs.readFile(path.join(__dirname, '../content.js'), 'utf8');
        await route.fulfill({ contentType: 'text/javascript', body: body.replace(/heroVideoSrc: [^,\n]+/, "heroVideoSrc: 'assets/hero-hike.mp4'") });
      });
      await page.route('**/assets/hero-hike.mp4', async route => { requested = true; await route.abort(); });
      await page.goto(base);
      if (!reduced) await page.waitForFunction(() => document.querySelector('.hero-video').error !== null);
      check(await page.locator('.hero-video').evaluate(video => video.hidden), 'Failed/reduced-motion video stays hidden');
      check(await page.locator('.hero-image').evaluate(image => image.complete && image.naturalWidth > 0), 'Fallback photo remains loaded');
      check(!(await page.locator('.video-toggle').isVisible()), 'Failed/reduced-motion control hidden');
      check(requested === !reduced, 'Reduced motion never requests configured footage');
      await context.close();
    }
    results.push({ name: 'configured-clip-failure-and-reduced-motion', status: 'passed' });

    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const still = await noJS.newPage();
    await still.goto(base);
    await noOverflow(still);
    check(await still.locator('h1').isVisible(), 'Hero remains visible without JavaScript');
    check(await still.locator('h2').evaluateAll(headings => headings.every(h => getComputedStyle(h).opacity === '1')), 'Headlines never hidden without JavaScript');
    await noJS.close();
    results.push({ name: 'no-javascript-still-content', status: 'passed' });
    await fs.writeFile(path.join(output, 'test-results.json'), JSON.stringify({ testedAt: new Date().toISOString(), url: base, dnsOverride: process.env.PANCAKE_ORIGIN_IP || null, results }, null, 2) + '\n');
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
