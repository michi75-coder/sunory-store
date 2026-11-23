# sunory-store

Sunory's store screenshots, kept out of the app's repository: the scene photos, the showcase
captures and the composed images. The showcase mode itself lives in the app
(`src/features/showcase/`).

```
photos/                         the four scene photos (1632 × 2912)
screens/<language>/             the iPhone simulator captures, <scene>-<language>.png
screens/android/<language>/     the Android emulator captures (Pixel 8, 1080 × 2400), same names
output/appStore-6.3/<language>/ 1206 × 2622, the size App Store Connect requires
output/appStore-6.9/<language>/ 1320 × 2868, optional
output/googlePlay/<language>/   1080 × 1920 (Play refuses a side more than twice the other)
output/googlePlay/               icon-512.png, feature-graphic-<language>.png (1024 × 500)
brand/icon.png                  the app icon, copied from the app's `assets/icon.png`
```

`yarn install` once, with Node 22.

## Push the photos into the simulator

With Sunory's development build installed and the simulator booted:

```sh
yarn push-photos
```

It copies `photos/coast.png`, `mountain.png`, `apartment.png` and `village.png` into the app's
documents folder (`showcase/`), where the showcase mode reads them. Run it again after
reinstalling the app. Another bundle ID: `yarn push-photos com.example.app`.

## Take the screenshots

Settings → Development → Showcase mode → pick a scene. Sunory opens on the right screen, with
the place, the time and the phone's attitude frozen: everything shown is computed for real.
Take the screenshot with `Cmd+S` in the simulator (iPhone 17 Pro Max, 1320 × 2868), in French
then in English. "Leave showcase mode" reloads the app.

## Compose the store images

Put the captures in `screens/<language>/<scene>-<language>.png` (`mapArc`, `coast`,
`apartment`, `mountain`, `village`, `sun`), then:

```sh
yarn compose
```

Each capture goes in a phone, over its scene's photo blurred (the map's scenes, which have no
photo, over their own capture blurred), under a short title; the status bar
shows the scene's time (12-hour in English) and a full battery instead of the simulator's 09:41
and charging icon. The PNGs are opaque: both stores refuse an alpha channel. Titles, times and
store order are in `scripts/composeStoreScreens.js`.

`yarn compose googlePlay` renders one canvas, `yarn compose googlePlay mapArc` one of its scenes. Google Play's images use the Android captures in
an Android frame: the composition redraws the clock and the Wi-Fi icon, as it does on iPhone.

## Google Play's icon and feature graphic

```sh
yarn compose-play
```

The 512 × 512 icon from `brand/icon.png`, and the 1024 × 500 feature graphic: the coast photo,
the icon, the name and a tagline per language (`scripts/composePlayAssets.js`). Copy the app's
`assets/icon.png` into `brand/` again whenever the icon changes.

## App preview (video)

A short video of the map, for the App Store's app preview (and, uploaded to YouTube, Google
Play's promo video). In the simulator, stage the map scene, then freeze the status bar and record:

```sh
xcrun simctl status_bar booted override --time 20:00 --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4
xcrun simctl io booted recordVideo screens/video/map-fr.mov   # Ctrl+C to stop
xcrun simctl status_bar booted clear
```

Slide the time slider slowly, tilt the map: keep it under 30 seconds. Then:

```sh
yarn compose-preview screens/video/map-fr.mov fr          # the whole recording
yarn compose-preview screens/video/map-fr.mov fr 2 24     # from 2 s, 24 s long
yarn compose-preview screens/video/map-fr.mov fr 0 12 0.8  # 12 s slowed to 15 s
```

`output/appPreview/<language>/preview.mp4`: 886 × 1920, 30 fps, H.264, with a silent stereo track
(App Store Connect wants audio), between 15 and 30 seconds as Apple requires. Needs `ffmpeg`.
