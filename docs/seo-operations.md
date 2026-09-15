# SEO方針と公開後の手動確認

## 今回の監査と判断

基点: origin/main `74e8275`。2026-09-15に監査。

| ページ | インデックス | sitemap | 方針 |
|---|---|---|---|
| / | 対象 | 掲載 | Backlog複数スペース・横断検索・個人整理の検索意図を既存title/descriptionが自然に説明しており維持 |
| /privacy/ | 対象 | 掲載 | 固有title/descriptionを維持 |
| /support/ | 対象 | 掲載 | 固有title/descriptionを維持 |
| /terms/ | noindex継続 | 除外 | #5とM4の法務整理後に再判断。施行日を推測しない |
| /commerce-disclosure/ | noindex継続 | 除外 | 有料版提供開始日などが別作業中のため継続 |
| 404 | noindex | 除外 | 任意の欠損URLに応答するためcanonicalを設定しない |

- 全5ページはHTTPS・独自ドメイン・末尾スラッシュにcanonicalとog:urlを統一。見出し階層、本文・フッター内部リンクは検査済み。
- OGPを全5ページに追加・統一。XはOGPフォールバックを使うsummary_large_imageを採用し、根拠のないアカウント名は追加しない。
- OGP画像は#6のユーザー確認待ち。旧PNGの参照を維持し、#6承認後に新PNG/JPEGの共有画像、実寸、altを全ページ同時に更新する。WebPの本文画像だけを機械的にOGPへ置換しない。
- robots.txtはクロールを許可し、noindexを読み取れる状態を維持。sitemapは索引対象3ページのみ。全ページに同一の古いlastmodが設定されていたため削除。信頼できる本文変更日を運用で管理できる場合だけ再導入。
- SoftwareApplicationは今回は不採用。表示中の料金・公開表現が#5/M4作業中で、検証済みレビュー情報もない。Googleのソフトウェアリッチリザルトには料金と評価またはレビューが必要なため、架空値で補わない。構造化データ未採用なので検証対象なし。
- 解析タグ・GA4・GTMは追加しない。

## Search Console（運営者が実施）

1. `issue-dock.com`のドメインプロパティを選択、または作成。Googleが提示するDNS TXT値をDNS管理者が登録し、所有権確認する。値は推測・生成せず、サイトコードにも埋め込まない。
2. 承認済み変更のマージ・自動公開後に、トップ・privacy・supportのURL検査でライブテストを実施。取得可能性、指定canonicalとGoogle選択canonical、noindexの有無を確認。
3. `https://issue-dock.com/sitemap.xml`をサイトマップ画面で送信。成功・検出URL数3を確認する。必要な3ページにインデックス登録をリクエスト。
4. 数日後にページのインデックス登録レポートを確認。terms・commerce-disclosureは意図的なnoindexとして区別。インデックス登録自体は保証されない。
5. #5/M4の確定後、法務2ページを検索対象にする判断を行う。対象にする場合はnoindex削除とsitemap追加を同じ変更で行う。
6. #6の画像承認後にOGP更新と共有プレビュー確認。料金・対応OS・公式ストア・実表示が確定し、実レビューの根拠が得られた時点で構造化データを再検討し、Rich Results Testで検証する。

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
