# Kerala Astro Guide

A free, open-source web app for Kerala-style (Malayalam) astrological calculations. Everything
runs in the browser: positions come from the Swiss Ephemeris compiled to WebAssembly, and nothing
you enter leaves your device.

Bilingual interface (Malayalam / English), phone-friendly.

## Features

- **Horoscope (ജാതകം):** time and panchangam values, Malayalam and Saka dates, sphutas, Kerala
  square charts (rasi, navamsa, bhava), Vimshottari dasa with sub-periods, bhava sphuta,
  shadvarga, ashtakavarga (bhinna and samudaya, with the classical samudaya analyses as numbers),
  karthru dosham stars, Kalachakra dasa, Parashari and other varga charts, KP sub-lords,
  printable sheet.
- **Marriage matching (വിവാഹപൊരുത്തം):** the ten nakshatra poruthams computed from the
  traditional rules, papasamyam, dasa sandhi and kuja dosham comparison.
- **Prashnam (പ്രശ്നം):** prashna sphutas, tamboolam, guna-dosham, sutrams, prashna shadvarga,
  ashtamangalam digits, KP ruling planets.
- **Transits (ഗോചരം):** sign ingress times for any planet and date range; transit positions
  from the birth sign.
- **Muhurtham:** panchanga shuddhi calendar and a daily panchangam (lagna changes, kalahora,
  muhurthas, upagraha kalam, guna-dosham, mrityu dosham checks).
- **Tools:** Malayalam to English date converter, star-only porutham, rasi pramanam.
- Settings for ayanamsa (Lahiri, Raman, KP, Chandrahari and more), node type, house system,
  sunrise definition, year length and Kollam era convention.

This edition shows calculations, tables and charts only. It does not include interpretive texts.

## Development

```sh
npm install
npm run dev             # http://127.0.0.1:5180
npm test                # Node tests (calculations against the reference tables)
npm run build:public    # production build into dist/ (same as the Vercel build)
npm run check-public    # build and verify the public bundle
```

Requires Node 20.6 or later. No framework: Vite and plain ES modules.

### Layout

- `src/engine/` pure calculation code (Swiss Ephemeris instance in, plain objects out).
- `src/modules/` one folder per screen; `src/components/` shared UI (birth form, Kerala chart).
- `public/open/reference.json` traditional reference tables (names, nakshatra attributes, dasa
  years, ashtakavarga and other classical lookup tables).
- `public/open/places.json` place search data from GeoNames.
- `src/private-stub/` empty stand-ins for optional text modules imported as `@private/...`.

## Licence and attributions

- Code: GNU Affero General Public License v3.0 or later, see [LICENSE](LICENSE).
- [Swiss Ephemeris](https://www.astro.com/swisseph/) by Astrodienst AG, used under the AGPL
  through [sweph-wasm](https://github.com/ptprashanttripathi/sweph-wasm). Ephemeris files in
  `public/ephe/` are Astrodienst's.
- Place data: [GeoNames](https://www.geonames.org/), CC BY 4.0.
- Malayalam fonts by Swathanthra Malayalam Computing and other authors, under the SIL Open Font
  License or the GPL with font exception; see
  [public/fonts/FONT-LICENSES.txt](public/fonts/FONT-LICENSES.txt).

## Disclaimer

The results follow traditional astrological rules and are offered for cultural and educational
use. They are not scientific predictions; do not rely on them for medical, legal, financial,
marriage or other important decisions. No warranty.

Independent project, not affiliated with or endorsed by the makers of any other astrology software.
