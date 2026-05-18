# 豆瓣收割机 — 项目规则

## 项目概览

TypeScript + Playwright 爬虫，导出豆瓣电影/电视剧评分数据。支持全量、增量、修复三种模式。

## 命令速查

```bash
npm start          # 交互式模式（自动判断全量/增量）
npm run full       # 强制全量模式
npm run repair     # 修复模式（遍历所有页面，去重补漏）
npx tsx verify.ts  # 验证 collect.json 数据完整性
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DOUBAN_USER_ID` | ✅ | 豆瓣用户 ID |
| `PIXELREEL_BASE_URL` | ❌ | PixelReel 接口地址（默认 http://localhost:18889） |
| `PIXELREEL_TOKEN` | ❌ | PixelReel 认证 token |

配置方式：在项目根目录创建 `.env` 文件。

## 关键配置（config.ts）

- `SLEEP_MIN` / `SLEEP_MAX`：每页随机延迟（3~7 秒）
- `LONG_BREAK_EVERY`：每 N 页长休息（40 页）
- `LONG_BREAK_SECONDS`：长休息时长（180 秒）
- `MAX_PAGES_PER_RUN`：单次运行上限（200 页）
- `AUTO_PUSH`：是否自动推送到 PixelReel（默认 false）

## 防风控红线

- **绝对不能**减小延迟参数（SLEEP_MIN/MAX、LONG_BREAK_*）
- **绝对不能**设置 `headless: true`
- **绝对不能**移除反检测脚本（addInitScript）
- 被封后等 2 小时再跑，不要立即重试

## 数据文件

| 文件 | 说明 | 是否提交 |
|------|------|----------|
| `collect.json` | 评分数据缓存 | ❌ |
| `reviews.json` | 影评数据缓存 | ❌ |
| `progress.json` | 断点记录 | ❌ |
| `sync_state.json` | 增量同步状态 | ❌ |
| `output/douban.xlsx` | Excel 导出 | ❌ |
| `.env` | 环境变量 | ❌ |

## 深入文档

- [DESIGN.md](DESIGN.md) — 设计概要、架构、数据流
