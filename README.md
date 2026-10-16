# Pi Learning Lab

[Pi](https://pi.dev)（[earendil-works/pi](https://github.com/earendil-works/pi)）を学ぶためのインタラクティブな学習サイトです。Pi 1.3.0 の公式ドキュメントとソースコードをもとに、次の 3 つの柱で構成しています。

| 柱 | 内容 | 主なインタラクティブ教材 |
|---|---|---|
| 01 Pi の基本 | 設計思想、インストール、対話操作、エージェントループ、セッション | モード選択、ターミナル・シミュレーター、ループのステップ実行、セッションツリー |
| 02 Pi のカスタマイズ | 仕組みの選び方、設定、テンプレート、スキル、拡張機能、テーマ／パッケージ | チューザー、設定エクスプローラー、テンプレート展開、SKILL.md 検証、拡張機能ビルダー、パッケージフィルター |
| 03 独自 Harness を作る | レイヤー構造、pi-ai、pi-agent-core、SDK、RPC、ハンズオン | レイヤー図、ストリームリプレイ、イベントシミュレーター、SDK ビルダー、RPC プレイグラウンド |

各レッスンには確認クイズ（7 割以上で完了）と、根拠にした一次情報へのリンクがあります。進捗はブラウザーの localStorage に保存されます。

## 開発

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # Biome（lint/format）+ 型チェック + Vitest
npm run build      # dist/ に静的ファイルを出力
```

HashRouter と相対パス（`base: "./"`）を使っているので、`dist/` はどの静的ホスティングにもそのまま置けます。

## 構成

- `src/lib/` — シミュレーターのロジック（テンプレート展開・スキル検証・エージェントループ・セッションツリー・RPC・コード生成）。UI から独立した純粋関数で、Vitest でテストしています。挙動は Pi のソース（`prompt-templates.ts`、`skills.ts`、`agent-loop.ts`、`package-manager.ts`）に合わせています。
- `src/widgets/` — インタラクティブ教材のコンポーネント
- `src/lessons/` — 各レッスンの本文
- `src/content/curriculum.ts` — カリキュラム、クイズ、出典リンク

シミュレーターは学習用に挙動を単純化しています。最新の仕様は必ず公式ドキュメントで確認してください。本サイトは非公式の教材です。
