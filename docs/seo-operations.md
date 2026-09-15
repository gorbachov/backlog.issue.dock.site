# SEO方針と公開後の手動確認

## 今回の監査と判断

基点: origin/main `74e8275`。2026-09-15に監査。

| ページ | インデックス | sitemap | 方針 |
|---|---|---|---|
| / | 対象 | 掲載 | Backlog複数スペース・横断検索・個人整理の検索意図を既存title/descriptionが自然に説明しており維持 |
| /privacy/ | 対象 | 掲載 | 固有title/descriptionを維持 |
| /support/ | 対象 | 掲載 | 固有title/descriptionを維持 |
| /terms/ | 対象 | 掲載 | 施行日を2026-09-15に確定し、公開対象とする |
| /commerce-disclosure/ | 対象 | 掲載 | 有料版提供開始日を2026-09-15に確定し、公開対象とする |
| 404 | noindex | 除外 | 任意の欠損URLに応答するためcanonicalを設定しない |

- 全5ページはHTTPS・独自ドメイン・末尾スラッシュにcanonicalとog:urlを統一。見出し階層、本文・フッター内部リンクは検査済み。
- OGPを全5ページに追加・統一。XはOGPフォールバックを使うsummary_large_imageを採用し、根拠のないアカウント名は追加しない。
- OGP画像は#6で承認済みの最新版画面から1280×800のPNGを生成し、実寸・altを全ページで統一した。
- robots.txtはクロールを許可。sitemapは索引対象5ページを掲載し、今回の確定した本文更新日2026-09-15をlastmodに設定した。
- SoftwareApplicationは今回は不採用。表示中の料金・公開表現が#5/M4作業中で、検証済みレビュー情報もない。Googleのソフトウェアリッチリザルトには料金と評価またはレビューが必要なため、架空値で補わない。構造化データ未採用なので検証対象なし。
- 解析タグ・GA4・GTMは追加しない。

## Search Console（運営者が実施）

1. `issue-dock.com`のドメインプロパティを選択、または作成。Googleが提示するDNS TXT値をDNS管理者が登録し、所有権確認する。値は推測・生成せず、サイトコードにも埋め込まない。
2. 承認済み変更のマージ・自動公開後に、トップ・privacy・terms・commerce-disclosure・supportのURL検査でライブテストを実施。取得可能性、指定canonicalとGoogle選択canonical、noindexの有無を確認。
3. `https://issue-dock.com/sitemap.xml`をサイトマップ画面で送信。成功・検出URL数5を確認し、必要なページにインデックス登録をリクエスト。
4. 数日後にページのインデックス登録レポートを確認する。インデックス登録自体は保証されない。
5. OGPの共有プレビューを確認する。料金・対応OS・公式ストア・実表示が確定し、実レビューの根拠が得られた時点で構造化データを再検討し、Rich Results Testで検証する。

## 本番HTTP・重複URLの残確認

このホストのHTTPクライアントは独自ドメインで403を受信。原因がCloudflare、経路、取得環境のどれかは未確定。実訪問者やGooglebotにも403が返ると断定しない。記録: `review/network-audit.json`。
GitHub Pages元URLは200で到達できた。ローカルテストは静的配信相当のサーバーであり、本番Workerの動作を証明するものではない。

運営者が公開後に次を確認し、必要な301/308・HTTPステータス対応は配信Worker側で別途実施する（この静的リポジトリにはWorkerソースがない）。HTMLやJavaScriptでHTTPリダイレクトを偽装しない。

| URL | 期待 |
|---|---|
| https://issue-dock.com/ と各索引対象ページ | 200、正しいcanonical |
| http://issue-dock.com/、wwwホスト | HTTPS正規ホストへ301/308（wwwを運用する場合） |
| /privacy | /privacy/へ301/308 |
| /index.html、/privacy/index.html | 正規URLへ301/308が望ましい。少なくともcanonical一致 |
| /存在しないパス/ | 404のまま新しい404画面を表示（200のsoft 404にしない） |
| https://gorbachov.github.io/backlog.issue.dock.site/ | 元URLの重複は独自ドメインcanonicalで集約。配信制約に応じ301も検討 |

## 参考（一次資料）

- [Google: ソフトウェアアプリ構造化データ](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google: canonicalと重複URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: sitemap作成・送信](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
