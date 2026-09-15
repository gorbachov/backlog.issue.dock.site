# IssueDock website

IssueDockの公式サイトです。ランディングページ、Chrome Web Store掲載用のプライバシーポリシー、法務・サポートページをGitHub Pagesで公開します。

- Site: https://issue-dock.com/
- Privacy policy: https://issue-dock.com/privacy/
- Terms: https://issue-dock.com/terms/
- Commerce disclosure: https://issue-dock.com/commerce-disclosure/
- Support: https://issue-dock.com/support/

`main`ブランチへの更新はGitHub Actionsを通してGitHub Pagesへ自動反映され、Cloudflare Worker `issue-dock-site` から独自ドメインで配信されます。

## 検証

内部リンク、ページ構造、公開導線、旧表記を検査できます。

```sh
node scripts/check-site.js
```

一般公開直前は法務ページの日付確定も含めて検査します。

```sh
node scripts/check-site.js --release
```

公開手順と確認項目は [`docs/general-public-release-checklist.md`](docs/general-public-release-checklist.md) を参照してください。

## ローカル品質確認

`npm install`、`npx playwright install chromium`の後、`npm run check`と`npm run audit`を実行します。

- [検証結果と1440px/500px確認画像](docs/review/README.md)
- [安全な製品画面の撮影記録](docs/product-capture.md)
- [SEO方針・Search Consoleの手動操作](docs/seo-operations.md)
