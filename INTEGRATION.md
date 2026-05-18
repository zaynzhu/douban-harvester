# 豆瓣收割机 — 数据接入指南

本项目的产出就是 JSON 文件，其他项目只需读取 JSON 即可，无需引入本项目代码。

## 数据文件

所有数据文件在项目根目录下：

| 文件 | 内容 | 更新时机 |
|------|------|----------|
| `data/collect.json` | 评分数据（主文件） | 全量/修补模式运行时写入 |
| `data/reviews.json` | 影评数据 | 全量模式运行时写入 |
| `data/progress.json` | 爬取断点 | 每页抓完后写入 |
| `data/sync_state.json` | 增量同步日期 | 同步完成后写入 |
| `output/incremental_latest.json` | 最近一次增量结果 | 增量模式运行时写入 |

日常使用只需关注 `data/collect.json` 和 `data/reviews.json`。

## 评分数据（collect.json）

顶层是数组，每条记录结构如下：

```json
{
  "title": "低智商犯罪",
  "altTitle": "",
  "intro": "2026-05-04(中国大陆) / 王骁 / 田曦薇 / ... / 中国大陆 / 45分钟 / 剧情 / 犯罪 / ...",
  "rating": "5",
  "date": "2026-05-18",
  "comment": "比想象的还有好看",
  "link": "https://movie.douban.com/subject/35517044/"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 中文片名 |
| `altTitle` | string | 外文名，可能为空 |
| `intro` | string | 混合信息，包含上映日期、导演、演员、国家、时长、类型标签、语言等，用 ` / ` 分隔 |
| `rating` | string | 豆瓣评分，`"1"` ~ `"5"`，未评分为空字符串 `""` |
| `date` | string | 标记日期，格式 `YYYY-MM-DD` |
| `comment` | string | 短评，可为空字符串 |
| `link` | string | 豆瓣条目链接，格式 `https://movie.douban.com/subject/{id}/` |

### intro 字段解析

`intro` 是豆瓣原始混合文本，各段用 ` / ` 分隔，常见模式：

```
上映日期 / 演员1 / 演员2 / ... / 国家 / 导演 / 时长 / 类型1 / 类型2 / 语言
```

提取特定信息示例：

| 需要的信息 | 方法 |
|------------|------|
| 类型标签 | 找到 `剧情`、`喜剧`、`动作` 等已知类型词 |
| 时长 | 匹配 `XX分钟`（电影）或 `XX分钟/集`（电视剧） |
| 国家/地区 | 找到 `中国大陆`、`美国`、`日本` 等 |
| 上映日期 | 第一个字段，格式 `YYYY-MM-DD(国家)` |

## 影评数据（reviews.json）

顶层是数组，每条记录结构如下：

```json
{
  "movie": "低智商犯罪",
  "title": "看完想说的话",
  "rating": "4",
  "date": "2026-05-18",
  "abstract": "影评摘要文本...",
  "link": "https://movie.douban.com/review/XXXXXX/"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `movie` | string | 影片名 |
| `title` | string | 影评标题 |
| `rating` | string | 评分 `"1"` ~ `"5"`，可能为空 |
| `date` | string | 发布日期，`YYYY-MM-DD` |
| `abstract` | string | 影评摘要 |
| `link` | string | 影评链接 |

## 增量数据（incremental_latest.json）

增量模式运行后生成，结构：

```json
{
  "collect": [ ...CollectItem ],
  "reviews": [ ...ReviewItem ]
}
```

只包含上次同步之后的新标记。合并到主文件的方式：按 `link` 字段去重追加。

## 断点与同步状态

`progress.json` 和 `sync_state.json` 是爬取过程的状态文件，一般不需要读取：

```json
// progress.json
{
  "collectStart": 4440,
  "collectDone": true,
  "reviewsPage": 1,
  "reviewsDone": true
}

// sync_state.json
{
  "lastSyncDate": "2026-05-18"
}
```

## 数据更新流程

```bash
# 首次：全量抓取
npm run full

# 之后：增量同步（只抓新数据）
npm start  # 选择增量模式

# 数据有缺失：修补模式
npm run repair
```

运行后 JSON 文件自动更新，其他项目直接读取即可。

## 豆瓣条目 ID

每条记录的 `link` 字段包含豆瓣 subject ID：

```
https://movie.douban.com/subject/35517044/
                                ^^^^^^^^
                                这就是 ID
```

提取方式：`link.split("/subject/")[1].replace("/", "")`

这个 ID 可用于关联豆瓣页面或匹配其他数据源（如 TMDb）。