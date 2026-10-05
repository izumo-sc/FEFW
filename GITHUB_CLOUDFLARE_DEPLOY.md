# GitHub → Cloudflare Pages 配置手順

このプロジェクトはビルド不要の静的サイトです。公開対象は `dist` フォルダーです。

## 1. 使用するGitHubリポジトリ

- Repository: `https://github.com/izumo-sc/FEFW.git`
- Production branch: `main`

## 2. VS CodeのPowerShellでGitHubへ送る

次のコマンドを上から実行します。

```powershell
Set-Location "C:\Users\miyu1\Documents\Codex\2026-09-21\s\material-tracker-site"

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
git config --global --add safe.directory "C:/Users/miyu1/Documents/Codex/2026-09-21/s/material-tracker-site"
```

## 3. Cloudflare PagesとGitHubを接続する

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)を開く
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. GitHubを選び、`FEFW` を指定する
4. Project name は `fefw` にする
5. 次のビルド設定を入力する

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

## 4. 次回以降の更新コマンド

```powershell
Set-Location "C:\Users\miyu1\Documents\Codex\2026-09-21\s\material-tracker-site"
git add .
git commit -m "Update material data"
git push
```

## サイトの仕様

- 必要数・所持数・不足数・採集ポイントを表示
- 入力値は閲覧者ごとのブラウザに保存
- サーバー側のデータベースは未使用
- 別端末や別ブラウザへ所持数は同期されない
