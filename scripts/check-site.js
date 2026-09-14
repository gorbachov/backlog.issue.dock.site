"use strict";

const { existsSync, readFileSync } = require("fs");
const { dirname, join, normalize, resolve } = require("path");

const root = resolve(__dirname, "..");
const pages = [
  "index.html",
  "privacy/index.html",
  "terms/index.html",
  "commerce-disclosure/index.html",
  "support/index.html",
];
const storeUrl = "https://chromewebstore.google.com/detail/issuedock/ciglfijkdakeeaahlbnhpbaalljbnepd";
const legacyPatterns = [
  /Trusted Tester/i,
  /ExtPay|ExtensionPay/i,
  /無料ベータ|ベータ版/,
  /公開準備中|購入申込みは受け付けていません/,
];
const errors = [];

function report(condition, message) {
  if (!condition) errors.push(message);
}

function matches(text, pattern) {
  const results = [];
  let match;
  while ((match = pattern.exec(text)) !== null) results.push(match);
  return results;
}

function targetFor(page, href) {
  const parts = href.split("#", 2);
  const pathname = parts[0];
  const fragment = parts[1] || "";
  const pageDir = dirname(join(root, page));
  let target = pathname ? normalize(join(pageDir, pathname)) : join(root, page);
  const lastPart = pathname.split("/").pop();
  if (pathname.endsWith("/") || (pathname && lastPart.indexOf(".") === -1)) {
    target = join(target, "index.html");
  }
  return { target, fragment };
}

for (const page of pages) {
  const path = join(root, page);
  const html = readFileSync(path, "utf8");

  report(/<html\s+lang="ja"/.test(html), `${page}: htmlのlangがjaではありません`);
  report(/<meta\s+name="viewport"/.test(html), `${page}: viewportがありません`);
  report((html.match(/<h1(?:\s|>)/g) || []).length === 1, `${page}: h1は1つ必要です`);
  report(/class="skip-link"\s+href="#main"/.test(html), `${page}: スキップリンクがありません`);
  report(/id="main"/.test(html), `${page}: スキップリンク先のmainがありません`);

  for (const pattern of legacyPatterns) {
    report(!pattern.test(html), `${page}: 旧表記が残っています (${pattern})`);
  }

  const ids = new Set(matches(html, /\sid="([^"]+)"/g).map((match) => match[1]));
  const references = matches(html, /(?:href|src)="([^"]+)"/g).map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|data:)/.test(reference)) continue;
    const result = targetFor(page, reference);
    report(existsSync(result.target), `${page}: 参照先がありません (${reference})`);
    if (result.fragment && result.target === path) {
      report(ids.has(result.fragment), `${page}: ページ内リンク先がありません (#${result.fragment})`);
    } else if (result.fragment && existsSync(result.target)) {
      const targetHtml = readFileSync(result.target, "utf8");
      const escapedFragment = result.fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      report(new RegExp(`\\sid="${escapedFragment}"`).test(targetHtml), `${page}: リンク先のIDがありません (${reference})`);
    }
  }
}

const home = readFileSync(join(root, "index.html"), "utf8");
const support = readFileSync(join(root, "support/index.html"), "utf8");
report(home.includes(storeUrl), "index.html: 公式Chrome Web Storeリンクがありません");
report(support.includes(storeUrl), "support/index.html: 公式Chrome Web Storeリンクがありません");

if (process.argv.includes("--release")) {
  const terms = readFileSync(join(root, "terms/index.html"), "utf8");
  const disclosure = readFileSync(join(root, "commerce-disclosure/index.html"), "utf8");
  report(!/施行日:[\s\S]{0,100}未定/.test(terms), "terms/index.html: 利用規約の施行日が未確定です");
  report(!/有料版提供開始日:[\s\S]{0,100}未定/.test(disclosure), "commerce-disclosure/index.html: 有料版提供開始日が未確定です");
}

if (errors.length) {
  console.error(`サイト検査で${errors.length}件の問題が見つかりました。`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`サイト検査に合格しました（${pages.length}ページ）。`);
