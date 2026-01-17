const puppeteer = require('puppeteer');

async function debugExtraction() {
    console.log("Starting Debug Extraction...");
    let browser;
    try {
        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
        ];

        browser = await puppeteer.launch({
            headless: true,
            args: launchArgs
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        const searchUrl = "https://lista.mercadolivre.com.br/playstation-5";
        console.log(`Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for items
        try {
            await page.waitForSelector('.ui-search-layout__item, .andes-card, li.ui-search-layout__item', { timeout: 10000 });
            console.log("Container items found.");
        } catch (e) {
            console.log("Timeout waiting for selectors.");
        }

        const debugResults = await page.evaluate(() => {
            const items = document.querySelectorAll('.ui-search-layout__item, .andes-card, li.ui-search-layout__item');
            console.log(`Found ${items.length} raw items.`);

            const logs = [];
            const timestamp = new Date().toISOString();

            // Check first 5 items only
            for (let i = 0; i < Math.min(items.length, 5); i++) {
                const item = items[i];
                const itemLog = { index: i };

                // 1. Title
                const titleEl = item.querySelector('.poly-component__title, .ui-search-item__title, h2.ui-search-item__title');
                itemLog.titleFound = !!titleEl;
                itemLog.titleText = titleEl ? titleEl.innerText : 'NULL';
                itemLog.titleClasses = titleEl ? titleEl.className : 'NULL';

                // 2. Link
                const linkEl = item.querySelector('a.poly-component__title, .ui-search-link, .ui-search-item__group__element.ui-search-link');
                itemLog.linkFound = !!linkEl;
                itemLog.linkHref = linkEl ? linkEl.href : 'NULL';

                // 3. Price
                const priceBlock = item.querySelector('.poly-component__price, .ui-search-price');
                itemLog.priceBlockFound = !!priceBlock;

                let priceContainer;
                if (priceBlock) {
                    priceContainer = priceBlock.querySelector('.andes-money-amount:not(.andes-money-amount--previous)');
                }
                if (!priceContainer) {
                    priceContainer = item.querySelector('.ui-search-price__second-line .andes-money-amount');
                }

                itemLog.priceContainerFound = !!priceContainer;
                itemLog.priceText = priceContainer ? priceContainer.innerText : 'NULL';

                // Check for fraction element (Critical for scraper.js)
                let fractionEl = null;
                if (priceContainer) {
                    fractionEl = priceContainer.querySelector('.andes-money-amount__fraction, .price-tag-fraction');
                }
                itemLog.fractionFound = !!fractionEl;
                itemLog.fractionText = fractionEl ? fractionEl.innerText : 'NULL';

                // 4. Strict Match Simulation
                const queryWords = "playstation 5".split(" ");
                if (itemLog.titleText !== 'NULL') {
                    const cleanTitle = itemLog.titleText.toLowerCase();
                    const matches = queryWords.every(w => cleanTitle.includes(w));
                    itemLog.matchesQuery = matches;
                }

                logs.push(itemLog);
            }
            return logs;
        });

        console.log("Extraction Debug Logs:", JSON.stringify(debugResults, null, 2));

    } catch (error) {
        console.error("Puppeteer Error:", error);
    } finally {
        if (browser) await browser.close();
    }
}

debugExtraction();
