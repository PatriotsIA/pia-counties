/** Rebuild the editable SVG ad artwork; official photos are preserved, never synthesized. */
import { readFile, writeFile } from "node:fs/promises";
import { supportCampaigns } from "../../src/data/campaigns";
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
for (const c of supportCampaigns) {
  const photo = `data:image/webp;base64,${(await readFile(`public${c.portrait}`)).toString("base64")}`;
  const align = c.id === "ken-paxton" ? "xMaxYMin" : "xMidYMin";
  const office = c.office.replace(" · ", " • ");
  for (const format of ["square", "banner"]) {
    const square = format === "square";
    const width = square ? 600 : 980, height = square ? 600 : 250;
    const artwork = square ? `
      <image href="${photo}" x="325" y="0" width="275" height="520" preserveAspectRatio="${align} slice" />
      <path d="M0 0H325V520H0Z" fill="#102a45"/>
      <text x="30" y="43" font-size="12" letter-spacing="1.5" font-weight="700">PATRIOTS IN ACTION SUPPORTS</text>
      <path d="M30 70H285" stroke="#c6a65d" stroke-width="2"/>
      <text x="30" y="140" font-size="28" letter-spacing="5" fill="#e3c78b" font-weight="700">VOTE</text>
      <text x="25" y="220" font-family="Georgia,serif" font-size="76">${c.firstName}</text>
      <text x="25" y="301" font-family="Georgia,serif" font-size="76">${c.lastName}</text>
      <text x="30" y="350" font-size="17" font-weight="700">${esc(office)}</text>
      <rect x="30" y="390" width="255" height="58" fill="#ba2635"/>
      <text x="53" y="426" font-size="17" font-weight="700">MEET ${c.firstName.toUpperCase()} ${c.lastName.toUpperCase()} →</text>
      <path d="M0 520H600" stroke="#c6a65d" stroke-width="3"/>
      <text x="30" y="552" font-size="16">Unpaid support message created by</text>
      <text x="30" y="578" font-size="16" font-weight="700">Patriots in Action.</text>
      <text x="550" y="576" font-size="34" fill="#e3c78b">★</text>
    ` : `
      <image href="${photo}" x="720" y="0" width="260" height="250" preserveAspectRatio="${align} slice"/>
      <path d="M0 0H720V250H0Z" fill="#102a45"/>
      <text x="32" y="34" font-size="12" letter-spacing="2" font-weight="700">PATRIOTS IN ACTION SUPPORTS</text>
      <text x="30" y="112" font-family="Georgia,serif" font-size="57">Vote ${c.name}</text>
      <text x="32" y="154" font-size="19" letter-spacing="1" fill="#e3c78b">${esc(office)}</text>
      <rect x="470" y="137" width="215" height="48" fill="#ba2635"/>
      <text x="491" y="168" font-size="15" font-weight="700">MEET ${c.firstName.toUpperCase()} ${c.lastName.toUpperCase()} →</text>
      <path d="M32 202H685" stroke="#c6a65d"/>
      <text x="32" y="229" font-size="14">Unpaid support message created by Patriots in Action.</text>
    `;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Vote ${c.name}. Unpaid support message created by Patriots in Action."><rect width="100%" height="100%" fill="#102a45"/><g fill="white" font-family="Arial,sans-serif">${artwork}</g></svg>`;
    await writeFile(`public/campaigns/${c.id}/${format}.svg`,svg);
  }
}
