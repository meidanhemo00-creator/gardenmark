async (page) => {
  const out = '/Users/meidis/Documents/gardenmark-social';
  await page.setViewportSize({ width: 1080, height: 1350 });
  const posts = [['colors', 6, '02-colors'], ['saturdays', 6, '04-saturdays'], ['questions', 7, '05-questions'], ['paws', 6, '06-paws']];
  const report = [];
  for (const [p, count, dir] of posts) {
    for (let s = 0; s < count; s++) {
      await page.goto(`http://localhost:5191/social/post.html?post=${p}&s=${s}`);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
      await page.waitForTimeout(250);
      const r = await page.evaluate(() => {
        const o = [...window.__shrunk];
        const st = document.querySelector('.stage').getBoundingClientRect();
        const kids = [...document.querySelector('.stage').children].map(e => e.getBoundingClientRect());
        const top = Math.min(...kids.map(k => k.top)), bot = Math.max(...kids.map(k => k.bottom));
        if (top < st.top - 2 || bot > st.bottom + 2) o.push(`overflow stage ${Math.round(top)}-${Math.round(bot)} vs ${Math.round(st.top)}-${Math.round(st.bottom)}`);
        document.querySelectorAll('h1,h2,.body,.label,.list,.stack').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.left < 78 || b.right > 1002)) o.push(`margin ${el.className||el.tagName} ${Math.round(b.left)}-${Math.round(b.right)}`); });
        return o;
      });
      if (r.length) report.push(`${p}-${s + 1}: ${r.join(' ; ')}`);
      await page.locator('.slide').screenshot({ path: `${out}/${dir}/slide-${String(s + 1).padStart(2, '0')}.png` });
    }
  }
  return report;
}
