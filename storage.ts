import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import type { Progress, SyncState } from "./types.js";

const PROGRESS_FILE = "progress.json";
const SYNC_STATE_FILE = "sync_state.json";

export function loadProgress(): Progress {
  if (existsSync(PROGRESS_FILE)) {
    return JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
  }
  return {
    collectStart: 0,
    collectDone: false,
    reviewsPage: 1,
    reviewsDone: false,
  };
}

export function saveProgress(progress: Progress): void {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf-8");
}

export function loadData<T>(filename: string): T[] {
  if (existsSync(filename)) {
    return JSON.parse(readFileSync(filename, "utf-8"));
  }
  return [];
}

export function saveData(filename: string, data: unknown): void {
  writeFileSync(filename, JSON.stringify(data, null, 2), "utf-8");
}

// -------- 增量同步状态 --------

export function loadSyncState(): SyncState {
  if (existsSync(SYNC_STATE_FILE)) {
    return JSON.parse(readFileSync(SYNC_STATE_FILE, "utf-8"));
  }
  return { lastSyncDate: null };
}

export function saveSyncState(dateStr: string): void {
  writeFileSync(SYNC_STATE_FILE, JSON.stringify({ lastSyncDate: dateStr }, null, 2), "utf-8");
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dedupByLink<T extends { link: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

export function ensureOutputDir(): void {
  mkdirSync("output", { recursive: true });
}