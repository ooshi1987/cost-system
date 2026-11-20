# 本番DBのバックアップと復元

Neon の Free プランは、過去に戻せるのが 6 時間前までしかない。そのため GitHub Actions（`.github/workflows/db-backup.yml`）で毎晩 4:00（日本時間）に本番DBを丸ごと書き出し、30 日分を保管する。

- 書き出したデータは、一時的な Postgres に復元して主要テーブル（Store / User / Transaction / DeliverySlip）が戻ることを確認してから保管する。
- リポジトリが公開のため、保管前に **パスフレーズで暗号化（AES256）** する。暗号化前のデータはどこにも残さない。
- 失敗すると GitHub から通知メールが届く。

## 初回の準備（Secrets の登録）

GitHub のリポジトリ → **Settings → Secrets and variables → Actions → New repository secret** で次の 2 つを登録する。値はチャットや Issue に書かない。

| 名前 | 中身 |
|---|---|
| `BACKUP_DATABASE_URL` | Neon の接続文字列。Neon コンソールの **Connect** で「Connection pooling」を**オフ**にした直接接続の文字列（ホスト名に `-pooler` が付かないもの）を使う |
| `BACKUP_PASSPHRASE` | 暗号化用の長いパスフレーズ。**パスワード管理アプリに必ず控える**（失くすとバックアップを復元できない） |

パスフレーズは、ターミナルで次を実行して作れる（表示された文字列を控えてから登録する）。

```bash
openssl rand -base64 32
```

登録後、GitHub の **Actions → DB backup → Run workflow** で手動実行し、成功することを確認する。

## 復元のしかた

本番DBへ直接上書きしない。まず Neon で**新しいブランチ**を作り、そこへ復元して中身を確認してから切り替えを判断する（本番データの書き込みは必ずオーナーの承認を得てから行う）。

1. バックアップを取得する（GitHub の Actions の実行結果画面から、または次のコマンド）

   ```bash
   gh run download --repo ooshi1987/cost-system --name costra-db-YYYY-MM-DD_HHMM
   ```

2. 復号する（パスフレーズを聞かれる）

   ```bash
   gpg --output costra.dump --decrypt costra_YYYY-MM-DD_HHMM.dump.gpg
   ```

3. Neon コンソールで復元用のブランチを作り、その接続文字列に復元する

   ```bash
   pg_restore --no-owner --no-privileges --dbname "<復元用ブランチの接続文字列>" costra.dump
   ```

4. 復元用ブランチで件数・最新の記録を確認し、問題がなければ本番の切り替えを判断する。作業後、手元の `costra.dump` は削除する。
