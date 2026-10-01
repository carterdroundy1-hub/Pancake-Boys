const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.PANCAKE_TEST_URL || 'http://127.0.0.1:4174/';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1024, 1440]) {
      const geometry = [];
      for (const javaScriptEnabled of [false, true]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled, reducedMotion: 'reduce' });
        const page = await context.newPage();
        if (javaScriptEnabled) await page.addInitScript(() => {
          window.__layoutShift = 0;
          new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__layoutShift += entry.value; })).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(base);
        await page.evaluate(() => document.fonts.ready);
        if (javaScriptEnabled) {
          await page.waitForTimeout(600);
          assert.equal(await page.evaluate(() => window.__layoutShift), 0, `No initial layout shift at ${width}px`);
        }
        geometry.push(await page.locator('main h2').evaluateAll(headings => headings.map(h => {
          const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), rects = [];
          let node;
          while ((node = walker.nextNode())) if (node.textContent.trim()) {
            const range = document.createRange(); range.selectNodeContents(node);
            rects.push(...range.getClientRects());
          }
          return { height: Math.max(...rects.map(r => r.bottom)) - Math.min(...rects.map(r => r.top)) };
        })));
        await context.close();
      }
      geometry[0].forEach((plain, i) => {
        assert.ok(Math.abs(plain.height - geometry[1][i].height) < 1, `Heading height preserved at ${width}px`);
      });
      results.push({ width, status: 'passed', checks: 'Original heading heights preserved with/without JavaScript; initial cumulative layout shift is zero' });
    }
    await fs.writeFile('website/qa/layout-results.json', JSON.stringify({ url: base, results }, null, 2) + '\n');
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
