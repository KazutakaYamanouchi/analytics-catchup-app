# 分析基盤キャッチアップ — 7日間学習アプリ

マルチエージェント形式の分析基盤(オーケストレータ → Codex → Dataiku / Apache Spark → Snowflake)を
**1週間でキャッチアップする** ための iPhone 向け学習アプリ(PWA)です。

## 📱 iPhone へのインストール

1. iPhone の Safari で公開 URL を開く
2. 共有ボタン(□↑)→ **「ホーム画面に追加」** をタップ
3. ホーム画面のアイコンから起動(全画面のアプリとして動作、オフライン対応)

進捗(読了・クイズのスコア)は端末内(localStorage)に保存されます。

## 📚 カリキュラム(7日間)

| Day | テーマ |
|-----|--------|
| 1 | データ分析基盤の全体像(OLTP/OLAP、DWH、ETL/ELT、パイプライン) |
| 2 | Snowflake 入門(ストレージ/コンピュート分離、仮想ウェアハウス) |
| 3 | Apache Spark 入門(分散処理、DataFrame、遅延評価) |
| 4 | Dataiku 入門(Flow、レシピ、プッシュダウン、API) |
| 5 | AI エージェントと Codex(ツール使用、エージェントループ) |
| 6 | マルチエージェント分析基盤のアーキテクチャ |
| 7 | 総復習と実務準備(初日に確認すべき質問リスト付き) |

各日: 解説セクション + 要点まとめ + 理解度クイズ。ほかに **タップで探索できるアーキテクチャ図** と **横断検索できる用語集** を収録。

## 🏗 構成

- ビルド不要のバニラ HTML / CSS / JS(`index.html`, `js/app.js`, `js/data.js`, `css/style.css`)
- PWA(`manifest.webmanifest`, `sw.js` による stale-while-revalidate キャッシュ)
- 教材データは `js/data.js` に集約(AI マルチエージェントワークフローで生成・ファクトチェック済み)
- アイコンは `tools/gen_icons.py`(Python 標準ライブラリのみ)で生成
- `main` ブランチへの push で GitHub Pages が自動的に再配信(ブランチデプロイ方式)

## 🛠 ローカルでの動作確認

```bash
python3 -m http.server 8000
# → http://localhost:8000 を開く
```
