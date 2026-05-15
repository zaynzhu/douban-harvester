// 豆瓣ID — 个人主页 URL 最后一串数字
export const USER_ID = "174594598";

// 限速配置（安全为主，不要改小）
export const SLEEP_MIN = 3.0;
export const SLEEP_MAX = 7.0;
export const LONG_BREAK_EVERY = 40;
export const LONG_BREAK_SECONDS = 180;

// 每次运行最多爬多少页（防止单次跑太久引起风控）
export const MAX_PAGES_PER_RUN = 80;

// PixelReel 接口配置
export const PIXELREEL_BASE_URL = "http://localhost:18889";
export const PIXELREEL_TOKEN = "";
// 是否自动推送到 PixelReel（false=只导出Excel，true=同时推送接口）
export const AUTO_PUSH = false;