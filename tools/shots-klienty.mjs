/* Кадры главы 0.2 «Клиенты»: Play UI с вкладками, Run all, скачиванием и веб-терминалом.
   Стенд должен быть поднят: cd ~/clickhouse-practice && docker compose up -d

     node tools/shots-klienty.mjs            все кадры
     node tools/shots-klienty.mjs 12-play-terminal   один кадр

   Рамки — как в tools/shots.mjs: красные, с номером, рисуются поверх страницы до снимка. */
const pw = (await import('/Users/makarovmn/python_presentations/tools/node_modules/playwright/index.js')).default;

const root = new URL('..', import.meta.url).pathname;
const WIDTH = 1280;
const MARK = '#E0442B';
const only = process.argv.slice(2);

async function rect(page, at) {
  const r = await page.evaluate(at => {
    let el;
    if (at.startsWith('r:')) el = [...document.querySelectorAll('query-result')].map(q => q.shadowRoot?.querySelector(at.slice(2))).find(Boolean);
    else if (at.startsWith('p:')) el = document.querySelector('query-progress')?.shadowRoot?.querySelector(at.slice(2));
    else el = document.querySelector(at);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }, at);
  if (!r) throw new Error(`цель не найдена: ${at}`);
  return r;
}

async function frame(page, at, label, pad = 4) {
  const r = typeof at === 'string' ? await rect(page, at) : at;
  await page.evaluate(({ r, label, color, pad }) => {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'fixed', left: `${r.x - pad}px`, top: `${r.y - pad}px`, width: `${r.w + 2 * pad}px`, height: `${r.h + 2 * pad}px`,
      border: `3px solid ${color}`, borderRadius: '6px', boxSizing: 'border-box',
      boxShadow: '0 0 0 2px #fff', pointerEvents: 'none', zIndex: 2147483647,
    });
    const b = document.createElement('span');
    b.textContent = label;
    Object.assign(b.style, {
      position: 'absolute', [r.y - pad < 16 ? 'bottom' : 'top']: '-14px', right: '-14px', minWidth: '24px', height: '24px', padding: '0 6px',
      borderRadius: '12px', background: color, color: '#fff', font: '700 14px/24px Arial, sans-serif',
      textAlign: 'center', boxShadow: '0 0 0 2px #fff', boxSizing: 'border-box',
    });
    d.appendChild(b);
    document.body.appendChild(d);
  }, { r, label, color: MARK, pad });
}

async function open(browser, height = 720) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:8123/play');
  await page.fill('#user', 'student');
  await page.fill('#password', 'student');
  return page;
}

async function run(page, query, button = '#run') {
  await page.fill('#query', query);
  await page.click(button);
  await page.waitForFunction(() => [...document.querySelectorAll('query-result')].some(q => {
    const r = q.shadowRoot; const t = r?.querySelector('#data-table'); const e = r?.querySelector('#error');
    return (t && t.rows.length > 0) || (e && e.textContent.trim());
  }), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('#query').blur();
  await page.mouse.move(WIDTH - 20, 700);
}

const shots = {
  /* Карта экрана: вкладки, редактор, Run, итог, скачать, список баз, терминал. */
  async '08-play-map'(page) {
    await run(page, 'SELECT title, brand, price\nFROM shop.products\nLIMIT 5');
    await frame(page, '#tab-add', '1');
    await frame(page, '#query', '2', 2);
    await frame(page, '#run', '3');
    await frame(page, 'p:#progress-text', '4');
    await frame(page, '#download-div', '5');
    await frame(page, '#databases-icon', '6');
    await frame(page, '#terminal-icon', '7');
  },
  /* Два запроса в одном поле: Run one и Run all, два результата. */
  async '09-play-run-all'(page) {
    await run(page, 'SELECT count() FROM shop.orders;\nSELECT count() FROM shop.customers;', '#run-all');
    await frame(page, '#run', '1');
    await frame(page, '#run-all', '2');
    const tables = await page.evaluate(() => [...document.querySelectorAll('query-result')]
      .map(q => q.shadowRoot?.querySelector('#data-table')).filter(t => t && t.rows.length)
      .map(t => { const b = t.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }));
    for (const [i, r] of tables.entries()) await frame(page, r, String(3 + i), 3);
    return { clip: { x: 0, y: 0, width: WIDTH, height: Math.ceil(tables.at(-1).y + tables.at(-1).h + 20) } };
  },
  /* Меню скачивания результата. */
  async '10-play-download'(page) {
    await run(page, 'SELECT title, brand, price\nFROM shop.products\nLIMIT 5');
    await page.click('#download-div');
    await page.waitForTimeout(600);
    await frame(page, '#download-format', '1');
    await frame(page, '#download-button', '2');
    const d = await rect(page, '#download-dropdown');
    return { clip: { x: WIDTH - 760, y: 150, width: 760, height: Math.ceil(d.y + d.h + 40 - 150) } };
  },
  /* Большая таблица без LIMIT: Play UI показывает первые 1000 строк и пишет «1000+». */
  async '11-play-1000'(page) {
    await page.fill('#query', 'SELECT event_time, event_type\nFROM web.events');
    await page.click('#run');
    await page.waitForFunction(() => document.querySelector('query-progress')?.shadowRoot
      ?.querySelector('#progress-text')?.textContent.includes('1000+'), null, { timeout: 60000 });
    await page.waitForTimeout(800);
    await page.locator('#query').blur();
    await page.mouse.move(WIDTH - 20, 700);
    await frame(page, 'p:#progress-text', '1');
    return { clip: { x: 0, y: 0, width: WIDTH, height: 330 } };
  },
  /* Веб-терминал: clickhouse-client прямо в браузере. */
  async '12-play-terminal'(page) {
    await page.click('#terminal-icon');
    await page.waitForTimeout(2500);
    await page.keyboard.type('SELECT count() FROM web.events', { delay: 15 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    const t = await rect(page, '#terminal-panel');
    return { clip: { x: 0, y: 0, width: WIDTH, height: Math.ceil(t.y + t.h) + 4 } };
  },
};

const browser = await pw.chromium.launch();
for (const [name, fn] of Object.entries(shots)) {
  if (only.length && !only.includes(name)) continue;
  const page = await open(browser);
  const res = (await fn(page)) || {};
  await page.screenshot({ path: `${root}shots/${name}.png`, clip: res.clip || { x: 0, y: 0, width: WIDTH, height: 720 } });
  console.log('снят', name);
  await page.close();
}
await browser.close();
