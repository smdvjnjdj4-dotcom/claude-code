// Deterministic frame renderer: node render.cjs <from> <to> [fps] [outdir] [workers]  — or --stills t1,t2,...
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const open = async () => {
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(__dirname, 'stage.html'));
    await p.waitForFunction(() => window.__ready === true);
    await p.waitForTimeout(400);
    return p;
  };
  if (args[0] === '--stills') {
    const p = await open();
    fs.mkdirSync('stills', { recursive: true });
    for (const t of args[1].split(',').map(Number)) { await p.evaluate((t) => window.render(t), t); await p.screenshot({ path: `stills/t${String(t).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 85 }); }
    await b.close(); return;
  }
  const [from, to] = [Number(args[0]), Number(args[1])];
  const fps = Number(args[2] || 60), out = args[3] || 'frames', W = Number(args[4] || 4);
  fs.mkdirSync(out, { recursive: true });
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const per = Math.ceil((f1 - f0) / W);
  const t0 = Date.now();
  await Promise.all(Array.from({ length: W }, async (_, w) => {
    const p = await open();
    // warm-up: render sequentially from the start of this chunk so caption state is consistent
    for (let f = f0 + w * per; f < Math.min(f1, f0 + (w + 1) * per); f++) {
      await p.evaluate((t) => window.render(t), f / fps);
      await p.screenshot({ path: `${out}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    }
  }));
  console.log(`rendered ${f1 - f0} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await b.close();
})();
