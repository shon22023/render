# 他のMacでSSHキーを作成する手順

## 概要
GitHubにプッシュするために、他のMacでもSSHキーを設定する方法です。

---

## ステップ1: ターミナルを開く
他のMacで「ターミナル」アプリを開きます。
- Spotlight検索（⌘ + スペース）で「ターミナル」と入力
- または、アプリケーション → ユーティリティ → ターミナル

---

## ステップ2: SSHキーを生成
以下のコマンドをコピー＆ペーストして実行します：

```bash
ssh-keygen -t ed25519 -C "shon22023@github"
```

### 実行時の操作：
1. **ファイルの保存場所を聞かれたら** → `Enterキー`を押す（デフォルトの場所でOK）
2. **パスフレーズを聞かれたら** → `Enterキー`を押す（パスフレーズなしでOK）
3. **パスフレーズの確認** → `Enterキー`を押す

### 成功すると以下のように表示されます：
```
Your identification has been saved in /Users/.../.ssh/id_ed25519
Your public key has been saved in /Users/.../.ssh/id_ed25519.pub
```

---

## ステップ3: 公開鍵を表示してコピー
以下のコマンドを実行します：

```bash
cat ~/.ssh/id_ed25519.pub
```

表示された内容を**すべてコピー**します。以下のような形式です：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG/0Hf2mxs+yfrg8oWjDqUYVuHJldEeDhct+6RQe6FXx shon22023@github
```

---

## ステップ4: GitHubに公開鍵を追加

### 1. GitHubにアクセス
ブラウザで以下のURLを開きます：
- https://github.com/settings/keys
- または GitHub → 右上のプロフィールアイコン → Settings → SSH and GPG keys

### 2. 新しいSSHキーを追加
- 「**New SSH key**」ボタンをクリック

### 3. フォームに入力
- **Title**: わかりやすい名前を入力（例: "MacBook Pro 2台目" や "会社のMac"）
- **Key**: ステップ3でコピーした公開鍵を貼り付け
- **Key type**: 自動で「Authentication Key」が選択されている

### 4. 保存
- 「**Add SSH key**」をクリック

---

## ステップ5: SSHエージェントに追加（推奨）
以下のコマンドを実行します：

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

---

## ステップ6: 接続テスト
以下のコマンドでGitHubへの接続をテストします：

```bash
ssh -T git@github.com
```

### 初回実行時：
以下のようなメッセージが出たら `yes` と入力してEnter：

```
The authenticity of host 'github.com' can't be established.
Are you sure you want to continue connecting (yes/no)?
```

### 成功すると以下のメッセージが表示されます：
```
Hi shon22023! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## ステップ7: リポジトリの設定

### パターンA: リポジトリを新しくクローンする場合

```bash
git clone git@github.com:shon22023/render.git
cd render
```

### パターンB: 既存のリポジトリがある場合

```bash
cd リポジトリのパス
git remote set-url origin git@github.com:shon22023/render.git
```

---

## ステップ8: プッシュをテスト
以下のコマンドでプッシュできるか確認します：

```bash
git push origin main
```

成功すれば、他のMacからもGitHubにプッシュできます！

---

## トラブルシューティング

### 「Permission denied」エラーが出る場合
- GitHubに公開鍵が正しく追加されているか確認
- 公開鍵のコピーに余分な空白や改行が入っていないか確認

### 「Host key verification failed」エラーが出る場合
以下のコマンドを実行：

```bash
ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
ssh -T git@github.com
```

### 接続テストで「yes」を入力してもエラーが出る場合
上記の `ssh-keyscan` コマンドを実行してから再度テストしてください。

---

## まとめ

1. ✅ `ssh-keygen -t ed25519 -C "shon22023@github"` でキー生成
2. ✅ `cat ~/.ssh/id_ed25519.pub` で公開鍵をコピー
3. ✅ GitHubの設定ページで公開鍵を追加
4. ✅ `ssh -T git@github.com` で接続テスト
5. ✅ `git push` でプッシュ

---

## 補足情報

### SSHキーとは？
- **パスワードとは違う**：ファイルベースの認証方式
- **自動認証**：一度設定すれば、毎回パスワードを入力する必要がない
- **より安全**：数百文字のランダムな文字列で、推測が困難

### ファイルの場所
- **秘密鍵**: `~/.ssh/id_ed25519`（絶対に他人に見せない）
- **公開鍵**: `~/.ssh/id_ed25519.pub`（GitHubに登録済み）

### リポジトリ情報
- **リポジトリURL**: `git@github.com:shon22023/render.git`
- **GitHubユーザー名**: `shon22023`

