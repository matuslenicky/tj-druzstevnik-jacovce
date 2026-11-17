# TJ Družstevník Jacovce – návrh webu

Návrh nového webu futbalového klubu TJ Družstevník Jacovce. **Nie je to oficiálna stránka klubu.** Ukážka má v hlavičke pás s týmto upozornením a vyhľadávače ju neindexujú (`noindex`).

Ukážka: https://matuslenicky.github.io/tj-druzstevnik-jacovce/ · administrácia (ukážka bez ukladania): https://matuslenicky.github.io/tj-druzstevnik-jacovce/admin/

## Vzhľad

**„Zábradlie“.** Erb klubu je zeleno-biela vlajočka (obrátený trojuholník) s rokom 1932, okolo ihriska stojí od 70. rokov zeleno-biele tyčové zábradlie.

- hlavička s **koľajnicou zábradlia** (dve koľajnice a tyče), rovnaké zábradlie nad pätou,
- úvod s **veľkou vlajočkou** a odpočtom **rokov do storočnice** (2032),
- **„Zábradlie storočnice“**: 101 tyčí, jedna za každý rok 1932 – 2032, míľniky sú vyššie tyče s hlavicou, budúce roky priesvitné,
- program ako **dvojstranná časová os**: dátum na zelenej osi, zápasy doma vľavo, vonku vpravo (na telefóne os vľavo a odsadenie podľa strany),
- výsledky ako **gólové váhy**: od stredu naše góly zeleným pruhom doľava, súperove sivým doprava,
- forma ako **rad vlajočiek** s hrotom nadol, hlavičky podstránok a karty so zelenou vlajočkou v rohu,
- menu na telefóne ako **zelený panel rozbalený pod hlavičkou** (nie modálne okno),
- písmo **Unbounded** (široké nadpisy a čísla) a **Manrope** (text).

## Obsah a zdroje

- Zápasy, výsledky, strelci, karty, počty divákov, zostavy dospelých, tabuľky a súpisky 4 tímov (áčko, dorast U19, mladší žiaci U13, prípravka U11) zo Sportnetu (Futbalnet), verejné API súťaží (`scripts/sportnet.mjs` → `data/sportnet.json`). Vek hráčov sa neukladá, zostavy len pri dospelých.
- Ročníky áčka 2013/14 – 2025/26 z konečných tabuliek na Sportnete (`data/klub.json`).
- Jacovský hlásnik (noviny obce, dve čísla ročne): založenie klubu 10. 7. 1932 a zápisnice, šesť mien klubu, Slovenský pohár 1956, tituly majstra okresu, 90. výročie (1/2022 a 2/2022), ihrisko 1948 – 2025 a nová stena s logom, zhodnotenie ročníka 2025/26 a Jacovské bociany (1/2026), 800 rokov obce (1/2024, 2/2024).
- Tréneri a tímy aj na webe obce (stránka Futbal). Obec podľa e-obce.sk (história, kostol).
- E-mail zo Sportnetu. Vlastný web ani sociálne siete klubu sme nenašli (17. 11. 2026).
- Erb klubu a erby súperov zo Sportnetu (`scripts/logos.py`). Patria príslušným klubom.
- Písmo Unbounded a Manrope, licencia SIL Open Font License 1.1 (`scripts/fonts.py`, rovné číslice sú zapečené do písma).

## Zostavenie

Statický generátor bez závislostí (Node 20+, Python 3 s Pillow na erby a fontTools na písmo):

```
node scripts/sportnet.mjs        # zápasy, tabuľky a súpisky (FULL=1 stiahne znova aj detaily zápasov)
python -I scripts/logos.py       # erby súperov a náš erb do src/img (FORCE=1 stiahne znova)
node build.js                    # data/ + src/ -> dist/ (TODAY=2026-11-17 prepíše dnešný dátum)
node scripts/serve.mjs dist 5410 # náhľad na http://127.0.0.1:5410/ (?nolr = bez obnovovania, s CSP)
node scripts/deploy.mjs          # nasadenie dist/ na vetvu gh-pages (GitHub Pages)
```

Výsledky sa po zápasoch aktualizujú samé cez GitHub Actions (`.github/workflows/sportnet.yml`). Ročníky v `data/klub.json` treba po sezóne doplniť ručne.
