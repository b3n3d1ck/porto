const { chromium } = require('playwright');

(async () => {
  const errors = [];
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:5173/#work', { waitUntil: 'networkidle' }).catch(() => page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' }));
  await page.waitForTimeout(2400);
  console.log('intro gone:', (await page.locator('.intro').count()) === 0);
  console.log('h1:', await page.locator('h1').innerText());
  console.log('hero photo:', await page.locator('.portrait-photo').evaluate(e => e.complete && e.naturalWidth > 0));
  console.log('overflow:', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  console.log('tickers:', await page.locator('.ticker').count());
  await page.screenshot({ path: 'desktop-hero.png' });
  const read = () => page.evaluate(() => getComputedStyle(document.querySelectorAll('.project-object')[0]).transform);
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 450); await page.waitForTimeout(140); }
  console.log('after scrolling down:', await read());
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -500); await page.waitForTimeout(140); }
  console.log('after scrolling back:', await read());
  await page.locator('#work').scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  console.log('cards:', await page.locator('.project-card').count());
  await page.screenshot({ path: 'desktop-work.png' });
  await page.getByRole('button', { name: 'Creative' }).click(); await page.waitForTimeout(500);
  console.log('creative cards (expect 4):', await page.locator('.project-card').count());
  await page.getByRole('button', { name: 'All' }).click(); await page.waitForTimeout(400);
  await page.locator('.project-card button').first().click(); await page.waitForTimeout(500);
  console.log('dialog:', await page.getByRole('dialog').count()); await page.keyboard.press('Escape');

  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  m.on('pageerror', (e) => errors.push('mobile: ' + e.message));
  await m.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' }); await m.waitForTimeout(2400);
  console.log('mobile overflow:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await m.screenshot({ path: 'mobile-hero.png' });
  await m.getByRole('button', { name: 'Toggle menu' }).click(); await m.waitForTimeout(700);
  console.log('mobile nav:', await m.locator('#mobile-nav').isVisible());
  await m.screenshot({ path: 'mobile-menu.png' });
  const before = await m.evaluate(() => scrollY);
  await m.getByRole('button', { name: /Projects/ }).click(); await m.waitForTimeout(1200);
  console.log('menu closed after nav:', (await m.locator('#mobile-nav').count()) === 0, '| scrolled from', before, 'to', await m.evaluate(() => scrollY));
  console.log('work in view:', await m.evaluate(() => { const r = document.getElementById('work').getBoundingClientRect(); return r.top >= -200 && r.top < 400; }));
  await m.screenshot({ path: 'mobile-work.png' });
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
