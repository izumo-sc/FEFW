# GitHub → Cloudflare Pages 配置手順

このプロジェクトはビルド不要の静的サイトです。公開対象は `dist` フォルダーです。

## 1. 使用するGitHubリポジトリ

- Repository: `https://github.com/izumo-sc/FEFW.git`
- Production branch: `main`

## 2. VS CodeのPowerShellでGitHubへ送る

次のコマンドを上から実行します。

```powershell
Set-Location "<リポジトリの保存先>\material-tracker-site"

$GitHubUser = "izumo-sc"
$Repository = "FEFW"
$GitHubUrl = "https://github.com/$GitHubUser/$Repository.git"

git status
git add .
git commit -m "Prepare material tracker for Cloudflare Pages"

if (git remote get-url origin 2>$null) {
    git remote set-url origin $GitHubUrl
} else {
    git remote add origin $GitHubUrl
}

git branch -M main
git push -u origin main
```

GitHubの認証画面が出た場合は、自分のGitHubアカウントでログインします。

`detected dubious ownership` と表示された場合だけ、次を一度実行してからやり直します。

```powershell
git config --global --add safe.directory (Get-Location).Path
```

## 3. Cloudflare PagesとGitHubを接続する

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)を開く
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. GitHubを選び、`FEFW` を指定する
4. Project name は `fefw` にする
5. 次のビルド設定を入力する

> **「Wranglerの設定が検出されませんでした」と表示された場合**
>
> Workersの **Import a repository** を開いています。その画面では自動設定を続行せず、
> **Workers & Pages** に戻って **Pages → Connect to Git** を選び直します。
> このサイトは静的なPagesプロジェクトなので、Wrangler設定は不要です。

> **「Cloudflare could not create the Git repository」と表示された場合**
>
> 新規リポジトリを作る経路を開いています。再試行せず、作成画面を閉じて
> **Connect to Git → Existing Git repository** から既存の `izumo-sc/FEFW` を選びます。
> `FEFW` が一覧に出ない場合は、GitHub側のCloudflare Pagesアプリ設定で
> Repository accessに `FEFW` を追加してから一覧を更新します。

| 設定 | 値 |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | 空欄 |
| Build output directory | `dist` |
| Root directory | 空欄 |

**Save and Deploy**を押すと公開されます。以後、`main`へpushするたびにCloudflare Pagesが自動更新します。

公開URLは `https://fefw.pages.dev/`、復興素材管理は `https://fefw.pages.dev/materials/` になります。
`fefw.pages.dev` が既に使われている場合は、短い任意名に変更します。

## 4. HOME閲覧数用のD1を設定する

HOMEを開いた回数はCloudflare D1に保存します。初回だけ次の設定が必要です。

1. Cloudflare Dashboardの **Storage & Databases** → **D1 SQL database** を開く
2. `fefw-stats` というデータベースを作成する
3. 作成したデータベースの **Console** を開き、`schema.sql` の内容を実行する
4. **Workers & Pages** → 対象のPagesプロジェクト → **Settings** → **Bindings** を開く
5. **D1 database binding** を追加する

| 設定 | 値 |
|---|---|
| Variable name | `COUNTER_DB` |
| D1 database | `fefw-stats` |

ProductionとPreviewの両方に同じバインディングを設定し、Pagesを再デプロイします。
閲覧数にはIPアドレスやブラウザ情報を保存せず、HOMEが読み込まれるたびに裏側で1回加算します。閲覧者の画面には件数を表示しません。

管理者が現在の件数を確認する場合は、プロジェクトのフォルダーで次を実行します。

```powershell
npx wrangler d1 execute fefw-stats --remote --command="SELECT page, count, updated_at FROM page_views;"
```

## 5. 次回以降の更新コマンド

```powershell
Set-Location "<リポジトリの保存先>\material-tracker-site"
git add .
git commit -m "Update material data"
git push
```

## サイトの仕様

- 必要数・所持数・不足数・採集ポイントを表示
- 入力値は閲覧者ごとのブラウザに保存
- サーバー側のデータベースは未使用
- 別端末や別ブラウザへ所持数は同期されない
