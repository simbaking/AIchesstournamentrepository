// capture_ui_screenshots.js
// Uses Playwright to capture screenshots of key UI pages after redesign.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve(__dirname, '../../.gemini/antigravity/brain/3eea9f20-0048-4dd5-8bb8-e24f03c5b076');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const pages = [
    { name: 'home', url: 'http://localhost:3000/' },
    { name: 'game', url: 'http://localhost:3000/game.html' },
    // add more pages if they exist
];

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    for (const p of pages) {
        const page = await context.newPage();
        await page.goto(p.url, { waitUntil: 'networkidle' });
        const filePath = path.join(ARTIFACT_DIR, `${p.name}_screenshot.png`);
        await page.screenshot({ path: filePath, fullPage: true });
        console.log(`[CAPTURE] ${p.name} saved to ${filePath}`);
        await page.close();
    }
    await browser.close();
})();
