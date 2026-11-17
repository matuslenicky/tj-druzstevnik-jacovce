// Statický generátor webu TJ Družstevník Jacovce: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-17 prepíše dnešný dátum)
// Obsah: zápasy, tabuľky a súpisky 4 tímov zo Sportnetu (data/sportnet.json, scripts/sportnet.mjs), ročníky áčka od 2013/14,
// história, ihrisko a správy z klubu z Jacovského hlásnika (data/klub.json), erby zo Sportnetu.
// Podpis vzhľadu „Zábradlie“: erb je zeleno-biela vlajočka (obrátený trojuholník), okolo ihriska zeleno-biele tyčové
// zábradlie z roku 1972. Hlavička s koľajnicou zábradlia, hero s veľkou vlajočkou a odpočtom do storočnice 2032,
// storočnica ako 101 tyčí zábradlia (rok = tyč, míľnik = vyššia tyč), program ako dvojstranná časová os (doma vľavo,
// vonku vpravo), výsledky ako gólové váhy od stredu, forma ako rad vlajočiek, menu na telefóne ako zelený panel. Unbounded a Manrope.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const rd = (f, def) => { const p = path.join(ROOT, 'data', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : def; };
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const club = rd('klub.json');
const sn = rd('sportnet.json');
const SPACE = config.sportnet.appSpace;

// ---- pomocné -------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const todayISO = () => local.format(new Date()).slice(0, 10);
const TODAY = process.env.TODAY || todayISO();
const DAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const DAYS_S = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const MONTHS_G = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const dObj = (iso) => new Date(iso + 'T12:00:00Z');
const dShort = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`; };
const dDay = (iso) => DAYS_S[dObj(iso).getUTCDay()];
const DAYS_ACC = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
const dWhen = (iso) => { const d = dObj(iso); return `${DAYS_ACC[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dLong = (iso) => { const d = dObj(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dDate = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dFull = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`; };
const monthKey = (iso) => iso.slice(0, 7);
const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
// okamih výkopu s posunom časového pásma (letný čas) pre odpočet v prehliadači
function isoLocal(date, time = '12:00') {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const [ld, lt] = local.format(new Date(guess)).split(' ');
  const shown = Date.UTC(...ld.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)), ...lt.split(':').map(Number));
  const off = (shown - guess) / 6e4;
  return `${date}T${time}:00+${String(Math.floor(off / 60)).padStart(2, '0')}:${String(off % 60).padStart(2, '0')}`;
}
const acc = (league) => league.replace(/\bliga\b/, 'ligu'); // 4. pád: hrajú IV. ligu
const vLige = (league) => `${/^IV\./.test(league) ? 'vo' : 'v'} ${esc(league.replace(/\bliga\b/, 'lige'))}`; // 6. pád: vo IV. lige, v VII. lige
const SEASON = sn.season.replace(/^(\d{4})\/\d\d(\d\d)$/, '$1/$2');
const plural = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`; // číslo a slovo bez zlomu riadka („4 body“)
const zo = (n) => `${/^(4|6|7|1[467]|[467]\d)$/.test(String(n)) ? 'zo' : 'z'} ${n}`; // „zo 16“, „z 11“ (podľa výslovnosti čísla)
const num = (n) => Number(n).toLocaleString('sk-SK');
const nazov = (n) => club.nazvy?.[n] || n; // čitateľný názov súpera (úradné názvy a veľké písmená zo Sportnetu)

// ---- súťaže, tímy, zápasy ------------------------------------------------------------------------
const compName = (name) => club.sutaze[name] || club.sutaze[name.replace(/\s+/g, ' ').trim()] || name.replace(/\s+/g, ' ').replace(/-ObFZ TN/, ' ObFZ Trenčín').replace(/\s*Macron \| yoursport\s*/, ' ').replace(/-/g, ' ').trim();
const ROUND = (r) => (/^\d+$/.test(r) ? `${r}. kolo` : String(r || '').replace(/\.\s*kolo/i, '. kolo').replace(/Kolo/, 'kolo'));
const teams = sn.teams.map((t) => {
  const league = t.competitions.find((c) => !c.cup);
  // tabuľka prípraviek bez zapísaných výsledkov (všetci 0:0, body len za účasť) by klamala, preto sa neukazuje
  const raw = league ? sn.tables[league.key] : null;
  // ak náš klub výsledky prípravky nezapisuje (len 0:0), poradie by ho stavalo na chvost, preto tiež bez tabuľky
  const ourRaw = raw?.rows.find((r) => r.our);
  const prepNoScore = /^U(\d|1[01])\b/.test(t.short) && ourRaw && !ourRaw.gf && !ourRaw.ga;
  const table = raw && raw.rows.some((r) => r.gf || r.ga) && !prepNoScore ? raw : null;
  const pos = table?.rows.find((r) => r.our);
  return {
    ...t, url: `timy/${t.slug}/`, code: t.adult ? t.slug[0] : norm(t.short).replace(/-/g, ''),
    full: t.adult ? t.short : `${t.sub} ${t.short}`,
    leagueName: league ? compName(league.name) : '', leagueKey: league?.key || '', table, pos: pos?.pos || null, of: table?.rows.length || 0,
  };
});
// tímy bez zápasu v sezóne (napr. prihlásený tím bez súťaže) sa na webe neukazujú
for (let i = teams.length - 1; i >= 0; i--) if (!sn.matches.some((m) => m.team === teams[i].slug)) teams.splice(i, 1);
const bySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));
// kolo bez súpera (voľno) vedie Sportnet ako zápas s prázdnym súperom: na webe by z neho bol riadok bez mena
const matches = sn.matches.filter((m) => String(m.opponent || '').trim() && bySlug[m.team]).map((m) => {
  const t = bySlug[m.team];
  const past = m.played || m.date < TODAY;
  let gf = null, ga = null, res = null;
  // prípravky (U11 a mladší) výsledok nezapisujú, Sportnet pri nich dáva 0:0 bez gólov
  if (m.score === '0:0' && !(m.goals || []).length && /^U(\d|1[01])\b/.test(t.short)) m = { ...m, score: null };
  if (m.score) { const [h, a] = m.score.split(':').map(Number); [gf, ga] = m.home ? [h, a] : [a, h]; res = gf > ga ? 'w' : gf < ga ? 'l' : 'd'; }
  const opponent = nazov(m.opponent);
  const slug = `${m.date}-${t.code}-${norm(opponent)}`;
  return { ...m, opponent, past, gf, ga, res, slug, url: `zapasy/${slug}/`, comp: compName(m.competition), roundName: ROUND(m.round), teamObj: t, cup: /cup|pohár/i.test(m.competition) };
});
const teamMatches = (slug) => matches.filter((m) => m.team === slug);
const upcoming = matches.filter((m) => !m.past);
const results = matches.filter((m) => m.past).reverse();
const RES = { w: 'Výhra', d: 'Remíza', l: 'Prehra' };
const RES_S = { w: 'V', d: 'R', l: 'P' };
const isPrep = (t) => /^U(\d|1[01])\b/.test(t.short); // prípravky (U11 a mladší) výsledky nezapisujú
const noScore = (m) => (isPrep(m.teamObj) ? 'Výsledky prípraviek sa nezapisujú' : 'Sportnet výsledok neuvádza');

// strelci tímu v sezóne (vlastné góly sa nerátajú)
function scorers(slug) {
  const c = new Map();
  for (const m of teamMatches(slug)) for (const g of m.goals || []) if (g.side === 'our' && g.kind !== 'own' && g.player) c.set(g.player, (c.get(g.player) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sk'));
}
function record(slug, filter = () => true) {
  const r = { w: 0, d: 0, l: 0, gf: 0, ga: 0, n: 0 };
  for (const m of teamMatches(slug)) if (m.res && filter(m)) { r[m.res]++; r.gf += m.gf; r.ga += m.ga; r.n++; }
  return r;
}

// ---- erby ----------------------------------------------------------------------------------------
const CREST_R = 1; // erb je takmer štvorcový 480 × 479
const logoFile = (space) => space && fs.existsSync(path.join(SRC, 'img', 'kluby', `${space}.webp`));
const initials = (name) => String(name).replace(/^(TJ|OŠK|OFK|ŠK|FK|FC|MFK|MŠK|PFK|TFK|PŠK|ZFC|OTJ|AFC|TTS|Telovýchovná jednota)\s+/i, '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function logo(space, name, R, size = 40, eager = false) {
  if (space === SPACE) return `<img class="logo" src="${R}img/erb-128.webp" alt="" width="${Math.round(size * CREST_R)}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  if (logoFile(space)) return `<img class="logo" src="${R}img/kluby/${space}.webp" alt="" width="${size}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  return `<span class="logo logo--txt" aria-hidden="true">${esc(initials(name))}</span>`;
}

// ---- ikony (Lucide, ISC) -------------------------------------------------------------------------
const ico = (p, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  mail: ico('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  phone: ico('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  pin: ico('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  route: ico('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'),
  cal: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  ext: ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  arrow: ico('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: ico('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
  ball: ico('<circle cx="12" cy="12" r="10"/><path d="m12 7 4.2 3-1.6 5H9.4L7.8 10z"/><path d="M12 2v5M21.5 9.5 16.2 10M18 20l-3.4-5M6 20l3.4-5M2.5 9.5l5.3.5"/>'),
  trophy: ico('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>'),
  music: ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  users: ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
};

// ---- CSP a rozloženie ----------------------------------------------------------------------------
// GitHub Pages nedovolí hlavičky, preto <meta>: skripty len z webu, jediný inline skript HEAD_JS povolený hashom.
// Inline atribút style CSP nepustí: tyče storočnice sú v SVG atribútoch, dĺžky gólových pruhov sú triedy g0 až g10.
// .flt: zoznam zápasov s filtrom v adrese (?tim=, ?kde=) je neviditeľný, kým ho site.mjs nevyfiltruje (inak skáče);
// pri zlyhaní site.mjs ho odkryje udalosť load
const HEAD_JS = `var d=document.documentElement;d.classList.add('js');if(/[?&](tim|kde)=/.test(location.search)){d.classList.add('flt');addEventListener('load',function(){d.classList.remove('flt')})}`;
const sha256 = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const CONNECT = ["'self'", ...(config.supabase?.url ? [new URL(config.supabase.url).origin] : [])];
const CSP = [
  "default-src 'none'", `script-src 'self' ${sha256(HEAD_JS)}`, "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  `connect-src ${CONNECT.join(' ')}`, "base-uri 'none'", "form-action 'none'", "object-src 'none'", "manifest-src 'self'",
].join('; ');

const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['mladez/', 'Mládež'], ['klub/', 'Klub a storočnica'], ['ihrisko/', 'Ihrisko'], ['kontakt/', 'Kontakt']];
const ST = club.stadion;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ST.geo.join(',')}`;
const mapyUrl = `https://mapy.com/fnc/v1/showmap?mapset=basic&amp;center=${ST.geo[1]},${ST.geo[0]}&amp;zoom=16&amp;marker=true`;
const A = teams[0];
const YEAR = Number(TODAY.slice(0, 4));
const DO100 = 2032 - YEAR;
const DESC = `${club.nazov} – futbal v Jacovciach od roku ${club.zalozenie}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}), dorastu, žiakov a prípravky, 2. miesto v VI. lige 2025/26 a cesta k storočnici v roku 2032.`;
const nextHome = upcoming.find((m) => m.home && m.team === A.slug);
const winterNow = (() => { const n = upcoming.find((m) => m.team === A.slug); return !!n && (dObj(n.date) - dObj(TODAY)) / 864e5 > 14; })();

// storočnica: zeleno-biele tyčové zábradlie ako okolo ihriska, jedna tyč za každý rok 1932 – 2032, míľniky vyššie s bodkou
function storocnica() {
  const mil = new Set(club.milniky.zoznam.map((x) => x.rok));
  let posts = '';
  for (let y = 1932, i = 0; y <= 2032; y++, i++) {
    const x = i * 10 + 2, tall = mil.has(y);
    const cls = y > YEAR ? 'p-f' : i % 2 ? 'p-w' : 'p-g';
    posts += `<rect class="${cls}" x="${x}" y="${tall ? 14 : 34}" width="6" height="${tall ? 76 : 56}" rx="1"/>`;
    if (tall) posts += `<rect class="${y > YEAR ? 'm-f' : 'm-d'}" x="${x - 2}" y="2" width="10" height="9"/>`;
  }
  const split = (YEAR - 1932 + 1) * 10;
  // preserveAspectRatio="none": na telefóne sa zábradlie zúži, preto len obdĺžniky (krúžky by sa zdeformovali)
  return `<div class="cent"><svg class="cent-s" viewBox="0 0 1012 96" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path class="r-past" d="M0 40H${split}M0 82H${split}"/><path class="r-fut" d="M${split} 40H1012M${split} 82H1012"/>${posts}
</svg>
<p class="cent-ax" aria-hidden="true"><span>1932</span><span><b class="cent-now">dnes ${YEAR}</b> · 2032</span></p></div>`;
}

// menu: na počítači v riadku vpravo, na telefóne zelený panel rozbalený pod hlavičkou (nie modálne okno, obsah sa posunie)
function layout({ route, title, desc, body, active, bodyClass = '' }) {
  const depth = route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const cur = (u) => (active && active === u ? ' aria-current="page"' : '');
  const fullTitle = (config.ukazka ? 'Návrh webu – ' : '') + (route ? `${title} | ${club.nazov}` : `${club.nazov} – ${title}`);
  const canon = config.siteUrl ? `${config.siteUrl}${route}` : '';
  const ld = route ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'SportsClub', name: club.nazov, sport: 'Futbal', foundingDate: '1932-07-10',
    email: club.kontakt.email,
    address: { '@type': 'PostalAddress', streetAddress: club.adresa[0], postalCode: club.adresa[1].slice(0, 6), addressLocality: club.mesto, addressCountry: 'SK' },
    location: { '@type': 'StadiumOrArena', name: ST.nazov, geo: { '@type': 'GeoCoordinates', latitude: ST.geo[0], longitude: ST.geo[1] } },
    sameAs: [club.sportnetUrl],
  }).replace(/</g, '\\u003c')}</script>`;
  const li = ([u, t]) => `<li><a href="${R}${u}"${cur(u)}>${t}</a></li>`;
  return `<!doctype html>
<html lang="sk" data-root="${R}"${config.ukazka ? ' class="has-demo"' : ''}>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || DESC)}">
${config.noindex ? '<meta name="robots" content="noindex">\n' : ''}${canon ? `<link rel="canonical" href="${canon}">\n` : ''}<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="sk_SK">
<meta name="theme-color" content="#0b6b2c">
<link rel="icon" type="image/png" href="${R}img/favicon.png">
<link rel="apple-touch-icon" href="${R}img/apple-touch-icon.png">
<link rel="preload" href="${R}fonts/unbounded-800.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${R}fonts/manrope-400.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="${R}fonts/manrope-700.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="${R}css/site.css">
<script>${HEAD_JS}</script>
<script type="module" src="${R}js/site.mjs"></script>
${ld}</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
<a class="skip" href="#obsah">Preskočiť na obsah</a>
${config.ukazka ? '<p class="demo">Návrh webu · nie je to oficiálna stránka klubu</p>' : ''}
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="${R}"${route ? '' : ' aria-current="page"'}><img src="${R}img/erb-128.webp" alt="" width="36" height="48"><span class="brand-t"><span class="brand-n">Družstevník Jacovce</span><span class="brand-s">futbal od roku ${club.zalozenie}</span></span><span class="sr">, úvod</span></a>
    <nav class="nav" aria-label="Hlavné menu"><ul>${NAV.map(li).join('')}</ul></nav>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu">${I.menu}${I.close}<span>Menu</span></button>
  </div>
  <nav class="drop" id="menu" aria-label="Menu na telefóne" hidden><ul class="drop-nav wrap"><li><a href="${R}"${route ? '' : ' aria-current="page"'}>Úvod</a></li>${NAV.map(li).join('')}</ul></nav>
  <div class="rail" aria-hidden="true"></div>
</header>
<main id="obsah">
${body}
</main>
<footer class="ftr">
  <div class="wrap ftr-grid">
    <div class="ftr-club">
      <img src="${R}img/erb-128.webp" alt="" width="48" height="64" loading="lazy">
      <p class="ftr-name">${esc(club.nazov)}</p>
      <p class="ftr-motto">${esc(club.sezona2526.pokrik)}</p>
    </div>
    <div><h2 class="ftr-h">Ihrisko</h2><p>${esc(ST.nazov)}<br>${club.adresa.map(esc).join(', ')}</p><p><a href="${mapsUrl}" rel="noopener">Navigovať na ihrisko</a></p>${nextHome ? `<p>Najbližšie doma: <a href="${R}${nextHome.url}">${dShort(nextHome.date)} o ${esc(nextHome.time || '')} proti ${esc(nextHome.opponent)}</a></p>` : ''}</div>
    <div><h2 class="ftr-h">Kontakt</h2><p>${esc(club.pravnyNazov)}<br><a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email).replace('@', '<wbr>@')}</a></p></div>
    <div><h2 class="ftr-h">Zdroje</h2><p>Výsledky zo Sportnetu (Futbalnet), aktualizované ${dFull(sn.updated.slice(0, 10))}. História a správy z klubu podľa Jacovského hlásnika.</p><p><a href="${club.sportnetUrl}" rel="noopener">Klub na Sportnete</a></p></div>
  </div>
  <div class="ftr-bar"><div class="wrap ftr-bar-in"><span>© ${new Date().getFullYear()} ${esc(club.pravnyNazov)}</span><a href="${R}ochrana-sukromia/">Ochrana súkromia</a>${config.adminDemo ? `<a href="${R}admin/">Administrácia (ukážka)</a>` : ''}</div></div>
</footer>
</body>
</html>
`;
}

// ---- spoločné bloky ------------------------------------------------------------------------------
// skratka klubu („TJ“, „OFK“) nezostane na konci riadka bez mena (nadpis podstránky, ihrisko v zápasovej karte)
const glueAbbr = (s) => s.replace(/(^|\s)(TJ|FK|FC|MFK|MFC|OŠK|ŠK|OFK|MŠK|PFK|ZFC|TFK|SDM|AFC|OTJ|ŠC|PŠK|FKS) (?=\S)/g, `$1$2${NB}`);
// hlavička podstránky: biela plocha so zeleným trojuholníkom vlajočky vpravo (CSS)
const pageHead = ({ title, sub = '', crumbs = [], R, aside = '' }) => `<section class="phead"><div class="wrap phead-in">
  <div>${crumbs.length ? `<nav class="crumbs" aria-label="Omrvinky"><a href="${R}">Úvod</a>${crumbs.map(([u, x]) => u ? `<a href="${R}${u}">${esc(x)}</a>` : `<span aria-current="page">${esc(x)}</span>`).join('')}</nav>` : ''}
  <h1 class="h1">${glueAbbr(esc(title))}</h1>${sub ? `<p class="phead-sub">${sub}</p>` : ''}</div>${aside}
</div></section>`;
const secHead = (h, id, moreLink = '', eyebrow = '') => `<div class="sec-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h2 class="h2" id="${id}">${h}</h2></div>${moreLink}</div>`;
const more = (href, t) => `<a class="more" href="${href}">${t}${I.arrow}</a>`;
const venueName = (v) => v.replace(/\s+/g, ' ').trim().replace(/(^|\s)č\.\s*(\d)/g, '$1č. $2'); // „Ihrisko č.1“ zo Sportnetu -> „č. 1“

// zápasová karta: biela, v rohu zelený trojuholník vlajočky, skóre na zelenom poli
function card(m, R, { big = false, label = '', self = false } = {}) {
  const ourName = m.teamObj.adult ? club.nazov : `${club.kratky} ${m.teamObj.short}`;
  const us = { name: ourName, space: SPACE }, them = { name: m.opponent, space: m.oppSpace };
  const [h, a] = m.home ? [us, them] : [them, us];
  const lbl = label || (m.score || m.past ? 'Posledný zápas' : 'Najbližší zápas');
  const side = (t, role) => `<div class="mp-side${t.space === SPACE ? ' is-us' : ''}"><span class="mp-crest">${logo(t.space, t.name, R, big ? 56 : 44, big)}</span><span class="mp-name">${esc(t.name)}</span><span class="mp-role">${role}</span></div>`;
  let mid, note = '';
  if (m.score) { mid = `<span class="sr">Výsledok </span>${esc(m.score).replace(':', '<span class="mp-colon">:</span>')}`; note = `<span class="mp-res mp-res--${m.res}">${RES[m.res]}</span>${m.half ? `<span>polčas ${esc(m.half)}</span>` : ''}`; }
  else if (m.past) { mid = '<span aria-hidden="true">–</span>'; note = `<span>${noScore(m)}</span>`; }
  else { mid = `<span class="mp-time"><span class="sr">Výkop o </span>${esc(m.time || '–')}</span>`; note = `<span class="cd" data-kickoff="${isoLocal(m.date, m.time)}" hidden></span>`; }
  const links = [];
  if (m.score && m.detail && !self) links.push(`<a class="mp-a" href="${R}${m.url}">Priebeh a zostavy${I.arrow}</a>`);
  if (!m.past && !self) links.push(`<a class="mp-a" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Do kalendára</a>`);
  const meta = [esc(m.comp) + (m.roundName ? `, ${esc(m.roundName)}` : ''), m.venue ? glueAbbr(esc(venueName(m.venue))) : '', m.audience ? plural(m.audience, 'divák', 'diváci', 'divákov') : ''].filter(Boolean);
  return `<article class="mp${big ? ' mp--big' : ''}">
  <p class="mp-top"><span class="mp-label">${esc(lbl)}</span><span>${esc(m.teamObj.full)}</span></p>
  <p class="mp-when"><time datetime="${m.date}">${dLong(m.date)}</time></p>
  <div class="mp-row">${side(h, 'domáci')}<p class="mp-score">${mid}</p>${side(a, 'hostia')}</div>
  <p class="mp-note">${note}</p>
  <p class="mp-meta">${meta.join('<span aria-hidden="true">&nbsp;· </span>')}</p>
  ${links.length ? `<p class="mp-links">${links.join('')}</p>` : ''}
</article>`;
}

// zoznam zápasov: program ako dvojstranná časová os (doma vľavo, vonku vpravo, dátum na zelenej osi),
// výsledky ako gólové váhy: naše góly zeleným pruhom doľava, súperove sivým doprava od stredu
function matchRow(m, R, { showTeam = true } = {}) {
  const href = m.detail || !m.past ? ` href="${R}${m.url}"` : '';
  const tag = href ? 'a' : 'div';
  const where = m.home ? 'doma' : 'vonku';
  const comp = esc(m.cup ? m.comp : m.roundName || m.comp);
  if (!m.past) {
    return `<li class="mrow mrow--tl mrow--${m.home ? 'h' : 'a'}" data-team="${m.team}" data-where="${where}"><${tag} class="tln"${href}>
  <span class="tl-d"><time datetime="${m.date}">${dShort(m.date)}</time><span>${dDay(m.date)}</span></span>
  <span class="tl-c"><span class="tl-t">${esc(m.time || '–')} · ${where}</span><span class="tl-o">${esc(m.opponent)}</span><span class="tl-k">${showTeam ? `<span class="nw">${esc(m.teamObj.short)}</span> · ` : ''}${comp}</span></span>
</${tag}></li>`;
  }
  const g = (n) => `g${Math.min(10, n)}`;
  const bar = m.score
    ? `<span class="gb-bar" aria-hidden="true"><span class="gb-half gb-half--us"><span class="gb-us ${g(m.gf)}"></span></span><span class="gb-s">${m.gf}<i>:</i>${m.ga}</span><span class="gb-half"><span class="gb-th ${g(m.ga)}"></span></span></span><span class="sr">${RES[m.res]}: náš tím ${m.gf}, súper ${m.ga}</span>`
    : '<span class="gb-bar gb-bar--none"><span class="gb-na">bez výsledku</span></span>';
  return `<li class="mrow mrow--gb" data-team="${m.team}" data-where="${where}"><${tag} class="gb gb--${m.res || 'n'}"${href}>
  <span class="gb-h"><span class="gb-o">${esc(m.opponent)}</span><span class="gb-k">${dShort(m.date)}${showTeam ? ` · <span class="nw">${esc(m.teamObj.short)}</span>` : ''} · ${where}${m.score ? ` · <span class="gb-r">${RES[m.res].toLowerCase()}</span>` : ''}</span></span>
  ${bar}
</${tag}></li>`;
}
const matchList = (list, R, opts) => (list.length && list.every((m) => m.past)
  ? `<ol class="mlist mlist--gb">${list.map((m) => matchRow(m, R, opts)).join('')}</ol>`
  : `<div class="tlw"><div class="tl-head" aria-hidden="true"><span>Doma</span><span></span><span>Vonku</span></div><ol class="mlist mlist--tl">${list.map((m) => matchRow(m, R, opts)).join('')}</ol></div>`);
const gbKey = '<ul class="gb-key" aria-hidden="true"><li><span class="k k--us"></span>naše góly</li><li><span class="k k--th"></span>góly súpera</li></ul>';

function tableHtml(tb, R, { compact = false, caption = '' } = {}) {
  let rows = tb.rows;
  if (compact) { const i = rows.findIndex((r) => r.our); const from = Math.max(0, Math.min(i - 2, rows.length - 5)); rows = rows.slice(from, from + 5); }
  return `<div class="tbl-wrap"><table class="tbl">${caption ? `<caption>${caption}</caption>` : ''}
  <thead><tr><th scope="col"><abbr title="Poradie">#</abbr></th><th scope="col" class="tl">Tím</th><th scope="col"><abbr title="Zápasy">Z</abbr></th><th scope="col" class="hm"><abbr title="Výhry">V</abbr></th><th scope="col" class="hm"><abbr title="Remízy">R</abbr></th><th scope="col" class="hm"><abbr title="Prehry">P</abbr></th><th scope="col">Skóre</th><th scope="col"><abbr title="Body">B</abbr></th></tr></thead>
  <tbody>${rows.map((r) => `<tr${r.our ? ' class="our"' : ''}><td class="pos">${r.pos}</td><th scope="row" class="tl"><span class="tteam">${logo(r.space, r.name, R, 24)}<span>${esc(nazov(r.name))}</span></span></th><td>${r.played}</td><td class="hm">${r.won}</td><td class="hm">${r.draw}</td><td class="hm">${r.lost}</td><td class="nw">${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody>
</table></div>`;
}
// forma ako rad trojuholníkových vlajočiek (hrot nadol ako erb)
const formHtml = (slug, n = 5) => {
  const last = teamMatches(slug).filter((m) => m.res).slice(-n);
  return last.length ? `<ol class="form" aria-label="Forma: ${last.length === 1 ? 'posledný zápas' : last.length <= 4 ? `posledné ${last.length} zápasy` : `posledných ${last.length} zápasov`}">${last.map((m) => `<li class="form--${m.res}" title="${dShort(m.date)} ${esc(m.opponent)} ${m.gf}:${m.ga}"><span aria-hidden="true">${RES_S[m.res]}</span><span class="sr">${RES[m.res]} ${esc(m.opponent)} ${m.gf}:${m.ga}</span></li>`).join('')}</ol>` : '';
};

// kalendár zápasov (.ics): odber cez webcal/Google doplní site.mjs, inak stiahnutie
const calBox = (file, R, id) => `<details class="cal" data-cal id="${id}">
  <summary class="btn btn--line">${I.cal}<span>Zápasy do kalendára</span></summary>
  <div class="cal-pop">
    <a class="cal-o" data-webcal href="${R}kalendar/${file}" hidden><b>Odoberať v telefóne</b><span>iPhone, Mac, Outlook – rozpis sa sám aktualizuje</span></a>
    <a class="cal-o" data-gcal href="${R}kalendar/${file}" rel="noopener" hidden><b>Pridať do Google Kalendára</b><span>aj pre Android</span></a>
    <a class="cal-o" data-ics href="${R}kalendar/${file}" download><b>Stiahnuť súbor .ics</b><span>jednorazovo, bez aktualizácií</span></a>
  </div>
</details>`;

// výber zápasu: zápas v najbližších 7 dňoch, inak posledný odohraný (zimná prestávka), inak najbližší
function cardPick(slug) {
  const list = teamMatches(slug);
  const next = list.find((m) => !m.past);
  const last = [...list].reverse().find((m) => m.past && (m.score || isPrep(m.teamObj)));
  const soon = next && (dObj(next.date) - dObj(TODAY)) / 864e5 <= 7;
  return soon ? next : last || next;
}

// mládež na úvode: riadky so štítkom tímu a posledným výsledkom alebo najbližším zápasom
function teamsBoard(R, list) {
  return `<ul class="tb">${list.map((t) => {
    const m = cardPick(t.slug);
    if (!m) return '';
    const href = m.detail || !m.past ? `${R}${m.url}` : `${R}${t.url}`;
    const right = m.score
      ? `<span class="tb-score tb-score--${m.res}"><span class="sr">${RES[m.res]} </span>${m.gf}:${m.ga}</span>`
      : m.past ? '<span class="tb-score tb-score--none">bez výsl.</span>' : `<span class="tb-score tb-score--time">${esc(m.time || '')}</span>`;
    return `<li><a class="tb-row" href="${href}">
    <span class="tb-code">${esc(t.short)}</span>
    <span class="tb-main"><span class="tb-top">${esc(t.sub)}&nbsp;· ${dDay(m.date)} ${dShort(m.date)}&nbsp;· ${m.home ? 'doma' : 'vonku'}</span><span class="tb-opp">${esc(m.opponent)}</span></span>
    ${right}
  </a></li>`;
  }).join('')}</ul>`;
}

function teamGrid(R, only = () => true) {
  return '<ul class="tgrid">' + teams.filter(only).map((t) => `<li class="tcard${t.adult ? ' tcard--a' : ''}"><a href="${R}${t.url}">
  <span class="tcard-n">${esc(t.short)}</span>
  <span class="tcard-s">${esc(t.adult ? 'Muži' : t.sub)}</span>
  <span class="tcard-l">${esc(t.leagueName)}</span>
  ${t.pos ? `<span class="tcard-p"><b>${t.pos}.</b> ${zo(t.of)}</span>` : '<span class="tcard-p">bez tabuľky</span>'}
  ${coachOf(t) ? `<span class="tcard-k">${coachRole(t)} ${esc(coachOf(t))}</span>` : ''}
</a></li>`).join('') + '</ul>';
}

// ---- stránky -----------------------------------------------------------------------------------
const pages = [];
const add = (route, opts) => pages.push({ route, ...opts });
const crewRole = { coach: 'Tréner', assist_coach: 'Asistent trénera', coach_goalkeepers: 'Tréner brankárov', manager: 'Vedúci mužstva', doctor: 'Zdravotník', physiotherapist: 'Fyzioterapeut', masseur: 'Masér', club_representative: 'Zástupca klubu', security_manager: 'Hlavný usporiadateľ', other: 'Člen realizačného tímu' };
const POS = [['goalkeeper', 'Brankári'], ['defender', 'Obrancovia'], ['midfielder', 'Stredopoliari'], ['forward', 'Útočníci'], ['', 'Hráči']];
const coachOf = (t) => t.squad.crew.find((c) => c.role === 'coach')?.name || t.squad.crew.find((c) => c.role === 'manager')?.name || '';
const coachRole = (t) => (t.squad.crew.some((c) => c.role === 'coach') ? 'tréner' : 'vedúci');
const teamLabel = (t) => (t.adult ? t.full : `${t.short} ${t.sub.toLowerCase()}`);
const milList = () => `<ol class="mil">${club.milniky.zoznam.map((x) => `<li class="${x.rok > YEAR ? 'mil--f' : ''}"><p class="mil-y">${x.rok}</p><p>${esc(x.text)}</p></li>`).join('')}</ol>`;
const obecFacts = () => `<ol class="facts4">${club.obec.fakty.map((f) => `<li><p class="f4-k">${esc(f.k)}</p><p>${esc(f.t)}</p></li>`).join('')}</ol>`;

// úvod
add('', {
  title: `futbal v Jacovciach od roku ${club.zalozenie}`, active: '', bodyClass: 'home',
  body: (R) => {
    const nextAll = upcoming.slice(0, 6);
    const lastAll = results.filter((m) => m.score).slice(0, 7);
    const lg = record(A.slug, (m) => !m.cup);
    const top = scorers(A.slug);
    const row = A.table?.rows.find((r) => r.our);
    const first = upcoming[0];
    const aNext = upcoming.find((m) => m.team === A.slug);
    const winter = first && (dObj(first.date) - dObj(TODAY)) / 864e5 > 14;
    const winterText = !first ? '' : aNext && aNext.date === first.date
      ? `Jar sa začína ${dWhen(first.date)}, áčko v ten deň hrá ${aNext.home ? 'doma proti' : 'vonku na ihrisku'} ${esc(aNext.opponent)}.`
      : `${upcoming.filter((m) => m.date === first.date).length > 1 ? 'Prvé jarné zápasy sú' : 'Prvý jarný zápas je'} ${dWhen(first.date)} (${esc(teamLabel(first.teamObj))})${aNext ? `, áčko začína ${dWhen(aNext.date)} ${aNext.home ? 'doma proti' : 'vonku na ihrisku'} ${esc(aNext.opponent)}` : ''}.`;
    const aPick = cardPick(A.slug);
    const youth = teams.filter((t) => !t.adult);
    const prev = club.rocniky.zoznam.at(-1);
    return `<section class="hero" aria-labelledby="hero-h"><div class="wrap hero-in">
  <div class="hero-copy">
    <p class="eyebrow">Futbal od 10. júla 1932 · ročník ${SEASON}</p>
    <h1 class="hero-h" id="hero-h"><span class="hero-k">TJ</span> Družstevník Jacovce</h1>
    <p class="hero-p">V minulom ročníku skončilo áčko druhé v VI. lige Severovýchod, na jar s 14 výhrami a jedinou prehrou. Teraz hrá ${esc(acc(A.leagueName))}${A.pos ? ` a ${winterNow ? 'po jeseni ' : ''}je na ${A.pos}. mieste ${zo(A.of)}` : ''}. Najmenší, Jacovské bociany, sú majstrami okresu.</p>
    <p class="hero-cta"><a class="btn btn--green" href="${R}zapasy/">Program a výsledky</a><a class="btn btn--line" href="${R}klub/">Cesta k storočnici</a></p>
  </div>
  <div class="hero-pen">
    <div class="pen"><img src="${R}img/erb-480.webp" alt="${esc(club.erbAlt)}" width="240" height="321" fetchpriority="high"></div>
    <p class="hero-count"><b>${DO100}</b> ${DO100 === 1 ? 'rok' : DO100 >= 2 && DO100 <= 4 ? 'roky' : 'rokov'} do storočnice</p>
  </div>
</div></section>
${winterText && winter ? `<section class="pause"><div class="wrap"><p><b>Zimná prestávka.</b> ${winterText}</p></div></section>` : ''}
<section class="sec" aria-labelledby="now-h"><div class="wrap now">
  <div>${secHead('Zápas áčka', 'now-h', '', esc(A.leagueName))}${aPick ? card(aPick, R, { big: true }) : ''}</div>
  <div><h2 class="h3 now-h2">Mládež</h2>${teamsBoard(R, youth)}${more(`${R}mladez/`, 'Mládež a Jacovské bociany')}</div>
</div></section>
<section class="sec sec--mint" aria-labelledby="prog-h"><div class="wrap">
  ${secHead('Program a výsledky', 'prog-h', more(`${R}zapasy/`, 'Všetky zápasy'), 'Os a gólové váhy')}
  <div class="cols2">
    <div><h3 class="h3">Najbližšie</h3>${nextAll.length ? matchList(nextAll, R) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</div>
    <div><h3 class="h3">Posledné výsledky</h3>${gbKey}${matchList(lastAll, R)}</div>
  </div>
</div></section>
${A.table ? `<section class="sec" aria-labelledby="liga-h"><div class="wrap">
  ${secHead(`Áčko, ${esc(A.leagueName)}`, 'liga-h', more(`${R}tabulky/#${A.slug}`, 'Celá tabuľka'))}
  <div class="liga">
    <div class="liga-pos"><p class="liga-n">${A.pos}.</p><p>miesto ${zo(A.of)} · ${plural(row.pts, 'bod', 'body', 'bodov')} · skóre ${lg.gf}:${lg.ga}</p></div>
    <div>${tableHtml(A.table, R, { compact: true, caption: `<span class="sr">Výrez tabuľky okolo ${esc(club.nazov)}</span>` })}</div>
    <div class="liga-side">
      <div class="liga-row"><h3 class="h4">Forma</h3>${formHtml(A.slug)}</div>
      ${top.length ? `<div class="liga-row liga-row--list"><h3 class="h4">Strelci áčka</h3><ol class="scorers">${top.slice(0, 4).map(([n, g]) => `<li><span>${esc(n)}</span><b>${g}</b></li>`).join('')}</ol></div>` : ''}
    </div>
  </div>
</div></section>` : ''}
<section class="sec sec--green" aria-labelledby="ce-h"><div class="wrap">
  ${secHead('Zábradlie storočnice', 'ce-h', more(`${R}klub/`, 'Celá história'), '1932 – 2032')}
  <p class="lead">Každý rok jedna tyč zeleno-bieleho zábradlia, ako okolo ihriska. Vyššie tyče sú míľniky, do storočnice zostáva ${plural(DO100, 'rok', 'roky', 'rokov')}.</p>
  ${storocnica()}
  ${milList()}
  <p class="src src--inv">Zdroj: Jacovský hlásnik 1/2022, 2/2022 a 1/2026, Sportnet.</p>
</div></section>
<section class="sec" aria-labelledby="se-h"><div class="wrap season">
  <div>
    ${secHead(`Ročník ${esc(prev.rok)}: ${prev.poz}. miesto`, 'se-h', '', esc(prev.liga))}
    <p class="lead">${esc(club.sezona2526.text)}</p>
    <p class="cry">${esc(club.sezona2526.pokrik)}</p>
    <p class="src">Zdroj: Jacovský hlásnik 1/2026, konečná tabuľka zo Sportnetu.</p>
  </div>
  <div class="bigs" aria-label="Ročník ${esc(prev.rok)} v číslach">
    <p><b>${prev.body}</b><span>bodov</span></p><p><b>${esc(prev.skore)}</b><span>skóre</span></p><p><b>14</b><span>výhier na jar</span></p><p><b>10</b><span>výhier v rade</span></p>
  </div>
</div></section>
<section class="sec sec--mint" aria-labelledby="bo-h"><div class="wrap storks">
  <div>
    ${secHead('Jacovské bociany', 'bo-h', more(`${R}mladez/`, 'Mládež a nábor'), 'Prípravka U9, majster okresu')}
    <p class="lead">${esc(club.bociany.text)}</p>
    <p class="src">Zdroj: Jacovský hlásnik 1/2026.</p>
  </div>
  ${teamGrid(R, (t) => !t.adult)}
</div></section>
<section class="sec" aria-labelledby="ob-h"><div class="wrap">
  ${secHead('Jacovce', 'ob-h', more(`${R}klub/#obec`, 'Viac o obci'), 'Obec pri Topoľčanoch')}
  ${obecFacts()}
  <p class="src">Zdroj: Jacovský hlásnik 1/2024 a 2/2024, e-obce.sk.</p>
</div></section>
<section class="sec sec--green" aria-labelledby="ih-h"><div class="wrap pitch">
  <div>
    ${secHead(esc(ST.nazov).replace('TJ ', `TJ${NB}`), 'ih-h', '', 'Ihrisko od roku 1948')}
    <ul class="mini">${ST.fakty.map((u) => `<li><b>${esc(u.k)}</b> ${esc(u.t)}</li>`).join('')}</ul>
    <p class="btns"><a class="btn btn--white" href="${mapsUrl}" rel="noopener">${I.route}Navigovať</a><a class="btn btn--ghost" href="${R}ihrisko/">O ihrisku</a></p>
  </div>
  ${nextHome ? `<div class="pitch-next"><p class="eyebrow">Najbližšie doma</p>${card(nextHome, R)}</div>` : ''}
</div></section>`;
  },
});

// zápasy
add('zapasy/', {
  title: 'Zápasy a výsledky', active: 'zapasy/', desc: `Program a výsledky všetkých tímov ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => {
    const grp = (list) => {
      const months = new Map();
      for (const m of list) { const k = monthKey(m.date); if (!months.has(k)) months.set(k, []); months.get(k).push(m); }
      return [...months].map(([k, l]) => `<section class="month" data-month><h3 class="month-h">${monthName(k)}</h3>${matchList(l, R)}</section>`).join('');
    };
    return `${pageHead({ title: 'Zápasy a výsledky', sub: `Ročník ${SEASON}, všetky tímy. Výsledky, góly a karty preberáme zo Sportnetu.`, R, crumbs: [[null, 'Zápasy']] })}
<section class="sec sec--first"><div class="wrap">
  <div class="filters" data-filters>
    <div class="chips" role="group" aria-label="Tím"><button type="button" class="chip" data-f-team="" aria-pressed="true">Všetky</button>${teams.map((t) => `<button type="button" class="chip" data-f-team="${t.slug}" aria-pressed="false">${esc(t.short)}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Miesto"><button type="button" class="chip" data-f-where="" aria-pressed="true">Doma aj vonku</button><button type="button" class="chip" data-f-where="doma" aria-pressed="false">Doma</button><button type="button" class="chip" data-f-where="vonku" aria-pressed="false">Vonku</button></div>
  </div>
  <div class="cols2 cols2--list">
    <section aria-labelledby="z-prog"><h2 class="h2" id="z-prog">Program</h2>${upcoming.length ? grp(upcoming) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}<p class="empty" data-empty hidden>Pre tento výber nie je naplánovaný žiadny zápas.</p></section>
    <section aria-labelledby="z-vys"><h2 class="h2" id="z-vys">Výsledky</h2>${gbKey}${grp(results)}<p class="empty" data-empty hidden>Pre tento výber zatiaľ nie je žiadny výsledok.</p></section>
  </div>
  <div class="cal-row">${calBox('vsetky.ics', R, 'cal-vsetky')}</div>
</div></section>`;
  },
});

// detail zápasu
function lineupHtml(l, title) {
  if (!l || (!l.start.length && !l.subs.length)) return '';
  const li = (p) => `<li><span class="ln-nr">${esc(p.nr)}</span><span>${esc(p.name)}${p.c ? ' <abbr class="cap" title="kapitán"><span aria-hidden="true">C</span><span class="sr">kapitán</span></abbr>' : ''}</span></li>`;
  return `<div class="lineup"><h3 class="h4">${esc(title)}</h3><ol class="ln">${l.start.map(li).join('')}</ol>${l.subs.length ? `<p class="ln-h">Náhradníci</p><ol class="ln ln--subs">${l.subs.map(li).join('')}</ol>` : ''}${l.coach ? `<p class="ln-coach">Tréner: ${esc(l.coach)}</p>` : ''}</div>`;
}
for (const m of matches) {
  if (m.past && !m.detail) continue;
  const name = m.home ? `${club.nazov} – ${m.opponent}` : `${m.opponent} – ${club.nazov}`;
  add(m.url, {
    title: `${name}${m.score ? ` ${m.score}` : ''}`, active: 'zapasy/',
    desc: `${m.teamObj.full}, ${m.comp}, ${dLong(m.date)}.`,
    body: (R) => {
      const ev = [...(m.goals || []).map((g) => ({ ...g, t: 'goal' })), ...(m.cards || []).map((c) => ({ ...c, t: 'card' })), ...((m.lineups?.subs) || []).map((s) => ({ ...s, t: 'sub' }))]
        .sort((a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0));
      const evIcon = (e) => e.t === 'goal' ? `<span class="ev-i ev-goal" aria-hidden="true">${I.ball}</span>` : e.t === 'card' ? `<span class="ev-i ev-card ev-card--${e.kind}" aria-hidden="true"></span>` : '<span class="ev-i ev-sub" aria-hidden="true">⇄</span>';
      const evText = (e) => e.t === 'goal' ? (e.kind === 'own' ? `Vlastný gól: ${esc(e.player)}` : `Gól: ${esc(e.player)}${e.kind === 'penalty' ? ' (z penalty)' : ''}`) : e.t === 'card' ? `${e.kind === 'yellow' ? 'Žltá karta' : e.kind === 'red' ? 'Červená karta' : 'Druhá žltá a červená'}: ${esc(e.player) || 'hráč neuvedený'}` : `Striedanie: prichádza ${esc(e.in)}, odchádza ${esc(e.out)}`;
      const evSide = (e) => ((e.side === 'our') === m.home ? 'h' : 'a');
      const evTeam = (e) => (e.side === 'our' ? club.nazov : m.opponent);
      const prevMeet = matches.filter((x) => x.oppSpace === m.oppSpace && x.id !== m.id && x.team === m.team && x.score);
      const snUrl = sn.matches.find((x) => x.id === m.id)?.url;
      return `${pageHead({ title: name, sub: `${esc(m.teamObj.full)}, ${esc(m.comp)}${m.roundName ? `, ${esc(m.roundName)}` : ''}`, R, crumbs: [['zapasy/', 'Zápasy'], [null, dShort(m.date)]] })}
<section class="sec sec--first"><div class="wrap match">
  <div class="match-card">${card(m, R, { big: true, self: true, label: m.score ? 'Konečný výsledok' : 'Zápas' })}</div>
  <div class="match-info">
    ${ev.length ? `<h2 class="h3">Priebeh zápasu</h2><ol class="evs">${ev.map((e) => `<li class="ev ev--${evSide(e)}"><span class="ev-min">${esc(e.min)}′</span>${evIcon(e)}<span>${evText(e)}<small>${esc(evTeam(e))}</small></span></li>`).join('')}</ol>` : m.score ? '<p>Zápis o stretnutí neobsahuje góly ani karty.</p>' : ''}
    <dl class="facts">
      <div><dt>Dátum</dt><dd>${dLong(m.date)}${m.time ? `, ${esc(m.time)}` : ''}</dd></div>
      ${m.venue ? `<div><dt>Ihrisko</dt><dd>${esc(venueName(m.venue))}</dd></div>` : ''}
      ${m.audience ? `<div><dt>Diváci</dt><dd>${num(m.audience)}</dd></div>` : ''}
      ${m.referee ? `<div><dt>Rozhodca</dt><dd>${esc(m.referee)}</dd></div>` : ''}
    </dl>
    <p class="btns">${m.score && snUrl ? `<a class="btn btn--line" href="${snUrl}" rel="noopener">${I.ext}Zápis na Sportnete</a>` : ''}${!m.past ? `<a class="btn btn--green" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Pridať do kalendára</a>${m.home ? `<a class="btn btn--line" href="${mapsUrl}" rel="noopener">${I.route}Navigovať na ihrisko</a>` : ''}` : ''}</p>
  </div>
  ${m.lineups ? `<div class="lineups"><h2 class="h3 lineups-h">Zostavy</h2>${lineupHtml(m.home ? m.lineups.our : m.lineups.opp, m.home ? club.nazov : m.opponent)}${lineupHtml(m.home ? m.lineups.opp : m.lineups.our, m.home ? m.opponent : club.nazov)}</div>` : ''}
  ${prevMeet.length ? `<div class="meet"><h2 class="h3">Ďalšie zápasy s týmto súperom v ročníku</h2>${gbKey}${matchList(prevMeet, R, { showTeam: false })}</div>` : ''}
</div></section>`;
    },
  });
}

// tabuľky
add('tabulky/', {
  title: 'Tabuľky', active: 'tabulky/', desc: `Tabuľky súťaží, v ktorých hrajú tímy ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => `${pageHead({ title: 'Tabuľky', sub: `Ročník ${SEASON}. Poradie podľa Sportnetu, náš tím je zvýraznený.`, R, crumbs: [[null, 'Tabuľky']] })}
<section class="sec sec--first"><div class="wrap">
  <nav class="toc" aria-label="Tabuľky tímov">${teams.filter((t) => t.table).map((t) => `<a href="#${t.slug}">${esc(t.short)}</a>`).join('')}</nav>
  ${teams.filter((t) => t.table).map((t) => `<section class="tsec" id="${t.slug}" aria-labelledby="h-${t.slug}">
    <div class="sec-head"><h2 class="h2" id="h-${t.slug}">${esc(t.full)}</h2>${more(`${R}${t.url}`, 'Stránka tímu')}</div>
    <p class="tsec-l">${esc(t.leagueName)}</p>
    ${tableHtml(t.table, R)}
  </section>`).join('')}
  ${teams.some((t) => !t.table) ? `<p class="note">${teams.filter((t) => !t.table).map((t) => esc(t.short)).join(', ')}: ${teams.filter((t) => !t.table).length > 1 ? 'prípravky hrajú' : 'prípravka hrá'} bez tabuľky.</p>` : ''}
</div></section>`,
});

// tímy
add('timy/', {
  title: 'Tímy', active: 'timy/', desc: `Tímy ${club.nazov} v sezóne ${SEASON}: áčko, dorast U19, mladší žiaci U13 a prípravka.`,
  body: (R) => `${pageHead({ title: 'Tímy', sub: `${plural(teams.length, 'tím', 'tímy', 'tímov')} v ročníku ${SEASON}.`, R, crumbs: [[null, 'Tímy']] })}
<section class="sec sec--first"><div class="wrap">${teamGrid(R)}
</div></section>`,
});

for (const t of teams) {
  add(t.url, {
    title: t.full, active: 'timy/', desc: `${club.nazov} – ${t.full}: ${t.leagueName}, zápasy, tabuľka a súpiska v sezóne ${SEASON}.`,
    body: (R) => {
      const list = teamMatches(t.slug);
      const nx = list.filter((m) => !m.past), rs = list.filter((m) => m.past).reverse();
      const pick = cardPick(t.slug);
      const rec = record(t.slug);
      const sc = scorers(t.slug);
      const groups = POS.map(([k, h]) => [h, t.squad.athletes.filter((a) => (k ? a.pos === k : !POS.some(([x]) => x && x === a.pos)))]).filter(([, l]) => l.length);
      const nrCount = new Map(); for (const a of t.squad.athletes) nrCount.set(a.nr, (nrCount.get(a.nr) || 0) + 1);
      const nr = (a) => (a.nr !== '' && nrCount.get(a.nr) === 1 ? a.nr : '');
      return `${pageHead({ title: t.full, sub: `${esc(t.leagueName)}${t.pos ? `, <b>${t.pos}. miesto</b> ${zo(t.of)}` : ''}`, R, crumbs: [['timy/', 'Tímy'], [null, t.short]] })}
<section class="sec sec--first"><div class="wrap team-top">
  ${pick ? `<div>${card(pick, R, { big: true })}</div>` : ''}
  <div class="team-side">
    ${rec.n ? `<p class="stat"><span class="stat-n">${rec.w}–${rec.d}–${rec.l}</span><span class="stat-l">výhry, remízy a prehry vo všetkých súťažiach, skóre ${rec.gf}:${rec.ga}</span></p><div class="liga-row"><h2 class="h4">Forma</h2>${formHtml(t.slug)}</div>` : '<p>Tím v tomto ročníku zatiaľ nemá výsledky. Rozpis zápasov je nižšie.</p>'}
    ${sc.length && t.adult ? `<div class="liga-row liga-row--list"><h2 class="h4">Strelci v sezóne</h2><ol class="scorers">${sc.slice(0, 5).map(([n, g]) => `<li><span>${esc(n)}</span><b>${g}</b></li>`).join('')}</ol></div>` : ''}
    ${calBox(`${t.slug}.ics`, R, `cal-${t.slug}`)}
  </div>
</div></section>
<section class="sec sec--mint" aria-labelledby="tz-h"><div class="wrap">
  ${secHead('Zápasy', 'tz-h')}
  <div class="cols2">
    <div><h3 class="h3">Program</h3>${nx.length ? matchList(nx, R, { showTeam: false }) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</div>
    <div><h3 class="h3">Výsledky</h3>${rs.length ? gbKey + matchList(rs, R, { showTeam: false }) : '<p>Tím v tomto ročníku ešte nehral.</p>'}</div>
  </div>
</div></section>
${t.table ? `<section class="sec" aria-labelledby="tt-h"><div class="wrap">${secHead('Tabuľka', 'tt-h')}<p class="tsec-l">${esc(t.leagueName)}</p>${tableHtml(t.table, R)}</div></section>` : ''}
${t.squad.athletes.length || t.squad.crew.length ? `<section class="sec sec--mint" aria-labelledby="ts-h"><div class="wrap">
  ${secHead('Súpiska', 'ts-h')}
  <p class="note">Hráči, ktorí v kalendárnom roku ${sn.updated.slice(0, 4)} nastúpili alebo boli v nominácii na zápas (podľa Sportnetu).${t.adult ? '' : ' Pri mládeži uvádzame len mená.'}</p>
  ${groups.map(([h, l]) => `<h3 class="h4 sq-h">${h}</h3><ul class="squad">${l.sort((a, b) => a.name.split(' ').at(-1).localeCompare(b.name.split(' ').at(-1), 'sk')).map((a) => `<li class="pl"><span class="pl-nr" aria-hidden="true">${esc(nr(a)) || '<span class="pl-dot"></span>'}</span><span class="pl-name">${esc(a.name)}${a.captain && t.adult ? ' <abbr class="cap" title="kapitán"><span aria-hidden="true">C</span><span class="sr">kapitán</span></abbr>' : ''}</span>${nr(a) ? `<span class="sr">, číslo ${nr(a)}</span>` : ''}</li>`).join('')}</ul>`).join('')}
  ${t.squad.crew.length ? `<h3 class="h4 sq-h">Realizačný tím</h3><ul class="crew">${t.squad.crew.map((c) => `<li><span class="crew-r">${esc(crewRole[c.role] || crewRole.other)}</span><span>${esc(c.name)}</span></li>`).join('')}</ul>` : ''}
</div></section>` : ''}`;
    },
  });
}

// mládež
add('mladez/', {
  title: 'Mládež', active: 'mladez/', desc: `Mládež ${club.nazov}: dorast U19, mladší žiaci U13 a prípravka – Jacovské bociany, majstri okresu U9 v ročníku 2025/26.`,
  body: (R) => {
    const youth = teams.filter((t) => !t.adult);
    return `${pageHead({ title: 'Mládež', sub: `${plural(youth.length, 'mládežnícky tím', 'mládežnícke tímy', 'mládežníckych tímov')} v ročníku ${SEASON}. Najmenší sú Jacovské bociany.`, R, crumbs: [[null, 'Mládež']] })}
<section class="sec sec--first"><div class="wrap youth-top">
  <div>
    <p class="lead">${esc(club.bociany.text)}</p>
    <ul class="coaches">${youth.map((t) => `<li><a href="${R}${t.url}"><b>${esc(t.short)}</b><span>${esc(t.sub)} · ${esc(t.leagueName)}${t.pos ? ` · ${t.pos}. miesto` : ''}</span>${coachOf(t) ? `<small>${coachRole(t)} ${esc(coachOf(t))}</small>` : ''}</a></li>`).join('')}</ul>
    <p class="src">Tréneri, súťaže a poradie podľa Sportnetu, bociany podľa Jacovského hlásnika 1/2026.</p>
  </div>
  <aside class="join">
    <p class="eyebrow">Nábor</p>
    <h2 class="h3">Prvý tréning</h2>
    <p>Chcete, aby vaše dieťa hralo futbal v Jacovciach? Napíšte klubu a opýtajte sa, kedy trénuje jeho vekový tím.</p>
    <p class="btns"><a class="btn btn--white" href="mailto:${club.kontakt.email}?subject=${encodeURIComponent('Nábor do mládeže')}">${I.mail}Napísať klubu</a></p>
  </aside>
</div></section>
<section class="sec sec--mint" aria-labelledby="ymt-h"><div class="wrap">
  ${secHead('Tímy mládeže', 'ymt-h', more(`${R}tabulky/`, 'Tabuľky'))}
  ${teamGrid(R, (t) => !t.adult)}
</div></section>
<section class="sec" aria-labelledby="ynext-h"><div class="wrap">
  ${secHead('Najbližšie zápasy mládeže', 'ynext-h', more(`${R}zapasy/`, 'Všetky zápasy'))}
  ${matchList(upcoming.filter((m) => !m.teamObj.adult).slice(0, 8), R)}
</div></section>`;
  },
});

// klub, storočnica, mená a obec
add('klub/', {
  title: 'Klub a storočnica', active: 'klub/', desc: `${club.nazov}: od 10. júla 1932, šesť mien klubu, Slovenský pohár 1956, majstri okresu, 2. miesto v VI. lige 2025/26 a storočnica v roku 2032.`,
  body: (R) => `${pageHead({ title: 'Klub a storočnica', sub: `Futbal v Jacovciach od 10. júla 1932, od roku 1960 pod menom TJ Družstevník. Farby ${esc(club.farby)}.`, R, crumbs: [[null, 'Klub']] })}
<section class="sec sec--first"><div class="wrap klub-grid">
  <div>
    <h2 class="h2">Kopačky za členské</h2>
    <p class="lead">${esc(club.zapisnica.text)}</p>
    <p class="src">Zdroj: zápisnice z roku 1932 citované v Jacovskom hlásniku 1/2022.</p>
    <h2 class="h3 names-h">Šesť mien klubu</h2>
    <ol class="names">${club.mena.zoznam.map((x) => `<li><span class="nm-y">${esc(x.roky)}</span><span class="nm-n">${esc(x.nazov)}</span></li>`).join('')}</ol>
  </div>
  <aside class="klub-aside">
    <img src="${R}img/erb-480.webp" alt="${esc(club.erbAlt)}" width="150" height="201" loading="lazy">
    <h2 class="h4">Úspechy</h2>
    <ul class="wins">${club.uspechy.map((u) => `<li>${I.trophy}<span><b>${esc(u.rok)}</b> ${esc(u.text)}</span></li>`).join('')}</ul>
  </aside>
</div></section>
<section class="sec sec--green" aria-labelledby="ce2-h"><div class="wrap">
  ${secHead('Zábradlie storočnice', 'ce2-h', '', '1932 – 2032')}
  ${storocnica()}
  ${milList()}
  <p class="src src--inv">Zdroj: Jacovský hlásnik 1/2022, 2/2022 a 1/2026, Sportnet.</p>
</div></section>
<section class="sec" id="rocniky" aria-labelledby="roc-h"><div class="wrap">
  ${secHead('Ročníky áčka', 'roc-h', '', 'Od 2013/14')}
  <div class="tbl-wrap"><table class="tbl tbl--roc"><caption class="sr">Ročníky áčka od 2013/14</caption>
    <thead><tr><th scope="col" class="tl">Ročník</th><th scope="col" class="tl">Súťaž</th><th scope="col">Miesto</th><th scope="col" class="hm">Skóre</th><th scope="col">Body</th></tr></thead>
    <tbody>${club.rocniky.zoznam.map((x) => `<tr${x.naj ? ' class="our"' : ''}><th scope="row" class="tl">${esc(x.rok)}</th><td class="tl">${esc(x.liga)}${x.pozn ? `<small>${esc(x.pozn)}</small>` : ''}</td><td class="nw">${x.poz}.<span> ${zo(x.z)}</span></td><td class="hm nw">${esc(x.skore)}</td><td>${x.body}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="src">Zdroj: konečné tabuľky zo Sportnetu.</p>
</div></section>
<section class="sec sec--mint" id="obec" aria-labelledby="ob2-h"><div class="wrap">
  ${secHead('Jacovce', 'ob2-h', '', 'Obec pri Topoľčanoch')}
  ${obecFacts()}
  <p class="src">Zdroj: Jacovský hlásnik 1/2024 a 2/2024, e-obce.sk. Správy z klubu vychádzajú v <a href="${club.noviny}" rel="noopener">Jacovskom hlásniku</a>.</p>
</div></section>`,
});

// ihrisko
add('ihrisko/', {
  title: 'Ihrisko', active: 'ihrisko/', desc: `${ST.nazov}: ihrisko z roku 1948, tribúna z roku 1972, závlaha 2020 a nová stena s logom klubu.`,
  body: (R) => {
    const home = upcoming.filter((m) => m.home).slice(0, 6);
    return `${pageHead({ title: ST.nazov, sub: `${club.adresa.map(esc).join(', ')}. Ihrisko slúži od roku 1948.`, R, crumbs: [[null, 'Ihrisko']] })}
<section class="sec sec--first"><div class="wrap stad">
  <div>
    <h2 class="h3">Od drevených bránok po zeleno-bielu stenu</h2>
    <ul class="mini mini--light">${ST.fakty.map((u) => `<li><b>${esc(u.k)}</b> ${esc(u.t)}</li>`).join('')}</ul>
    <p class="btns"><a class="btn btn--green" href="${mapsUrl}" rel="noopener">${I.route}Navigovať (Google Mapy)</a><a class="btn btn--line" href="${mapyUrl}" rel="noopener">${I.pin}Mapy.com</a></p>
    <p class="src">Zdroj: Jacovský hlásnik 1/2026, poloha zo Sportnetu.</p>
  </div>
  <div>${home.length ? `<h2 class="h3">Najbližšie zápasy doma</h2>${matchList(home, R)}` : ''}</div>
</div></section>`;
  },
});

// kontakt
add('kontakt/', {
  title: 'Kontakt', active: 'kontakt/', desc: `Kontakt na ${club.nazov}: e-mail, sídlo a ihrisko.`,
  body: (R) => `${pageHead({ title: 'Kontakt', sub: 'Zápasy, nábor do mládeže, partnerstvo a spolupráca.', R, crumbs: [[null, 'Kontakt']] })}
<section class="sec sec--first"><div class="wrap contact">
  <div class="ccard">
    <p class="eyebrow">Kontakt klubu</p>
    <p class="ccard-n">${esc(club.nazov)}</p>
    <p class="btns"><a class="btn btn--green" href="mailto:${club.kontakt.email}">${I.mail}<span>${esc(club.kontakt.email).replace('@', '<wbr>@')}</span></a></p>
    <p class="note">E-mail klubu podľa Sportnetu. Telefónne čísla klub verejne neuvádza.</p>
  </div>
  <dl class="facts">
    <div><dt>Názov</dt><dd>${esc(club.pravnyNazov)}</dd></div>
    <div><dt>Adresa</dt><dd>${club.adresa.map(esc).join(', ')}</dd></div>
    <div><dt>Ihrisko</dt><dd>${esc(ST.nazov)}</dd></div>
    <div><dt>Farby</dt><dd>${esc(club.farby)}</dd></div>
  </dl>
  <div>
    <h2 class="h3">Klub na webe</h2>
    <ul class="docs">
      <li><a href="${club.sportnetUrl}" rel="noopener">${I.ext}<span>Profil klubu na Sportnete</span><small>zápisy o stretnutí, súpisky, prestupy</small></a></li>
      <li><a href="https://www.obecjacovce.sk/futbal.html" rel="noopener">${I.ext}<span>Futbal na webe obce</span><small>tímy a tréneri</small></a></li>
      <li><a href="${club.noviny}" rel="noopener">${I.ext}<span>Jacovský hlásnik</span><small>noviny obce, rubrika šport</small></a></li>
    </ul>
    <p class="src">Vlastný web ani sociálne siete klubu sme nenašli.</p>
  </div>
</div></section>`,
});

add('ochrana-sukromia/', {
  title: 'Ochrana súkromia', desc: `Ako web ${club.nazov} pracuje s údajmi.`,
  body: (R) => `${pageHead({ title: 'Ochrana súkromia', R, crumbs: [[null, 'Ochrana súkromia']] })}
<section class="sec sec--first"><div class="wrap prose">
  <p>Web nepoužíva cookies, analytiku ani reklamné nástroje a nenačítava nič z iných serverov. Všetky súbory vrátane písma a erbov sú uložené priamo na webe. Odkazy na Sportnet a mapy sú obyčajné odkazy.</p>
  <p>Mená hráčov, trénerov a rozhodcov, výsledky, strelcov, karty a počty divákov preberáme z verejného systému Sportnet (Futbalnet), kam ich zapisujú kluby a zväzy pri zápasoch. Vek hráčov nezverejňujeme, pri mládeži uvádzame len mená a zostavy zápasov len pri dospelých.</p>
  <p>Ak chcete niečo opraviť alebo odstrániť, napíšte na <a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email)}</a>.</p>
</div></section>`,
});

add('404/', {
  title: 'Stránka sa nenašla',
  body: (R) => `${pageHead({ title: 'Stránka sa nenašla', sub: 'Táto lopta skončila za zábradlím. Adresa je chybná alebo sa stránka presunula.', R })}
<section class="sec sec--first"><div class="wrap"><p class="btns"><a class="btn btn--green" href="${R}">Na úvod</a><a class="btn btn--line" href="${R}zapasy/">Zápasy a výsledky</a></p></div></section>`,
});

// ---- kalendár (.ics, RFC 5545) ----------------------------------------------------------------
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsFold = (line) => {
  const out = []; let cur = '';
  for (const ch of line) { if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  out.push(cur);
  return out.join('\r\n');
};
const VTZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Bratislava',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
function ics(list, calName) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = list.map((m) => {
    const us = m.teamObj.adult ? club.nazov : `${club.nazov} ${m.teamObj.short}`;
    const [h, a] = m.home ? [us, m.opponent] : [m.opponent, us];
    const d = m.date.replace(/-/g, '');
    const t = (m.time || '').slice(0, 5);
    const when = t ? [`DTSTART;TZID=Europe/Bratislava:${d}T${t.replace(':', '')}00`, 'DURATION:PT2H'] : [`DTSTART;VALUE=DATE:${d}`];
    const desc = [m.comp + (m.roundName ? `, ${m.roundName}` : ''), m.home ? 'Domáci zápas' : 'Zápas vonku'].join('\n');
    return ['BEGIN:VEVENT', `UID:zapas-${m.id}@${config.sportnet.club}.sportnet`, `DTSTAMP:${stamp}`, ...when,
      `SUMMARY:${icsEsc(`${m.teamObj.short}: ${h} – ${a}${m.score ? ` ${m.score}` : ''}`)}`,
      `DESCRIPTION:${icsEsc(desc)}`, m.venue && `LOCATION:${icsEsc(venueName(m.venue))}`, 'END:VEVENT'].filter(Boolean);
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${club.nazov}//Zapasy//SK`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEsc(calName)}`, 'X-WR-TIMEZONE:Europe/Bratislava', ...VTZ, ...events.flat(), 'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n';
}

// ---- ukážka administrácie (dist/admin/demo.json pre src/admin/admin.js) ------------------------------
function writeAdminDemo() {
  // rovnaký tvar dát ako administrácia OK Častkovce (src/admin/admin.js je spoločný základ)
  const R = '../';
  const snById = Object.fromEntries(sn.matches.map((m) => [m.id, m]));
  const people = (t) => t.squad.athletes.map((a) => ({ name: a.name, number: a.nr === '' ? '' : String(a.nr), role: '', photo: null }));
  const demo = {
    club: { nazov: club.nazov, crest: `${R}img/erb-128.webp` },
    updated: sn.updated, season: sn.season,
    teams: teams.map((t) => ({ slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub })),
    matches: matches.map((m) => ({
      id: m.id, team: m.team, date: m.date, time: m.time, home: m.home, opponent: m.opponent, competition: m.comp, part: '',
      round: (/\d+/.exec(m.round) || [''])[0], played: m.past, score: m.score, goals: m.goals || [], cards: m.cards || [],
      venue: venueName(m.venue || ''), url: snById[m.id]?.url || null, gallery: null, video: null,
    })),
    rosters: Object.fromEntries(teams.map((t) => [t.slug, people(t).map(({ name, number, photo }) => ({ name, number, photo }))])),
    news: [],
    info: {
      nazov: club.nazov, pravnyNazov: club.pravnyNazov, adresa: club.adresa, osoba: '', telefon: '', email: club.kontakt.email,
      facebook: '', ico: '', ucet: '', stadion: { nazov: ST.nazov, kapacita: '', rozmery: '', vip: '' },
    },
    allTeams: teams.map((t) => ({
      slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub, league: t.leagueName, url: t.url, photo: null,
      groups: [{ title: 'Hráči', people: people(t) }, { title: 'Realizačný tím', people: t.squad.crew.map((c) => ({ name: c.name, number: '', role: crewRole[c.role] || crewRole.other, photo: null })) }],
    })),
    coaches: [],
    pages: {
      historia: { title: 'Míľniky', url: 'klub/', html: `<ul>${club.milniky.zoznam.map((h) => `<li><b>${esc(h.rok)}</b> – ${esc(h.text)}</li>`).join('')}</ul>` },
      rocniky: { title: 'Ročníky áčka', url: 'klub/', html: `<ul>${club.rocniky.zoznam.map((x) => `<li>${esc(x.rok)} ${esc(x.liga)}: ${x.poz ? `${x.poz}. miesto` : 'bez umiestnenia'}</li>`).join('')}</ul>` },
      'ochrana-sukromia': { title: 'Ochrana súkromia', url: 'ochrana-sukromia/', html: '<p>Web nepoužíva cookies, analytiku ani reklamné nástroje.</p>' },
    },
    home: {
      heroTitle: club.nazov, heroText: `Futbal v Jacovciach od roku 1932. Áčko hrá ${acc(A.leagueName)}.`, hero: null,
      stadion: { title: ST.nazov, text: ST.fakty.map((u) => u.text || u.t).join(' ') },
    },
    galleries: [], videos: [], fanshop: { pozn: '', email: club.kontakt.email, produkty: [] }, partners: [],
  };
  fs.writeFileSync(path.join(OUT, 'admin', 'demo.json'), JSON.stringify(demo));
}

// ---- zápis -------------------------------------------------------------------------------------
// obsah dist/ sa maže po súboroch: koreň môže držať náhľadový server (fs.watch) alebo otvorený terminál
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
const copy = (from, to) => { if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true }); };
copy(path.join(SRC, 'img'), path.join(OUT, 'img'));
copy(path.join(SRC, 'fonts'), path.join(OUT, 'fonts'));
copy(path.join(SRC, 'js'), path.join(OUT, 'js'));
copy(path.join(ROOT, 'media', 'foto-web'), path.join(OUT, 'foto'));
if (config.adminDemo !== false && fs.existsSync(path.join(SRC, 'admin', 'index.html'))) { copy(path.join(SRC, 'admin'), path.join(OUT, 'admin')); writeAdminDemo(); }
fs.rmSync(path.join(OUT, 'fonts', 'fonts.css'), { force: true });
fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
const fontsCss = fs.readFileSync(path.join(SRC, 'fonts', 'fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, 'url(../fonts/$1)');
fs.writeFileSync(path.join(OUT, 'css', 'site.css'), fontsCss + fs.readFileSync(path.join(SRC, 'css', 'site.css'), 'utf8'));

// slovenská sadzba v texte stránok (nie v <script>, <style> ani v atribútoch): jednopísmenová predložka alebo spojka
// nezostane na konci riadka („v Trenčíne“), skóre „1 : 0“, čísla „2 730“, dátumy, „V. liga“ a „1. miesto“ sa nerozdelia
const NB = ' ';
const typo = (html) => html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/).map((part, i) => (i % 2 ? part : part.replace(/>([^<]+)</g, (m, t) => '>' + t
  .replace(/(?<=^|[\s(„])([AaIiKkOoSsUuVvZz])[ \t]+(?=\S)/g, `$1${NB}`)
  .replace(/(?<=^|[\s(])(zo|vo|so|ku) (?=\S)/g, `$1${NB}`) // „zo 16“, „vo IV. lige“
  .replace(/ · /g, `${NB}· `) // oddeľovač „·“ nezačne riadok
  .replace(/(\d) : (\d)/g, `$1${NB}:${NB}$2`)
  .replace(/ - /g, ' – ') // spojovník medzi medzerami (názvy klubov a ihrísk zo Sportnetu) -> pomlčka
  .replace(/\b(U\d{1,2}) ([A-D])\b/g, `$1${NB}$2`) // „U15 A“ sa nerozdelí
  .replace(/([a-záäčďéíĺľňóôŕšťúýž]) (U\d{1,2})\b/g, `$1${NB}$2`) // „dorast U19“, „prípravky U11“ sa nerozdelí
  .replace(/(\d) (?=(?:rok|roky|rokov|rokoch|divák|diváci|divákov|bod|body|bodov|tím|tímy|tímov|mužstiev|vzorkami|m²|výhra|výhry|výhier|výhrami|prehra|prehry|prehier|víťazstiev|zápasov|gólov)(?![a-záäčďéíĺľňóôŕšťúýž]))/g, `$1${NB}`) // „400 divákov“, „23 rokov“
  .replace(/(?<=^|[\s(])(po|ut|st|št|pi|so|ne) (?=\d{1,2}\.)/g, `$1${NB}`) // „ne 15. 11.“
  .replace(/(\d\.) (?=(?:kol[oae]|miest[oea])\b)/g, `$1${NB}`)
  .replace(/(?<![\d.])(\d{1,2}\.) (?=[a-záäčďéíĺľňóôŕšťúýž])/g, `$1${NB}`) // „14. storočia“, „3. mieste“ (radová číslovka s podstatným menom)
  .replace(/(?<=^|[\s(])sv\. (?=\S)/g, `sv.${NB}`) // „sv. Juraja“
  .replace(/\bpred n\. l\./g, `pred${NB}n.${NB}l.`)
  .replace(/\b(\d{1,2}\.) (?=(?:\d{1,2}\.|januára|februára|marca|apríla|mája|júna|júla|augusta|septembra|októbra|novembra|decembra)(?!\d))/g, `$1${NB}`) // „7. marca“, „15. 11.“
  .replace(/\b([IVX]{1,4}\.) (?=lig)/g, `$1${NB}`) // „V. liga“
  .replace(/\b(\d{3}) (\d{2})\b/g, `$1${NB}$2`) // PSČ 913 11
  .replace(/(\d) (\d{3})(?!\d)/g, `$1${NB}$2`) + '<'))).join('');
for (const p of pages) {
  const depth = p.route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const html = typo(layout({ ...p, body: p.body(R) }));
  const file = path.join(OUT, p.route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
// GitHub Pages: 404 v koreni (absolútne cesty, lebo sa zobrazuje na ľubovoľnej adrese)
const BASE = process.env.BASE_PATH || config.basePath || '/';
const notFound = fs.readFileSync(path.join(OUT, '404', 'index.html'), 'utf8').replace(/(href|src|data-root)="(\.\.\/)+/g, `$1="${BASE}`);
fs.writeFileSync(path.join(OUT, '404.html'), notFound);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, '.gitattributes'), '*.ics -text\n'); // RFC 5545 chce CRLF, git na Windowse by ho zmenil

// kalendáre .ics: každý tím, všetky zápasy a jednotlivé budúce zápasy
fs.mkdirSync(path.join(OUT, 'kalendar'), { recursive: true });
for (const t of teams) fs.writeFileSync(path.join(OUT, 'kalendar', `${t.slug}.ics`), ics(teamMatches(t.slug), `${club.nazov} – ${t.full}`));
fs.writeFileSync(path.join(OUT, 'kalendar', 'vsetky.ics'), ics(matches, `${club.nazov} – všetky zápasy`));
for (const m of upcoming) fs.writeFileSync(path.join(OUT, 'kalendar', `zapas-${m.id}.ics`), ics([m], `${club.nazov} – ${m.teamObj.full}`));
console.log(`Hotovo: ${pages.length} stránok -> dist/ (dnes = ${TODAY})`);
