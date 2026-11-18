// Statický generátor webu TJ Družstevník Jacovce: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-17 prepíše dnešný dátum)
// Zostavuje ho kluby-siet/engine/assemble.py zo spoločného jadra v2 a tohto súboru (vzhľad, úvod, stránka Klub).
// Kostra „Mozaika“: úvod je mriežka dlaždíc rôznej veľkosti – najbližší zápas áčka, posledný výsledok, miesto a forma,
// výsledky, program, Jacovské bociany, ročník 2025/26 a cesta k storočnici 2032. Svetlý podklad, biele dlaždice,
// jedna zelená. Písmo Syne (nadpisy, čísla) a Bitter (text).
const SKIN = {
  nav: 'bar', theme: '#0b5e2a', brand: 'Družstevník Jacovce', brandSub: 'futbal od roku 1932',
  fonts: ['syne-700.woff', 'bitter-400.woff', 'bitter-700.woff'],
  sources: 'História a správy z klubu podľa Jacovského hlásnika.',
  adminHero: 'Futbal v Jacovciach od roku 1932',
  adminFacts: club.milniky.zoznam.map((x) => ({ k: String(x.rok), t: x.text })),
  links: [['https://www.obecjacovce.sk/futbal.html', 'Futbal na webe obce'], [club.noviny, 'Jacovský hlásnik']],
};
const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['klub/', 'Klub'], ['kontakt/', 'Kontakt']];
const DESC = `${club.nazov} – futbal v Jacovciach od roku ${club.zalozenie}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}) a mládeže, 2. miesto v VI. lige 2025/26 a storočnica 2032.`;

add('', {
  title: `futbal od roku ${club.zalozenie}`, active: '', bodyClass: 'home',
  body: (R) => {
    const n = nextA, l = lastA;
    const row = A.table?.rows.find((r) => r.our);
    const prev = club.rocniky.zoznam.at(-1);
    const wl = winterLine();
    return `<section class="sec sec--first"><div class="wrap">
  <h1 class="h1">TJ Družstevník Jacovce</h1>
  <div class="bento">
    ${n ? `<article class="tile tile--next">
      <p class="tile-k">${wl ? 'Áčko po zimnej prestávke' : 'Najbližší zápas áčka'}</p>
      <p class="next-o">${n.home ? 'Jacovce – ' : ''}${esc(n.opponent)}${n.home ? '' : ' – Jacovce'}</p>
      <p class="next-d"><time datetime="${n.date}">${dLong(n.date)}</time>, ${esc(n.time || '')} · ${n.home ? 'doma' : 'vonku'}</p>
      ${wl ? '' : `<p class="next-cd"><span class="cd" data-kickoff="${isoLocal(n.date, n.time)}" hidden></span></p>`}
      <p class="btns"><a class="btn" href="${R}kalendar/zapas-${n.id}.ics" download>${I.cal}Do kalendára</a><a class="btn btn--line" href="${R}${n.url}">Detail</a></p>
    </article>` : ''}
    ${l ? `<a class="tile tile--last" href="${R}${l.detail ? l.url : 'zapasy/'}">
      <p class="tile-k">Posledný výsledok</p>
      <p class="last-s">${l.gf}:${l.ga}</p>
      <p class="last-o">${esc(l.opponent)}</p><p class="tile-m">${RES[l.res]} ${l.home ? 'doma' : 'vonku'}</p>
      <p class="tile-m">${dShort(l.date)} · ${esc(l.roundName || l.comp)}</p>
    </a>` : ''}
    ${row ? `<a class="tile tile--pos" href="${R}tabulky/">
      <p class="tile-k">${esc(A.leagueName)}</p>
      <p class="pos-n">${A.pos}.<span>${zo(A.of)}</span></p>
      <p class="tile-m">${row.pts} ${pw(row.pts, 'bod', 'body', 'bodov')} · skóre ${row.gf}:${row.ga}</p>
      ${formHtml(A.slug)}
    </a>` : ''}
    <section class="tile tile--res" aria-labelledby="res-h"><h2 class="tile-h" id="res-h">Výsledky</h2>${fxList(homeRes(4, lastA), R)}${more(`${R}zapasy/#z-vys`, 'Všetky')}</section>
    <section class="tile tile--prog" aria-labelledby="prog-h"><h2 class="tile-h" id="prog-h">Program</h2>${homeUp(4, nextA).length ? fxList(homeUp(4, nextA), R) : '<p>Zatiaľ bez programu.</p>'}${more(`${R}zapasy/`, 'Všetky')}</section>
    <a class="tile tile--green" href="${R}klub/">
      <p class="tile-k">Ročník ${esc(prev.rok)}</p>
      <p class="big-n">${prev.poz}. miesto</p>
      <p>${esc(prev.liga)}, ${prev.body} bodov, skóre ${esc(prev.skore)}. Na jar 14 výhier a 10 v rade.</p>
    </a>
    <a class="tile tile--storks" href="${R}timy/">
      <p class="tile-k">Prípravka U9</p>
      <p class="big-n">Jacovské bociany</p>
      <p>Majstri okresu Topoľčany v ročníku 2025/26.</p>
    </a>
    <a class="tile tile--cent" href="${R}klub/">
      <p class="tile-k">1932 – 2032</p>
      <p class="big-n">${2032 - YEAR} ${pw(2032 - YEAR, 'rok', 'roky', 'rokov')}</p>
      <p>do sto rokov futbalu v Jacovciach.</p>
    </a>
  </div>
</div></section>`;
  },
});

add('klub/', {
  title: 'Klub', active: 'klub/', desc: `${club.nazov}: od 10. júla 1932, šesť mien klubu, Slovenský pohár 1956, ročníky áčka, Jacovské bociany a ihrisko z roku 1948.`,
  body: (R) => `${pageHead({ title: 'Klub', sub: `Futbal v Jacovciach od 10. júla 1932, od roku 1960 pod menom TJ Družstevník. Klubové farby: ${esc(club.farby)}.`, R, crumbs: [[null, 'Klub']] })}
<section class="sec sec--first"><div class="wrap bento bento--page">
  <section class="tile tile--wide"><h2 class="tile-h">Míľniky</h2><ol class="mil">${club.milniky.zoznam.map((x) => `<li${x.rok > YEAR ? ' class="mil--f"' : ''}><b>${x.rok}</b><span>${esc(x.text)}</span></li>`).join('')}</ol></section>
  <section class="tile"><h2 class="tile-h">Kopačky za členské</h2><p>${esc(club.zapisnica.text)}</p></section>
  <section class="tile"><h2 class="tile-h">Šesť mien klubu</h2><ol class="names">${club.mena.zoznam.map((x) => `<li><span>${esc(x.roky)}</span><b>${esc(x.nazov)}</b></li>`).join('')}</ol></section>
  <section class="tile tile--wide"><h2 class="tile-h">Ročníky áčka</h2>${seasonsTable(club.rocniky.zoznam)}</section>
  <section class="tile"><h2 class="tile-h">Ročník 2025/26</h2><p>${esc(club.sezona2526.text)}</p></section>
  <section class="tile"><h2 class="tile-h">Jacovské bociany</h2><p>${esc(club.bociany.text)}</p></section>
  <section class="tile"><h2 class="tile-h">${esc(ST.nazov)}</h2>${facts(ST.fakty)}</section>
  <section class="tile"><h2 class="tile-h">Jacovce</h2>${facts(club.obec.fakty)}</section>
</div>
<div class="wrap"><p class="note">Zdroje: Jacovský hlásnik 1/2022, 2/2022, 1/2024, 2/2024 a 1/2026, e-obce.sk, Sportnet.</p></div></section>`,
});
