// Smoke test: mở từng app thật và kiểm tra nó lấp đầy màn hình 440x956pt, không có lỗi JS.
// Chạy:  node tests/smoke.mjs http://localhost:8765/index.html
// Cần:   npm i -D playwright  (và `npx playwright install chromium`)
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:8765/index.html';
const APPS = ['settings', 'calculator', 'clock', 'notes', 'camera', 'photos', 'music',
              'messages', 'phone', 'safari', 'calendar', 'weather', 'maps'];
const IGNORE = [/ERR_NAME_NOT_RESOLVED/, /navigator\.vibrate/, /getUserMedia|NotAllowed|NotFound/i];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !IGNORE.some((re) => re.test(m.text()))) errors.push('console: ' + m.text());
});

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ios?.mod?.wm);
await page.evaluate(() => window.__ios.mod.lock.hide());
await page.waitForTimeout(1200);

const failures = [];
for (const id of APPS) {
  await page.evaluate((i) => window.__ios.mod.wm.open(i), id);
  await page.waitForFunction(() => window.__ios.mod.wm.mode === 'app', null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500); // chờ spring dừng hẳn
  const r = await page.evaluate(() => {
    const sc = document.querySelector('#screen').getBoundingClientRect();
    const k = sc.width / 440;
    const win = document.querySelector('.win[style*="display: block"] .win-c, .win:not([style*="display: none"]) .win-c');
    const el = win?.firstElementChild;
    if (!el) return { missing: true };
    const b = el.getBoundingClientRect();
    return { x: (b.left - sc.left) / k, y: (b.top - sc.top) / k, w: b.width / k, h: b.height / k };
  });
  const ok = !r.missing && Math.abs(r.x) < 1 && Math.abs(r.y) < 1 && Math.abs(r.w - 440) < 1 && Math.abs(r.h - 956) < 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(11)}`, r.missing ? '(không tìm thấy nội dung)' : `${r.w.toFixed(0)}x${r.h.toFixed(0)} @ (${r.x.toFixed(0)},${r.y.toFixed(0)})`);
  if (!ok) failures.push(id);
  await page.evaluate(() => window.__ios.mod.wm.goHome());
  await page.waitForFunction(() => window.__ios.mod.wm.mode === 'home', null, { timeout: 5000 }).catch(() => {});
}

if (errors.length) { console.log('\nLỗi JS/console:'); errors.forEach((e) => console.log(' -', e.slice(0, 200))); }
await browser.close();
const bad = failures.length + errors.length;
console.log(bad ? `\n${bad} vấn đề.` : '\nTất cả đạt.');
process.exit(bad ? 1 : 0);
