import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import {
  USER_ID, SLEEP_MIN, SLEEP_MAX,
  LONG_BREAK_EVERY, LONG_BREAK_SECONDS, MAX_PAGES_PER_RUN,
} from "./config.js";
import { loadData, saveData, saveProgress } from "./storage.js";
import { parseCollectPage, parseReviewsPage } from "./parser.js";
import type { CollectItem, ReviewItem, Progress } from "./types.js";

function randomSleep(minS?: number, maxS?: number): Promise<void> {
  const t = Math.random() * ((maxS ?? SLEEP_MAX) - (minS ?? SLEEP_MIN)) + (minS ?? SLEEP_MIN);
  console.log(`  ⏱ 等待 ${t.toFixed(1)}s...`);
  return new Promise((r) => setTimeout(r, t * 1000));
}

async function longBreak(): Promise<void> {
  console.log(`\n⏸ 主动休息 ${LONG_BREAK_SECONDS}s，防风控...`);
  for (let remaining = LONG_BREAK_SECONDS; remaining > 0; remaining -= 10) {
    process.stdout.write(`  剩余 ${remaining}s...\r`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.log();
}

export async function makeBrowser(): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({
    headless: false, // 调试期用有头；稳定后可改 true
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  });
  // 隐藏 webdriver 特征
  await context.addInitScript(`
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
  `);
  return { browser, context };
}

function checkBlocked(page: Page): { blocked: boolean; reason: string } {
  const url = page.url();
  try {
    // 同步检查 URL 级别的风控信号
    if (url.includes("accounts.douban.com")) {
      return { blocked: true, reason: "跳转到登录页" };
    }
    if (url.includes("verification") || url.includes("captcha")) {
      return { blocked: true, reason: "验证码页面" };
    }
    return { blocked: false, reason: "" };
  } catch {
    return { blocked: true, reason: "页面内容获取失败" };
  }
}

async function checkBlockedAsync(page: Page): Promise<{ blocked: boolean; reason: string }> {
  const urlCheck = checkBlocked(page);
  if (urlCheck.blocked) return urlCheck;

  try {
    const content = await page.content();
    if (content.includes("访问频率")) {
      return { blocked: true, reason: "频率限制提示" };
    }
    const lower = content.toLowerCase();
    if (lower.includes("robot") && !lower.slice(0, 100).includes("douban")) {
      return { blocked: true, reason: "机器人检测" };
    }
  } catch {
    return { blocked: true, reason: "页面内容获取失败" };
  }
  return { blocked: false, reason: "" };
}

function isOlderThan(dateStr: string, cutoff: string): boolean {
  try {
    return dateStr.slice(0, 10) <= cutoff;
  } catch {
    return false;
  }
}

export async function scrapeCollect(
  context: BrowserContext,
  progress: Progress,
  cutoffDate?: string,
): Promise<{ ok: boolean; newItems: CollectItem[] }> {
  const data: CollectItem[] = cutoffDate === undefined ? loadData<CollectItem>("collect.json") : [];
  const newItems: CollectItem[] = [];
  let pageCount = 0;
  const page = await context.newPage();
  const mode = cutoffDate ? "增量" : "全量";
  console.log(`\n🚀 评分抓取模式：${mode}${cutoffDate ? `，截止日期 ${cutoffDate}` : ""}`);

  try {
    while (true) {
      const start = cutoffDate
        ? pageCount * 15
        : progress.collectDone
          ? -1
          : progress.collectStart;

      if (!cutoffDate && progress.collectDone) break;

      const url =
        `https://movie.douban.com/people/${USER_ID}/collect` +
        `?start=${start}&sort=time&rating=all&filter=all&mode=grid`;

      console.log(`\n📄 评分页 offset=${start} | 已抓 ${data.length + newItems.length} 条`);
      console.log(`   正在加载 ${url}`);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      } catch (e: any) {
        console.log(`❌ 页面加载失败: ${e.message}`);
        return { ok: false, newItems };
      }
      await randomSleep(1.5, 2.5);

      const { blocked, reason } = await checkBlockedAsync(page);
      if (blocked) {
        console.log(`❌ 被风控: ${reason}`);
        console.log("   请等待 2 小时以上再运行，进度已保存");
        if (cutoffDate === undefined) {
          saveData("collect.json", data);  // 先存数据
          saveProgress(progress);           // 再存进度
        }
        return { ok: false, newItems };
      }

      console.log("   正在解析页面...");
      let items: CollectItem[];
      try {
        items = await parseCollectPage(page);
      } catch (e: any) {
        console.log(`❌ 页面解析失败: ${e.message}`);
        return { ok: false, newItems };
      }

      if (items.length === 0) {
        console.log("✅ 评分数据全部抓完！");
        if (cutoffDate === undefined) {
          progress.collectDone = true;
          saveProgress(progress);
        }
        break;
      }

      if (cutoffDate) {
        const fresh = items.filter((i) => !isOlderThan(i.date, cutoffDate));
        newItems.push(...fresh);
        console.log(`   本页新增 ${fresh.length} 条（共${items.length}条）`);
        if (fresh.length < items.length) {
          console.log("   遇到旧数据，增量抓取完毕");
          break;
        }
      } else {
        data.push(...items);
        saveData("collect.json", data); // 先存数据
        progress.collectStart = start + 15;
        saveProgress(progress);          // 再推进 offset
        console.log(`   本页获取 ${items.length} 条，累计 ${data.length} 条`);
      }

      pageCount++;

      if (cutoffDate === undefined && pageCount >= MAX_PAGES_PER_RUN) {
        console.log(`\n⏹ 本次运行已达 ${MAX_PAGES_PER_RUN} 页上限，进度已保存`);
        return { ok: true, newItems: [] };
      }

      if (pageCount % LONG_BREAK_EVERY === 0) {
        await longBreak();
      } else {
        await randomSleep();
      }
    }
  } finally {
    await page.close();
  }

  return { ok: true, newItems };
}

export async function scrapeReviews(
  context: BrowserContext,
  progress: Progress,
  cutoffDate?: string,
): Promise<{ ok: boolean; newItems: ReviewItem[] }> {
  const data: ReviewItem[] = cutoffDate === undefined ? loadData<ReviewItem>("reviews.json") : [];
  const newItems: ReviewItem[] = [];
  let pageCount = 0;
  const page = await context.newPage();
  const mode = cutoffDate ? "增量" : "全量";
  console.log(`\n🚀 影评抓取模式：${mode}${cutoffDate ? `，截止日期 ${cutoffDate}` : ""}`);

  try {
    while (true) {
      const p = cutoffDate ? pageCount + 1 : progress.reviewsDone ? -1 : progress.reviewsPage;

      if (!cutoffDate && progress.reviewsDone) break;

      const url =
        `https://movie.douban.com/people/${USER_ID}/reviews` +
        `?start=${(p - 1) * 20}&sortby=time`;

      console.log(`\n📝 影评第 ${p} 页 | 已抓 ${data.length + newItems.length} 条`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await randomSleep(1.5, 2.5);

      const { blocked, reason } = await checkBlockedAsync(page);
      if (blocked) {
        console.log(`❌ 被风控: ${reason}`);
        console.log("   请等待 2 小时以上再运行，进度已保存");
        if (cutoffDate === undefined) {
          saveData("reviews.json", data);  // 先存数据
          saveProgress(progress);           // 再存进度
        }
        return { ok: false, newItems };
      }

      const items = await parseReviewsPage(page);

      if (items.length === 0) {
        console.log("✅ 影评全部抓完！");
        if (cutoffDate === undefined) {
          progress.reviewsDone = true;
          saveProgress(progress);
        }
        break;
      }

      if (cutoffDate) {
        const fresh = items.filter((i) => !isOlderThan(i.date, cutoffDate));
        newItems.push(...fresh);
        console.log(`   本页新增 ${fresh.length} 条（共${items.length}条）`);
        if (fresh.length < items.length) {
          console.log("   遇到旧数据，增量抓取完毕");
          break;
        }
      } else {
        data.push(...items);
        saveData("reviews.json", data);  // 先存数据
        progress.reviewsPage = p + 1;
        saveProgress(progress);           // 再推进 offset
        console.log(`   本页获取 ${items.length} 条，累计 ${data.length} 条`);
      }

      pageCount++;

      if (cutoffDate === undefined && pageCount >= MAX_PAGES_PER_RUN) {
        console.log(`\n⏹ 本次运行已达 ${MAX_PAGES_PER_RUN} 页上限，进度已保存`);
        return { ok: true, newItems: [] };
      }

      if (pageCount % LONG_BREAK_EVERY === 0) {
        await longBreak();
      } else {
        await randomSleep();
      }
    }
  } finally {
    await page.close();
  }

  return { ok: true, newItems };
}