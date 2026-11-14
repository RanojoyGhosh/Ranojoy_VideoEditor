// Renders the OG share image + apple touch icon with the pre-installed Playwright.
// Run after replacing posters: node scripts/og/render.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // uses the globally installed Playwright
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${root}/scripts/og/og-cover.html`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}/public/assets/images/og-cover.jpg`, type: 'jpeg', quality: 86 });

const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(`<style>@font-face{font-family:P;font-weight:600;src:url('file://${root}/node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2')}
body{margin:0;width:180px;height:180px;display:grid;place-items:center;background:#0B1F17;color:#E8DCC4;font:600 72px P;letter-spacing:-3px}</style><body>RG</body>`);
await icon.evaluate(() => document.fonts.ready);
await icon.screenshot({ path: `${root}/public/assets/images/apple-touch-icon.png` });
await browser.close();
console.log('✓ og-cover.jpg and apple-touch-icon.png written');
