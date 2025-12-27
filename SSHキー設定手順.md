# 他のMacでSSHキーを作成する手順

## 概要
GitHubにプッシュするために、他のMacでもSSHキーを設定する方法です。

---

## ステップ1: ターミナルを開く
他のMacで「ターミナル」アプリを開きます。
- Spotlight検索（⌘ + スペース）で「ターミナル」と入力
- または、アプリケーション → ユーティリティ → ターミナル

---

 ## ステップ2: 既存のSSHキーを確認（オプション）
既にSSHキーがあるか確認します：

```bash
ls -la ~/.ssh/id_ed25519* 2>/dev/null || echo "SSHキーが見つかりません"
```

既存のキーがある場合は、そのまま使用するか、新しいキーを生成するか選択できます。

---

## ステップ3: SSHキーを生成

### 方法A: 対話形式で生成（推奨）
以下のコマンドをコピー＆ペーストして実行します：

```bash
ssh-keygen -t ed25519 -C "shon22023@github"
```

### 実行時の操作：
1. **ファイルの保存場所を聞かれたら** → `Enterキー`を押す（デフォルトの場所でOK）
2. **パスフレーズを聞かれたら** → `Enterキー`を押す（パスフレーズなしでOK）
3. **パスフレーズの確認** → `Enterキー`を押す

### 方法B: 非対話形式で生成（パスフレーズなし）
以下のコマンドで自動的に生成されます：

```bash
ssh-keygen -t ed25519 -C "shon22023@github" -f ~/.ssh/id_ed25519 -N ""
```

### 成功すると以下のように表示されます：
```
Your identification has been saved in /Users/.../.ssh/id_ed25519
Your public key has been saved in /Users/.../.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:... shon22023@github
```

---

## ステップ4: 公開鍵を表示してコピー
以下のコマンドを実行します：

```bash
cat ~/.ssh/id_ed25519.pub
```

表示された内容を**すべてコピー**します。以下のような形式です：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG/0Hf2mxs+yfrg8oWjDqUYVuHJldEeDhct+6RQe6FXx shon22023@github
```

---

## ステップ5: GitHubに公開鍵を追加

### ⚠️ 重要な注意点
**必ず「Authentication Key」として登録してください！**
- ❌ **Deploy Key**（リポジトリの設定ページ）→ 読み取り専用でプッシュできない
- ✅ **Authentication Key**（ユーザーアカウントの設定ページ）→ 読み書き可能でプッシュできる

### 1. GitHubにアクセス
ブラウザで以下のURLを開きます：
- **https://github.com/settings/keys** ← これが正しいページです
- または GitHub → 右上のプロフィールアイコン → **Settings** → **SSH and GPG keys**

⚠️ **注意**: リポジトリの設定ページ（`github.com/ユーザー名/リポジトリ名/settings/keys`）ではなく、**ユーザーアカウントの設定ページ**にアクセスしてください。

### 2. 新しいSSHキーを追加
- 「**New SSH key**」ボタンをクリック

### 3. フォームに入力
- **Title**: わかりやすい名前を入力（例: "MacBook Pro 2台目" や "会社のMac"）
- **Key type**: **「Authentication Key」**を選択（重要！）
- **Key**: ステップ4でコピーした公開鍵を貼り付け

### 4. 保存
- 「**Add SSH key**」をクリック

### 成功すると以下のメッセージが表示されます：
```
You have successfully added the key 'shon22023@github'.
```

キーの状態が「**Read/write**」になっていることを確認してください。

---

## ステップ6: SSHエージェントに追加（推奨）
以下のコマンドを実行します：

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

---

## ステップ7: 接続テスト
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

## ステップ8: リポジトリの設定

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

## ステップ9: プッシュをテスト
以下のコマンドでプッシュできるか確認します：

```bash
git push origin main
```

成功すれば、他のMacからもGitHubにプッシュできます！

---

## トラブルシューティング

### 「Permission denied (publickey)」エラーが出る場合
**原因**: SSHキーが存在しない、またはGitHubに登録されていない

**解決方法**:
1. SSHキーが存在するか確認：
   ```bash
   ls -la ~/.ssh/id_ed25519*
   ```
2. 存在しない場合は、ステップ3でキーを生成
3. GitHubに公開鍵が正しく追加されているか確認
4. 公開鍵のコピーに余分な空白や改行が入っていないか確認

### 「ERROR: The key you are authenticating with has been marked as read only.」エラーが出る場合
**原因**: SSHキーが「Deploy Key」として登録されている（読み取り専用）

**解決方法**:
1. リポジトリのDeploy keysページで既存のキーを削除
2. **ユーザーアカウントの設定ページ**（https://github.com/settings/keys）に移動
3. 「Authentication Key」として同じ公開鍵を再登録
4. キーの状態が「Read/write」になっていることを確認

### 「Key is already in use」エラーが出る場合
**原因**: 同じ公開鍵が既にGitHubに登録されている

**解決方法**:
1. 新しいSSHキーペアを生成：
   ```bash
   ssh-keygen -t ed25519 -C "shon22023@github" -f ~/.ssh/id_ed25519_new -N ""
   ```
2. 既存のキーをバックアップ：
   ```bash
   mv ~/.ssh/id_ed25519 ~/.ssh/id_ed25519_old
   mv ~/.ssh/id_ed25519.pub ~/.ssh/id_ed25519_old.pub
   ```
3. 新しいキーをデフォルト名にリネーム：
   ```bash
   mv ~/.ssh/id_ed25519_new ~/.ssh/id_ed25519
   mv ~/.ssh/id_ed25519_new.pub ~/.ssh/id_ed25519.pub
   ```
4. SSHエージェントに追加：
   ```bash
   ssh-add -D
   ssh-add ~/.ssh/id_ed25519
   ```
5. 新しい公開鍵をGitHubに登録

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
3. ✅ **ユーザーアカウントの設定ページ**（https://github.com/settings/keys）で「**Authentication Key**」として公開鍵を追加
4. ✅ `ssh-add ~/.ssh/id_ed25519` でSSHエージェントに追加
5. ✅ `ssh -T git@github.com` で接続テスト
6. ✅ `git push` でプッシュ

## 重要なポイント

### Deploy Key vs Authentication Key
| 種類 | 登録場所 | 権限 | 用途 |
|------|---------|------|------|
| **Deploy Key** | リポジトリの設定ページ | 読み取り専用（または特定リポジトリのみ） | サーバーからの自動デプロイなど |
| **Authentication Key** | ユーザーアカウントの設定ページ | 読み書き可能（全リポジトリ） | 通常の開発作業 |

**プッシュする場合は必ず「Authentication Key」として登録してください！**

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

