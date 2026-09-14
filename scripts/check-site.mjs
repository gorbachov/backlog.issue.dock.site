import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));
const releaseMode = process.argv.includes('--release');
const htmlFiles = [
  'index.html',
  'privacy/index.html',
  'support/index.html',
  'terms/index.html',
  'commerce-disclosure/index.html',
];
const storeUrl = 'https://chromewebstore.google.com/detail/issuedock/ciglfijkdakeeaahlbnhpbaalljbnepd';
const errors = [];
const warnings = [];
const documents = new Map(
  htmlFiles.map((file) => [file, readFileSync(join(root, file), 'utf8')]),
);

function addError(file, message) {
  errors.push(`${file}: ${message}`);
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function attributes(tag) {
  return new Map(
    [...tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((match) => [match[1], match[3]]),
  );
}

function targetFile(fromFile, href) {
  const [pathPart = '', hash = ''] = href.split('#', 2);
  const baseDir = dirname(fromFile);
  let target = pathPart ? normalize(join(baseDir, pathPart)) : fromFile;
  if (!extname(target)) target = join(target, 'index.html');
  return { target, hash };
}

for (const [file, html] of documents) {
  if (!/<html\s+lang="ja"/.test(html)) addError(file, 'html lang="ja" がありません');
  if (!/<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"/.test(html)) {
    addError(file, 'viewport指定がありません');
  }
  if ((html.match(/<h1\b/g) ?? []).length !== 1) addError(file, 'h1は1件である必要があります');
  if ((html.match(/<main\b/g) ?? []).length !== 1) addError(file, 'mainは1件である必要があります');
  if (!/<a\s+class="skip-link"\s+href="#main"/.test(html)) addError(file, '本文へのスキップリンクがありません');

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) {
    addError(file, `id="${id}" が重複しています`);
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gs)) {
    if (!attributes(match[0]).has('alt')) addError(file, `altのない画像があります: ${match[0]}`);
  }

  for (const match of html.matchAll(/<a\b[^>]*>(.*?)<\/a>/gs)) {
    const attrs = attributes(match[0]);
    const href = attrs.get('href');
    if (!href) {
      addError(file, 'hrefのないリンクがあります');
      continue;
    }
    if (!stripTags(match[1]) && !attrs.get('aria-label')) addError(file, `読み上げ名のないリンクがあります: ${href}`);
    if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;

    const { target, hash } = targetFile(file, href);
    const absoluteTarget = join(root, target);
    if (!existsSync(absoluteTarget)) {
      addError(file, `リンク先がありません: ${href}`);
      continue;
    }
    if (hash) {
      const targetHtml = documents.get(target) ?? readFileSync(absoluteTarget, 'utf8');
      if (!new RegExp(`\\sid=["']${hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(targetHtml)) {
        addError(file, `アンカー先がありません: ${href}`);
      }
    }
  }

  for (const match of html.matchAll(/<(?:img|link)\b[^>]*>/gs)) {
    const attrs = attributes(match[0]);
    const source = attrs.get('src') ?? attrs.get('href');
    if (!source || /^(?:https?:|data:)/.test(source)) continue;
    const { target } = targetFile(file, source);
    if (!existsSync(join(root, target))) addError(file, `資材がありません: ${source}`);
  }
}

const allHtml = [...documents.values()].join('\n');
for (const expression of ['Trusted Tester', '公開準備中', '購入受付前', '無料ベータ', 'ExtensionPay', 'ExtPay']) {
  if (allHtml.includes(expression)) addError('site', `旧表現が残っています: ${expression}`);
}

for (const file of ['index.html', 'support/index.html']) {
  if (!documents.get(file).includes(storeUrl)) addError(file, '正式なChrome Web Storeリンクがありません');
}
for (const file of ['index.html', 'support/index.html', 'terms/index.html', 'commerce-disclosure/index.html']) {
  const html = documents.get(file);
  if (!html.includes('250円') || !html.includes('2,400円')) addError(file, '月額・年額料金が揃っていません');
}
for (const file of ['support/index.html', 'terms/index.html', 'commerce-disclosure/index.html']) {
  const html = documents.get(file);
  if (!html.includes('72時間')) addError(file, '支払い失敗時の72時間猶予がありません');
  if (!html.includes('契約期間末日')) addError(file, '通常解約の期間末利用がありません');
  if (!html.includes('管理者権限')) addError(file, '返金の管理者対応がありません');
}

const privacy = documents.get('privacy/index.html');
for (const expression of ['Cloudflare Workers', 'Cloudflare D1', 'Resend', 'Stripe', 'メールアドレス', '認証セッション', '無料利用権', '支払い失敗', '返金・監査記録']) {
  if (!privacy.includes(expression)) addError('privacy/index.html', `現行データ境界の説明がありません: ${expression}`);
}

const css = readFileSync(join(root, 'assets/styles.css'), 'utf8');
if (!/@media\s*\(max-width:\s*640px\)/.test(css)) addError('assets/styles.css', '500px幅へ適用されるブレークポイントがありません');
if (!/\.table-wrap\s*\{[^}]*overflow-x:\s*auto/s.test(css)) addError('assets/styles.css', '狭幅時の表の横スクロール保護がありません');
for (const html of documents.values()) {
  if (/<table\b/.test(html) && !/<div class="table-wrap">\s*<table\b/s.test(html)) {
    addError('site', 'table-wrapで保護されていない表があります');
  }
}

const pendingDates = [
  ['terms/index.html', /施行日:\s*<span class="pending">/],
  ['commerce-disclosure/index.html', /有料版提供開始日:\s*<span class="pending">/],
];
for (const [file, pattern] of pendingDates) {
  if (!pattern.test(documents.get(file))) continue;
  const message = '公開日付が未確定です';
  if (releaseMode) addError(file, message);
  else warnings.push(`${file}: ${message}`);
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`OK ${htmlFiles.length}ページの構造・内部リンク・公開文言を確認しました`);
}
if (warnings.length) console.warn(warnings.map((warning) => `WARN ${warning}`).join('\n'));
