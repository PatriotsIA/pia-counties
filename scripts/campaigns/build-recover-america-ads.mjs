import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright';

// Original SVG composition using the existing official, unaltered partner assets.
const root = 'public/partners/recover-america';
const logo = `data:image/webp;base64,${readFileSync(`${root}/logo.webp`).toString('base64')}`;
const portrait = `data:image/webp;base64,${readFileSync(`${root}/rick-scarborough.webp`).toString('base64')}`;
mkdirSync(root, { recursive: true });
const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>Recover America — a Patriots in Action partner</title><rect width="${w}" height="${h}" fill="#102a45"/>${body}</svg>`;
const square = wrap(600, 600, `
<rect width="600" height="94" fill="#faf8f3"/><image href="${logo}" x="30" y="24" width="540" height="55"/>
<rect y="94" width="600" height="3" fill="#d4b77c"/>
<image href="${portrait}" x="329" y="97" width="271" height="393" preserveAspectRatio="xMidYMin slice"/>
<text x="30" y="136" font-family="Arial" font-size="11" font-weight="700" letter-spacing="2" fill="#d4b77c">FAITH &amp; CIVIC ENGAGEMENT</text>
<g fill="white" font-family="Georgia" font-size="49"><text x="30" y="205">A voice for</text><text x="30" y="263">families.</text></g>
<rect x="30" y="289" width="52" height="2" fill="#d4b77c"/>
<g fill="#dce4eb" font-family="Arial" font-size="18"><text x="30" y="329">Explore the mission</text><text x="30" y="355">and the Protect</text><text x="30" y="381">Children pledge.</text></g>
<text x="30" y="448" font-family="Arial" font-size="11" letter-spacing="1.1" fill="#d4b77c">A PATRIOTS IN ACTION PARTNER</text>
<rect x="30" y="482" width="540" height="62" fill="#ba2635"/>
<text x="52" y="520" fill="white" font-family="Arial" font-size="17" font-weight="700">MEET RECOVER AMERICA</text><text x="531" y="522" fill="white" font-family="Arial" font-size="26">→</text>
<text x="30" y="576" fill="#c1cbd6" font-family="Arial" font-size="12">Learn more at PatriotsInAction.com</text>`);
const banner = wrap(980, 250, `
<rect width="980" height="4" fill="#d4b77c"/>
<rect x="28" y="23" width="370" height="53" fill="#faf8f3"/><image href="${logo}" x="40" y="33" width="346" height="33"/>
<text x="28" y="125" font-family="Georgia" font-size="37" fill="white">A voice for families.</text>
<text x="28" y="159" font-family="Arial" font-size="16" fill="#dce4eb">Explore the mission and the Protect Children pledge.</text>
<text x="28" y="220" font-family="Arial" font-size="10" letter-spacing="1.3" fill="#d4b77c">A PATRIOTS IN ACTION PARTNER</text>
<rect x="492" y="188" width="242" height="43" fill="#ba2635"/><text x="510" y="215" font-family="Arial" font-size="12" font-weight="700" fill="white">MEET RECOVER AMERICA →</text>
<image href="${portrait}" x="770" y="4" width="210" height="246" preserveAspectRatio="xMidYMin slice"/><rect x="767" y="4" width="3" height="246" fill="#d4b77c"/>`);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const [format, svg, width, height] of [['square', square, 600, 600], ['banner', banner, 980, 250]]) {
    const file = path.resolve(`${root}/${format}`);
    writeFileSync(`${file}.svg`, svg);
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(`file://${file}.svg`);
    await page.screenshot({ path: `/tmp/recover-america-${format}.png` });
    execFileSync('magick', [`/tmp/recover-america-${format}.png`, '-strip', '-quality', '90', `${file}.webp`]);
    await page.close();
  }
} finally { await browser.close(); }
