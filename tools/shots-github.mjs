/* Кадры страницы репозитория стенда на GitHub — для главы 0.1.
   Снимаются без входа в аккаунт: так страницу видит студент.

     node tools/shots-github.mjs */
const pw = (await import('/Users/makarovmn/python_presentations/tools/node_modules/playwright/index.js')).default;

const root = new URL('..', import.meta.url).pathname;
const REPO = 'https://github.com/MaximBytecamp/clickhouse-practice';
const MARK = '#E0442B';

async function frame(page, locator, label) {
  const b = await locator.boundingBox();
  await page.evaluate(({ b, label, color }) => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'absolute', left: `${b.x + scrollX - 5}px`, top: `${b.y + scrollY - 5}px`,
      width: `${b.width + 10}px`, height: `${b.height + 10}px`, border: `3px solid ${color}`,
      borderRadius: '8px', boxShadow: '0 0 0 2px #fff', pointerEvents: 'none', zIndex: 2147483647, boxSizing: 'border-box',
    });
    if (label) {
      const s = document.createElement('span');
      s.textContent = label;
      Object.assign(s.style, {
        position: 'absolute', top: '-14px', right: '-14px', minWidth: '24px', height: '24px', borderRadius: '12px',
        background: color, color: '#fff', font: '700 14px/24px Arial, sans-serif', textAlign: 'center', boxShadow: '0 0 0 2px #fff',
      });
      d.appendChild(s);
    }
    document.body.appendChild(d);
  }, { b, label, color: MARK });
}

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' });
await page.goto(REPO, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.getByRole('button', { name: 'Code' }).first().waitFor({ timeout: 60000 });
await page.waitForTimeout(2500);

// 1. Страница репозитория: список файлов; описания коммитов догружаются отдельно
await page.waitForFunction(() => !document.querySelector('[class*="Skeleton"], .Skeleton'), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);
await frame(page, page.getByRole('button', { name: 'Code' }).first(), '1');
await page.screenshot({ path: `${root}shots/06-github-repo.png`, clip: { x: 0, y: 0, width: 1280, height: 540 } });
await page.evaluate(() => document.querySelectorAll('body > div[style*="z-index: 2147483647"]').forEach(e => e.remove()));

// 2. Меню Code: адрес для git clone и Download ZIP
const code = page.getByRole('button', { name: 'Code' }).first();
await code.click();
const zip = page.getByText('Download ZIP', { exact: true });
await zip.waitFor();
await page.waitForTimeout(400);
const url = page.locator('input[value$="clickhouse-practice.git"]').first();
await frame(page, url, '1');
await frame(page, zip, '2');
// меню — область от кнопки Code до Download ZIP, с запасом по краям
const boxes = [await code.boundingBox(), await url.boundingBox(), await zip.boundingBox()];
const x = Math.min(...boxes.map(r => r.x)) - 40, y = Math.min(...boxes.map(r => r.y)) - 24;
const right = Math.max(...boxes.map(r => r.x + r.width)) + 40, bottom = Math.max(...boxes.map(r => r.y + r.height)) + 28;
await page.screenshot({ path: `${root}shots/07-github-code-zip.png`, clip: { x, y, width: right - x, height: bottom - y } });
console.log('сняты 06-github-repo, 07-github-code-zip');
await browser.close();
