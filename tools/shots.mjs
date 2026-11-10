/* Кадры Play UI на живом стенде (http://localhost:8123/play).
   Стенд должен быть поднят: cd ~/clickhouse-practice && docker compose up -d

     node tools/shots.mjs                  все кадры из tools/shots.json
     node tools/shots.mjs 03-play-version  один кадр

   Каждый кадр снимается в новом окне браузера: Play UI хранит вкладки и
   запросы в localStorage, и прошлый прогон не должен попадать в кадр.
   Описание кадра (tools/shots.json):
     name      имя файла в shots/ без .png
     query     текст запроса; пустая строка — кадр без запуска
     login     false — оставить поля user и password пустыми (по умолчанию — student)
     password  другой пароль (для кадра с ошибкой входа)
     panel     true — открыть слева список баз и таблиц
     expand    имена баз, которые раскрыть в списке
     height    высота окна, по умолчанию 720
     mark      рамки: [{ "at": цель, "label": "1", "pad": 5 }]; label и pad необязательны;
               pad — отступ рамки от элемента, отрицательный — внутрь
     clip      обрезка: { "at": цель, "pad": 12 } или { "box": [x, y, w, h] }
     crop      false — снять окно целиком; по умолчанию кадр обрезается
               по нижнему краю результата

   Цель — CSS-селектор. Префикс «r:» ищет внутри результата запроса
   (теневой DOM query-result): «r:#data-table tr:nth-child(3)», «r:#stats».
   Префикс «text:» — элемент с таким текстом: «text:Run». */
const pw = (await import('/Users/makarovmn/python_presentations/tools/node_modules/playwright/index.js')).default;
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const all = JSON.parse(readFileSync(root + 'tools/shots.json', 'utf8'));
const only = process.argv.slice(2);
const list = only.length ? all.filter(s => only.includes(s.name)) : all;
if (!list.length) { console.error('нет таких кадров:', only.join(' ')); process.exit(1); }

const WIDTH = 1280;
const MARK = '#E0442B';

/* Прямоугольник цели в координатах окна. */
async function rect(page, at) {
  const r = await page.evaluate(at => {
    let el;
    if (at.startsWith('r:')) el = document.querySelector('query-result')?.shadowRoot?.querySelector(at.slice(2));
    else if (at.startsWith('text:')) {
      const want = at.slice(5);
      el = [...document.querySelectorAll('body *')].find(e => e.children.length === 0 && e.textContent.trim() === want);
    } else el = document.querySelector(at);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, at);
  if (!r) throw new Error(`цель не найдена: ${at}`);
  return r;
}

/* Рамка поверх страницы: рисуется до снимка, поэтому совпадает с элементом точно. */
async function frame(page, r, label, pad = 5) {
  await page.evaluate(({ r, label, color, pad }) => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'fixed', left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.w + 2 * pad}px`, height: `${r.h + 2 * pad}px`,
      border: `3px solid ${color}`, borderRadius: '6px', boxSizing: 'border-box',
      boxShadow: '0 0 0 2px #fff', pointerEvents: 'none', zIndex: 2147483647,
    });
    if (label) {
      const b = document.createElement('span');
      b.textContent = label;
      Object.assign(b.style, {
        // у верхнего края окна метка уходит вниз, иначе её срежет
        position: 'absolute', [r.y - pad < 16 ? 'bottom' : 'top']: '-14px', right: '-14px', minWidth: '24px', height: '24px', padding: '0 6px',
        borderRadius: '12px', background: color, color: '#fff', font: '700 14px/24px Arial, sans-serif',
        textAlign: 'center', boxShadow: '0 0 0 2px #fff', boxSizing: 'border-box',
      });
      d.appendChild(b);
    }
    document.body.appendChild(d);
  }, { r, label, color: MARK, pad });
}

const browser = await pw.chromium.launch();
for (const shot of list) {
  const height = shot.height || 720;
  const page = await browser.newPage({ viewport: { width: WIDTH, height }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8123/play');
  if (shot.login !== false) {
    await page.fill('#user', 'student');
    await page.fill('#password', shot.password || 'student');
  }
  if (shot.panel) {
    await page.click('#databases-icon');
    for (const db of shot.expand || []) {
      await page.locator('#databases').getByText(db, { exact: true }).first().click();
      await page.waitForTimeout(400);
    }
  }
  if (shot.query) {
    await page.fill('#query', shot.query);
    await page.click('#run');
    // результат рисуется в теневом DOM элемента query-result активной вкладки
    await page.waitForFunction(() => {
      const r = document.querySelector('query-result')?.shadowRoot;
      const t = r?.querySelector('#data-table');
      const e = r?.querySelector('#error');
      return (t && t.rows.length > 0) || (e && e.textContent.trim());
    }, null, { timeout: 60000 });
    await page.waitForTimeout(500);
  }
  await page.locator('#query').blur();
  await page.mouse.move(WIDTH - 10, height - 5);

  for (const m of shot.mark || []) await frame(page, await rect(page, m.at), m.label, m.pad);

  let clip = { x: 0, y: 0, width: WIDTH, height };
  if (shot.clip?.box) {
    const [x, y, width, h] = shot.clip.box;
    clip = { x, y, width, height: h };
  } else if (shot.clip?.at) {
    const r = await rect(page, shot.clip.at), pad = shot.clip.pad ?? 12;
    const x = Math.max(0, r.x - pad), y = Math.max(0, r.y - pad);
    clip = { x, y, width: Math.min(WIDTH - x, r.w + 2 * pad), height: Math.min(height - y, r.h + 2 * pad) };
  } else if (shot.crop !== false && shot.query) {
    const bottom = await page.evaluate(() => {
      const r = document.querySelector('query-result').shadowRoot;
      const els = ['#data_div', '#error'].map(s => r.querySelector(s)).filter(e => e && e.getBoundingClientRect().height);
      return Math.max(...els.map(e => e.getBoundingClientRect().bottom));
    });
    clip.height = Math.min(Math.ceil(bottom) + 16, height);
  }
  await page.screenshot({ path: `${root}shots/${shot.name}.png`, clip });
  console.log('снят', shot.name);
  await page.close();
}
await browser.close();
