// Shared page behaviour: reading meter, scroll reveal, chapter rail highlighting, collapsed references.
document.documentElement.classList.add('js');

(() => {
  const meter = document.querySelector('.hud-meter');
  if (meter) {
    const tick = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      meter.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    addEventListener('scroll', tick, { passive: true });
    tick();
  }

  // Scroll-checked rather than IntersectionObserver: some embedded webviews throttle IO and would leave content invisible.
  let pending = [...document.querySelectorAll('.rise')];
  const reveal = () => {
    const vh = innerHeight;
    const atEnd = scrollY + vh >= document.documentElement.scrollHeight - 4; // last items may never cross the line
    pending = pending.filter(el => {
      // anything at or above the line, including content skipped by an anchor jump
      if (atEnd || el.getBoundingClientRect().top < vh * .92) { el.classList.add('seen'); return false; }
      return true;
    });
    if (!pending.length) { removeEventListener('scroll', reveal); removeEventListener('resize', reveal); }
  };
  addEventListener('scroll', reveal, { passive: true });
  addEventListener('resize', reveal);
  reveal();
  // captures, reader modes and find-in-page never scroll: show everything after a beat
  setTimeout(() => { pending.forEach(el => el.classList.add('seen')); pending = []; }, 2500);

  // Chapter pages: a chapter switcher in the HUD, and "On this page" for screens without the rail.
  const CHAPTERS = [
    ['00-prologue', 'Agent = Model + Harness'], ['01-loop', 'The Loop'], ['02-context', 'Context'],
    ['03-tools', 'Tools & Environment'], ['04-guardrails', 'Guardrails & Trust'], ['05-evals', 'Evals & Evolution'],
    ['06-operating', 'Operating the Harness'],
  ];
  const here = (location.pathname.match(/\/book\/(\d\d-[a-z]+)\.html$/) || [])[1];
  const nav = document.querySelector('.hud nav');
  if (here && nav) {
    const i = CHAPTERS.findIndex(c => c[0] === here);
    const menu = document.createElement('details');
    menu.className = 'chmenu';
    menu.innerHTML = `<summary title="Jump to a chapter">${String(i).padStart(2, '0')} / ${String(CHAPTERS.length - 1).padStart(2, '0')} ▾</summary><ol>` +
      CHAPTERS.map(([f, t], k) => `<li><a href="${f}.html"${k === i ? ' aria-current="page"' : ''}><span>${String(k).padStart(2, '0')}</span>${t}</a></li>`).join('') + '</ol>';
    nav.prepend(menu);
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  }
  const rail = document.querySelector('.rail ol'), hero = document.querySelector('.ch-hero');
  if (rail && hero) {
    const otp = document.createElement('details');
    otp.className = 'otp';
    otp.innerHTML = '<summary>On this page</summary>' + rail.outerHTML;
    hero.append(otp);
    otp.addEventListener('click', e => { if (e.target.closest('a')) otp.open = false; });
  }

  // Chapter rail: highlight the h2 currently in view.
  const links = [...document.querySelectorAll('.rail a[href^="#"]')];
  if (links.length) {
    const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('on'));
      map.get(e.target.id)?.classList.add('on');
    }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const t = document.getElementById(id); if (t) spy.observe(t); });
  }
})();

// Citations point into the collapsed references; open the box before jumping.
(() => {
  const box = document.querySelector('details.refbox');
  if (!box) return;
  const open = () => { const id = location.hash.slice(1); if (/^r\d+$/.test(id)) { box.open = true; document.getElementById(id)?.scrollIntoView({ block: 'center' }); } };
  addEventListener('hashchange', open);
  document.addEventListener('click', e => { if (e.target.closest('a[href^="#r"]')) box.open = true; });
  open();
})();

// Tiny helpers the chapter instruments share.
window.H = {
  $: (s, r = document) => r.querySelector(s),
  $$: (s, r = document) => [...r.querySelectorAll(s)],
  pct: v => (Math.round(v * 10) / 10).toFixed(1) + '%',
  // self-check: logs a visible console error instead of silently shipping wrong maths
  check: (cond, msg) => { if (!cond) console.error('[instrument self-check failed]', msg); return cond; },
};
