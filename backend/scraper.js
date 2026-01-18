
const axios = require('axios');

require('dotenv').config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function searchProducts(userQuery, options = {}) {
    // Permissive check: Default to TRUE unless explicitly 'false'
    const isMlEnabled = options.ml !== 'false';
    const isGoogleEnabled = options.google === 'true';

    // Validation: At least one store must be selected
    if (!isMlEnabled && !isGoogleEnabled) {
        throw new Error('Nenhuma loja selecionada.');
    }

    let allProducts = [];
    const errors = [];

    // --- 1. GOOGLE SHOPPING STRATEGY ---
    if (isGoogleEnabled) {
        try {
            console.log(`[Scraper] 🔍 Searching Google Shopping for: "${userQuery}"`);
            const data = JSON.stringify({
                "q": userQuery,
                "gl": "br",
                "hl": "pt-br"
            });

            const config = {
                method: 'post',
                url: 'https://google.serper.dev/shopping',
                headers: {
                    'X-API-KEY': GOOGLE_API_KEY,
                    'Content-Type': 'application/json'
                },
                data: data
            };

            const response = await axios.request(config);
            const items = response.data.shopping || [];

            console.log(`[Scraper] ✅ Google found ${items.length} items.`);

            const googleProducts = items.map(item => {
                // Parse Price: "R$ 4.299,00 agora" -> 4299.00
                // Remove non-numeric characters except comma and dot? 
                // Creating a clean number regex.
                let priceStr = item.price || "";
                // Remove "R$", "agora", spaces
                priceStr = priceStr.toLowerCase().replace("r$", "").replace("agora", "").trim();
                // Replace dot thousands separator with nothing, comma decimal with dot
                // Example: "4.299,00" -> "4299.00"
                // Heuristic: If there are 2 separators, the first is usually thousands.
                // Simple Brazil format parser:
                priceStr = priceStr.replace(/\./g, "").replace(",", ".");

                const price = parseFloat(priceStr);

                // Format cleanly as BRL for display
                const cleanFormattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                return {
                    title: item.title,
                    price: isNaN(price) ? 999999 : price,
                    formattedPrice: !isNaN(price) ? cleanFormattedPrice : (item.price || ""),
                    link: item.link,
                    image: item.imageUrl,
                    store: item.source || 'Google Shopping'
                };
            }).filter(p => !isNaN(p.price) && p.price > 0);

            allProducts.push(...googleProducts);

        } catch (error) {
            console.error(`[Scraper] ❌ Google Error: ${error.message}`);
            errors.push(`Google: ${error.message}`);
        }
    }

    // --- 2. KABUM STRATEGY (PUPPETEER) ---
    if (isMlEnabled) { // Reusing flag for "Main Store"
        let browser;
        try {
            console.log("[Scraper] 🚀 Launching Browser (Kabum Mode)...");

            const puppeteer = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer.use(StealthPlugin());

            const launchConfig = {
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ]
            };

            browser = await puppeteer.launch(launchConfig);
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // --- HUMAN SIMULATION ---
            console.log("[Scraper] 🚶 Visiting Kabum Home...");
            // Use domcontentloaded for speed on Render
            await page.goto('https://www.kabum.com.br/', { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Reduced wait time for Render (it's already slow)
            await new Promise(r => setTimeout(r, 500));

            // Type Query
            console.log(`[Scraper] ⌨️ Typing query: "${userQuery}"`);
            const searchInput = await page.waitForSelector('input#inputBusca', { timeout: 15000 });

            await searchInput.click();
            await searchInput.type(userQuery, { delay: 50 }); // Faster typing
            await page.keyboard.press('Enter');

            console.log("[Scraper] 🔍 Searching...");
            // Increased timeout for search results
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });

            // Wait for products
            try {
                await page.waitForSelector('article.productCard', { timeout: 10000 });
            } catch (e) {
                console.log("[Scraper] ⚠️ Warning: Timeout waiting for product cards.");
            }

            const kabumProducts = await page.evaluate((query) => {
                const cleanText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const queryClean = cleanText(query);
                const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);

                // Select cards - Kabum uses <article> often with class productCard or similar
                // We use a broad selector to catch them
                const items = document.querySelectorAll('article');
                const results = [];

                items.forEach(item => {
                    // Selectors based on inspection
                    const titleEl = item.querySelector('span.nameCard, h3');
                    const linkEl = item.querySelector('a'); // Usually the whole card or a link inside
                    const imageEl = item.querySelector('img.imageCard');
                    const priceEl = item.querySelector('span.priceCard'); // Main price

                    if (titleEl && priceEl && linkEl) {
                        const title = titleEl.innerText || titleEl.textContent;

                        // Strict Match
                        const titleClean = cleanText(title);
                        const matchesAll = queryWords.every(word => {
                            // Simple includes for stability
                            return titleClean.includes(word);
                        });
                        if (!matchesAll) return;

                        // Price Parse: "R$ 4.299,00"
                        const rawPrice = priceEl.innerText.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
                        const price = parseFloat(rawPrice);

                        if (isNaN(price)) return;

                        const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                        // Absolute Link?
                        let link = linkEl.href;
                        if (!link.startsWith('http')) link = 'https://www.kabum.com.br' + link;

                        let image = '';
                        if (imageEl) image = imageEl.src;

                        results.push({
                            title,
                            price,
                            formattedPrice,
                            link,
                            image,
                            store: 'Kabum'
                        });
                    }
                });
                return results;
            }, userQuery);

            if (kabumProducts.length === 0) {
                const debugPage = await page.evaluate(() => ({
                    title: document.title,
                }));
                console.log(`[Scraper] ⚠️ ZERO ITEMS. Title: "${debugPage.title}"`);
            }

            console.log(`[Scraper] ✅ Kabum found ${kabumProducts.length} items.`);
            allProducts.push(...kabumProducts);
            await browser.close();

        } catch (error) {
            console.error(`[Scraper] ❌ Kabum Error: ${error.message}`);
            errors.push(`Kabum: ${error.message}`);
            if (browser) await browser.close();
        }
    }

    // --- 3. SORT AND RETURN CHEAPEST ---
    if (allProducts.length === 0) {
        if (errors.length > 0) throw new Error(errors.join(' | '));
        throw new Error('Nenhum produto encontrado nas lojas selecionadas.');
    }

    // Sort by price (ascending)
    allProducts.sort((a, b) => a.price - b.price);

    const cheapest = allProducts[0];
    console.log(`[Scraper] 🏆 Winner: ${cheapest.title} (${cheapest.formattedPrice}) from ${cheapest.store}`);

    return {
        title: cheapest.title,
        price: cheapest.price, // Return NUMBER, not string
        formattedPrice: cheapest.formattedPrice,
        image: cheapest.image,
        link: cheapest.link,
        store: cheapest.store
    };
}

module.exports = { searchProducts };
