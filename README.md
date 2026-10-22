# sunory-store

Sunory's store screenshots, kept out of the app's repository: the scene photos, the showcase
captures and the composed images. The showcase mode itself lives in the app
(`src/features/showcase/`).

```
photos/                         the four scene photos (1632 × 2912)
screens/<language>/             the simulator captures, <scene>-<language>.png
output/appStore-6.3/<language>/ 1206 × 2622, the size App Store Connect requires
output/appStore-6.9/<language>/ 1320 × 2868, optional
output/googlePlay/<language>/   1080 × 1920 (Play refuses a side more than twice the other)
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

Put the captures in `screens/<language>/<scene>-<language>.png` (`coast`, `apartment`,
`mountain`, `village`, `sun`, `compass`), then:

```sh
yarn compose
```

Each capture goes in a phone, over its scene's photo blurred, under a short title; the status bar
shows the scene's time (12-hour in English) and a full battery instead of the simulator's 09:41
and charging icon. The PNGs are opaque: both stores refuse an alpha channel. Titles, times and
store order are in `scripts/composeStoreScreens.js`.
