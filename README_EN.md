<div align="center">

# 🌾 Douban Harvestor

Export your Douban ratings and reviews with one click. No login required, safety first.

[中文](README.md)

</div>

<div align="center">

![Stars](https://img.shields.io/github/stars/zaynzhu/douban-harvester?style=for-the-badge)
![Last Commit](https://img.shields.io/github/last-commit/zaynzhu/douban-harvester?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/zaynzhu/douban-harvester?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=for-the-badge&logo=typescript&logoColor=white)

</div>

---

> [!TIP]
> douban-harvester is a Playwright-based tool for exporting Douban movie/TV ratings and reviews.
> No login required, no cookies used — only reads public pages. Supports full, incremental, and repair modes with built-in anti-detection strategies.

## ✨ Features

- **No Login Required** — Reads only public pages, never touches your Douban account
- **Three Modes** — Full / Incremental / Repair, auto-detected or manually selected
- **Resume on Interrupt** — Stop anytime, resume from where you left off
- **Anti-Detection First** — Random delays, headed browser, auto-stop on rate limiting
- **Excel Export** — Ratings and reviews in separate sheets, ready to use
- **PixelReel Sync** — Optional auto-push to PixelReel API
- **Data Verification** — Built-in verify script to check data integrity

## 🚀 Quick Start

```bash
git clone https://github.com/zaynzhu/douban-harvester.git
cd douban-harvester
npm install
npx playwright install chromium
```

Create a `.env` file in the project root:

```bash
DOUBAN_USER_ID=your_douban_id
```

> [!TIP]
> Find your Douban ID in your profile URL: `https://www.douban.com/people/your_id/`

Then run:

```bash
npm start
```

The first run automatically enters full mode. After that, incremental sync is all you need.

## 📦 Installation

### npm

```bash
npm install
npx playwright install chromium
```

### Requirements

- Node.js >= 18
- Chromium (automatically installed by Playwright)

## 💡 Usage

### Full Export

Scrape all ratings and reviews from scratch, with resume support:

```bash
npm run full
```

### Incremental Sync

Only fetch new data since the last sync, completes in seconds:

```bash
npm start
# Select "incremental mode"
```

### Data Verification

Check collect.json data integrity:

```bash
npx tsx src/verify.ts
```

## Run Modes

| Mode | Command | Description |
|------|---------|-------------|
| Interactive | `npm start` | Auto-detect state, guided selection |
| Full | `npm run full` | Scrape from scratch, resume support |
| Incremental | `npm start` then pick incremental | Only new items, finishes in seconds |
| Repair | `npm run repair` | Scan all pages, deduplicate and fill gaps |
| Verify | `npx tsx src/verify.ts` | Check data integrity |

## 🛡️ Anti-Detection

- No login, no cookies — Douban blocks cookies, not IPs
- Random delay of 3–7 seconds per page, 3-minute break every 40 pages
- Headed browser with hidden webdriver fingerprint
- Auto-stop and save progress when rate limiting is detected

> [!WARNING]
> **Never** reduce delay parameters, set `headless: true`, or remove anti-detection scripts. Wait 2 hours after a ban before retrying.

## Data Files

| File | Description |
|------|-------------|
| `data/collect.json` | Ratings data cache |
| `data/reviews.json` | Reviews data cache |
| `data/progress.json` | Resume checkpoint |
| `data/sync_state.json` | Incremental sync state |
| `output/douban.xlsx` | Excel export (ratings + reviews sheets) |

All data files are excluded via `.gitignore`.

## Project Structure

```text
douban-harvester/
├── src/
│   ├── main.ts          # Entry point
│   ├── scraper.ts       # Scraping + rate limiting + anti-detection
│   ├── parser.ts        # HTML parsing (list/grid/DOM strategies)
│   ├── storage.ts       # JSON read/write, checkpoint, dedup
│   ├── pixelreel.ts     # PixelReel push (optional)
│   ├── config.ts        # Configuration
│   ├── types.ts         # TypeScript type definitions
│   └── verify.ts        # Data verification
├── data/                # Runtime data (gitignored)
└── output/              # Export files (gitignored)
```

## Configuration

Adjust in `src/config.ts`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SLEEP_MIN` / `SLEEP_MAX` | 3 / 7 | Random delay per page (seconds) |
| `LONG_BREAK_EVERY` | 40 | Long break every N pages |
| `LONG_BREAK_SECONDS` | 180 | Long break duration (seconds) |
| `MAX_PAGES_PER_RUN` | 200 | Max pages per run |
| `AUTO_PUSH` | false | Auto-push to PixelReel |

Optional environment variables:

| Variable | Description |
|----------|-------------|
| `PIXELREEL_BASE_URL` | PixelReel API endpoint (default: `http://localhost:18889`) |
| `PIXELREEL_TOKEN` | PixelReel auth token |

## 🗺️ Roadmap

| Area | Feature | Status |
|------|---------|--------|
| Core | Full/Incremental/Repair modes | ✅ |
| Core | Resume on interrupt | ✅ |
| Core | Excel export | ✅ |
| Core | Data verification script | ✅ |
| Integration | PixelReel auto-sync | 🔄 |
| Integration | More data source support | 📋 |
| Experience | Interactive config wizard | 📋 |

## ❓ FAQ

<details>
<summary>What if I get rate-limited by Douban?</summary>

Wait 2 hours before retrying. Do not retry immediately — it will extend the ban. The script auto-detects rate limiting, stops, and saves progress. The next run resumes from the checkpoint.

</details>

<details>
<summary>What data is supported?</summary>

Currently supports **ratings** and **reviews** for movies/TV shows. Ratings include title, score, date, and short comments. Reviews include title, rating, and summary.

</details>

<details>
<summary>Do I need to log in to Douban?</summary>

No. The script only reads public pages, uses no cookies, and never triggers a login flow. Douban bans cookies, not IPs — not logging in is the safest approach.

</details>

<details>
<summary>How does incremental sync work?</summary>

After the first full scrape, the script records the last sync date. In incremental mode, it only fetches data newer than that date and stops as soon as it hits older items. It usually completes in seconds and barely triggers any rate limiting.

</details>

<details>
<summary>Where is the exported Excel file?</summary>

After the run completes, the Excel file is at `output/douban.xlsx`. It contains two sheets: ratings data and reviews data.

</details>

## 📚 Documentation

| Topic | Description |
|-------|-------------|
| [Design Overview](DESIGN.md) | Architecture, data flow, CSS selector details |
| [Integration Guide](INTEGRATION.md) | How to integrate data with other systems |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
git clone https://github.com/zaynzhu/douban-harvester.git
cd douban-harvester
npm install
npx playwright install chromium
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).
