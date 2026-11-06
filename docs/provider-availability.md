# OS / Cares 空き情報の接続

`service_availability_public` が事業所サービス単位の公開版。対象が移行済みなら、撤回・期限切れ・不明でも旧プロフィールや地域のレポートへ戻さない。未移行だけ `cares_latest_vacancies` を使う。第三者レポートの投稿経路は事業所の回答に昇格させない。

`cares_current_availability` が公開版と未移行レポートを統合し、既存 directory / confirmed_directory ビューの検索列へ反映する。`conditional` を独立した状態として保持する。旧 `/facility/{id}` はサービスが完全一致し、一意に紐づく場合だけ状態を表示する。複数の候補を先頭1件で決めない。

公開カレンダーと利用者募集は同じ公開版を表示する。`summary.calendar` の確認日・期限は一般受入状態と別管理し、Cares受付設定の保存で詳細枠を更新しない。既存の曜日・訪問・入所等の表は `detailConfirmation` の確認日・期限が有効な場合だけ表示する。未確認・期限切れは要再確認とし、元の入力は保持する。一般状態が受入不可・不明なら、以前の枠表や受入可能条件は現在情報として表示しない。募集FAXの公開URLは `/directory/{listing_id}`。

Cares受付管理は `cares_intake_save_availability` を呼ぶ。所有権を再検証し、正本保存と受付設定更新を同じトランザクションで行う。期待する版と操作IDを必須とし、受付文面を含む同じ操作の再送は一度だけ保存する。旧5引数RPCは版を持たないため保存を拒否する。公開撤回時、またはOS側で新しい版になったときは、以前の受付案内文を公開しない。受付案内文には別の `message_confirmed_on` / `message_valid_until` を持たせる。初期OFFの『この案内文の内容も確認しました』を選んだ保存時だけ更新し、一般状態の保存では期限を延ばさない。未確認の文面変更は前の確認を無効にする。未確認・期限切れの案内文は公開せず、所有者編集画面に入力を残す。フォーム受付の可否・通知先の確認は既存の認可を維持する。

検索は最新 active snapshot または現役の検証済み source alias を持つ WAM 掲載に限定する。旧 snapshot しかない掲載は検索から外し、確認済みの同じ事業所は canonical URL を継続する。

WAMの出典は `source_kind=welfare` / `source_entry_id` / `source_version`。WAMの事業所番号は `public_provider_number`。介護の `jigyosho_number` に書き込まない。QR回答からCares所有者認証を変更しない。

Cares検索に載る実データは `cares_listings` に登録済みのものだけ。未照会のWAM全件は、OS側の初期バックフィルを実施・確認するまでは掲載済みと扱わない。アプリとSQLを作成しただけで本番の全WAM掲載を完了とはしない。

## 適用・検証

全体の適用順・照会/FAX/相談の追加 migration は対応する OS PR #1423 の `scripts/availability/README.md` を参照する。Cares の直接依存は以下3本。

同一DBへ OS `20261106131710_service_availability_state.sql`、Cares `20261106132035_cares_shared_availability.sql`、`20261106132057_cares_intake_shared_availability.sql` の順で適用し、その後アプリを切り替える。公開前にSQLとアプリの両側を揃える。検索ビューは既存列順を保持して新しい出典列だけ末尾へ追加する。

共通カレンダーとDBテスト用SQLの生成コピーは `node scripts/sync-availability-contract.cjs /path/to/os` で更新し、`--check` で一致を検証する。DB契約fixtureは本番適用用migrationではない。サービスカタログは `node scripts/sync-service-types.cjs /path/to/os HEAD --working-tree` で同期する。通常は確定したrefを指定し `--working-tree` を省く。

`npm test`、`npm run typecheck`、`npm run lint`。`tests/provider-availability.test.cjs` は実際の共通SQLとCares SQLをPGliteへ適用し、列順・条件付き・期限・非公開・他組織・Cares専用所有者・版競合・再送を確認する。

### 大量データ公開時の検索性能

7本の連携・バックフィルmigrationに続き、`20261106153402_cares_directory_search_order_index.sql` を適用する。公開検索の既定順（確認済み事業所、情報充実度、事業所名）と一致する複合索引で、最初の50件を得るための全件並べ替えを防ぐ。ロック待ちは2秒で失敗させ、データ・公開範囲・権限は変更しない。

全国検索の件数は `estimated` を使い、画面では「約」、APIでは `totalIsEstimate: true` として扱う。大量データでの厳密集計はDBの時間制限を超えるため、件数監査には管理用SQLを使う。公開後は全国と障害福祉の両検索を確認し、HTTP 200だけでなくNext.jsのエラーダイジェストがないことも確認する。
