import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
for (const id of ['greg-abbott','ken-paxton']) for (const format of ['square','banner']) {
  const width = format === 'square' ? 600 : 980, height = format === 'square' ? 600 : 250;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const base = path.resolve(`public/campaigns/${id}/${format}`);
  await page.goto(`file://${base}.svg`);
  await page.screenshot({ path: `/tmp/${id}-${format}.png` });
  execFileSync('magick', [`/tmp/${id}-${format}.png`, '-strip', '-quality', '90', `${base}.webp`]);
  await page.close();
}
await browser.close();
