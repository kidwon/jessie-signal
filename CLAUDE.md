# CLAUDE.md — market-pulse

独立市场信号仪表盘，从 mymoomoo 项目提取，使用 Convex + Vite 重建。

## 运行

```bash
./start.sh          # 同时启动 Convex 后端 + Vite 前端
# 或分开运行：
npx convex dev      # Convex 本地后端（http://127.0.0.1:3210）
npm run dev         # Vite 前端（http://localhost:5173）
```

## 架构

```
浏览器 (React)
  ↓  useAction(api.signals.get)
Convex Action (convex/signals.ts)   ← 在 Convex 服务端运行，无 CORS 限制
  ↓  fetch() 并发
  ├── CBOE VIX API
  ├── CNN Fear & Greed API
  └── Finnhub Quote API × 8 ETF
```

## 数据源

| 数据 | API |
|------|-----|
| VIX | `https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json` |
| Fear & Greed | `https://production.dataviz.cnn.io/index/fearandgreed/graphdata` |
| 8 ETF 涨跌幅 | `https://finnhub.io/api/v1/quote?symbol=SPY&token=KEY`（`dp` 字段） |

ETF 列表：SPY, RSP, IWM, HYG, JNK, TLT, GLD, UUP

## 环境变量

- **本地**：`.env.local`（由 `npx convex dev` 自动生成，含 `VITE_CONVEX_URL`）
- **Finnhub Key**：已通过 `npx convex env set` 写入本地 Convex 部署
- **生产部署**：需在 Convex Dashboard → Settings → Environment Variables 添加 `FINNHUB_API_KEY`

## 关键文件

| 文件 | 说明 |
|------|------|
| `convex/signals.ts` | 唯一后端入口：拉取数据 + 情景分类逻辑（对应 mymoomoo 的 `macro.py`） |
| `src/MarketPulse.jsx` | 主页面组件，含情景浮标 UI + 6 张指标卡 |
| `src/App.jsx` | 根组件：语言切换 Header + ConvexProvider |
| `src/i18n.jsx` | 精简版 zh/en 切换（localStorage 持久化） |
| `src/main.jsx` | 入口，挂载 ConvexProvider |

## 部署

```bash
# 1. 推送 Convex 函数到生产
npx convex deploy

# 2. 构建前端静态文件
npm run build

# 3. 将 dist/ 部署到 Netlify / Cloudflare Pages
# 需设置环境变量：VITE_CONVEX_URL=<生产部署的 Convex URL>
```

## 开发注意

- Convex Action 运行在服务端，可自由 fetch 任何第三方 API，无需担心 CORS
- 前端 5 分钟本地缓存（`useRef`），避免频繁调用 Convex Action
- Tailwind 动态 class 必须写完整字符串（不能运行时拼接）
- `convex/_generated/` 目录由 `npx convex dev` 自动维护，不要手动编辑

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
