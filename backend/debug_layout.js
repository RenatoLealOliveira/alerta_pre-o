const puppeteer = require('puppeteer');
const fs = require('fs');

async function debugLayout() {
    console.log("Starting Layout Debugger...");
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

        const searchUrl = "https://lista.mercadolivre.com.br/playstation-5-slim";
        console.log(`Navigating to: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit for dynamic content
        await new Promise(r => setTimeout(r, 2000));

        // Analyze selectors
        const analysis = await page.evaluate(() => {
            const items_layout = document.querySelectorAll('.ui-search-layout__item').length;
            const items_poly = document.querySelectorAll('.poly-card').length;
            const items_andes = document.querySelectorAll('.andes-card').length;
            const items_li = document.querySelectorAll('li.ui-search-layout__item').length;

            return { items_layout, items_poly, items_andes, items_li };
        });

        console.log("--- DOM Analysis ---");
        console.log(JSON.stringify(analysis, null, 2));

        // Save HTML for review
        const html = await page.content();
        fs.writeFileSync('ml_dump.html', html);
        console.log("HTML dump saved to 'ml_dump.html'");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        if (browser) await browser.close();
    }
}

debugLayout();
