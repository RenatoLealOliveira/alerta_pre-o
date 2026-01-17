const puppeteer = require('puppeteer');

async function testPuppeteer() {
    console.log("Starting Puppeteer debug...");
    let browser;
    try {
        // Same stable args as applied in scraper.js
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
        ];

        console.log("Launching browser with args:", launchArgs);

        browser = await puppeteer.launch({
            headless: true, // Changed to true for stability
            args: launchArgs
        });

        console.log("Browser launched. Creating new page...");
        const page = await browser.newPage();
        console.log("Page created.");

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        const searchUrl = "https://lista.mercadolivre.com.br/playstation-5";
        console.log(`Navigating to: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log("Navigation complete.");

        await page.waitForSelector('.ui-search-layout__item, .andes-card, li.ui-search-layout__item', { timeout: 10000 });
        console.log("Items found.");

        await browser.close();
        console.log("Browser closed. Success.");

    } catch (error) {
        console.error("Puppeteer Error:", error);
    } finally {
        if (browser) await browser.close();
    }
}

testPuppeteer();
