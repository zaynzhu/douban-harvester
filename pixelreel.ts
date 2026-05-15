import type { CollectItem, ReviewItem } from "./types.js";
import { PIXELREEL_BASE_URL, PIXELREEL_TOKEN } from "./config.js";

const HEADERS: Record<string, string> = {
  Authorization: `Bearer ${PIXELREEL_TOKEN}`,
  "Content-Type": "application/json",
};

/**
 * 推送单条评分记录到 PixelReel。
 * TODO: 接口字段确认后补全 payload 映射
 */
export function pushCollectItem(item: CollectItem): void {
  // const payload = {
  //   title: item.title,
  //   year: ...,           // 从 subtitle 解析
  //   rating: Number(item.rating) * 2,  // 豆瓣1~5 → PixelReel 2~10，视接口定
  //   watchedDate: item.date,
  //   source: "douban",
  //   sourceUrl: item.link,
  // };
  // const resp = await fetch(`${PIXELREEL_BASE_URL}/api/movies`, {
  //   method: "POST",
  //   headers: HEADERS,
  //   body: JSON.stringify(payload),
  // });
  // if (!resp.ok) throw new Error(`推送失败: ${resp.status}`);
  console.log(`  [TODO] 推送评分: ${item.title} (${item.rating}星)`);
}

/**
 * 推送单条影评到 PixelReel。
 * TODO: 确认 PixelReel 是否有影评/短评字段，补全映射
 */
export function pushReviewItem(item: ReviewItem): void {
  console.log(`  [TODO] 推送影评: ${item.movie} - ${item.title}`);
}

/**
 * 批量推送增量数据
 */
export function pushToPixelreel(
  newCollect: CollectItem[],
  newReviews: ReviewItem[],
): void {
  console.log(`\n📤 开始推送到 PixelReel...`);
  console.log(`   评分 ${newCollect.length} 条，影评 ${newReviews.length} 条`);

  let ok = 0;
  let fail = 0;

  for (const item of newCollect) {
    try {
      pushCollectItem(item);
      ok++;
    } catch (e: any) {
      console.log(`  ❌ 推送失败: ${item.title} - ${e.message}`);
      fail++;
    }
  }

  for (const item of newReviews) {
    try {
      pushReviewItem(item);
      ok++;
    } catch (e: any) {
      console.log(`  ❌ 推送失败: ${item.title} - ${e.message}`);
      fail++;
    }
  }

  console.log(`   推送完成：成功 ${ok}，失败 ${fail}`);
}