// capture_ui_screenshots.js
// Uses Playwright (already available via ms-playwright) to capture screenshots of the main UI pages
// Screenshots are saved to the Antigravity artifacts directory for easy embedding.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Paths where screenshots will be stored (artifact directory)
const ARTIFACT_DIR = path.resolve(__dirname, '../../.gemini/antigravity/brain/3eea9f20-0048-4dd5-8bb8-e24f03c5b076');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const pages = [
    { name: 'home', url: 'http://localhost:3000/' },
    { name: 'game', url: 'http://localhost:3000/game.html' },
];

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    for (const p of pages) {
        const page = await context.newPage();
        await page.goto(p.url, { waitUntil: 'networkidle' });
        const filePath = path.join(ARTIFACT_DIR, `${p.name}_screenshot.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`[CAPTURE] Saved ${p.name} screenshot to ${filePath}`);
        await page.close();
    }
    await browser.close();
})();
