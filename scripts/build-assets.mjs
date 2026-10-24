#!/usr/bin/env node
// Generates every SVG in /assets and README.md from /data/*.json.
//   node scripts/build-assets.mjs                 build everything (offline-safe)
//   node scripts/build-assets.mjs --fetch-icons   also try to pull real Devicon / Simple Icons logos + your avatar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLYPHS } from './icons.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = (...p) => path.join(ROOT, 'assets', ...p);
const J = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n), 'utf8'));
const FETCH = process.argv.includes('--fetch-icons');
const YEAR = new Date().getFullYear();

// ───────────────────────── tokens ─────────────────────────
const G = '#00ff88', MUTED = '#888888', WHITE = '#ffffff';
const GLASS = 'rgba(255,255,255,.03)', GLASS_B = 'rgba(255,255,255,.08)';
const GS = 'rgba(255,255,255,.06)', GS_B = 'rgba(255,255,255,.12)';
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fonts/meta.json'), 'utf8'));
const CW = (fs_) => meta.adv * fs_;
const b64 = (f) => fs.readFileSync(path.join(ROOT, 'scripts/fonts', f)).toString('base64');
const FONT_REG = `@font-face{font-family:PD;font-weight:400;src:url(data:font/woff;base64,${b64('mono.woff')}) format('woff')}`;
const FONT_BOLD = `@font-face{font-family:PD;font-weight:700;src:url(data:font/woff;base64,${b64('mono-bold.woff')}) format('woff')}`;
const FONT_KANA = `@font-face{font-family:PDK;src:url(data:font/woff;base64,${b64('kana.woff')}) format('woff')}`;
const STACK = `PD,'JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
const SYS = `'JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
const KANA = Array.from('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょぁぃぅぇぉっャュョァィゥェォッヴファフィフェフォティディトゥドゥチェシェジェ0234');

// ───────────────────────── helpers ─────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f1 = (n) => +n.toFixed(2);
const pc = (t, T) => +((t / T) * 100).toFixed(3);
const minify = (s) => s.replace(/\n\s*/g, '').replace(/>\s+</g, '><');
const written = [];
function put(rel, content) {
  const p = OUT(rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content); written.push([rel, Buffer.byteLength(content)]);
}
function wrap(text, max, balance = false) {
  if (text.length <= max) return [text];
  const words = text.split(' ');
  if (balance && words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const m = Math.max(a.length, b.length);
      if (!best || m < best.m) best = { m, l: [a, b] };
    }
    if (best.m <= max) return best.l;
  }
  const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines;
}
const RM = '@media (prefers-reduced-motion:reduce){*{animation:none!important}.cur,.rm-hide{display:none}}';
function svg({ w, h, title, desc, css = '', body, defs = '', font = false, bold = false, kana = false, sys = false }) {
  const fonts = (font ? FONT_REG : '') + (bold ? FONT_BOLD : '') + (kana ? FONT_KANA : '');
  return minify(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc><defs>${defs}</defs>
<style>${fonts}text{font-family:${sys ? SYS : STACK}}.bl{animation:bl 1s step-end infinite}@keyframes bl{0%,50%{opacity:1}50.01%,100%{opacity:0}}${css}${RM}</style>${body}</svg>`);
}
const icon = (name, x, y, size, color, sw = 1.6) =>
  `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(size / 24)})" fill="none" stroke="currentColor" color="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name] || GLYPHS.code}</g>`;
const scan = (id = 'sl') => `<pattern id="${id}" width="4" height="2" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" fill-opacity=".5"/></pattern>`;
const frame = (w, h, r, strong = true) => `<rect width="${w}" height="${h}" rx="${r}" fill="#000"/><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="${strong ? GS : GLASS}" stroke="${strong ? GS_B : GLASS_B}"/>`;
// border shimmer: a short bright dash that travels the rounded-rect outline, active only part of the cycle
const shimmer = (w, h, r, delay, cycle = 12) => ({
  el: `<rect class="sh" x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="${G}" stroke-width="1.4" pathLength="1000" stroke-dasharray="110 890" style="animation-delay:${delay}s"/>`,
  css: `.sh{opacity:0;animation:sh ${cycle}s linear infinite}@keyframes sh{0%{stroke-dashoffset:0;opacity:0}2%{opacity:.9}20%{opacity:.9}24%{stroke-dashoffset:-1000;opacity:0}100%{stroke-dashoffset:-1000;opacity:0}}`,
});

// typed-text engine: per-character fill-opacity keyframes (steps), exact because the font is embedded
class Timeline {
  constructor(T) { this.T = T; this.css = ''; this.n = 0; this.cur = []; }
  p(t) { return pc(Math.min(t, this.T), this.T); }
  chars(text, x0, y, fs_, fill, t0, dt, erase) { // erase: {t0, dt} | null
    const cw = CW(fs_); let out = `<text y="${y}" font-size="${fs_}" fill="${fill}">`;
    Array.from(text).forEach((ch, i) => {
      const a = t0 + i * dt, name = 'k' + this.n++;
      const b = erase ? erase.t0 + (text.length - 1 - i) * erase.dt : null;
      const e = 0.002;
      this.css += b == null
        ? `@keyframes ${name}{0%,${this.p(a)}%{fill-opacity:0}${this.p(a) + e}%,100%{fill-opacity:1}}`
        : `@keyframes ${name}{0%,${this.p(a)}%{fill-opacity:0}${this.p(a) + e}%,${this.p(b)}%{fill-opacity:1}${this.p(b) + e}%,100%{fill-opacity:0}}`;
      out += `<tspan x="${f1(x0 + i * cw)}" class="c" style="animation-name:${name}">${ch === ' ' ? '&#160;' : esc(ch)}</tspan>`;
    });
    return out + '</text>';
  }
  appear(inner, t, cls = '') { const name = 'a' + this.n++; this.css += `@keyframes ${name}{0%,${this.p(t)}%{opacity:0}${this.p(t) + 0.002}%,100%{opacity:1}}`; return `<g class="${cls}" style="animation:${name} ${this.T}s steps(1,end) infinite">${inner}</g>`; }
  event(t, x, y = 0) { this.cur.push([t, x, y]); }
  cursor(w, h, yOff) {
    let last = -1, k = `@keyframes cur{`; const ev = [...this.cur].sort((a, b) => a[0] - b[0]);
    ev.forEach(([t, x, y]) => { let p = this.p(t); if (p <= last) p = last + 0.003; last = p; k += `${p}%{transform:translate(${f1(x)}px,${f1(y)}px)}`; });
    k += `100%{transform:translate(${f1(ev.at(-1)[1])}px,${f1(ev.at(-1)[2])}px)}}`;
    const first = ev[0]; k = k.replace('@keyframes cur{', `@keyframes cur{0%{transform:translate(${f1(first[1])}px,${f1(first[2])}px)}`);
    return { css: k + `.cur{animation:cur ${this.T}s steps(1,end) infinite}`, el: `<g class="cur"><rect class="bl" x="0" y="${yOff}" width="${w}" height="${h}" fill="${G}"/></g>` };
  }
  base() { return `.c{animation-duration:${this.T}s;animation-iteration-count:infinite;animation-timing-function:linear}${this.css}`; }
}

// ───────────────────────── 1. banner ─────────────────────────
function rain(anim, W, H) {
  const R = rng(1337), N = 46, step = (W - 20) / N; let cols = '';
  for (let i = 0; i < N; i++) {
    const op = 0.1 + R() * 0.9, size = Math.round(10 + R() * 8), n = 5 + Math.floor(R() * 6);
    const x = 10 + i * step + R() * step * 0.35, speed = 30 + ((op - 0.1) / 0.9) * 120; // px/s, proportional to opacity
    const dur = f1(550 / speed), delay = f1(R() * dur), y0 = f1(R() * H);
    let ts = '';
    for (let j = 0; j < n; j++) {
      const ch = KANA[Math.floor(R() * KANA.length)], fo = f1(op * (0.15 + 0.85 * (j / (n - 1))));
      ts += `<tspan x="${f1(x)}" dy="${j ? f1(size * 1.25) : 0}" fill-opacity="${fo}">${ch}</tspan>`;
    }
    cols += anim
      ? `<g class="r" style="animation-duration:${dur}s;animation-delay:-${delay}s"><text font-size="${size}">${ts}</text></g>`
      : `<g transform="translate(0 ${y0})"><text font-size="${size}">${ts}</text></g>`;
  }
  return `<g mask="url(#fade)" fill="${G}" style="font-family:PDK,${SYS}">${cols}</g>`;
}
function banner(anim) {
  const W = 700, H = 300, fsN = 54, cwN = CW(fsN), name = "I'm PAVIN DAS", nx = 350 - (name.length * cwN) / 2;
  const phrases = ['Security Engineer', 'Web & Mobile Application Tester', 'Ethical Hacker'], fsS = 22, cwS = CW(fsS), yS = 208;
  const tl = new Timeline(1);
  let sub = '', css = `.r{animation:fall linear infinite}@keyframes fall{from{transform:translateY(-240px)}to{transform:translateY(310px)}}`;
  if (anim) {
    let t = 0.6; const plan = [];
    phrases.forEach((ph) => { const n = ph.length, tType = n * 0.07, tE = t + tType + 1.9, end = tE + n * 0.035; plan.push({ ph, t0: t, tE }); t = end + 0.45; });
    const T = f1(t + 0.9); tl.T = T;
    plan.forEach(({ ph, t0, tE }, pi) => {
      const x0 = 350 - (ph.length * cwS) / 2;
      sub += tl.chars(ph, x0, yS, fsS, G, t0, 0.07, { t0: tE, dt: 0.035 });
      tl.event(t0, x0);
      for (let i = 0; i < ph.length; i++) tl.event(t0 + i * 0.07, x0 + (i + 1) * cwS);
      for (let i = ph.length - 1; i >= 0; i--) tl.event(tE + (ph.length - 1 - i) * 0.035, x0 + i * cwS);
    });
    tl.event(0, 350 - (phrases[0].length * cwS) / 2);
    const c = tl.cursor(10, f1(fsS * 1.2), yS - fsS * 0.95); css += tl.base() + c.css; sub += c.el;
  } else {
    sub = `<text x="350" y="${yS}" font-size="${fsS}" fill="${G}" text-anchor="middle">${esc(phrases[0])}</text><rect x="${f1(350 + (phrases[0].length * cwS) / 2 + 3)}" y="${f1(yS - fsS * 0.95)}" width="10" height="${f1(fsS * 1.2)}" fill="${G}"/>`;
  }
  const nameTxt = (fill, dx) => `<text x="${f1(nx + dx)}" y="156" font-size="${fsN}" font-weight="700" fill="${fill}">${esc(name)}</text>`;
  let glitch = '';
  if (anim) {
    css += `.nm{transform-box:fill-box;transform-origin:center;animation:sk 6s steps(1,end) infinite}@keyframes sk{0%,85%{transform:none}86%{transform:skewX(-4deg)}88%{transform:skewX(3deg)}90%,100%{transform:none}}`
      + `.gA,.gB,.gC{opacity:0;animation-duration:6s;animation-iteration-count:infinite;animation-timing-function:steps(1,end)}`
      + `.gA{animation-name:gA}@keyframes gA{0%,84%{opacity:0}85%{opacity:1;transform:translateX(-6px)}87%{opacity:1;transform:translateX(5px)}89%{opacity:1;transform:translateX(-3px)}91%,100%{opacity:0}}`
      + `.gB{animation-name:gB}@keyframes gB{0%,85%{opacity:0}86%{opacity:1;transform:translateX(6px)}88%{opacity:1;transform:translateX(-4px)}90%{opacity:1;transform:translateX(3px)}92%,100%{opacity:0}}`
      + `.gC{animation-name:gC}@keyframes gC{0%,40%{opacity:0}41%{opacity:1;transform:translateX(-4px)}43%{opacity:1;transform:translateX(3px)}44%,100%{opacity:0}}`;
    glitch = `<g clip-path="url(#sa)"><g class="gA">${nameTxt(G, -2)}</g></g><g clip-path="url(#sb)"><g class="gB">${nameTxt('#fff', 2)}</g></g><g clip-path="url(#sc)"><g class="gC">${nameTxt(G, -3)}</g></g>`;
  }
  const eb = '> HELLO!', ls = 4, ebw = eb.length * (CW(13) + ls);
  const defs = `<clipPath id="rr"><rect width="${W}" height="${H}" rx="16"/></clipPath>
<linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".14" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<mask id="fade"><rect width="${W}" height="${H}" fill="url(#mg)"/></mask>
<radialGradient id="vg" cx="50%" cy="50%" r="62%"><stop offset="0" stop-color="#000" stop-opacity=".86"/><stop offset=".55" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></radialGradient>${scan()}
<clipPath id="sa"><rect x="0" y="118" width="${W}" height="13"/></clipPath><clipPath id="sb"><rect x="0" y="137" width="${W}" height="12"/></clipPath><clipPath id="sc"><rect x="0" y="127" width="${W}" height="9"/></clipPath>`;
  const body = `<g clip-path="url(#rr)"><rect width="${W}" height="${H}" fill="#000"/>${rain(anim, W, H)}<rect width="${W}" height="${H}" fill="url(#vg)"/>
<text x="24" y="34" font-size="11" fill="${MUTED}"><tspan fill="${G}">root@security:~$</tspan> whoami</text>
<text x="${f1(350 - ebw / 2)}" y="98" font-size="13" letter-spacing="${ls}" fill="${MUTED}"><tspan fill="${G}">&gt;</tspan> HELLO!</text>
<g class="nm">${nameTxt('#fff', 0)}</g>${glitch}${sub}
<text x="350" y="252" font-size="11" fill="${MUTED}" text-anchor="middle">Web &amp; Mobile Application Security · Vulnerability Assessment · Secure Code Review</text>
<text x="676" y="282" font-size="11" fill="${MUTED}" text-anchor="end" fill-opacity=".8">pavindas.github.io</text>
<rect width="${W}" height="${H}" fill="url(#sl)" opacity=".22"/></g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="rgba(0,255,136,.25)"/>`;
  return svg({ w: W, h: H, title: 'Pavin Das – Security Engineer', desc: 'Animated hero: matrix rain, glitching name, and a typed subtitle cycling through Security Engineer, Web & Mobile Application Tester and Ethical Hacker.', css: css + (anim ? '' : ''), body, defs, font: true, bold: true, kana: true });
}

// ───────────────────────── 2. nav / status / buttons ─────────────────────────
function navPill(label, first) {
  const w = 124, h = 44;
  return svg({ w, h, sys: false, font: true, title: label, desc: `Navigate to ${label}`,
    css: first ? `.gl{animation:gl 5s ease-in-out infinite}@keyframes gl{0%,100%{stroke-opacity:.35}50%{stroke-opacity:1}}` : '',
    body: `<rect x="2" y="2" width="120" height="40" rx="20" fill="#000"/><rect class="gl" x="2.5" y="2.5" width="119" height="39" rx="19.500" fill="${first ? 'rgba(0,255,136,.07)' : GLASS}" stroke="${first ? G : 'rgba(255,255,255,.18)'}" ${first ? 'stroke-opacity=".6"' : ''}/>
<text x="62" y="27" font-size="13" text-anchor="middle" fill="${first ? G : '#fff'}">${esc(label)}</text>` });
}
function status() {
  const items = ['Available for freelance', 'Bengaluru, India', 'pavindas.github.io'], fs_ = 12, cw = CW(fs_);
  const total = items.join('  ·  ').length * cw + 20, w = 700, x0 = (w - total) / 2;
  return svg({ w, h: 44, font: true, title: 'Status', desc: 'Available for freelance · Bengaluru, India · pavindas.github.io',
    css: `.pr{transform-box:fill-box;transform-origin:center;animation:pr 2.4s ease-out infinite}@keyframes pr{0%{transform:scale(1);opacity:.7}100%{transform:scale(3.2);opacity:0}}`,
    body: `<circle class="pr" cx="${f1(x0 + 6)}" cy="22" r="4" fill="${G}"/><circle cx="${f1(x0 + 6)}" cy="22" r="4" fill="${G}"/>
<text x="${f1(x0 + 20)}" y="26" font-size="${fs_}" fill="#fff"><tspan fill="${G}">${esc(items[0])}</tspan><tspan fill="${MUTED}">  ·  ${esc(items[1])}  ·  </tspan>${esc(items[2])}</text>` });
}
const BW = {};
function button(label, ic, note) {
  const fs_ = 14, cw = CW(fs_), pad = 28, iw = ic ? 26 : 0, tw = label.length * cw, w = Math.round(tw + iw + pad * 2), h = 48, M = 8;
  const W = w + M * 2, H = h + M * 2, tx = M + pad + iw; BW[label] = W;
  return svg({ w: W, h: H, font: true, title: label, desc: note,
    defs: `<clipPath id="bc"><rect x="${M}" y="${M}" width="${w}" height="${h}" rx="10"/></clipPath><linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="${G}" stop-opacity="0"/><stop offset=".5" stop-color="${G}" stop-opacity=".28"/><stop offset="1" stop-color="${G}" stop-opacity="0"/></linearGradient><filter id="gw" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>`,
    css: `.sw{animation:sw 6s ease-in-out infinite}@keyframes sw{0%{transform:translateX(-90px)}30%,100%{transform:translateX(${w + 40}px)}}.gl{animation:gl 4s ease-in-out infinite}@keyframes gl{0%,100%{opacity:.18}50%{opacity:.4}}`,
    body: `<rect class="gl" x="${M}" y="${M}" width="${w}" height="${h}" rx="10" fill="none" stroke="${G}" stroke-width="3" filter="url(#gw)"/>
<rect x="${M}" y="${M}" width="${w}" height="${h}" rx="10" fill="#000"/><g clip-path="url(#bc)"><rect class="sw" x="${M}" y="${M}" width="80" height="${h}" fill="url(#bg)"/></g>
<rect x="${M + .5}" y="${M + .5}" width="${w - 1}" height="${h - 1}" rx="9.500" fill="none" stroke="${G}"/>
${ic ? icon(ic, M + pad - 2, M + 14, 20, G, 2) : ''}<text x="${f1(tx)}" y="${M + 29}" font-size="${fs_}" font-weight="500" fill="${G}">${esc(label)}</text>` });
}

// ───────────────────────── 3. about ─────────────────────────
function terminal() {
  const W = 400, H = 252, fs_ = 12, cw = CW(fs_), T = 15, tl = new Timeline(T), px = 20, P = 'root@security:~$ ', pw = P.length * cw;
  const ly = (i) => 66 + i * 25;
  let body = '';
  const prompt = (i, t, cmd, ct, dt) => {
    const y = ly(i); let s = tl.appear(`<text x="${px}" y="${y}" font-size="${fs_}" fill="${G}">root@security:~$</text>`, t);
    if (cmd) s += tl.chars(cmd, px + pw, y, fs_, MUTED, ct, dt, null);
    tl.event(t, px + pw, y - 66); if (cmd) for (let k = 0; k < cmd.length; k++) tl.event(ct + k * dt, px + pw + (k + 1) * cw, y - 66);
    return s;
  };
  const out = (i, text, t) => tl.appear(`<text x="${px}" y="${ly(i)}" font-size="${fs_}" fill="#fff"><tspan fill="${G}">&gt;</tspan> ${esc(text)}</text>`, t);
  tl.event(0, px + pw, 0);
  body += prompt(0, 0.4, 'cat specialization.txt', 0.9, 0.06);
  body += out(1, 'Web & Mobile Application Security Testing', 2.8) + out(2, 'Vulnerability Assessment & Penetration Testing', 3.4) + out(3, 'Secure Code Review', 4.0);
  body += prompt(4, 5.0, 'echo $STATUS', 5.4, 0.07) + out(5, 'Available for freelance', 6.6) + prompt(6, 7.6, '', 0, 0);
  const c = tl.cursor(7, f1(fs_ * 1.25), -fs_ * 1.0);
  tl.css += `@keyframes fo{0%,86%{opacity:1}92%,100%{opacity:0}}`;
  const dots = [['#ff5f56', 20], ['#ffbd2e', 40], ['#27c93f', 60]].map(([c_, x]) => `<circle cx="${x}" cy="18" r="6" fill="${c_}" filter="url(#dg)"/>`).join('');
  return svg({ w: W, h: H, font: true, title: 'Terminal – specialization',
    desc: 'Terminal session. $ cat specialization.txt → Web & Mobile Application Security Testing; Vulnerability Assessment & Penetration Testing; Secure Code Review. $ echo $STATUS → Available for freelance.',
    css: tl.base() + c.css + `.fo{animation:fo ${T}s linear infinite}`,
    defs: `<clipPath id="rr"><rect width="${W}" height="${H}" rx="12"/></clipPath><filter id="dg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.200" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>${scan()}`,
    body: `<g clip-path="url(#rr)"><rect width="${W}" height="${H}" fill="#000"/><rect width="${W}" height="${H}" fill="${GS}"/>${dots}
<text x="${W / 2}" y="22" font-size="11" fill="${MUTED}" text-anchor="middle">root@security: ~</text><rect y="36" width="${W}" height="1" fill="rgba(255,255,255,.1)"/>
<g class="fo">${body}<g transform="translate(0 66)">${c.el}</g></g><rect width="${W}" height="${H}" fill="url(#sl)" opacity=".35"/></g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${GS_B}"/>` });
}
async function getAvatar() {
  const cache = OUT('.cache/avatar.jpg');
  if (FETCH || !fs.existsSync(cache)) {
    try { const r = await fetch('https://avatars.githubusercontent.com/u/88970616?v=4&s=300', { signal: AbortSignal.timeout(10000) }); if (r.ok) { fs.mkdirSync(path.dirname(cache), { recursive: true }); fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer())); } } catch { /* offline */ }
  }
  return fs.existsSync(cache) ? fs.readFileSync(cache).toString('base64') : null;
}
function avatarFrame(img) {
  const W = 220, H = 252, M = 8, ph = !img;
  const photo = ph
    ? `<g fill="#1a1a1a"><circle cx="110" cy="100" r="40"/><path d="M34 244c0-52 34-80 76-80s76 28 76 80z"/></g><text x="110" y="226" font-size="30" font-weight="700" fill="${G}" fill-opacity=".85" text-anchor="middle" font-family="${SYS}">PD</text>`
    : `<image href="data:image/jpeg;base64,${img}" x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" preserveAspectRatio="xMidYMid slice" filter="url(#gray)"/>`;
  const br = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 18}V${y}H${x + sx * 18}" fill="none" stroke="${G}" stroke-width="2"/>`;
  return svg({ w: W, h: H, font: true, title: 'Pavin Das – avatar frame', desc: 'Grayscale portrait with a faint green grid, scanlines, corner brackets and a slow scanning line.',
    defs: `<clipPath id="in"><rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" rx="10"/></clipPath><filter id="gray"><feColorMatrix type="saturate" values="0"/></filter>${scan()}
<pattern id="gr" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="${G}" stroke-opacity=".10"/></pattern>
<linearGradient id="ln" x1="0" x2="1"><stop offset="0" stop-color="${G}" stop-opacity="0"/><stop offset=".5" stop-color="${G}"/><stop offset="1" stop-color="${G}" stop-opacity="0"/></linearGradient>
<linearGradient id="tr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${G}" stop-opacity="0"/><stop offset="1" stop-color="${G}" stop-opacity=".22"/></linearGradient>`,
    css: `.sw{animation:sw 6s linear infinite}@keyframes sw{0%{transform:translateY(0)}100%{transform:translateY(${H - 2 * M}px)}}`,
    body: `<rect width="${W}" height="${H}" rx="16" fill="#000"/><g clip-path="url(#in)">${photo}<rect x="${M}" y="${M}" width="${W}" height="${H}" fill="url(#gr)"/><rect x="${M}" y="${M}" width="${W}" height="${H}" fill="url(#sl)" opacity=".5"/>
<g class="sw" transform="translate(0 0)"><g><rect x="${M}" y="${M - 34}" width="${W - 2 * M}" height="34" fill="url(#tr)"/><rect x="${M}" y="${M - 1}" width="${W - 2 * M}" height="2" fill="url(#ln)"/></g></g></g>
${br(M + 4, M + 4, 1, 1)}${br(W - M - 4, M + 4, -1, 1)}${br(M + 4, H - M - 4, 1, -1)}${br(W - M - 4, H - M - 4, -1, -1)}
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="rgba(0,255,136,.25)"/>` });
}

// ───────────────────────── 4. headers / categories ─────────────────────────
function header(eyebrow, title) {
  const W = 700, H = 96, fsT = 30, cwT = CW(fsT), tw = (title.length + 2) * cwT, x0 = (W - tw) / 2;
  const ebw = (eyebrow.length + 2) * (CW(12) + 3), ex = (W - ebw) / 2;
  return svg({ w: W, h: H, font: true, bold: true, title: `${eyebrow} – ${title}`, desc: `Section header: ${eyebrow}, ${title}`,
    defs: `<linearGradient id="ul" x1="0" x2="1"><stop offset="0" stop-color="${G}" stop-opacity="0"/><stop offset=".5" stop-color="${G}" stop-opacity=".7"/><stop offset="1" stop-color="${G}" stop-opacity="0"/></linearGradient><linearGradient id="gs" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    css: `.gs{animation:gs 8s ease-in-out infinite}@keyframes gs{0%{transform:translateX(-160px)}35%,100%{transform:translateX(860px)}}`,
    body: `<text x="${f1(ex)}" y="26" font-size="12" letter-spacing="3" fill="${MUTED}"><tspan fill="${G}">&gt;</tspan> ${esc(eyebrow)}</text>
<text x="${f1(x0)}" y="68" font-size="${fsT}" font-weight="700" fill="#fff"><tspan fill="${G}">$</tspan> ${esc(title)}</text>
<rect class="bl" x="${f1(x0 + tw + 4)}" y="${68 - fsT * 0.95}" width="10" height="${f1(fsT * 1.2)}" fill="${G}"/>
<rect x="150" y="86" width="400" height="1" fill="url(#ul)"/><rect class="gs" x="0" y="85" width="140" height="3" fill="url(#gs)" opacity=".5"/>` });
}
function category(title, w = 672) {
  return svg({ w, h: 40, font: true, bold: true, title, desc: `Skill category: ${title}`,
    body: `<rect x="0" y="6" width="2" height="28" fill="${G}"/><text x="16" y="26" font-size="14" font-weight="700" letter-spacing="1.4" fill="#fff"><tspan fill="${G}">#</tspan> ${esc(title.toUpperCase())}</text>` });
}

// ───────────────────────── 5. cards ─────────────────────────
const CARD_W = 322;
function projectCard(p, i) {
  const W = CARD_W, H = 228, fsD = 11.5, max = Math.floor((W - 44) / CW(fsD)), lines = wrap(p.description, max);
  const sh = shimmer(W, H, 16, i * 2);
  const chipW = Math.round(p.tag.length * CW(10.5) + 20);
  return svg({ w: W, h: H, font: true, bold: true, title: `${p.name} – ${p.tag}`, desc: p.description, css: sh.css,
    body: `${frame(W, H, 16)}${sh.el}${icon(p.glyph, W - 56, 22, 30, G, 1.4)}
<text x="22" y="44" font-size="18" font-weight="700" fill="#fff"><tspan fill="${G}">&gt;</tspan> ${esc(p.name)}</text>
<rect x="22.500" y="58.500" width="${chipW}" height="22" rx="11" fill="rgba(0,255,136,.10)" stroke="${G}" stroke-opacity=".4"/><text x="${22 + chipW / 2}" y="73" font-size="10.500" fill="${G}" text-anchor="middle">${esc(p.tag)}</text>
${lines.map((l, k) => `<text x="22" y="${108 + k * 19}" font-size="${fsD}" fill="#fff" fill-opacity=".82">${esc(l)}</text>`).join('')}
<rect x="22" y="${H - 44}" width="${W - 44}" height="1" fill="rgba(255,255,255,.08)"/>
<text x="22" y="${H - 20}" font-size="11" fill="${MUTED}">${esc(p.lang)}</text><text x="${W - 46}" y="${H - 20}" font-size="11" fill="${G}" text-anchor="end">view repo</text>${icon('arrowup', W - 40, H - 33, 16, G, 2)}` });
}
function serviceTile(s, i) {
  const W = 200, H = 236, fsT = 14, fsD = 11, sh = shimmer(W, H, 16, i * 3.5);
  const tl_ = wrap(s.title, Math.floor((W - 40) / CW(fsT)), true), dl = wrap(s.text, Math.floor((W - 40) / CW(fsD)));
  return svg({ w: W, h: H, font: true, bold: true, title: s.title, desc: s.text, css: sh.css,
    body: `${frame(W, H, 16)}${sh.el}${icon(s.icon, 22, 24, 40, G, 1.3)}${icon('arrowup', W - 38, 20, 18, MUTED, 1.8)}
<rect x="22" y="76" width="28" height="2" fill="${G}"/>
${tl_.map((l, k) => `<text x="22" y="${104 + k * 19}" font-size="${fsT}" font-weight="700" fill="#fff">${esc(l)}</text>`).join('')}
${dl.map((l, k) => `<text x="22" y="${104 + tl_.length * 19 + 10 + k * 17}" font-size="${fsD}" fill="#fff" fill-opacity=".72">${esc(l)}</text>`).join('')}` });
}
function blogCard(b, i) {
  const W = CARD_W, H = 156, sh = shimmer(W, H, 16, i * 2.5), fsT = 15;
  const tl_ = wrap(b.title, Math.floor((W - 90) / CW(fsT)), true), gl = wrap(b.tag, Math.floor((W - 44) / CW(11)));
  return svg({ w: W, h: H, font: true, bold: true, title: b.title, desc: b.tag, css: sh.css,
    body: `${frame(W, H, 16)}${sh.el}<text x="22" y="34" font-size="11" fill="${G}">${String(i + 1).padStart(2, '0')}</text><text x="${W - 22}" y="34" font-size="11" fill="${MUTED}" text-anchor="end">blog</text>
${tl_.map((l, k) => `<text x="22" y="${62 + k * 20}" font-size="${fsT}" font-weight="700" fill="#fff">${esc(l)}</text>`).join('')}
${gl.map((l, k) => `<text x="22" y="${62 + tl_.length * 20 + 4 + k * 16}" font-size="11" fill="${MUTED}">${esc(l)}</text>`).join('')}
<text x="22" y="${H - 18}" font-size="11" fill="${G}">read post</text>${icon('arrowup', 90, H - 31, 16, G, 2)}` });
}

// ───────────────────────── 6. skills ─────────────────────────
function iconCache(it) { // optional real logos downloaded by --fetch-icons
  const f = OUT('.icon-cache', it.slug + '.svg'); if (!fs.existsSync(f)) return null;
  const s = fs.readFileSync(f, 'utf8'); const vb = (s.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 24 24';
  let inner = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const tint = it.si || it.color === '#ffffff';
  if (tint) inner = inner.replace(/ fill="(?!none)[^"]*"/g, '');
  return { vb, inner, tint };
}
async function fetchIcons(cats) {
  fs.mkdirSync(OUT('.icon-cache'), { recursive: true });
  for (const c of cats) for (const it of c.items) {
    const urls = [it.si && `https://cdn.jsdelivr.net/npm/simple-icons/icons/${it.si}.svg`, it.dev && `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${it.dev}.svg`].filter(Boolean);
    for (const u of urls) { try { const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); if (r.ok) { fs.writeFileSync(OUT('.icon-cache', it.slug + '.svg'), await r.text()); break; } } catch { /* keep built-in glyph */ } }
  }
}
function skillTile(it, idx, row) {
  const W = 80, H = 98, fs_ = 10, lines = wrap(it.name, Math.floor(66 / CW(fs_)), true), col = idx % 8;
  const delay = f1(col * 0.16 + row * 1.1);
  let glyph; const cached = iconCache(it);
  if (cached) glyph = `<svg x="24" y="21" width="32" height="32" viewBox="${cached.vb}"${cached.tint ? ` fill="${it.color}"` : ''}>${cached.inner}</svg>`;
  else if (it.icon.startsWith('mono:')) {
    const t = it.icon.slice(5);
    glyph = `<rect x="22.500" y="20.500" width="35" height="35" rx="9" fill="${it.color}" fill-opacity=".12" stroke="${it.color}" stroke-opacity=".7"/><text x="40" y="44" font-size="${t.length > 1 ? 16 : 20}" font-weight="700" fill="${it.color}" text-anchor="middle">${esc(t)}</text>`;
  } else glyph = icon(it.icon, 24, 21, 32, it.color, 1.5);
  const ly = lines.length === 1 ? 78 : 73;
  return svg({ w: W, h: H, sys: true, title: it.name, desc: `${it.name} – skill`,
    css: `.l{animation:l 7s ease-in-out infinite;animation-delay:${delay}s}.b{animation:b 7s ease-in-out infinite;animation-delay:${delay}s}@keyframes l{0%,16%,100%{transform:translateY(0)}4%,10%{transform:translateY(-3px)}}@keyframes b{0%,16%,100%{stroke:#fff;stroke-opacity:.12}4%,10%{stroke:${G};stroke-opacity:1}}`,
    body: `<g class="l"><rect x="2" y="7" width="76" height="86" rx="12" fill="#000"/><rect class="b" x="2.500" y="7.500" width="75" height="85" rx="11.500" fill="${GS}" stroke="#fff" stroke-opacity=".12"/>${glyph}
${lines.map((l, k) => `<text x="40" y="${ly + k * 12}" font-size="${fs_}" fill="#fff" text-anchor="middle">${esc(l)}</text>`).join('')}</g>` });
}
function contactTile(c) {
  const W = 208, H = 64;
  return svg({ w: W, h: H, sys: true, title: `${c.label} – ${c.handle}`, desc: `${c.label}: ${c.handle}`,
    body: `${frame(W, H, 14)}${icon(c.icon, 18, 18, 28, G, 1.5)}<text x="58" y="29" font-size="12" font-weight="700" fill="#fff">${esc(c.label)}</text><text x="58" y="46" font-size="10" fill="${MUTED}">${esc(c.handle)}</text>${icon('arrowup', W - 30, 12, 14, MUTED, 2)}` });
}
function footerSvg() {
  const W = 700, H = 110, line = 'echo "stay curious. hack responsibly."', fs_ = 12, P = 'root@security:~$ ', cw = CW(fs_), x0 = (W - (P.length + line.length) * cw) / 2;
  const ecg = 'M0 40H250l10 0 8-24 10 46 8-34 8 12H430l10 0 8-24 10 46 8-34 8 12H700';
  return svg({ w: W, h: H, font: true, title: 'Footer', desc: 'Heartbeat line and closing terminal line: stay curious, hack responsibly.',
    css: `.hb{stroke-dasharray:150 850;animation:hb 5s linear infinite}@keyframes hb{from{stroke-dashoffset:0}to{stroke-dashoffset:-1000}}`,
    body: `<path d="${ecg}" pathLength="1000" fill="none" stroke="${G}" stroke-opacity=".14" stroke-width="1.4"/><path class="hb" d="${ecg}" pathLength="1000" fill="none" stroke="${G}" stroke-width="2" stroke-linecap="round"/>
<text x="${f1(x0)}" y="92" font-size="${fs_}" fill="${MUTED}"><tspan fill="${G}">root@security:~$</tspan> ${esc(line)}</text><rect class="bl" x="${f1(x0 + (P.length + line.length) * cw + 4)}" y="81" width="7" height="15" fill="${G}"/>` });
}
function placeholder(name, note) {
  return svg({ w: 700, h: 120, font: true, title: name, desc: note,
    body: `${frame(700, 120, 16, false)}<text x="350" y="56" font-size="13" text-anchor="middle" fill="#fff"><tspan fill="${G}">$</tspan> ${esc(name)}</text><text x="350" y="80" font-size="11" text-anchor="middle" fill="${MUTED}">${esc(note)}</text><rect class="bl" x="${350 + name.length * CW(13) / 2 + 12}" y="44" width="7" height="15" fill="${G}"/>` });
}

// ───────────────────────── build ─────────────────────────
const skills = J('skills.json'), projects = J('projects.json'), blogs = J('blogs.json'), links = J('links.json');
if (FETCH) await fetchIcons(skills);
put('banner.svg', banner(true)); put('banner-static.svg', banner(false));
const NAV = [['Projects', 'projects'], ['Services', 'services'], ['Skills', 'skills'], ['Blog', 'blog'], ['Contact', 'contact']];
NAV.forEach(([l], i) => put(`nav/${l.toLowerCase()}.svg`, navPill(l, i === 0)));
put('status.svg', status());
put('buttons/hire-me.svg', button('Hire Me', null, 'Email Pavin Das about security testing'));
put('buttons/download-cv.svg', button('Download CV', 'arrowdown', 'Download the CV as PDF'));
put('buttons/view-all-blogs.svg', button('View All Blogs', null, 'Open the blog index'));
put('buttons/portfolio.svg', button('Portfolio', 'globe', 'Open pavindas.github.io'));
put('terminal-about.svg', terminal());
put('avatar-frame.svg', avatarFrame(await getAvatar()));
const HEAD = { projects: ['PROJECTS', 'ls -la ~/projects'], services: ['SERVICES', './services.sh'], skills: ['TECHNOLOGIES', 'ls ./skills/'], blog: ['LATEST POSTS', 'ls ~/blogs'], github: ['GITHUB', 'git log --graph'], contact: ['CONTACT', './connect.sh'] };
for (const [k, [e, t]] of Object.entries(HEAD)) put(`headers/${k}.svg`, header(e, t));
skills.forEach((c) => put(`categories/${c.slug}.svg`, category(c.title)));
skills.forEach((c) => c.items.forEach((it, i) => put(`skills/${it.slug}.svg`, skillTile(it, i, Math.floor(i / 8)))));
projects.forEach((p, i) => put(`projects/${p.slug}.svg`, projectCard(p, i)));
links.services.forEach((s, i) => put(`services/${s.slug}.svg`, serviceTile(s, i)));
blogs.posts.forEach((b, i) => put(`blog/${b.slug}.svg`, blogCard(b, i)));
links.contacts.forEach((c) => put(`contact/${c.slug}.svg`, contactTile(c)));
put('footer.svg', footerSvg());
// placeholders that CI overwrites with real data (never fake numbers)
const SN = 'assets/snake/';
for (const f of ['github-snake.svg', 'github-snake-dark.svg']) if (!fs.existsSync(OUT('snake', f))) put(`snake/${f}`, placeholder('./snake --await-first-run', 'Contribution snake is generated by .github/workflows/snake.yml'));
if (!fs.existsSync(OUT('metrics.svg'))) put('metrics.svg', placeholder('./metrics --await-first-run', 'Stats card is generated by .github/workflows/metrics.yml'));

// ───────────────────────── README ─────────────────────────
const A = (p) => `assets/${p}`;
const img = (src, alt, w) => `<img src="${A(src)}" alt="${esc(alt)}" width="${w}">`;
const link = (href, inner) => `<a href="${href}">${inner}</a>`;
const mailto = `mailto:${links.email}?subject=${links.subject}`;
const anchor = (id, head, alt) => `<a id="${id}"></a>\n<h2 align="center">${img(`headers/${head}.svg`, alt, 700)}</h2>\n`;
let md = '';
md += `<div align="center">\n\n<h1 align="center">\n<picture>\n  <source media="(prefers-reduced-motion: reduce)" srcset="${A('banner-static.svg')}">\n  ${img('banner.svg', 'Pavin Das – Security Engineer, Web & Mobile Application Tester, Ethical Hacker', 700)}\n</picture>\n</h1>\n\n`;
md += NAV.map(([l, id]) => link(`#${id}`, img(`nav/${l.toLowerCase()}.svg`, l, 124))).join('\n') + '\n\n';
md += img('status.svg', 'Available for freelance · Bengaluru, India · pavindas.github.io', 700) + '\n\n';
md += [link(mailto, img('buttons/hire-me.svg', 'Hire Me – email Pavin Das', BW['Hire Me'])), link(links.cv, img('buttons/download-cv.svg', 'Download CV (PDF)', BW['Download CV'])), link(links.site, img('buttons/portfolio.svg', 'Open portfolio at pavindas.github.io', BW['Portfolio']))].join('\n') + '\n\n';
md += `<table align="center">\n<tr>\n<td valign="top">${img('terminal-about.svg', 'Terminal: cat specialization.txt → Web & Mobile Application Security Testing; Vulnerability Assessment & Penetration Testing; Secure Code Review. echo $STATUS → Available for freelance.', 400)}</td>\n<td valign="top">${img('avatar-frame.svg', 'Pavin Das – portrait frame', 220)}</td>\n</tr>\n</table>\n\n`;
md += `**Web & Mobile Application Security Testing** · **Vulnerability Assessment & Penetration Testing** · **Secure Code Review**<br>\n<sub>Security engineer and ethical hacker based in ${links.location}. Open to freelance work.</sub>\n\n`;
md += anchor('projects', 'projects', 'Projects – $ ls -la ~/projects');
const cell = (p, i) => `<td align="center" valign="top">\n${link(p.url, img(`projects/${p.slug}.svg`, `${p.name} – ${p.tag}. ${p.description}`, CARD_W))}\n<details><summary>features</summary>\n<ul align="left">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>\n</details>\n</td>`;
md += '<table align="center">\n' + [0, 2, 4].map((r) => `<tr>\n${cell(projects[r], r)}\n${cell(projects[r + 1], r + 1)}\n</tr>`).join('\n') + '\n</table>\n\n';
md += anchor('services', 'services', 'Services – $ ./services.sh');
md += '<table align="center">\n<tr>\n' + links.services.map((s) => `<td align="center" valign="top">${img(`services/${s.slug}.svg`, `${s.title}. ${s.text}`, 200)}</td>`).join('\n') + '\n</tr>\n</table>\n\n';
md += anchor('skills', 'skills', 'Technologies – $ ls ./skills/');
for (const c of skills) {
  md += `${img(`categories/${c.slug}.svg`, c.title, 672)}\n<br>\n`;
  md += c.items.map((it, i) => link(it.url, img(`skills/${it.slug}.svg`, it.name, 80)) + ((i + 1) % 8 === 0 && i + 1 < c.items.length ? '<br>' : '')).join('\n') + '\n\n';
}
md += anchor('blog', 'blog', 'Latest posts – $ ls ~/blogs');
const bc = (b, i) => `<td align="center">${link(blogs.base + b.slug + '.html', img(`blog/${b.slug}.svg`, `${b.title} – ${b.tag}`, CARD_W))}</td>`;
md += '<table align="center">\n' + [0, 2].map((r) => `<tr>\n${bc(blogs.posts[r], r)}\n${bc(blogs.posts[r + 1], r + 1)}\n</tr>`).join('\n') + '\n</table>\n\n';
md += `${link(blogs.index, img('buttons/view-all-blogs.svg', 'View all blogs', BW['View All Blogs']))}\n<br><sub>Also on <a href="${blogs.medium}">Medium</a></sub>\n\n`;
md += `<a id="github"></a>\n<h2 align="center">${img('headers/github.svg', 'GitHub activity – $ git log --graph', 700)}</h2>\n\n`;
md += `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${A('snake/github-snake-dark.svg')}">\n  ${img('snake/github-snake.svg', 'Contribution snake eating my GitHub contribution graph', 700)}\n</picture>\n\n${img('metrics.svg', 'GitHub stats: top languages and contribution totals', 700)}\n\n`;
md += anchor('contact', 'contact', 'Contact – $ ./connect.sh');
const ct = links.contacts.map((c) => link(c.url, img(`contact/${c.slug}.svg`, `${c.label}: ${c.handle}`, 208)));
md += '<p align="center">\n' + [ct.slice(0, 3), ct.slice(3, 6), ct.slice(6)].map((r) => r.join('\n')).join('<br>\n') + '\n</p>\n\n';
md += `<p align="center">\n${link(mailto, img('buttons/hire-me.svg', 'Hire Me – email Pavin Das', BW['Hire Me']))}<br>\n<sub>Based in ${links.location}</sub>\n</p>\n\n`;
md += `${img('footer.svg', 'Heartbeat line. root@security:~$ echo "stay curious. hack responsibly."', 700)}\n\n`;
md += `<details>\n<summary>$ sudo su</summary>\n\n\`\`\`console\nroot@security:~$ sudo su\n[sudo] password for pavin: ************\nroot@security:~# whoami\nroot\nroot@security:~# cat /root/flag.txt\nFLAG{curiosity_is_the_best_exploit}\nroot@security:~# exit\n\`\`\`\n\n</details>\n\n`;
md += `<sub>© ${YEAR} PavinDas · <a href="#">↑ back to top</a></sub><br>\n<sub>credits: Devicon · Font Awesome Free · Simple Icons · JetBrains Mono · <a href="assets/LICENSES.md">licenses</a></sub>\n\n</div>\n`;
fs.writeFileSync(path.join(ROOT, 'README.md'), md);

// ───────────────────────── report ─────────────────────────
const total = written.reduce((a, [, s]) => a + s, 0), big = written.filter(([, s]) => s > 60000);
console.log(`wrote ${written.length} files, ${(total / 1024).toFixed(0)} KB total. banner: ${(written.find(([r]) => r === 'banner.svg')[1] / 1024).toFixed(1)} KB`);
if (big.length) console.log('over 60 KB:', big.map(([r, s]) => `${r} ${(s / 1024).toFixed(0)}KB`).join(', '));
