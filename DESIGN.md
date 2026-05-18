# 豆瓣收割机 (douban-harvester) — 设计概要

## 目标

导出自己豆瓣账号的**电影/电视剧评分 + 影评**，无需登录，安全为主，支持断点续爬。
后续作为 PixelReel 的数据同步 worker，定期增量抓取新标记，自动推入 PixelReel 接口。

## 核心设计

### 三种运行模式

| 模式 | 触发条件 | 行为 |
|------|---------|------|
| **全量** | `data/sync_state.json` 不存在，或 `--full` 参数 | 从头爬所有评分/影评，支持断点续爬 |
| **增量** | `data/sync_state.json` 存在 | 只抓上次同步后的新数据，遇到旧日期立即停止 |
| **修复** | `--repair` 参数 | 遍历所有页面，去重补漏，从断点继续 |

### 数据源（公开页面，无需登录）

- 评分：`https://movie.douban.com/people/{ID}/collect?start=0&sort=time&rating=all&filter=all&mode=list`
- 影评：`https://movie.douban.com/people/{ID}/reviews?start=0&sortby=time`

注：使用 list 模式（每页 28-29 条）替代 grid 模式（每页 15 条），提高抓取效率。

### 文件结构

```
douban-harvester/
├── src/
│   ├── config.ts          # 配置项（环境变量、限速参数）
│   ├── types.ts           # TypeScript 类型定义
│   ├── storage.ts         # JSON 读写、断点、同步状态管理、去重
│   ├── parser.ts          # 页面解析（list/grid/DOM 三种模式）
│   ├── scraper.ts         # 爬取 + 限速 + 反检测 + 重试逻辑
│   ├── main.ts            # 主入口（全量/增量/修复三种模式）
│   ├── pixelreel.ts       # PixelReel 推送（桩，待补全）
│   └── verify.ts          # 数据验证脚本
├── data/                  # 运行时数据（自动生成，gitignored）
│   ├── progress.json      # 断点记录
│   ├── collect.json       # 评分数据缓存
│   ├── reviews.json       # 影评数据缓存
│   └── sync_state.json    # 增量同步状态
├── output/
│   └── douban.xlsx        # 全量导出
├── package.json           # tsx scripts, playwright + exceljs
├── tsconfig.json
├── .gitignore
└── .env                   # 环境变量（不提交，需手动创建）
```

### 环境变量配置

在项目根目录创建 `.env` 文件：

```bash
DOUBAN_USER_ID=你的豆瓣ID
# 可选：PixelReel 配置
PIXELREEL_BASE_URL=http://localhost:18889
PIXELREEL_TOKEN=your_token
```

⚠️ `.env` 已在 `.gitignore` 中排除，不会提交到远程仓库。

### 防风控策略

| 策略 | 值 | 原因 |
|------|---|------|
| 不登录、不带 cookie | — | 豆瓣只封 cookie 不封 IP |
| 每页随机延迟 | 3~7 秒 | 模拟人工浏览 |
| 每 40 页长休息 | 3 分钟 | 避免持续请求模式 |
| 单次运行上限 | 200 页 | 不贪多，支持修复模式全量遍历 |
| 有头浏览器 | `headless=False` | 指纹更真实 |
| 隐藏 webdriver 特征 | `addInitScript` | 防止被识别为自动化 |
| 检测风控页面 | 自动停止 + 保存进度 | 被封后等 2 小时重跑 |

### 断点续爬

每页数据抓完立刻写入 JSON，中断后重跑自动从上次 offset 继续。
关键文件：`data/progress.json`（offset/page）、`data/collect.json`、`data/reviews.json`。

### 增量同步

- 读取 `data/sync_state.json` 中的 `lastSyncDate`
- 从第一页开始抓，遇到日期 ≤ lastSyncDate 立即停止
- 每次只抓几页，几秒结束，几乎不触发风控
- 完成后更新 `lastSyncDate`

### 风控检测

脚本检测以下情况会自动停止并保存进度：
- 跳转到 `accounts.douban.com`（登录页）
- URL 含 `verification` 或 `captcha`
- 页面出现"访问频率"字样
- 出现 `robot` 检测页面

### 页面解析（CSS 选择器）

**评分页 — 列表模式（主要模式）：**
- 解析函数：`parseCollectListHtml(html)`
- 每页 28-29 条，效率更高
- 片名：`<a>` 标签内 `/` 分隔的中英文名
- 简介：`<span class="intro">`
- 评分：`<span class="rating">` 的 `allstarN` class
- 日期：`<span class="date">`
- 短评：`<div class="comment">`
- 链接：`<a href>`

**评分页 — 网格模式（备用）：**
- 解析函数：`parseCollectGridHtml(html)`
- 每页 15 条，用于 list 模式失败时降级

**评分页 — DOM 模式（最终降级）：**
- 解析函数：`parseCollectPage()` via Playwright locator
- 卡片：`.item.comment-item`
- 片名：`.title a em`（纯中文名），外文名从 `.title a` 完整文本提取
- 简介（年份/导演/类型）：`.intro`（不是 `.title span`，后者是 `[可播放]` 标签）
- 评分：`[class*='rating']`，class 含 `rating1-t` ~ `rating5-t`
- 日期：`.date`
- 短评：`.comment`（可能为空，需用 `.count()` 先判断）
- 链接：`.title a[href]`

**解析优先级**：list → grid → DOM

**影评页：**
- 卡片：`.review-item`
- 影片名：`.main-title-name`
- 影评标题+链接：`h2 a`
- 评分：`[class*='allstar']`，class 含 `allstar10` ~ `allstar50`
- 日期：`.main-meta`
- 摘要：`.review-short-content`

### 输出格式

**全量** → `output/douban.xlsx`（两个 sheet：评分、影评）

**增量** → `output/incremental_latest.json`，或直接推 PixelReel 接口

### PixelReel 对接（待补全）

豆瓣评分字段 → PixelReel 接口字段的映射，需要确认：
- 片名映射到哪个字段
- 豆瓣 1~5 评分 → PixelReel 评分规则（×2 变 2~10？）
- 标记日期字段名
- 来源标识（source / externalId）

---

## 与原 Python 版本的差异

原设计是 Python + Playwright，现改为 TypeScript + Playwright，核心逻辑完全一致：
- 同样的双模式（全量/增量）
- 同样的断点续爬机制
- 同样的防风控策略
- 同样的文件存储格式（JSON）
- CSS 选择器经过实测修正（片名改用 `em`、副标题改为 `.intro`、新增 `.comment` 短评）
- Playwright locator 必须用 `.count()` 先判断元素存在，否则会等待超时
- 用 `tsx` 直接运行 .ts，`npm start` / `npm run full`
- 类型定义 `types.ts` 可复用于 PixelReel 集成