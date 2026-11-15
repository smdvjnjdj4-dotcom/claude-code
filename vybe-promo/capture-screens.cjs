// Captures real VYBE screens (demo profile, local mode) for the promo film.
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const go = async (h, w = 1400) => { await page.goto('http://localhost:4173/#/' + h); await page.waitForTimeout(w); await dismiss(); };
  const dismiss = async () => { for (let k = 0; k < 8 && await page.getByRole('button', { name: 'Weiter', exact: true }).count(); k++) { await page.getByRole('button', { name: 'Weiter', exact: true }).click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500); } };
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  await page.goto('http://localhost:4173/'); await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Mit Demo-Profil erkunden' }).click(); await page.waitForTimeout(1500);
  // community profile
  await go('community');
  await page.getByRole('button', { name: 'Profil erstellen' }).first().click(); await page.waitForTimeout(500);
  const dlg = page.getByRole('dialog');
  await page.locator('#cp-age').fill('22'); await page.locator('#cp-handle').fill('alex.vybe'); await page.locator('#cp-city').fill('Berlin');
  for (const n of ['Trainingspartner', 'Techno', 'Indie', 'Lesen', 'Laufen', 'Fotografie']) await dlg.getByRole('button', { name: n, exact: true }).first().click();
  await page.locator('#cp-add-series').fill('Dark'); await page.locator('#cp-add-series').press('Enter');
  await dlg.getByRole('button', { name: 'Speichern' }).click(); await page.waitForTimeout(1200); await dismiss();
  await go('community/people');
  for (let i = 0; i < 2; i++) { await page.getByRole('button', { name: 'Annehmen' }).first().click(); await page.waitForTimeout(800); await dismiss(); }
  await go('community/chats');
  await page.getByRole('button', { name: 'Neuer Chat' }).click(); await page.waitForTimeout(400);
  await page.getByRole('dialog').getByRole('button', { name: /Mira/ }).click(); await page.waitForTimeout(400);
  await page.locator('#chat-input').fill('Morgen 7 Uhr bouldern? 🧗'); await page.getByRole('button', { name: 'Senden' }).click(); await page.waitForTimeout(2600); await dismiss();
  // give the chat an 8-day mutual streak (flame accessory) by editing the stored demo state
  await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open('vybe-db'); q.onsuccess = () => r(q.result); });
    const tx = (m) => db.transaction('kv', m).objectStore('kv');
    const raw = await new Promise((r) => { const q = tx('readonly').get('vybe-state'); q.onsuccess = () => r(q.result); });
    const s = JSON.parse(raw);
    const days = []; for (let i = 8; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); }
    const docs = s.state.communityDocs;
    docs['outbox/local-me'].threads['demo-mira'].days = days;
    docs['outbox/demo-mira'].threads['local-me'].days = days;
    await new Promise((r) => { const q = tx('readwrite').put(JSON.stringify(s), 'vybe-state'); q.onsuccess = r; });
  });
  await page.reload(); await page.waitForTimeout(1500); await dismiss();
  await go('community/chats');
  await page.getByRole('button', { name: /Mira/ }).first().click(); await page.waitForTimeout(1200); await shot('chat');
  // connect four mid-game vs Jonas
  await go('community/games');
  await page.getByRole('button', { name: /Vier gewinnt/ }).first().click(); await page.waitForTimeout(400);
  const d2 = page.getByRole('dialog');
  await d2.getByRole('button', { name: /Vier gewinnt/ }).click(); await d2.getByRole('button', { name: /Jonas/ }).click();
  await d2.getByRole('button', { name: 'Herausfordern' }).click(); await page.waitForTimeout(2500);
  for (const col of [3, 2, 4]) { await page.getByRole('dialog').getByRole('button', { name: `Spalte ${col + 1}` }).click().catch(() => {}); await page.waitForTimeout(2200); }
  await shot('game'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await go('community/discover'); await page.waitForTimeout(600); await shot('discover');
  await go('community/search'); await page.locator('#search-q').fill('@sam'); await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Sam/ }).first().click(); await page.waitForTimeout(800); await shot('creator'); await page.keyboard.press('Escape');
  await go('community/feed'); await shot('feed');
  for (const [h, n] of [['home', 'home'], ['character', 'character'], ['missions', 'missions'], ['habits', 'habits'], ['money', 'money'], ['achievements', 'achievements'], ['stats', 'stats'], ['companion', 'companion']]) { await go(h, 1800); await shot(n); }
  await b.close();
})().catch((e) => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
