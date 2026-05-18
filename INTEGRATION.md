# 豆瓣收割机 — 接入指南

别的项目要把豆瓣评分/影评数据接进去，读这一份文档就够了。

## 快速理解

这个项目干一件事：用 Playwright 模拟浏览器，从豆瓣公开页面抓取你的评分和影评数据，存成 JSON。

**核心产出就两个文件：**
- `data/collect.json` — 评分数据
- `data/reviews.json` — 影评数据（如有）

别的项目只要读这两个 JSON，就能拿到所有豆瓣数据。

## 数据结构

### 评分记录（collect.json）

顶层是数组，每条：

```json
{
  "title": "肖申克的救赎",
  "altTitle": "The Shawshank Redemption",
  "intro": "1994-09-10(加拿大) / 蒂姆·罗宾斯 / 摩根·弗里曼 / 美国 / 弗兰克·德拉邦特 / 142分钟 / 剧情 / 犯罪 / 英语",
  "rating": "5",
  "date": "2024-03-15",
  "comment": "经典永不过时",
  "link": "https://movie.douban.com/subject/1292052/"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 中文片名 |
| `altTitle` | string | 外文名，可为空 |
| `intro` | string | 豆瓣原始混合文本，各段用 ` / ` 分隔（日期/演员/国家/导演/时长/类型/语言） |
| `rating` | string | `"1"` ~ `"5"`，未评分为 `""` |
| `date` | string | 标记日期 `YYYY-MM-DD` |
| `comment` | string | 短评，可为空 |
| `link` | string | 豆瓣条目链接，含 subject ID |

### 影评记录（reviews.json）

```json
{
  "movie": "肖申克的救赎",
  "title": "自由与希望",
  "rating": "4",
  "date": "2024-03-15",
  "abstract": "影评摘要...",
  "link": "https://movie.douban.com/review/12345678/"
}
```

### 增量数据（output/incremental_latest.json）

增量模式运行后生成，只包含上次同步之后的新标记：

```json
{
  "collect": [ ...CollectItem ],
  "reviews": [ ...ReviewItem ]
}
```

合并到主文件：按 `link` 字段去重追加。

### 状态文件（一般不需要读）

- `data/progress.json` — 爬取断点（offset、是否完成）
- `data/sync_state.json` — `{"lastSyncDate": "2026-05-18"}`，上次同步日期

## 从 intro 提取信息

`intro` 是豆瓣原始混合文本，没有结构化。常见模式：

```
上映日期(国家) / 演员 / 演员 / 国家 / 导演 / 时长 / 类型 / 类型 / 语言
```

提取方法：

| 要什么 | 怎么取 |
|--------|--------|
| 豆瓣 ID | `link.split("/subject/")[1].replace("/", "")` |
| 类型标签 | 匹配 `剧情`、`喜剧`、`动作` 等已知词 |
| 时长 | 正则 `\d+分钟`；含 `/集` 的是电视剧 |
| 上映日期 | 第一个 ` / ` 前的字段 |
| 国家 | 匹配 `中国大陆`、`美国`、`日本` 等 |

## 项目代码结构

```
src/
├── main.ts          # 入口：全量/增量/修补/交互式
├── scraper.ts       # 核心爬取逻辑（Playwright + 反检测 + 限速 + 重试）
├── parser.ts        # HTML 解析（list/grid/DOM 三种策略，自动降级）
├── storage.ts       # JSON 读写、断点、同步状态、去重
├── config.ts        # 所有配置项（环境变量 + 硬编码常量）
├── types.ts         # TypeScript 类型定义（CollectItem, ReviewItem, Progress, SyncState）
├── pixelreel.ts     # 数据推送（目前是桩，TODO）
└── verify.ts        # 验证脚本（单独运行，调试用）
```

**依赖关系：**

```
main.ts → scraper.ts → parser.ts
                        ↗
       → storage.ts ←
       → config.ts
       → pixelreel.ts
       → types.ts（所有文件共用）
```

## 怎么融进别的项目

### 方式一：作为子目录引入

直接把 `src/` 目录和 `package.json` 的依赖复制进你的项目，改 `config.ts` 的配置，然后调用：

```typescript
import { scrapeCollect, scrapeReviews, makeBrowser } from "./scraper.js";
import { loadData, saveData, loadProgress, saveProgress } from "./storage.js";

const { browser, context } = await makeBrowser();
try {
  const { ok, newItems } = await scrapeCollect(context, loadProgress());
  // newItems 就是新抓到的评分数据
} finally {
  await context.close();
  await browser.close();
}
```

### 方式二：Docker 定时任务

```dockerfile
FROM node:20-slim
RUN npx playwright install --with-deps chromium
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./
COPY tsconfig.json ./
# 配置通过环境变量传入
ENV DOUBAN_USER_ID=""
CMD ["npx", "tsx", "src/main.ts", "--incremental"]
```

用 cron 或 Kubernetes CronJob 每天跑一次增量同步：

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: douban-sync
spec:
  schedule: "0 3 * * *"   # 每天凌晨3点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: douban-harvester
            image: your-registry/douban-harvester
            env:
            - name: DOUBAN_USER_ID
              value: "你的ID"
          restartPolicy: OnFailure
```

### 方式三：只读 JSON，不跑代码

如果你只需要数据，不关心爬取：
1. 在开发机上跑一次全量：`npm run full`
2. 之后每天跑增量：`npm start` 选增量
3. 把 `data/collect.json` 和 `data/reviews.json` 拷到你的项目里直接读

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DOUBAN_USER_ID` | ✅ | 豆瓣用户 ID，个人主页 URL 里那串 |
| `PIXELREEL_BASE_URL` | ❌ | PixelReel 接口地址，默认 `http://localhost:18889` |
| `PIXELREEL_TOKEN` | ❌ | PixelReel 认证 token |

## 关键配置（src/config.ts）

如果要改爬取行为，调这些：

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `SLEEP_MIN` / `SLEEP_MAX` | 3 / 7 | 每页随机延迟秒数，**不要改小** |
| `LONG_BREAK_EVERY` | 40 | 每 N 页长休息 |
| `LONG_BREAK_SECONDS` | 180 | 长休息秒数 |
| `MAX_PAGES_PER_RUN` | 200 | 单次运行上限 |
| `AUTO_PUSH` | false | 增量数据是否自动推送到 PixelReel |

## 防风控

代码内置了反检测，别的项目接入时**不要做这些事**：

- 不要把延迟参数改小
- 不要设置 `headless: true`
- 不要移除 `scraper.ts` 里的 `addInitScript` 反检测脚本
- 被封后等 2 小时再跑

## 扩展点

### 推送数据到你的后端

`pixelreel.ts` 目前是桩函数。改成你自己的推送逻辑：

```typescript
// pixelreel.ts — 改成你自己的 API
export async function pushToPixelreel(
  newCollect: CollectItem[],
  newReviews: ReviewItem[],
): Promise<void> {
  for (const item of newCollect) {
    await fetch("https://your-api.com/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        rating: Number(item.rating),
        watchedDate: item.date,
        source: "douban",
        sourceUrl: item.link,
      }),
    });
  }
}
```

然后在 `config.ts` 里设 `AUTO_PUSH = true`，增量跑完会自动推送。

### 只拿增量数据不推送

增量模式结束后，新数据写在 `output/incremental_latest.json`。读这个文件就行，不需要改代码。