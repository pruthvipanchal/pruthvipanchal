# Building the profile images

`README.md` in this repo is Pruthvi Panchal's GitHub profile page (the repo `pruthvipanchal/pruthvipanchal`). Its pictures in `assets/` are SVG cards drawn by `build.mjs` in pruthvip.tech's look. To change a word, edit `build.mjs` and rebuild; don't edit the SVGs by hand.

## Rebuild

```powershell
cd tools
npm install            # once: fontkit, to turn text into outlines
npm run build          # rewrites ../assets/*.svg and prints their sizes
```

`build.mjs` expects two things next to it:

- **`tools/fonts/`** (not committed): download these three open-licence (OFL) fonts from Google Fonts' repository:
  - `Archivo.ttf`: <https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf>
  - `IBMPlexMono-Medium.ttf`: <https://github.com/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Medium.ttf>
  - `NotoSansDevanagari.ttf`: <https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf>
- **`../../pruthvip.tech/`**: the portfolio, for the Earth's land dots (`assets/js/earth-data.js`, from Natural Earth).

## Why it's built this way

- **Text as outlines.** GitHub shows README images with `<img>`, which can't load web fonts, so every word is drawn from the font files. Each letter is stored once per image and reused.
- **Same look in both GitHub themes.** Every card is a dark rounded panel, so it reads the same in GitHub's light and dark themes.
- **Motion is CSS inside each SVG**, and it stops for visitors who ask for reduced motion.
- **The globe turns twice, then rests.** It turns twice in three minutes, then holds still facing India while the Moon, the pin and the stars keep moving. Animating about 1,800 dots keeps a browser busy, so it doesn't run forever. Change `TURNS` or `PERIOD` in `hero()` to adjust.
- **Cards are drawn narrow with large type.** They sit two to a row (about 410 px each on a laptop). On a phone the README shrinks them, as it does every image.
