import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "assets", "images", "design-your-ring", "preview");
const VIEWBOX = "0 0 1200 760";

const metals = {
  platinum: {
    base: "#d8d6ce",
    dark: "#7f807c",
    mid: "#f6f4ee",
    bright: "#ffffff",
    warm: "#efe8dc"
  },
  "white-gold": {
    base: "#d6d2c4",
    dark: "#858172",
    mid: "#fff8e8",
    bright: "#ffffff",
    warm: "#f6ecd8"
  },
  "yellow-gold": {
    base: "#c9901e",
    dark: "#6e4a11",
    mid: "#f3c85d",
    bright: "#fff5bc",
    warm: "#dca934"
  },
  "rose-gold": {
    base: "#ca826e",
    dark: "#7a3f34",
    mid: "#f0b4a5",
    bright: "#ffe2d8",
    warm: "#d99a86"
  },
  palladium: {
    base: "#c7c8c1",
    dark: "#73756f",
    mid: "#eeeeea",
    bright: "#ffffff",
    warm: "#dddcd5"
  }
};

const bands = ["classic", "pave", "halo", "hidden-halo", "side-stone", "organic"];
const stones = ["round", "oval", "pear", "emerald", "princess", "marquise", "heart", "radiant", "cushion", "baguette"];

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="1200" height="760" fill="none">${body}</svg>\n`;
}

function metalDefs(key, metal) {
  return `
  <defs>
    <linearGradient id="metal-${key}" x1="186" y1="246" x2="1018" y2="664" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${metal.bright}"/>
      <stop offset="0.18" stop-color="${metal.mid}"/>
      <stop offset="0.38" stop-color="${metal.base}"/>
      <stop offset="0.54" stop-color="${metal.dark}"/>
      <stop offset="0.69" stop-color="${metal.mid}"/>
      <stop offset="0.88" stop-color="${metal.bright}"/>
      <stop offset="1" stop-color="${metal.base}"/>
    </linearGradient>
    <linearGradient id="highlight-${key}" x1="242" y1="282" x2="962" y2="506" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.88"/>
      <stop offset="0.28" stop-color="${metal.warm}" stop-opacity="0.42"/>
      <stop offset="0.53" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.74" stop-color="${metal.dark}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.72"/>
    </linearGradient>
    <radialGradient id="gem-small" cx="0" cy="0" r="1" gradientTransform="matrix(24 0 0 24 0 0)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.32" stop-color="#eaf7fb"/>
      <stop offset="0.64" stop-color="#9cb7c2" stop-opacity="0.58"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.12"/>
    </radialGradient>
    <filter id="soft-shadow" x="80" y="160" width="1040" height="580" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="26" stdDeviation="18" flood-color="#1f2420" flood-opacity="0.16"/>
    </filter>
  </defs>`;
}

function diamond(cx, cy, size = 16, opacity = 0.94) {
  return `<g transform="translate(${cx} ${cy})" opacity="${opacity}">
    <circle r="${size}" fill="url(#gem-small)" stroke="#ffffff" stroke-opacity="0.76" stroke-width="2"/>
    <path d="M0 ${-size + 3}L${size - 4} 0L0 ${size - 3}L${-size + 4} 0Z" stroke="#9db7c2" stroke-opacity="0.32" stroke-width="1.4"/>
  </g>`;
}

function paveRows() {
  const items = [];
  for (let i = 0; i < 8; i += 1) {
    const t = i / 7;
    items.push(diamond(356 + t * 170, 398 - t * 64, 12, 0.88));
    items.push(diamond(844 - t * 170, 398 - t * 64, 12, 0.88));
  }
  return items.join("");
}

function haloRow() {
  const items = [];
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const x = 600 + Math.cos(angle) * 105;
    const y = 268 + Math.sin(angle) * 122;
    items.push(diamond(x.toFixed(1), y.toFixed(1), 10, 0.86));
  }
  return items.join("");
}

function sideStones() {
  return `
    <g opacity="0.95">
      ${diamond(430, 350, 44, 0.9)}
      ${diamond(770, 350, 44, 0.9)}
    </g>`;
}

function bandSvg(style, metalKey, metal) {
  const organic = style === "organic";
  const lowerPath = organic
    ? "M214 470C266 603 394 692 598 694C802 692 934 602 986 470"
    : "M214 470C254 630 392 696 600 696C808 696 946 630 986 470";
  const shoulderPath = organic
    ? "M296 430C404 350 496 326 600 330C704 326 796 350 904 430"
    : "M298 424C420 342 508 315 600 315C692 315 780 342 902 424";
  const bridgePath = style === "hidden-halo"
    ? "M412 422C486 450 714 450 788 422"
    : "M344 424C432 382 496 358 600 358C704 358 768 382 856 424";

  const decor = [
    style === "pave" ? paveRows() : "",
    style === "halo" ? haloRow() : "",
    style === "hidden-halo" ? `<g transform="translate(0 86) scale(1 .58)" opacity="0.82">${haloRow()}</g>` : "",
    style === "side-stone" ? sideStones() : ""
  ].join("");

  return svg(`
  ${metalDefs(metalKey, metal)}
  <g filter="url(#soft-shadow)">
    <path d="${lowerPath}" stroke="${metal.dark}" stroke-opacity="0.32" stroke-width="86" stroke-linecap="round"/>
    <path d="${lowerPath}" stroke="url(#metal-${metalKey})" stroke-width="72" stroke-linecap="round"/>
    <path d="${lowerPath}" stroke="url(#highlight-${metalKey})" stroke-width="28" stroke-linecap="round" opacity="0.78"/>
    <path d="${lowerPath}" stroke="#ffffff" stroke-opacity="0.56" stroke-width="7" stroke-linecap="round"/>
    <path d="M286 478C346 602 462 650 600 654C738 650 854 602 914 478" stroke="${metal.dark}" stroke-opacity="0.28" stroke-width="8" stroke-linecap="round"/>

    <path d="${shoulderPath}" stroke="${metal.dark}" stroke-opacity="0.2" stroke-width="56" stroke-linecap="round"/>
    <path d="${shoulderPath}" stroke="url(#metal-${metalKey})" stroke-width="44" stroke-linecap="round"/>
    <path d="${shoulderPath}" stroke="#ffffff" stroke-opacity="0.62" stroke-width="10" stroke-linecap="round"/>
    <path d="${bridgePath}" stroke="${metal.dark}" stroke-opacity="0.22" stroke-width="38" stroke-linecap="round"/>
    <path d="${bridgePath}" stroke="url(#metal-${metalKey})" stroke-width="29" stroke-linecap="round"/>
    <path d="${bridgePath}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="6" stroke-linecap="round"/>
    ${decor}
  </g>`);
}

function settingSvg(metalKey, metal) {
  return svg(`
  ${metalDefs(metalKey, metal)}
  <g filter="url(#soft-shadow)">
    <path d="M490 338C510 238 548 188 600 186C652 188 690 238 710 338" stroke="${metal.dark}" stroke-opacity="0.22" stroke-width="44" stroke-linecap="round"/>
    <path d="M490 338C510 238 548 188 600 186C652 188 690 238 710 338" stroke="url(#metal-${metalKey})" stroke-width="30" stroke-linecap="round"/>
    <path d="M522 360L548 194M678 360L652 194M500 292L440 330M700 292L760 330" stroke="url(#metal-${metalKey})" stroke-width="22" stroke-linecap="round"/>
    <path d="M522 360L548 194M678 360L652 194M500 292L440 330M700 292L760 330" stroke="#ffffff" stroke-opacity="0.64" stroke-width="5" stroke-linecap="round"/>
    <circle cx="548" cy="194" r="26" fill="url(#metal-${metalKey})" stroke="#ffffff" stroke-opacity="0.72" stroke-width="4"/>
    <circle cx="652" cy="194" r="26" fill="url(#metal-${metalKey})" stroke="#ffffff" stroke-opacity="0.72" stroke-width="4"/>
    <circle cx="440" cy="330" r="22" fill="url(#metal-${metalKey})" stroke="#ffffff" stroke-opacity="0.68" stroke-width="4"/>
    <circle cx="760" cy="330" r="22" fill="url(#metal-${metalKey})" stroke="#ffffff" stroke-opacity="0.68" stroke-width="4"/>
  </g>`);
}

function stonePath(shape) {
  switch (shape) {
    case "oval":
      return { element: '<ellipse cx="600" cy="268" rx="84" ry="126"/>', line: "M600 144V392M516 268H684M544 190L656 346M656 190L544 346", table: '<ellipse cx="600" cy="254" rx="43" ry="67"/>' };
    case "pear":
      return { element: '<path d="M600 124C676 206 704 279 660 354C628 408 572 408 540 354C496 279 524 206 600 124Z"/>', line: "M600 132V390M540 246L660 246M558 188L642 348M642 188L558 348", table: '<path d="M600 174C642 224 654 274 628 322C612 352 588 352 572 322C546 274 558 224 600 174Z"/>' };
    case "emerald":
      return { element: '<path d="M520 154H680L720 194V342L680 382H520L480 342V194Z"/>', line: "M520 154L680 382M680 154L520 382M480 194H720M480 342H720M600 154V382", table: '<path d="M552 198H648L676 226V310L648 338H552L524 310V226Z"/>' };
    case "princess":
      return { element: '<path d="M500 166H700V366H500Z"/>', line: "M500 166L700 366M700 166L500 366M600 166V366M500 266H700", table: '<path d="M548 214H652V318H548Z"/>' };
    case "marquise":
      return { element: '<path d="M600 118C688 170 732 220 750 268C732 316 688 366 600 418C512 366 468 316 450 268C468 220 512 170 600 118Z"/>', line: "M600 126V410M460 268H740M522 178L678 358M678 178L522 358", table: '<path d="M600 180C660 216 690 246 700 268C690 290 660 320 600 356C540 320 510 290 500 268C510 246 540 216 600 180Z"/>' };
    case "heart":
      return { element: '<path d="M600 388C528 326 488 284 488 228C488 184 520 154 560 154C584 154 600 170 600 170C600 170 616 154 640 154C680 154 712 184 712 228C712 284 672 326 600 388Z"/>', line: "M600 178V382M526 220L674 338M674 220L526 338M488 258H712", table: '<path d="M600 320C554 282 528 252 528 218C528 194 546 178 570 178C588 178 600 194 600 194C600 194 612 178 630 178C654 178 672 194 672 218C672 252 646 282 600 320Z"/>' };
    case "radiant":
      return { element: '<path d="M520 150H680L724 194V342L680 386H520L476 342V194Z"/>', line: "M520 150L680 386M680 150L520 386M476 194H724M476 342H724M600 150V386", table: '<path d="M544 202H656L678 224V312L656 334H544L522 312V224Z"/>' };
    case "cushion":
      return { element: '<rect x="500" y="166" width="200" height="200" rx="48"/>', line: "M508 196L672 360M692 196L528 360M600 166V366M500 266H700", table: '<rect x="546" y="212" width="108" height="108" rx="30"/>' };
    case "baguette":
      return { element: '<path d="M540 142H660L700 186V350L660 394H540L500 350V186Z"/>', line: "M540 142L660 394M660 142L540 394M500 186H700M500 350H700M600 142V394", table: '<path d="M560 198H640L664 224V312L640 338H560L536 312V224Z"/>' };
    default:
      return { element: '<circle cx="600" cy="268" r="112"/>', line: "M600 156V380M488 268H712M520 188L680 348M680 188L520 348M548 166L652 370M652 166L548 370", table: '<circle cx="600" cy="250" r="58"/>' };
  }
}

function stoneSvg(shape) {
  const { element, line, table } = stonePath(shape);
  return svg(`
  <defs>
    <radialGradient id="diamond-body" cx="0" cy="0" r="1" gradientTransform="matrix(154 0 0 154 570 216)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.22" stop-color="#f2fbff"/>
      <stop offset="0.48" stop-color="#c8dbe3" stop-opacity="0.82"/>
      <stop offset="0.72" stop-color="#ffffff" stop-opacity="0.76"/>
      <stop offset="1" stop-color="#a8bec9" stop-opacity="0.44"/>
    </radialGradient>
    <linearGradient id="diamond-flash" x1="482" y1="146" x2="710" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.98"/>
      <stop offset="0.34" stop-color="#b8d8e5" stop-opacity="0.44"/>
      <stop offset="0.58" stop-color="#ffffff" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#879daa" stop-opacity="0.42"/>
    </linearGradient>
    <filter id="diamond-shadow" x="390" y="70" width="420" height="420" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="#23313a" flood-opacity="0.18"/>
    </filter>
  </defs>
  <g filter="url(#diamond-shadow)">
    <g fill="url(#diamond-body)" stroke="#ffffff" stroke-opacity="0.82" stroke-width="7">
      ${element}
    </g>
    <g fill="url(#diamond-flash)" opacity="0.36" stroke="#ffffff" stroke-opacity="0.62" stroke-width="3">
      ${table}
    </g>
    <path d="${line}" stroke="#708b9a" stroke-opacity="0.34" stroke-width="3" stroke-linecap="round"/>
    <path d="${line}" stroke="#ffffff" stroke-opacity="0.38" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="560" cy="210" r="18" fill="#ffffff" opacity="0.72"/>
    <path d="M642 184C678 214 690 258 676 304" stroke="#ffffff" stroke-opacity="0.54" stroke-width="12" stroke-linecap="round"/>
  </g>`);
}

function shadowSvg() {
  return svg(`
  <defs>
    <radialGradient id="ring-shadow" cx="0" cy="0" r="1" gradientTransform="matrix(330 0 0 48 600 646)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#1f2420" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#1f2420" stop-opacity="0.11"/>
      <stop offset="1" stop-color="#1f2420" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="600" cy="646" rx="330" ry="48" fill="url(#ring-shadow)"/>`);
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, "shadow-soft.svg"), shadowSvg(), "utf8");

for (const [metalKey, metal] of Object.entries(metals)) {
  await writeFile(path.join(OUT_DIR, `setting-${metalKey}.svg`), settingSvg(metalKey, metal), "utf8");
  for (const band of bands) {
    await writeFile(path.join(OUT_DIR, `band-${band}-${metalKey}.svg`), bandSvg(band, metalKey, metal), "utf8");
  }
}

for (const stone of stones) {
  await writeFile(path.join(OUT_DIR, `stone-${stone}.svg`), stoneSvg(stone), "utf8");
}

console.log(`Generated ${bands.length * Object.keys(metals).length + Object.keys(metals).length + stones.length + 1} preview assets in ${OUT_DIR}`);
