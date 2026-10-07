# B案ロゴ・ログイン不要の応援ハート

2026-10-07。三浦がB案を選択し、事業所詳細の「いいね」が反応しないと報告。その後「ログインがなくてもいいねが増えたら」と要望。未ログインのPOSTが401で拒否され、説明文の下に小さいログインリンクだけが出る動作を、本番ログとコードで確認した。

## 変更

- B案の「2つの吹き出しの間にハート」の透過ロゴをヘッダー・フッター・faviconに採用。元画像は `public/brand/`。画像生成ツールで選定案の形を維持して切り出したPNG。フッターではCSSで白一色表示。
- 事業所の応援ハートはログイン・会員登録不要。同じ人が繰り返し応援でき、累計上限なし。記事への従来のいいねは対象外。
- 成功時は累計を更新してボタン直下にお礼を表示。送信中・失敗・再確認を区別し、12秒で結果が不明なら再確認できる。通信再送は同じrequest_idで行う。
- 人数表示は一覧・地図・トップ・詳細から除去。表示は応援回数の累計のみ。

## DB/API

`20261007041342_cares_guest_hearts.sql` は本番DBへ先行適用済み。履歴名は `cares_guest_hearts`、versionはファイルと同一。匿名送信履歴表と専用RPCを追加する後方互換変更で、既存の星・空き情報・会員データには変更なし。

APIがservice_role専用のsecurity invoker RPCを呼ぶ。匿名CookieはHttpOnly・SameSite=Lax・本番Secure、1年。署名と識別子のHMACはサーバーの既存service_roleキーを用途別の接頭辞で使用し、秘密値はクライアントに渡さない。IPはVercelの転送ヘッダーから受け、HMAC化した値だけDBへ送る。

送信IDは全体で一意。同じIDの再送は、最初の応答とCookieが失われても再加算しない。別の事業所へのID流用は拒否する。匿名識別子ごとに1秒の間隔、ネットワークごとに1分120回の短期制限をトランザクション内で適用。同じネットワークの複数利用者は制限を共有する。累計・生涯の上限ではない。分散したボットの完全排除を保証する仕組みではない。

外部OriginのPOSTは拒否し、JSONの入力とUUIDを検証。新しい履歴表はRLS有効でanon/authenticatedには権限なし。既存のハート累計を引き継ぎ、旧supporters列は互換性のため残すが公開画面・APIでは人数として使わない。

## 検証

- Node/PGliteの14テスト、型検査、Lintエラー0（既存警告19件）。署名Cookie・匿名POST・外部Origin拒否・再送・Cookie紛失・連打・ネットワーク制限・匿名DB拒否を含む。
- 実DBのservice_roleで初回加算・応答紛失を想定した再送・再応援・1秒制限・公開権限を確認。トランザクションをROLLBACKし、架空の応援は残していない。
- 実コンポーネント＋合成APIをChromeで検証。390/320/1440px、ロゴ表示、ログインなしの連続応援、通信切断後の同一ID再送、429後の再試行、古いブラウザー用UUID生成、横はみ出しなし、JS例外なし。
- Supabase Advisorの新規ERROR/WARNなし。内部履歴表に「RLS有効・ポリシーなし」のINFOが1件あり、一般公開しない意図どおり。
- ローカル空き1.7GiBのためフルビルドは行わず、Vercelのプレビュービルドで確認する。実PostgreSQL複数セッション同時送信の負荷試験は未実施。

本番切替は新API/画面のデプロイで行う。DBの追加SQLを再適用しない。切り戻しでも累計や履歴を削除しない。

技術根拠：[Supabase Functions](https://supabase.com/docs/guides/database/functions)、[Vercel転送ヘッダー](https://vercel.com/docs/headers/request-headers#x-forwarded-for)、[RLSポリシーなしのINFO](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。
