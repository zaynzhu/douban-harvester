// 豆瓣ID — 从环境变量读取，或在此填入你的ID
export const USER_ID = process.env.DOUBAN_USER_ID || "";

// 限速配置（安全为主，不要改小）
export const SLEEP_MIN = 3.0;
export const SLEEP_MAX = 7.0;
export const LONG_BREAK_EVERY = 40;
export const LONG_BREAK_SECONDS = 180;

// 每次运行最多爬多少页（防止单次跑太久引起风控）
export const MAX_PAGES_PER_RUN = 200;

// PixelReel 接口配置
export const PIXELREEL_BASE_URL = process.env.PIXELREEL_BASE_URL || "http://localhost:18889";
export const PIXELREEL_TOKEN = process.env.PIXELREEL_TOKEN || "";
// 是否自动推送到 PixelReel（false=只导出Excel，true=同时推送接口）
export const AUTO_PUSH = false;