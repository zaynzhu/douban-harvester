<div align="center">

# 🌾 豆瓣收割机

你的豆瓣评分和影评，一键导出。无需登录，安全第一。

[English](README_EN.md)

</div>

<div align="center">

![Stars](https://img.shields.io/github/stars/zaynzhu/douban-harvester?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/zaynzhu/douban-harvester?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/zaynzhu/douban-harvester?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white)

</div>

---

> [!TIP]
> douban-harvester 是一个基于 Playwright 的豆瓣数据导出工具，支持电影/电视剧评分和影评的抓取。
> 无需登录、不碰 cookie，只读公开页面。支持全量、增量、修复三种模式，配合防风控策略安全运行。

## ✨ Features

- **无需登录** — 不碰你的豆瓣账号，只读公开页面，安全第一
- **三种模式** — 全量 / 增量 / 修补，自动判断或手动指定
- **断点续爬** — 随时中断，重跑自动从上次位置继续
- **防风控优先** — 随机延迟、有头浏览器、检测到风控自动停止
- **Excel 导出** — 评分 + 影评分 sheet 输出，开箱即用
- **PixelReel 同步** — 可选自动推送到 PixelReel 接口
- **数据验证** — 内置 verify 脚本，检查数据完整性

## 🚀 Quick Start

```bash
git clone https://github.com/zaynzhu/douban-harvester.git
cd douban-harvester
npm install
npx playwright install chromium
```

在项目根目录创建 `.env` 文件：

```bash
DOUBAN_USER_ID=你的豆瓣ID
```

> [!TIP]
> 豆瓣 ID 在你的个人主页 URL 中：`https://www.douban.com/people/你的ID/`

然后运行：

```bash
npm start
```

首次运行会自动进入全量模式，之后增量同步即可。

## 📦 Installation

### npm

```bash
npm install
npx playwright install chromium
```

### Requirements

- Node.js >= 18
- Chromium（由 Playwright 自动安装）

## 💡 Usage

### 全量导出

从头抓取所有评分和影评，支持断点续爬：

```bash
npm run full
```

### 增量同步

只抓取上次同步后的新数据，几秒完成：

```bash
npm start
# 选择"增量模式"
```

### 数据验证

检查 collect.json 数据完整性：

```bash
npx tsx src/verify.ts
```

## 运行模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 交互式 | `npm start` | 自动检测状态，引导选择 |
| 全量 | `npm run full` | 从头抓取，支持断点续爬 |
| 增量 | `npm start` 选增量 | 只抓新标记，几秒完成 |
| 修补 | `npm run repair` | 遍历全部页面，去重补漏 |
| 验证 | `npx tsx src/verify.ts` | 检查数据完整性 |

## 🛡️ 防风控

- 不登录、不带 cookie — 豆瓣只封 cookie 不封 IP
- 每页随机延迟 3–7 秒，每 40 页长休息 3 分钟
- 有头浏览器 + 隐藏 webdriver 特征
- 检测到风控页面自动停止并保存进度

> [!WARNING]
> **不要**减小延迟参数、设置 `headless: true` 或移除反检测脚本。被封后等 2 小时再跑。

## 数据文件

| 文件 | 说明 |
|------|------|
| `data/collect.json` | 评分数据缓存 |
| `data/reviews.json` | 影评数据缓存 |
| `data/progress.json` | 断点记录 |
| `data/sync_state.json` | 增量同步状态 |
| `output/douban.xlsx` | Excel 导出（评分 + 影评两个 sheet） |

所有数据文件已在 `.gitignore` 中排除。

## 项目结构

```text
douban-harvester/
├── src/
│   ├── main.ts          # 主入口
│   ├── scraper.ts       # 爬取 + 限速 + 反检测
│   ├── parser.ts        # HTML 解析（list/grid/DOM 三种策略）
│   ├── storage.ts       # JSON 读写、断点、去重
│   ├── pixelreel.ts     # PixelReel 推送（可选）
│   ├── config.ts        # 配置项
│   ├── types.ts         # TypeScript 类型定义
│   └── verify.ts        # 数据验证
├── data/                # 运行时数据（gitignored）
└── output/              # 导出文件（gitignored）
```

## 配置项

在 `src/config.ts` 中调整：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `SLEEP_MIN` / `SLEEP_MAX` | 3 / 7 | 每页随机延迟（秒） |
| `LONG_BREAK_EVERY` | 40 | 每 N 页长休息 |
| `LONG_BREAK_SECONDS` | 180 | 长休息时长（秒） |
| `MAX_PAGES_PER_RUN` | 200 | 单次运行上限 |
| `AUTO_PUSH` | false | 自动推送到 PixelReel |

可选环境变量：

| 变量 | 说明 |
|------|------|
| `PIXELREEL_BASE_URL` | PixelReel 接口地址（默认 `http://localhost:18889`） |
| `PIXELREEL_TOKEN` | PixelReel 认证 token |

## 🗺️ Roadmap

| Area | Feature | Status |
|------|---------|--------|
| 核心 | 全量/增量/修复三种模式 | ✅ |
| 核心 | 断点续爬 | ✅ |
| 核心 | Excel 导出 | ✅ |
| 核心 | 数据验证脚本 | ✅ |
| 集成 | PixelReel 自动同步 | 🔄 |
| 集成 | 更多数据源支持 | 📋 |
| 体验 | 交互式配置向导 | 📋 |

## ❓ FAQ

<details>
<summary>被豆瓣封了怎么办？</summary>

等待 2 小时后重试。不要立即重试，否则封禁时间会延长。脚本检测到风控会自动停止并保存进度，下次运行从断点继续。

</details>

<details>
<summary>支持哪些数据？</summary>

目前支持电影/电视剧的**评分数据**和**影评数据**。评分数据包含片名、评分、标记日期、短评等字段。影评数据包含影评标题、评分、摘要等字段。

</details>

<details>
<summary>需要登录豆瓣吗？</summary>

不需要。脚本只读取公开页面，不使用 cookie，不触发登录流程。豆瓣只封 cookie 不封 IP，所以不登录是最安全的方式。

</details>

<details>
<summary>增量同步是怎么工作的？</summary>

首次全量抓取后，脚本会记录最后同步的日期。增量模式下只抓取该日期之后的新数据，遇到旧数据立即停止。通常几秒就能完成，几乎不触发风控。

</details>

<details>
<summary>导出的 Excel 文件在哪里？</summary>

运行完成后，Excel 文件在 `output/douban.xlsx`。包含两个 sheet：评分数据和影评数据。

</details>

## 📚 Documentation

| Topic | Description |
|-------|-------------|
| [设计概要](DESIGN.md) | 架构设计、数据流、CSS 选择器细节 |
| [数据接入指南](INTEGRATION.md) | 如何将数据接入其他系统 |

## 🤝 Contributing

欢迎贡献！请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

### 开发环境

```bash
git clone https://github.com/zaynzhu/douban-harvester.git
cd douban-harvester
npm install
npx playwright install chromium
```

## 📄 License

本项目基于 [MIT License](LICENSE) 开源。
