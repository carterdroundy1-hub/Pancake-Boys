const assert = require('node:assert/strict');
const path = require('node:path');

async function checkCinematic(page, { mobile, reduced, output }) {
  const header = page.locator('.header');
  await page.evaluate(() => { document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.waitForFunction(() => !document.querySelector('.header').classList.contains('is-hidden'));
  assert.equal(await header.evaluate(h => h.classList.contains('on-light')), false, 'Header is transparent over hero');
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.header').classList.contains('is-hidden'));
  await page.waitForFunction(() => document.querySelector('.header').classList.contains('on-light'));
  await page.evaluate(() => window.scrollTo({ top: 1250, behavior: 'instant' }));
  await page.waitForFunction(() => !document.querySelector('.header').classList.contains('is-hidden'));
  assert.equal(await header.evaluate(h => getComputedStyle(h).backgroundColor), 'rgb(241, 238, 231)', 'Compact cream header below hero');
  await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.header').classList.contains('is-hidden'));
  await page.locator('.menu-toggle').focus();
  await page.waitForFunction(() => !document.querySelector('.header').classList.contains('is-hidden'));
  await page.evaluate(() => window.scrollTo({ top: 1800, behavior: 'instant' }));
  await page.waitForTimeout(100);
  assert.equal(await header.evaluate(h => h.classList.contains('is-hidden')), false, 'Focused controls keep header visible');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  assert.equal(await page.locator('#menu-dialog').evaluate(d => getComputedStyle(d).backgroundColor), 'rgb(36, 39, 33)', 'Menu is charcoal');
  assert.equal(await header.evaluate(h => h.classList.contains('is-hidden')), false, 'Open menu keeps header visible');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#menu-dialog').open);
  await page.waitForFunction(() => document.activeElement.matches('.menu-toggle'));

  assert.ok(await page.locator('main h2').evaluateAll(headings => headings.every(h => h.querySelectorAll('.headline-line').length >= 2)), 'Major headlines split by rendered lines');
  assert.equal((await page.locator('#field-title').textContent()).replace(/\s+/g, ' ').trim(), 'COME FOR THE PANCAKES. STAY FOR THE PEOPLE.', 'Headline copy preserved');

  const strip = page.locator('.trail-viewport');
  await strip.scrollIntoViewIfNeeded();
  await strip.focus();
  await strip.evaluate(s => { s.scrollLeft = 0; });
  await page.evaluate(() => document.activeElement.blur());
  await page.mouse.move(0, 0);
  const start = await strip.evaluate(s => s.scrollLeft);
  if (!reduced) await page.waitForFunction(left => document.querySelector('.trail-viewport').scrollLeft > left + 5, start);
  else {
    await page.waitForTimeout(500);
    assert.equal(await strip.evaluate(s => s.scrollLeft), start, 'Reduced-motion strip remains still');
    assert.ok(await page.getByRole('button', { name: 'Photo strip motion disabled by reduced-motion preference' }).isDisabled());
  }
  if (!reduced) {
    const bounds = await strip.boundingBox();
    await page.mouse.move(bounds.x + 20, bounds.y + 20);
    await page.waitForTimeout(100);
    const hovered = await strip.evaluate(s => s.scrollLeft);
    await page.waitForTimeout(300);
    assert.equal(await strip.evaluate(s => s.scrollLeft), hovered, 'Hover pauses automatic movement');
    await page.getByRole('button', { name: 'Pause hike photo strip' }).click();
    await page.evaluate(() => document.activeElement.blur());
    await page.mouse.move(0, 0);
    const paused = await strip.evaluate(s => s.scrollLeft);
    await page.waitForTimeout(500);
    assert.equal(await strip.evaluate(s => s.scrollLeft), paused, 'Visible pause control stops movement persistently');
  }
  const beforeNext = await strip.evaluate(s => s.scrollLeft);
  await page.getByRole('button', { name: 'Move hike photos right' }).click();
  await page.waitForFunction(left => document.querySelector('.trail-viewport').scrollLeft > left + 20, beforeNext);
  await page.waitForTimeout(reduced ? 20 : 500);
  const beforePrevious = await strip.evaluate(s => s.scrollLeft);
  await page.getByRole('button', { name: 'Move hike photos left' }).click();
  await page.waitForFunction(left => document.querySelector('.trail-viewport').scrollLeft < left - 20, beforePrevious);
  await page.waitForTimeout(reduced ? 20 : 500);
  await strip.focus();
  const beforeKey = await strip.evaluate(s => s.scrollLeft);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(left => document.querySelector('.trail-viewport').scrollLeft > left + 20, beforeKey);
  await page.waitForTimeout(reduced ? 20 : 500);
  const box = await strip.boundingBox();
  const beforeDrag = await strip.evaluate(s => s.scrollLeft);
  if (mobile) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .8, y: box.y + box.height / 2 }] });
    for (let i = 1; i <= 5; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * .8 - i * 25, y: box.y + box.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(box.x + box.width * .7, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .7 - 130, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
  }
  await page.waitForFunction(left => document.querySelector('.trail-viewport').scrollLeft > left + 50, beforeDrag);
  await strip.focus();
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('.trail-viewport').scrollLeft < 2);
  await page.keyboard.press('End');
  await page.waitForFunction(() => document.querySelector('.trail-viewport').scrollLeft > 300);
  assert.equal(await page.locator('.trail-group').last().getAttribute('aria-hidden'), 'true', 'Loop duplicate hidden from assistive technology');
  await page.locator('.trail-strip').screenshot({ path: path.join(output, `cinematic-strip-${mobile ? 'mobile' : 'desktop'}-${reduced ? 'reduced' : 'motion'}.png`) });

  await page.evaluate(() => { document.activeElement.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-intro'), reduced ? 'reduced' : 'seen', 'Intro does not replay in this browser session');
  if (!reduced) {
    await page.waitForFunction(() => !document.querySelector('.hero-video').hidden && !document.querySelector('.hero-video').paused);
    await page.evaluate(() => { const video = document.querySelector('.hero-video'); video.currentTime = video.duration - .15; });
    await page.waitForFunction(() => document.querySelector('.hero-video').currentTime < 1 && !document.querySelector('.hero-video').paused);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.hero-video').hidden && document.querySelector('.hero-video').paused);
    assert.equal(await page.locator('.hero-image').evaluate(i => i.complete && i.naturalWidth > 0), true, 'Changing preference restores loaded photo');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
}
module.exports = { checkCinematic };
