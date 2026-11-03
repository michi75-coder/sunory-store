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
  "appStore-6.3": { width: 1206, height: 2622, device: "iphone" },
  "appStore-6.9": { width: 1320, height: 2868, device: "iphone" },
  googlePlay: { width: 1080, height: 1920, device: "android" },
};

// Where each device draws its status bar in a capture. `smudgeOffset` is how far down the strip
// that covers the original icons is taken from.
const DEVICES = {
  iphone: {
    capture: { width: 1320, height: 2868 },
    capturesFolder: (language) => path.join("screens", language),
    screenRadius: 190,
    smudgeOffset: 96,
    timeSpot: { x: 170, y: 64, width: 170, height: 66 },
    iconsSpot: { x: 1088, y: 58, width: 150, height: 84 },
    clockText: { x: 182, y: 117, fontSize: 54 },
    statusIcons: `
  <rect x="1106" y="78" width="84" height="40" rx="12" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="3"/>
  <rect x="1112" y="84" width="72" height="28" rx="7" fill="#FFFFFF"/>
  <rect x="1194" y="91" width="6" height="14" rx="3" fill="#FFFFFF" fill-opacity="0.45"/>`,
    cutout: '<rect x="472" y="42" width="376" height="110" rx="55" fill="#000000"/>',
  },
  android: {
    capture: { width: 1080, height: 2400 },
    capturesFolder: (language) => path.join("screens", "android", language),
    screenRadius: 80,
    smudgeOffset: 54,
    timeSpot: { x: -30, y: -30, width: 200, height: 88 },
    iconsSpot: { x: 868, y: -30, width: 56, height: 88 },
    clockText: { x: 56, y: 46, fontSize: 32 },
    // The Wi-Fi fan, without the "no internet" mark the emulator adds.
    statusIcons: '<path d="M 898 45 L 876 22 A 31 31 0 0 1 920 22 Z" fill="#FFFFFF"/>',
    cutout: '<circle cx="540" cy="30" r="17" fill="#000000"/>',
  },
};

// Ordered as on the store: the first three are what a browser sees without scrolling.
const SCENES = [
  {
    id: "coast",
    background: "coast.png",
    clock: "21:00",
    titles: { fr: "Où le soleil\nse couchera ?", en: "Where will\nthe sun set?" },
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
      fr: "Quand passera-t-il\nderrière la crête ?",
      en: "When will it slip\nbehind the ridge?",
    },
  },
  {
    id: "village",
    background: "village.png",
    clock: "19:20",
    titles: {
      fr: "La course du soleil,\nsur tout ce que tu vois",
      en: "The sun's path,\nover any view",
    },
  },
  {
    id: "sun",
    background: "village.png",
    clock: "19:20",
    titles: { fr: "La lumière parfaite,\nà la minute", en: "Perfect light,\nto the minute" },
  },
  {
    id: "compass",
    background: "village.png",
    clock: "19:20",
    titles: { fr: "Choisis un lieu,\nvois son soleil", en: "Pick a place,\nsee its sun" },
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

// The capture's clock and icons, replaced by the scene's time and clean icons: each spot is covered
// by the blurred strip just under it, faded at its edges: the sky or the screen's ground carries
// on behind the new glyphs.
// An English phone shows a 12-hour clock without AM or PM in its status bar.
const statusClock = (clock, language) => {
  if (language !== "en") {
    return clock;
  }
  const [hours, minutes] = clock.split(":").map(Number);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${String(minutes).padStart(2, "0")}`;
};

// Blurring fades at the capture's edges, where the original would show through: the solid inner
// rect keeps the mask opaque there, and the smudge filter restores its alpha.
const spotMask = ({ x, y, width, height }) => `
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="#FFFFFF" filter="url(#feather)"/>
  <rect x="${x + 12}" y="${y + 12}" width="${width - 24}" height="${height - 24}" fill="#FFFFFF"/>`;

const statusBar = (clock, device) => `
  <g mask="url(#timeSpot)"><use href="#capture" filter="url(#smudge)"/></g>
  <g mask="url(#iconsSpot)"><use href="#capture" filter="url(#smudge)"/></g>
  <text x="${device.clockText.x}" y="${device.clockText.y}" font-family="Inter" font-weight="600" font-size="${device.clockText.fontSize}" fill="#FFFFFF">${clock}</text>
  ${device.statusIcons}`;

const composeSvg = (scene, language, canvas) => {
  const device = DEVICES[canvas.device];
  const CAPTURE = device.capture;
  const capturePath = path.join(ROOT, device.capturesFolder(language), `${scene.id}-${language}.png`);
  const backgroundPath = path.join(ROOT, "photos", scene.background);
  const phoneTop = Math.round(canvas.height * 0.2);
  const phoneHeight = canvas.height - phoneTop - Math.round(canvas.height * 0.03);
  const scale = phoneHeight / CAPTURE.height;
  const phoneWidth = CAPTURE.width * scale;
  const phoneLeft = (canvas.width - phoneWidth) / 2;
  const bezel = Math.round(canvas.width * 0.016);
  const { screenRadius } = device;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
  <defs>
    <image id="capture" href="${dataUrl(capturePath)}" width="${CAPTURE.width}" height="${CAPTURE.height}"/>
    <filter id="backdrop" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${canvas.width * 0.03}"/></filter>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${canvas.width * 0.025}"/></filter>
    <filter id="smudge" x="0" y="0" width="100%" height="100%"><feOffset dy="-${device.smudgeOffset}"/><feGaussianBlur stdDeviation="14"/><feComponentTransfer><feFuncA type="linear" slope="100"/></feComponentTransfer></filter>
    <filter id="feather" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <clipPath id="screen"><rect width="${CAPTURE.width}" height="${CAPTURE.height}" rx="${screenRadius}"/></clipPath>
    <mask id="timeSpot">${spotMask(device.timeSpot)}</mask>
    <mask id="iconsSpot">${spotMask(device.iconsSpot)}</mask>
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
      ${statusBar(statusClock(scene.clock, language), device)}
      ${device.cutout}
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

// `yarn compose googlePlay compass` renders one canvas and one scene; without argument, everything.
const requestedCanvas = process.argv[2];
const requestedScene = process.argv[3];

const renderAll = () => {
  for (const language of ["fr", "en"]) {
    for (const [canvasName, canvas] of Object.entries(CANVASES)) {
      if (requestedCanvas && requestedCanvas !== canvasName) {
        continue;
      }
      const outputDirectory = path.join(ROOT, "output", canvasName, language);
      fs.mkdirSync(outputDirectory, { recursive: true });
      SCENES.forEach((scene, sceneIndex) => {
        if (requestedScene && requestedScene !== scene.id) {
          return;
        }
        const capturePath = path.join(
          ROOT,
          DEVICES[canvas.device].capturesFolder(language),
          `${scene.id}-${language}.png`,
        );
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
