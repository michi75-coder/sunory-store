// Google Play's listing images: the 512 × 512 icon and the 1024 × 500 feature graphic, in each
// language. Run `yarn compose-play`; the results land in `output/googlePlay/`.
const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const { PNG } = require("pngjs");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "output", "googlePlay");
const FONT_FILES = [
  path.join(ROOT, "node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf"),
  path.join(ROOT, "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
];
const COLORS = { inkDeep: "#0B1117", warmIvory: "#F5F1E8" };

const ICON_SIZE = 512;
const FEATURE = { width: 1024, height: 500 };
// The coast photo is 1632 × 2912; this band keeps the setting sun and the horizon.
const COAST = { file: "coast.png", width: 1632, height: 2912, bandTop: 1010 };
const TAGLINES = {
  fr: "La course du soleil,\npartout, n'importe quel jour",
  en: "The sun's path,\nanywhere, any day",
};

const dataUrl = (filePath) =>
  `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;

// Both stores refuse an alpha channel on their screenshots and feature graphics.
const opaquePng = (image) =>
  PNG.sync.write(
    { width: image.width, height: image.height, data: image.pixels },
    { colorType: 2, inputColorType: 6, inputHasAlpha: true },
  );

const render = (svg, width) =>
  new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Manrope" },
  }).render();

const featureSvg = (language) => {
  const photoScale = FEATURE.width / COAST.width;
  const iconSize = 168;
  const iconLeft = 64;
  const iconTop = (FEATURE.height - iconSize) / 2;
  const textLeft = iconLeft + iconSize + 44;
  const taglineLines = TAGLINES[language]
    .split("\n")
    .map(
      (line, lineIndex) =>
        `<text x="${textLeft}" y="${300 + lineIndex * 42}" font-family="Inter" font-weight="600" font-size="32" fill="${COLORS.warmIvory}" fill-opacity="0.85">${line}</text>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FEATURE.width}" height="${FEATURE.height}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLORS.inkDeep}" stop-opacity="0.8"/>
      <stop offset="0.55" stop-color="${COLORS.inkDeep}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${COLORS.inkDeep}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="iconShape"><rect x="${iconLeft}" y="${iconTop}" width="${iconSize}" height="${iconSize}" rx="${iconSize * 0.22}"/></clipPath>
    <filter id="iconShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <image href="${dataUrl(path.join(ROOT, "photos", COAST.file))}" x="0" y="${-COAST.bandTop * photoScale}" width="${FEATURE.width}" height="${COAST.height * photoScale}"/>
  <rect width="100%" height="100%" fill="url(#shade)"/>
  <rect x="${iconLeft}" y="${iconTop + 10}" width="${iconSize}" height="${iconSize}" rx="${iconSize * 0.22}" fill="#000000" opacity="0.45" filter="url(#iconShadow)"/>
  <image href="${dataUrl(path.join(ROOT, "brand", "icon.png"))}" x="${iconLeft}" y="${iconTop}" width="${iconSize}" height="${iconSize}" clip-path="url(#iconShape)"/>
  <text x="${textLeft}" y="236" font-family="Manrope" font-weight="700" font-size="92" fill="${COLORS.warmIvory}">Sunory</text>
  ${taglineLines}
</svg>`;
};

const iconSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}">
  <image href="${dataUrl(path.join(ROOT, "brand", "icon.png"))}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>
</svg>`;

const renderAll = () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT, "icon-512.png"), render(iconSvg(), ICON_SIZE).asPng());
  for (const language of Object.keys(TAGLINES)) {
    const image = render(featureSvg(language), FEATURE.width);
    fs.writeFileSync(path.join(OUTPUT, `feature-graphic-${language}.png`), opaquePng(image));
  }
};

renderAll();
