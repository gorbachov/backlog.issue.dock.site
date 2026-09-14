# IssueDock website

IssueDockの公式サイトです。ランディングページ、Chrome Web Store掲載用のプライバシーポリシー、法務・サポートページをGitHub Pagesで公開します。

- Site: https://issue-dock.com/
- Privacy policy: https://issue-dock.com/privacy/
- Terms: https://issue-dock.com/terms/
- Commerce disclosure: https://issue-dock.com/commerce-disclosure/
- Support: https://issue-dock.com/support/

`main`ブランチへの更新はGitHub Actionsを通してGitHub Pagesへ自動反映され、Cloudflare Worker `issue-dock-site` から独自ドメインで配信されます。

## 検証

依存パッケージなしで、内部リンク、ページ構造、公開導線、旧表記を検査できます。

```sh
node scripts/check-site.js
```

一般公開直前は法務ページの日付確定も含めて検査します。

```sh
node scripts/check-site.js --release
```

公開手順と確認項目は [`docs/general-public-release-checklist.md`](docs/general-public-release-checklist.md) を参照してください。
