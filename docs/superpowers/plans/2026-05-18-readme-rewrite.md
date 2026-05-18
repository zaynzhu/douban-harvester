# README 重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite README.md with a balanced professional-yet-approachable style per the design spec.

**Architecture:** Single-file rewrite of `README.md`. No code changes. The new README follows a top-down reading flow: slogan → highlights → quick start → mode details → safety → reference tables.

**Tech Stack:** Markdown only.

---

### Task 1: Rewrite README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the new README.md content**

Replace the entire content of `README.md` with:

```markdown
# 🌾 豆瓣收割机

> 你的豆瓣评分和影评，一键导出。无需登录，安全第一。

Node ≥18 · TypeScript · MIT License

## ✨ 为什么选它

- 🔒 **无需登录** — 不碰你的豆瓣账号，只读公开页面
- 🔄 **三种模式** — 全量 / 增量 / 修补，自动判断或手动指定
- 💾 **断点续爬** — 随时中断，重跑自动从上次位置继续
- 🛡️ **防风控优先** — 随机延迟、有头浏览器、检测到风控自动停止

## 🚀 快速开始

### 安装

```bash
npm install
npx playwright install chromium
```

### 配置

在项目根目录创建 `.env` 文件：

```bash
DOUBAN_USER_ID=你的豆瓣ID
```

> 💡 豆瓣 ID 在你的个人主页 URL 中：`https://www.douban.com/people/你的ID/`

可选环境变量：

| 变量 | 说明 |
|------|------|
| `PIXELREEL_BASE_URL` | PixelReel 接口地址（默认 `http://localhost:18889`） |
| `PIXELREEL_TOKEN` | PixelReel 认证 token |

### 运行

```bash
npm start          # 交互式模式（自动判断全量/增量）
npm run full       # 强制全量模式
npm run repair     # 修复模式（去重补漏）
```

首次运行用 `npm start`，之后增量同步即可。

## 运行模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 交互式 | `npm start` | 自动检测状态，引导选择 |
| 全量 | `npm run full` | 从头抓取，支持断点续爬 |
| 增量 | `npm start` 选增量 | 只抓新标记，几秒完成 |
| 修补 | `npm run repair` | 遍历全部页面，去重补漏 |
| 验证 | `npx tsx verify.ts` | 检查数据完整性 |

## 🛡️ 防风控

- 不登录、不带 cookie — 豆瓣只封 cookie 不封 IP
- 每页随机延迟 3–7 秒，每 40 页长休息 3 分钟
- 有头浏览器 + 隐藏 webdriver 特征
- 检测到风控页面自动停止并保存进度

> ⚠️ **不要**减小延迟参数、设置 `headless: true` 或移除反检测脚本。被封后等 2 小时再跑。

## 数据文件

| 文件 | 说明 |
|------|------|
| `collect.json` | 评分数据缓存 |
| `reviews.json` | 影评数据缓存 |
| `progress.json` | 断点记录 |
| `sync_state.json` | 增量同步状态 |
| `output/douban.xlsx` | Excel 导出（评分 + 影评两个 sheet） |

所有数据文件已在 `.gitignore` 中排除。

## 项目结构

```
douban-harvester/
├── main.ts          # 主入口
├── scraper.ts       # 爬取 + 限速 + 反检测
├── parser.ts        # HTML 解析（list/grid/DOM 三种策略）
├── storage.ts       # JSON 读写、断点、去重
├── pixelreel.ts     # PixelReel 推送（可选）
├── config.ts        # 配置项
├── types.ts         # TypeScript 类型定义
└── verify.ts        # 数据验证
```

## 配置项

在 `config.ts` 中调整：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `SLEEP_MIN` / `SLEEP_MAX` | 3 / 7 | 每页随机延迟（秒） |
| `LONG_BREAK_EVERY` | 40 | 每 N 页长休息 |
| `LONG_BREAK_SECONDS` | 180 | 长休息时长（秒） |
| `MAX_PAGES_PER_RUN` | 200 | 单次运行上限 |
| `AUTO_PUSH` | false | 自动推送到 PixelReel |

## 技术栈

TypeScript · Playwright · ExcelJS · tsx · dotenv

## License

MIT
```

- [ ] **Step 2: Commit the change**

```bash
git add README.md
git commit -m "docs: 重写 README，平衡型风格，提升可读性"
```