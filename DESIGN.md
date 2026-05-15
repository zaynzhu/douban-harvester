# 豆瓣收割机 (douban-harvester) — 设计概要

## 目标

导出自己豆瓣账号的**电影/电视剧评分 + 影评**，无需登录，安全为主，支持断点续爬。
后续作为 PixelReel 的数据同步 worker，定期增量抓取新标记，自动推入 PixelReel 接口。

## 核心设计

### 两种运行模式

| 模式 | 触发条件 | 行为 |
|------|---------|------|
| **全量** | `sync_state.json` 不存在，或 `--full` 参数 | 从头爬所有评分/影评，支持断点续爬 |
| **增量** | `sync_state.json` 存在 | 只抓上次同步后的新数据，遇到旧日期立即停止 |

### 数据源（公开页面，无需登录）

- 评分：`https://movie.douban.com/people/{ID}/collect?start=0&sort=time&rating=all&filter=all&mode=grid`
- 影评：`https://movie.douban.com/people/{ID}/reviews?start=0&sortby=time`

### 文件结构

```
douban-harvester/
├── config.ts          # 配置项（USER_ID、限速参数、PixelReel 地址）
├── types.ts           # TypeScript 类型定义
├── storage.ts         # JSON 读写、断点、同步状态管理
├── parser.ts          # 页面解析（CSS 选择器）
├── scraper.ts         # 爬取 + 限速 + 反检测 + 增量逻辑
├── main.ts            # 主入口（全量/增量自动判断）
├── pixelreel.ts       # PixelReel 推送（桩，待补全）
├── package.json       # tsx scripts, playwright + exceljs
├── tsconfig.json
├── .gitignore
├── progress.json      # 断点记录（自动生成）
├── collect.json       # 评分数据缓存（自动生成）
├── reviews.json       # 影评数据缓存（自动生成）
├── sync_state.json    # 增量同步状态（自动生成）
└── output/
    └── douban.xlsx    # 全量导出
```

### 防风控策略

| 策略 | 值 | 原因 |
|------|---|------|
| 不登录、不带 cookie | — | 豆瓣只封 cookie 不封 IP |
| 每页随机延迟 | 3~7 秒 | 模拟人工浏览 |
| 每 40 页长休息 | 3 分钟 | 避免持续请求模式 |
| 单次运行上限 | 80 页 | 不贪多 |
| 有头浏览器 | `headless=False` | 指纹更真实 |
| 隐藏 webdriver 特征 | `addInitScript` | 防止被识别为自动化 |
| 检测风控页面 | 自动停止 + 保存进度 | 被封后等 2 小时重跑 |

### 断点续爬

每页数据抓完立刻写入 JSON，中断后重跑自动从上次 offset 继续。
关键文件：`progress.json`（offset/page）、`collect.json`、`reviews.json`。

### 增量同步

- 读取 `sync_state.json` 中的 `lastSyncDate`
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

**评分页（已通过 Playwright MCP 实际验证 2026-05-15）：**
- 卡片：`.item.comment-item`
- 片名：`.title a em`（纯中文名），外文名从 `.title a` 完整文本提取
- 简介（年份/导演/类型）：`.intro`（不是 `.title span`，后者是 `[可播放]` 标签）
- 评分：`[class*='rating']`，class 含 `rating1-t` ~ `rating5-t`
- 日期：`.date`
- 短评：`.comment`（可能为空，需用 `.count()` 先判断）
- 链接：`.title a[href]`

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