// Run with Node.js 20+: node scripts/check-site.js [--seo] [--release]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const seo = process.argv.includes('--seo');
const release = process.argv.includes('--release');
const pages = ['index.html', 'privacy/index.html', 'terms/index.html', 'commerce-disclosure/index.html', 'support/index.html'];
if (fs.existsSync(path.join(root, '404.html'))) pages.push('404.html');
const titles = new Set(), descriptions = new Set(), indexed = [];
const attr = (tag, key) => tag.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];
const storeUrl = 'https://chromewebstore.google.com/detail/issuedock/ciglfijkdakeeaahlbnhpbaalljbnepd';
const legacyPatterns = [
  /Trusted Tester/i,
  /ExtPay|ExtensionPay/i,
  /無料ベータ|ベータ版/,
  /公開準備中|購入申込みは受け付けていません/,
];

for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const url = new URL(file.replace(/index\.html$/, ''), 'https://issue-dock.com/');
  assert.match(html, /<html lang="ja">/, file);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one h1`);
  assert.match(html, /class="skip-link"\s+href="#main"/, `${file}: skip link`);
  assert.match(html, /id="main"/, `${file}: skip-link target`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => m[0]);
  const get = key => meta.find(t => attr(t, 'name') === key || attr(t, 'property') === key);
  const description = attr(get('description') || '', 'content');
  assert(title && !titles.has(title), `${file}: unique title`); titles.add(title);
  assert(description && !descriptions.has(description), `${file}: unique description`); descriptions.add(description);
  if (file !== '404.html') assert(html.includes(`rel="canonical" href="${url.href}"`), `${file}: canonical`);
  if (!/name="robots" content="noindex/.test(html)) indexed.push(url.href);
  let level = 0;
  for (const h of html.matchAll(/<h([1-6])\b/g)) { const n = Number(h[1]); assert(n <= level + 1, `${file}: heading order`); level = n; }
  for (const m of html.matchAll(/<(?:a|link|img|source)\b[^>]*>/g)) {
    const tag = m[0];
    if (tag.startsWith('<img')) for (const key of ['width', 'height', 'alt']) assert(attr(tag,key) !== undefined, `${file}: image ${key}`);
    const raw = attr(tag,'href') || attr(tag,'src') || attr(tag,'srcset');
    if (!raw) continue;
    const target = new URL(raw, url);
    if (target.origin !== url.origin) continue;
    let local = path.join(root, decodeURIComponent(target.pathname));
    if (fs.existsSync(local) && fs.statSync(local).isDirectory()) local = path.join(local,'index.html');
    assert(fs.existsSync(local), `${file}: broken link ${raw}`);
    if (target.hash) assert(fs.readFileSync(local,'utf8').includes(`id="${target.hash.slice(1)}"`), `${file}: missing anchor ${raw}`);
  }
  for (const pattern of legacyPatterns) assert(!pattern.test(html), `${file}: legacy copy ${pattern}`);
  assert(!/googletagmanager|google-analytics|gtag\(|G-[A-Z0-9]{6,}|GTM-[A-Z0-9]+/.test(html), `${file}: analytics forbidden`);
  if (seo && file !== '404.html') for (const key of ['og:title','og:description','og:url','og:image','twitter:card']) assert(get(key), `${file}: ${key}`);
  if (seo && file !== '404.html') assert.equal(attr(get('og:url'), 'content'), url.href);
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const support = fs.readFileSync(path.join(root, 'support/index.html'), 'utf8');
assert(home.includes(storeUrl), 'index.html: official Chrome Web Store link');
assert(support.includes(storeUrl), 'support/index.html: official Chrome Web Store link');

if (release) {
  const terms = fs.readFileSync(path.join(root, 'terms/index.html'), 'utf8');
  const disclosure = fs.readFileSync(path.join(root, 'commerce-disclosure/index.html'), 'utf8');
  assert(!/施行日:[\s\S]{0,100}未定/.test(terms), 'terms/index.html: effective date unresolved');
  assert(!/有料版提供開始日:[\s\S]{0,100}未定/.test(disclosure), 'commerce-disclosure/index.html: paid-service date unresolved');
}

const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).sort(), indexed.sort());
assert.match(fs.readFileSync(path.join(root,'robots.txt'),'utf8'), /Sitemap: https:\/\/issue-dock.com\/sitemap.xml/);
console.log(`PASS: ${pages.length} pages; metadata, headings, local links/anchors, image attributes, sitemap, no legacy copy, no analytics${seo ? ', OGP/X cards' : ''}${release ? ', release dates' : ''}`);
