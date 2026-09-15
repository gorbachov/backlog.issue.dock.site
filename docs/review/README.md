# Issue #6 検証結果と確認画像

2026-09-15、Ubuntuホストの成果と一般公開用の法務・公開導線を統合したローカルプレビューで最終検証。

| 幅 | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| 1440px | 100 | 100 | 100 | 100 |
| 500px | 100 | 100 | 100 | 100 |

Lighthouse 13.4.1。ローカル配信・追加スロットリングなしのラボ値です。本番の通信速度や実ユーザーのCore Web Vitalsを保証する値ではありません。

- `node scripts/check-site.js`: 成功。日本語、固有title/description、canonical、見出し階層、ローカルリンク・アンカー、画像属性、sitemap、解析タグなしを検査。
- `node scripts/audit-site.mjs`: 成功。全ページを1440pxと500pxで検査（#7は欠損URLの404も含む）。横スクロール・画像読込失敗・コンソールエラー0、CLS 0。axe WCAG 2/2.1 A/AA違反0。
- キーボード: 最初のTabで本文スキップリンク、Enter後に本文の先頭CTAへ移動。FAQはEnterで開くことを確認。スクロール表はTab操作可能。
- 画像は日本語で目視確認。製品画像の個人情報・秘密情報チェックは#6の撮影記録参照。

## 確認画像

| 内容 | デスクトップ | 500px |
|---|---|---|
| トップ全体 | [1440px](home-1440.png) | [500px](home-500.png) |
| 機能紹介 | [1440px](features-1440.png) | [500px](features-500.png) |
| データと安全性 | [1440px](security-1440.png) | [500px](security-500.png) |
| 下部CTA | [1440px](install-1440.png) | [500px](install-500.png) |
| 個人整理 | [1440px](feature-organize-1440.png) | [500px](feature-organize-500.png) |
| 検索 | [1440px](feature-search-1440.png) | [500px](feature-search-500.png) |
| 詳細とコメント | [1440px](feature-detail-1440.png) | [500px](feature-detail-500.png) |
| カラーテーマ | [1440px](feature-theme-1440.png) | [500px](feature-theme-500.png) |
| 同期 | [1440px](feature-sync-1440.png) | [500px](feature-sync-500.png) |
| 利用状況 | [1440px](feature-plan-1440.png) | [500px](feature-plan-500.png) |

## 再検証

`npm install` → `npx playwright install chromium` → `npm run check` → `npm run audit`。
ブラウザ監査はローカルHTTPサーバーとChromiumを起動し、`docs/review/`を更新します。Chromeのリモートデバッグ用9223番ポートを使うため、別監査と同時実行しないでください。

詳細: [ブラウザ監査JSON](browser-audit.json)、[Lighthouse 1440px](lighthouse-1440.json)、[Lighthouse 500px](lighthouse-500.json)。

2026-09-15、ユーザーによるデザイン・内容確認が完了し、一般公開用サイトとして承認済み。
