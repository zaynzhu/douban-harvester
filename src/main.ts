import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import ExcelJS from "exceljs";
import { makeBrowser, scrapeCollect, scrapeReviews } from "./scraper.js";
import {
  loadProgress, saveProgress,
  loadSyncState, saveSyncState, todayStr,
  loadData, ensureOutputDir,
} from "./storage.js";
import { pushToPixelreel } from "./pixelreel.js";
import { AUTO_PUSH } from "./config.js";
import type { CollectItem, ReviewItem } from "./types.js";

async function exportExcel(): Promise<void> {
  const collect: CollectItem[] = existsSync("data/collect.json")
    ? JSON.parse(readFileSync("data/collect.json", "utf-8"))
    : [];
  const reviews: ReviewItem[] = existsSync("data/reviews.json")
    ? JSON.parse(readFileSync("data/reviews.json", "utf-8"))
    : [];

  ensureOutputDir();
  const workbook = new ExcelJS.Workbook();

  const collectSheet = workbook.addWorksheet("评分");
  collectSheet.columns = [
    { header: "片名", key: "title", width: 30 },
    { header: "外文名", key: "altTitle", width: 30 },
    { header: "年份/类型", key: "intro", width: 60 },
    { header: "评分", key: "rating", width: 8 },
    { header: "标记日期", key: "date", width: 14 },
    { header: "短评", key: "comment", width: 50 },
    { header: "链接", key: "link", width: 50 },
  ];
  collectSheet.addRows(collect);

  const reviewSheet = workbook.addWorksheet("影评");
  reviewSheet.columns = [
    { header: "影片名", key: "movie", width: 30 },
    { header: "影评标题", key: "title", width: 30 },
    { header: "评分", key: "rating", width: 8 },
    { header: "发布日期", key: "date", width: 14 },
    { header: "摘要", key: "abstract", width: 50 },
    { header: "链接", key: "link", width: 50 },
  ];
  reviewSheet.addRows(reviews);

  await workbook.xlsx.writeFile("output/douban.xlsx");

  console.log("\n🎉 导出完成！");
  console.log(`   评分记录：${collect.length} 条`);
  console.log(`   影评记录：${reviews.length} 条`);
  console.log("   文件路径：output/douban.xlsx");
}

async function runRepair(): Promise<void> {
  const progress = loadProgress();
  const currentCount = loadData<CollectItem>("data/collect.json").length;
  console.log("=".repeat(50));
  console.log("豆瓣收割 · 修补模式");
  console.log("=".repeat(50));
  console.log(`当前评分数据：${currentCount} 条`);
  console.log("从断点继续补扫缺失数据（已有数据去重保留）");
  console.log(`  断点：offset=${progress.collectStart}，完成=${progress.collectDone}`);
  console.log();

  progress.collectDone = false;
  saveProgress(progress);

  const { browser, context } = await makeBrowser();
  try {
    const { ok } = await scrapeCollect(context, progress);
    if (!ok) {
      console.log("\n由于风控，修补中止，进度已保存，可再次运行继续");
      return;
    }
  } finally {
    await context.close();
    await browser.close();
  }

  if (progress.collectDone) {
    await exportExcel();
    saveSyncState(todayStr());
  }
}

async function runFull(): Promise<void> {
  const progress = loadProgress();
  console.log("=".repeat(50));
  console.log("豆瓣收割 · 全量模式");
  console.log("=".repeat(50));
  console.log("断点状态：");
  console.log(`  评分：offset=${progress.collectStart}，完成=${progress.collectDone}`);
  console.log(`  影评：page=${progress.reviewsPage}，完成=${progress.reviewsDone}`);
  console.log();

  const { browser, context } = await makeBrowser();
  try {
    if (!progress.collectDone) {
      const { ok } = await scrapeCollect(context, progress);
      if (!ok) {
        console.log("\n由于风控，本次运行结束，请稍后重试");
        return;
      }
    } else {
      console.log("✅ 评分已全部完成，跳过");
    }

    if (!progress.reviewsDone) {
      const { ok } = await scrapeReviews(context, progress);
      if (!ok) {
        console.log("\n由于风控，本次运行结束，请稍后重试");
        return;
      }
    } else {
      console.log("✅ 影评已全部完成，跳过");
    }
  } finally {
    await context.close();
    await browser.close();
  }

  if (progress.collectDone && progress.reviewsDone) {
    await exportExcel();
    saveSyncState(todayStr());
    console.log("✅ 已记录同步时间，下次运行将自动走增量模式");
  } else {
    console.log("\n⏸ 尚未全部完成，直接重新运行即可从断点继续");
  }
}

async function runIncremental(lastSyncDate: string): Promise<void> {
  console.log("=".repeat(50));
  console.log("豆瓣收割 · 增量模式");
  console.log(`上次同步：${lastSyncDate}`);
  console.log("=".repeat(50));

  let newCollect: CollectItem[] = [];
  let newReviews: ReviewItem[] = [];

  const { browser, context } = await makeBrowser();
  try {
    const collectResult = await scrapeCollect(context, loadProgress(), lastSyncDate);
    if (!collectResult.ok) {
      console.log("\n由于风控，本次同步中止，下次重试");
      return;
    }
    newCollect = collectResult.newItems;

    const reviewsResult = await scrapeReviews(context, loadProgress(), lastSyncDate);
    if (!reviewsResult.ok) {
      console.log("\n由于风控，本次同步中止，下次重试");
      return;
    }
    newReviews = reviewsResult.newItems;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`\n📊 增量结果：新增评分 ${newCollect.length} 条，新增影评 ${newReviews.length} 条`);

  if (newCollect.length === 0 && newReviews.length === 0) {
    console.log("没有新数据，同步完成");
    saveSyncState(todayStr());
    return;
  }

  if (AUTO_PUSH) {
    pushToPixelreel(newCollect, newReviews);
  } else {
    ensureOutputDir();
    writeFileSync(
      "output/incremental_latest.json",
      JSON.stringify({ collect: newCollect, reviews: newReviews }, null, 2),
      "utf-8",
    );
    console.log("   已保存到 output/incremental_latest.json");
    console.log("   配置 AUTO_PUSH=true 并完善 pixelreel.ts 后可自动推送");
  }

  saveSyncState(todayStr());
  console.log(`✅ 同步完成，下次同步截止日期更新为 ${todayStr()}`);
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function interactiveMain(): Promise<void> {
  ensureOutputDir();

  const syncState = loadSyncState();
  const progress = loadProgress();
  const lastSync = syncState.lastSyncDate;

  console.log("豆瓣收割机 (douban-harvester)");
  console.log("─".repeat(30));
  console.log(`评分进度：offset=${progress.collectStart}，完成=${progress.collectDone}`);
  console.log(`影评进度：page=${progress.reviewsPage}，完成=${progress.reviewsDone}`);
  if (lastSync) {
    console.log(`上次同步：${lastSync}`);
  }
  console.log();
  console.log("请选择运行模式：");
  console.log("  1. 全量模式（从头/断点继续抓取所有数据）");
  console.log("  2. 增量模式（只抓上次同步后的新数据）");
  console.log("  3. 指定日期增量（从指定日期开始抓新数据）");
  console.log("  4. 修补模式（重扫所有页，补齐缺失数据）");
  console.log();

  const choice = await prompt("输入选项 (1/2/3/4): ");

  if (choice === "1") {
    await runFull();
  } else if (choice === "2") {
    if (!lastSync) {
      console.log("从未同步过，无法走增量模式。请先跑全量。");
      return;
    }
    await runIncremental(lastSync);
  } else if (choice === "3") {
    const dateInput = await prompt("输入截止日期 (YYYY-MM-DD，抓取该日期之后的数据): ");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      console.log("日期格式不正确，退出");
      return;
    }
    await runIncremental(dateInput);
  } else if (choice === "4") {
    await runRepair();
  } else {
    console.log("无效选项，退出");
  }
}

// 入口：带参数直接执行，无参数交互式
const args = process.argv.slice(2);
if (args.includes("--full")) {
  ensureOutputDir();
  runFull().catch(console.error);
} else if (args.includes("--repair")) {
  ensureOutputDir();
  runRepair().catch(console.error);
} else if (args.includes("--incremental")) {
  const dateArg = args.find((a) => a.startsWith("--date="));
  if (dateArg) {
    const date = dateArg.split("=")[1];
    runIncremental(date).catch(console.error);
  } else {
    const syncState = loadSyncState();
    if (syncState.lastSyncDate) {
      runIncremental(syncState.lastSyncDate).catch(console.error);
    } else {
      console.log("从未同步过，请先跑全量：npm run full");
      process.exit(1);
    }
  }
} else if (args.length === 0) {
  interactiveMain().catch(console.error);
} else {
  console.log("用法：");
  console.log("  npm start                  交互式选择模式");
  console.log("  npm run full               全量模式");
  console.log("  npx tsx src/main.ts --repair               修补模式");
  console.log("  npx tsx src/main.ts --incremental          增量模式");
  console.log("  npx tsx src/main.ts --incremental --date=2026-01-01  指定日期增量");
}