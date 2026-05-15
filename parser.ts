import type { Page } from "playwright";
import type { CollectItem, ReviewItem } from "./types.js";

/**
 * 安全获取元素文本，元素不存在时返回默认值
 */
async function safeText(locator: any, fallback = ""): Promise<string> {
  if (await locator.count() === 0) return fallback;
  try {
    return (await locator.first().innerText()).trim();
  } catch {
    return fallback;
  }
}

/**
 * 安全获取元素属性，元素不存在时返回默认值
 */
async function safeAttr(locator: any, attr: string, fallback = ""): Promise<string> {
  if (await locator.count() === 0) return fallback;
  try {
    return (await locator.first().getAttribute(attr)) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * 解析一页评分数据（每页15条）
 * CSS 选择器已通过 Playwright MCP 在实际页面验证
 */
export async function parseCollectPage(page: Page): Promise<CollectItem[]> {
  const items: CollectItem[] = [];
  const cards = page.locator(".item.comment-item");

  for (const card of await cards.all()) {
    try {
      // 片名：<em> 里是中文名
      const title = await safeText(card.locator(".title a em"));
      // 外文名：从 <a> 完整文本中去掉 <em> 部分
      const fullTitle = await safeText(card.locator(".title a"));
      const altTitle = fullTitle
        .replace(title, "")
        .replace(/^\s*\/\s*/, "")
        .trim();

      // 年份/导演/类型等
      const intro = await safeText(card.locator(".intro"));

      // 评分：class 是 rating1-t 到 rating5-t
      const ratingCls = await safeAttr(card.locator("[class*='rating']"), "class");
      let rating = "";
      for (let i = 1; i <= 5; i++) {
        if (ratingCls.includes(`rating${i}-t`)) {
          rating = String(i);
          break;
        }
      }

      // 标记日期
      const date = await safeText(card.locator(".date"));

      // 短评（可能为空）
      const comment = await safeText(card.locator(".comment"));

      // 条目链接
      const link = await safeAttr(card.locator(".title a"), "href");

      if (title) {
        items.push({ title, altTitle, intro, rating, date, comment, link });
      }
    } catch (e: any) {
      console.log(`  解析单条失败: ${e.message}`);
    }
  }
  return items;
}

/**
 * 解析一页影评（每页约20条）
 */
export async function parseReviewsPage(page: Page): Promise<ReviewItem[]> {
  const items: ReviewItem[] = [];
  const cards = page.locator(".review-item");

  for (const card of await cards.all()) {
    try {
      const movie = await safeText(card.locator(".main-title-name"));
      const title = await safeText(card.locator("h2 a"));
      const reviewLink = await safeAttr(card.locator("h2 a"), "href");

      // 评分：class 是 allstar10 到 allstar50
      const ratingCls = await safeAttr(card.locator("[class*='allstar']"), "class");
      let rating = "";
      for (let i = 1; i <= 5; i++) {
        if (ratingCls.includes(`allstar${i * 10}`)) {
          rating = String(i);
          break;
        }
      }

      const date = await safeText(card.locator(".main-meta"));
      const abstract = await safeText(card.locator(".review-short-content"));

      if (title) {
        items.push({ movie, title, rating, date, abstract, link: reviewLink });
      }
    } catch (e: any) {
      console.log(`  解析影评失败: ${e.message}`);
    }
  }
  return items;
}