// Composes the store screenshots: each capture of the showcase mode in a phone, over its scene's
// photograph, blurred, under a short title. Run `yarn compose` once the captures are in
// `screens/<language>/`; the results land in `output/`. See `README.md`.
const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const { PNG } = require("pngjs");

const ROOT = path.join(__dirname, "..");
const FONT_FILES = [
  path.join(ROOT, "node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf"),
  path.join(ROOT, "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
];

// The charter's colours, from the app's `src/config/theme/theme.ts`.
const COLORS = { midnightInk: "#101820", inkDeep: "#0B1117", warmIvory: "#F5F1E8" };

// App Store: the 6.3-inch iPhone is the one size it requires, the 6.9-inch the largest.
// Google Play refuses a side more than twice the other: 9:16 there.
const CANVASES = {
  "appStore-6.3": { width: 1206, height: 2622 },
  "appStore-6.9": { width: 1320, height: 2868 },
  googlePlay: { width: 1080, height: 1920 },
};

// Where the simulator draws the status bar in a 1320 × 2868 capture.
const CAPTURE = { width: 1320, height: 2868 };
const STATUS_TIME = { x: 170, y: 64, width: 170, height: 66, baseline: 117, left: 182 };
const STATUS_BATTERY = { x: 1088, y: 58, width: 150, height: 84 };
const ISLAND = { x: 472, y: 42, width: 376, height: 110 };

// Ordered as on the store: the first three are what a browser sees without scrolling.
const SCENES = [
  {
    id: "coast",
    background: "coast.png",
    clock: "21:00",
    titles: { fr: "Sache où le soleil\nse couchera", en: "See where the sun\nwill set" },
  },
  {
    id: "apartment",
    background: "apartment.png",
    clock: "12:20",
    titles: { fr: "Le soleil entre-t-il\nchez toi ?", en: "Will the sun\nreach your home?" },
  },
  {
    id: "mountain",
    background: "mountain.png",
    clock: "19:14",
    titles: {
      fr: "Quand passe-t-il\nderrière la crête ?",
      en: "When does it slip\nbehind the ridge?",
    },
  },
  {
    id: "village",
    background: "village.png",
    clock: "19:20",
    titles: { fr: "La golden hour,\nà la minute près", en: "Golden hour,\nto the minute" },
  },
  {
    id: "sun",
    background: "village.png",
    clock: "19:20",
    titles: { fr: "Toute la journée\ndu soleil", en: "The sun's whole day\nat a glance" },
  },
  {
    id: "compass",
    background: "village.png",
    clock: "19:20",
    titles: {
      fr: "Partout dans le monde,\nn'importe quel jour",
      en: "Anywhere in the world,\nany day",
    },
  },
];

const dataUrl = (filePath) =>
  `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;

const escapeText = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const titleLines = (title, canvas) => {
  const fontSize = Math.round(canvas.width * 0.072);
  const lineHeight = Math.round(fontSize * 1.18);
  const top = Math.round(canvas.height * 0.075);
  return title
    .split("\n")
    .map(
      (line, lineIndex) =>
        `<text x="${canvas.width / 2}" y="${top + fontSize + lineIndex * lineHeight}" text-anchor="middle" font-family="Manrope" font-weight="700" font-size="${fontSize}" fill="${COLORS.warmIvory}">${escapeText(line)}</text>`,
    )
    .join("");
};

// The simulator's "09:41" and charging battery, replaced by the scene's time and a full battery:
// each spot is covered by the blurred strip just under it, faded at its edges: the sky or the
// screen's ground carries on behind the new glyphs.
// An English iPhone shows a 12-hour clock without AM or PM in its status bar.
const statusClock = (clock, language) => {
  if (language !== "en") {
    return clock;
  }
  const [hours, minutes] = clock.split(":").map(Number);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, "0")}`;
};

const statusBar = (clock) => `
  <g mask="url(#timeSpot)"><use href="#capture" filter="url(#smudge)"/></g>
  <g mask="url(#batterySpot)"><use href="#capture" filter="url(#smudge)"/></g>
  <text x="${STATUS_TIME.left}" y="${STATUS_TIME.baseline}" font-family="Inter" font-weight="600" font-size="54" fill="#FFFFFF">${clock}</text>
  <rect x="1106" y="78" width="84" height="40" rx="12" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="3"/>
  <rect x="1112" y="84" width="72" height="28" rx="7" fill="#FFFFFF"/>
  <rect x="1194" y="91" width="6" height="14" rx="3" fill="#FFFFFF" fill-opacity="0.45"/>`;

const composeSvg = (scene, language, canvas) => {
  const capturePath = path.join(ROOT, "screens", language, `${scene.id}-${language}.png`);
  const backgroundPath = path.join(ROOT, "photos", scene.background);
  const phoneTop = Math.round(canvas.height * 0.2);
  const phoneHeight = canvas.height - phoneTop - Math.round(canvas.height * 0.03);
  const scale = phoneHeight / CAPTURE.height;
  const phoneWidth = CAPTURE.width * scale;
  const phoneLeft = (canvas.width - phoneWidth) / 2;
  const bezel = Math.round(canvas.width * 0.016);
  const screenRadius = 190;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
  <defs>
    <image id="capture" href="${dataUrl(capturePath)}" width="${CAPTURE.width}" height="${CAPTURE.height}"/>
    <filter id="backdrop" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${canvas.width * 0.03}"/></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${canvas.width * 0.025}"/></filter>
    <filter id="smudge" x="0" y="0" width="100%" height="100%"><feOffset dy="-96"/><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="feather" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <clipPath id="screen"><rect width="${CAPTURE.width}" height="${CAPTURE.height}" rx="${screenRadius}"/></clipPath>
    <mask id="timeSpot"><rect x="${STATUS_TIME.x}" y="${STATUS_TIME.y}" width="${STATUS_TIME.width}" height="${STATUS_TIME.height}" rx="20" fill="#FFFFFF" filter="url(#feather)"/></mask>
    <mask id="batterySpot"><rect x="${STATUS_BATTERY.x}" y="${STATUS_BATTERY.y}" width="${STATUS_BATTERY.width}" height="${STATUS_BATTERY.height}" rx="16" fill="#FFFFFF" filter="url(#feather)"/></mask>
    <linearGradient id="titleShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COLORS.inkDeep}" stop-opacity="0.75"/>
      <stop offset="0.35" stop-color="${COLORS.inkDeep}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="${COLORS.inkDeep}" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <image href="${dataUrl(backgroundPath)}" x="-5%" y="-5%" width="110%" height="110%" preserveAspectRatio="xMidYMid slice" filter="url(#backdrop)"/>
  <rect width="100%" height="100%" fill="url(#titleShade)"/>
  ${titleLines(scene.titles[language], canvas)}
  <rect x="${phoneLeft - bezel}" y="${phoneTop - bezel + canvas.height * 0.012}" width="${phoneWidth + 2 * bezel}" height="${phoneHeight + 2 * bezel}" rx="${screenRadius * scale + bezel}" fill="#000000" opacity="0.55" filter="url(#shadow)"/>
  <rect x="${phoneLeft - bezel}" y="${phoneTop - bezel}" width="${phoneWidth + 2 * bezel}" height="${phoneHeight + 2 * bezel}" rx="${screenRadius * scale + bezel}" fill="${COLORS.inkDeep}" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2"/>
  <g transform="translate(${phoneLeft} ${phoneTop}) scale(${scale})">
    <g clip-path="url(#screen)">
      <use href="#capture"/>
      ${statusBar(statusClock(scene.clock, language))}
      <rect x="${ISLAND.x}" y="${ISLAND.y}" width="${ISLAND.width}" height="${ISLAND.height}" rx="${ISLAND.height / 2}" fill="#000000"/>
    </g>
  </g>
</svg>`;
};

// Both stores refuse a screenshot with an alpha channel, even a fully opaque one.
const opaquePng = (image) =>
  PNG.sync.write(
    { width: image.width, height: image.height, data: image.pixels },
    { colorType: 2, inputColorType: 6, inputHasAlpha: true },
  );

const renderAll = () => {
  for (const language of ["fr", "en"]) {
    for (const [canvasName, canvas] of Object.entries(CANVASES)) {
      const outputDirectory = path.join(ROOT, "output", canvasName, language);
      fs.mkdirSync(outputDirectory, { recursive: true });
      SCENES.forEach((scene, sceneIndex) => {
        const capturePath = path.join(ROOT, "screens", language, `${scene.id}-${language}.png`);
        if (!fs.existsSync(capturePath)) {
          console.warn(`Missing capture: ${path.relative(ROOT, capturePath)}`);
          return;
        }
        const svg = composeSvg(scene, language, canvas);
        const image = new Resvg(svg, {
          fitTo: { mode: "width", value: canvas.width },
          font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Manrope" },
        }).render();
        const fileName = `${String(sceneIndex + 1).padStart(2, "0")}-${scene.id}.png`;
        fs.writeFileSync(path.join(outputDirectory, fileName), opaquePng(image));
      });
    }
  }
};

renderAll();
