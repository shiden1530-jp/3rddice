# Dice Dungeon Roguelike (GitHub Pages対応)

ブラウザで動作する、ターン制ダイス戦闘ローグライクです。  
`index.html` をそのまま配信できる静的構成なので、GitHub Pages の **Deploy from branch** でそのまま動きます。

## 遊び方
- 探索ノードを選択して進行
- 戦闘で敵のHPを0にする
- 宝箱 / ガチャ / 商人 / イベントでビルド強化
- HPが0でゲームオーバー

## GitHub Pages 公開手順（初心者向け）
1. GitHub リポジトリの **Settings** を開く
2. 左メニュー **Pages** を開く
3. **Build and deployment** の Source で **Deploy from a branch** を選択
4. Branch で `main`（または公開したいブランチ）と `/ (root)` を選ぶ
5. **Save** を押す
6. 数十秒〜数分待つと、表示された URL でプレイ可能

## 技術メモ
- 完全静的ファイルのみ（`index.html`, `styles.css`, `src/*.js`）
- 相対パス読込（`./src/main.js`）のため GitHub Pages の base path 配下でも動作
- データ駆動構成：`src/data.js` に武器/敵/スキル/relic/イベント定義を集約
  - 新要素はデータ追加中心で拡張可能

## ローカル起動
VS Code Live Server などの静的サーバーで `index.html` を開いてください。
