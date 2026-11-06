# WAM 全件掲載の準備・再開手順

本番未実行。事前に OS の正本 migration、Cares の検索・受付 migration を適用し、同一 DB を参照することを確認する。このスクリプトは公開基本情報と空き情報の同定行を作成する。受入可能情報・募集・所有認証を自動で付与せず、FAX や通知も送らない。

`scripts/backfill-wam-listings.cjs` は試行が既定。認証は実行環境の `SUPABASE_URL`（または `NEXT_PUBLIC_SUPABASE_URL`）と `SUPABASE_SERVICE_ROLE_KEY` から取得し、`.env` を読まない。値をコマンド引数・ログ・成果物に保存しない。

1. 適用前に、唯一の active WAM snapshot の ID・人が読める版・searchable 件数を試行結果で確認する。active は取込運用で承認した最新版であることを別途確認する。複数 active は停止する。

   ```sh
   node scripts/backfill-wam-listings.cjs --limit 1000 --page-size 100
   ```

2. 全件を事前確認する場合は `--limit` を件数に合わせて指定する（上限 100000）。件数が上限を超える場合、適用を進める前に別途運用判断する。dry-run では RPC・checkpoint 書込みなし。新規候補数は処理した範囲の source ID 未掲載件数で、全件の見積りではない。検証済みの新版 alias が既存 URL を引き継ぐ場合も候補に含まれるため、実際の新規ページ数とは一致しない。

3. snapshot、サービス、件数、サンプルを確認した後、明示した snapshot と新しい checkpoint で小さい上限から適用する。以下の UUID と保存先は確認した値に置き換える。

   ```sh
   node scripts/backfill-wam-listings.cjs --apply --snapshot REVIEWED_UUID --checkpoint /absolute/path/wam-checkpoint.json --limit 100 --page-size 50
   node scripts/backfill-wam-listings.cjs --apply --resume --snapshot REVIEWED_UUID --checkpoint /absolute/path/wam-checkpoint.json --limit 1000 --page-size 100
   ```

4. `completed: true` になるまで同じ snapshot・checkpoint で再開する。UUID 昇順の keyset で巡回し、検証済み行ごとに checkpoint を原子的に保存する。初回 RPC より前にもゼロ件 checkpoint を保存する。結果不明・保存失敗時には最後の行を再処理し得るが、正本 RPC の `source_kind=welfare` + `source_entry_id` 制約で重複を防ぐ。同じ処理中の並列実行は `.lock` で拒否する。異常終了した lock は実行プロセスが終了したことを確認してから手動で扱い、実行中に削除しない。

5. 結果の処理件数と `sourceCount`、source/service/version ごとの重複なし、検索の障害福祉タブ、代表の Cares ページ・公開番号を確認する。空き未回答の事業所は未確認のままであることも確認する。

番号・名称では既存介護掲載へマージしない。WAM の元 UUID と正規サービスで `ensure_service_availability_target('welfare', id)` を呼び、作成後は source alias → target → canonical listing の同一サービスを再検査し、処理前後に active snapshot の ID・版を再確認する。検証済み事業所が新版 WAM に移行した場合は元の Cares URL を引き継ぐ。事業所番号は `public_provider_number`、旧 `jigyosho_number` は NULL。所有認証は変えない。

snapshot ID・版・件数の変更や既存マッピング不一致で停止する。別 snapshot に古い checkpoint を流用しない。新 snapshot は再度試行・件数確認し、新 checkpoint で扱う。旧掲載の削除・名称や番号による統合は行わない。Cares の検索 view は最新 active source または現役の検証済み alias を持つ掲載だけを表示する。旧レコードは削除しないが、現役 alias のない旧 URL は検索 view を使う詳細画面でも掲載対象外になる。適用前に旧 snapshot の検索除外と verified alias による URL 継続を検証する。途中成功済みの行を削除する rollback は行わない。

ローカル検証: `node --test tests/wam-backfill.test.cjs`。合成データでページング・再開・応答紛失・同定不一致・snapshot 切替停止を確認する。本番の件数・成功を表すものではない。
