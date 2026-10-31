# iPhone 18 Pro Max · iOS 27 simulator

Open `index.html` (double-click works — `js/bundle.js` is a classic script).

Source lives in `js/` as ES modules. After editing anything there, rebuild the bundle:

    npx esbuild js/main.js --bundle --format=iife --target=es2020 --outfile=js/bundle.js

Chrome / Edge / Brave get real SVG refraction for Liquid Glass; Safari / Firefox fall back to frosted glass.
