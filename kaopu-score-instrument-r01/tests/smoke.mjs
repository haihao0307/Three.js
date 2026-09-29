import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const targetUrl = process.env.TARGET_URL;
if (!targetUrl) throw new Error('TARGET_URL is required');

await mkdir('qa-artifacts', { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`);
  });

  try {
    const response = await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 120_000 });
    assert(response?.ok(), `${name}: public URL returned ${response?.status()}`);

    await page.waitForSelector('#viewport canvas', { state: 'visible', timeout: 30_000 });
    await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('演奏完成'), null, { timeout: 30_000 });

    const canvasBox = await page.locator('#viewport canvas').boundingBox();
    assert(canvasBox && canvasBox.width > 200 && canvasBox.height > 200, `${name}: canvas is not visibly sized`);

    const initialObjects = Number((await page.locator('#objects').textContent())?.replaceAll(',', '') ?? 0);
    const initialTriangles = Number((await page.locator('#triangles').textContent())?.replaceAll(',', '') ?? 0);
    const initialBytes = Number((await page.locator('#bytes').textContent())?.replace(/[^0-9]/g, '') ?? 0);
    assert(initialObjects > 0, `${name}: no objects were generated`);
    assert(initialTriangles > 0, `${name}: no triangles were generated`);
    assert(initialBytes > 0, `${name}: score byte count is empty`);

    const presetButtons = page.locator('[data-score]');
    const presetCount = await presetButtons.count();
    assert(presetCount >= 9, `${name}: expected at least 9 score presets`);

    for (let index = 0; index < presetCount; index += 1) {
      await presetButtons.nth(index).click();
      await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('演奏完成'), null, { timeout: 15_000 });
      const status = await page.locator('#status').textContent();
      assert(!status?.includes('未执行'), `${name}: preset ${index + 1} failed: ${status}`);
    }

    await page.locator('#score').fill('K1|A4,1{s.2#e7b34e};b.5,.8,.5#6ea870');
    await page.locator('#play').click();
    await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('演奏完成'), null, { timeout: 15_000 });
    const customObjects = Number((await page.locator('#objects').textContent())?.replaceAll(',', '') ?? 0);
    assert(customObjects === 5, `${name}: expected 5 objects from custom score, got ${customObjects}`);

    await page.locator('#score').fill('K1|A0,1{s.2}');
    await page.locator('#play').click();
    await page.waitForFunction(() => document.querySelector('#status')?.textContent?.includes('谱子未执行'), null, { timeout: 15_000 });

    await page.locator('#camera').click();
    await page.screenshot({ path: `qa-artifacts/${name}.png`, fullPage: true });

    assert(pageErrors.length === 0, `${name}: page errors:\n${pageErrors.join('\n')}`);
    assert(consoleErrors.length === 0, `${name}: console errors:\n${consoleErrors.join('\n')}`);
    assert(failedRequests.length === 0, `${name}: failed requests:\n${failedRequests.join('\n')}`);
  } catch (error) {
    console.error(`${name} diagnostics:`);
    console.error(JSON.stringify({ consoleErrors, pageErrors, failedRequests }, null, 2));
    console.error(`Current page URL: ${page.url()}`);
    console.error(`Current status: ${await page.locator('#status').textContent().catch(() => 'missing')}`);
    await page.screenshot({ path: `qa-artifacts/${name}-failure.png`, fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await verifyViewport(browser, 'desktop-1440x900', { width: 1440, height: 900 });
  await verifyViewport(browser, 'mobile-390x844', { width: 390, height: 844 });
} finally {
  await browser.close();
}

console.log(`KAOPU Score Instrument public smoke QA passed: ${targetUrl}`);
