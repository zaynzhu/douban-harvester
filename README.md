# douban-harvester

豆瓣评分 & 影评导出工具。无需登录，自动防风控，支持断点续爬、增量同步、数据修复。

## 功能

- **评分导出** — 片名、外文名、年份/类型、评分（1-5）、标记日期、短评、链接
- **影评导出** — 影片名、影评标题、评分、发布日期、摘要、链接
- **三种模式** — 全量 / 增量 / 修补，自动判断或手动指定
- **断点续爬** — 中断后重跑自动从上次位置继续
- **防风控** — 随机延迟、长休息、有头浏览器、反检测脚本、风控自动停止
- **Excel 输出** — 自动生成 `output/douban.xlsx`（两个 sheet：评分、影评）

## 快速开始

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 配置

在项目根目录创建 `.env` 文件：

```bash
DOUBAN_USER_ID=你的豆瓣ID
```

> 豆瓣 ID 在你的个人主页 URL 中：`https://www.douban.com/people/你的ID/`

### 3. 运行

```bash
npm start          # 交互式模式（自动判断全量/增量）
npm run full       # 强制全量模式
npm run repair     # 修复模式（遍历所有页面，去重补漏）
```

## 运行模式

| 模式 | 命令 | 说明 |
|------|------|------|
| 交互式 | `npm start` | 自动检测状态，引导选择 |
| 全量 | `npm run full` | 从头抓取所有数据，支持断点续爬 |
| 增量 | `npm start` 选 2 | 只抓上次同步后的新标记 |
| 修补 | `npm run repair` | 遍历全部页面，去重补漏 |
| 验证 | `npx tsx verify.ts` | 检查数据完整性 |

首次运行用全量模式，之后用增量即可。数据有缺失时跑修补模式。

## 项目结构

```
douban-harvester/
├── main.ts          # 主入口（全量/增量/修复三种模式）
├── scraper.ts       # 爬取 + 限速 + 反检测 + 重试
├── parser.ts        # HTML 解析（list/grid/DOM 三种策略）
├── storage.ts       # JSON 读写、断点、同步状态、去重
├── pixelreel.ts     # PixelReel 推送（可选）
├── config.ts        # 配置项
├── types.ts         # TypeScript 类型定义
└── verify.ts        # 数据验证脚本
```

## 配置项

在 `config.ts` 中调整：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `SLEEP_MIN` / `SLEEP_MAX` | 3 / 7 | 每页随机延迟（秒） |
| `LONG_BREAK_EVERY` | 40 | 每 N 页长休息 |
| `LONG_BREAK_SECONDS` | 180 | 长休息时长（秒） |
| `MAX_PAGES_PER_RUN` | 200 | 单次运行上限 |
| `AUTO_PUSH` | false | 是否自动推送到 PixelReel |

环境变量（`.env`）：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DOUBAN_USER_ID` | 是 | 豆瓣用户 ID |
| `PIXELREEL_BASE_URL` | 否 | PixelReel 接口地址 |
| `PIXELREEL_TOKEN` | 否 | PixelReel 认证 token |

## 防风控说明

- 不登录、不带 cookie — 豆瓣只封 cookie 不封 IP
- 每页随机延迟 3-7 秒，模拟人工浏览
- 每 40 页长休息 3 分钟
- 有头浏览器 + 隐藏 webdriver 特征
- 检测到风控自动停止并保存进度

**不要减小延迟参数，不要设置 `headless: true`，不要移除反检测脚本。**

被封后等 2 小时再跑，不要立即重试。

## 数据文件

运行后自动生成（均已在 `.gitignore` 中排除）：

| 文件 | 说明 |
|------|------|
| `collect.json` | 评分数据缓存 |
| `reviews.json` | 影评数据缓存 |
| `progress.json` | 断点记录 |
| `sync_state.json` | 增量同步状态 |
| `output/douban.xlsx` | Excel 导出 |

## 技术栈

- **TypeScript** + **tsx** 直接运行
- **Playwright** 浏览器自动化
- **ExcelJS** Excel 生成
- **dotenv** 环境变量管理

## License

MIT
