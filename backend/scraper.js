
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

    const promises = [];

    // --- 1. GOOGLE SHOPPING STRATEGY ---
    if (isGoogleEnabled) {
        promises.push((async () => {
            try {
                console.log(`[Scraper] 🔍 Searching Google Shopping for: "${userQuery}"`);
                const data = JSON.stringify({ "q": userQuery, "gl": "br", "hl": "pt-br" });
                const config = {
                    method: 'post',
                    url: 'https://google.serper.dev/shopping',
                    headers: { 'X-API-KEY': GOOGLE_API_KEY, 'Content-Type': 'application/json' },
                    data: data
                };
                const response = await axios.request(config);
                const items = response.data.shopping || [];
                console.log(`[Scraper] ✅ Google found ${items.length} items.`);
                return items.map(item => {
                    let priceStr = item.price || "";
                    priceStr = priceStr.toLowerCase().replace("r$", "").replace("agora", "").trim();
                    priceStr = priceStr.replace(/\./g, "").replace(",", ".");
                    const price = parseFloat(priceStr);
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
            } catch (error) {
                console.error(`[Scraper] ❌ Google Error: ${error.message}`);
                errors.push(`Google: ${error.message}`);
                return [];
            }
        })());
    }

    // --- 2. KABUM STRATEGY (PUPPETEER) ---
    if (isMlEnabled) {
        promises.push((async () => {
            let browser;
            try {
                console.log("[Scraper] 🚀 Launching Browser (Kabum Mode)...");
                const puppeteer = require('puppeteer-extra');
                const StealthPlugin = require('puppeteer-extra-plugin-stealth');
                puppeteer.use(StealthPlugin());

                const launchConfig = {
                    headless: "new",
                    args: [
                        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                        '--disable-gpu', '--no-first-run', '--disable-blink-features=AutomationControlled',
                        '--window-size=1920,1080'
                    ]
                };

                if (process.env.SCRAPEOPS_API_KEY) {
                    launchConfig.args.push('--proxy-server=proxy.scrapeops.io:5353');
                }

                browser = await puppeteer.launch(launchConfig);
                const page = await browser.newPage();

                if (process.env.SCRAPEOPS_API_KEY) {
                    console.log('[Scraper] 🛡️ Using ScrapeOps Proxy');
                    await page.authenticate({ username: 'scrapeops', password: process.env.SCRAPEOPS_API_KEY });
                }

                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                // Block Heavy Assets
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'stylesheet', 'font', 'media', 'other'].includes(req.resourceType())) req.abort();
                    else req.continue();
                });

                const cleanQuery = userQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                const searchUrl = `https://www.kabum.com.br/busca/${cleanQuery}`;
                console.log(`[Scraper] 🔍 Direct Navigation to: ${searchUrl}`);

                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                try {
                    await page.waitForSelector('article, .productCard', { timeout: 20000 });
                } catch (e) {
                    console.log("[Scraper] ⚠️ Warning: Timeout waiting for product cards.");
                }

                const kabumProducts = await page.evaluate((query) => {
                    const cleanText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const queryClean = cleanText(query);
                    const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);
                    const items = document.querySelectorAll('article');
                    const results = [];
                    items.forEach(item => {
                        const titleEl = item.querySelector('span.nameCard, h3');
                        const linkEl = item.querySelector('a');
                        const imageEl = item.querySelector('img.imageCard');
                        const priceEl = item.querySelector('span.priceCard');
                        if (titleEl && priceEl && linkEl) {
                            const title = titleEl.innerText || titleEl.textContent;
                            const titleClean = cleanText(title);
                            const matchesAll = queryWords.every(word => titleClean.includes(word));
                            if (!matchesAll) return;
                            const rawPrice = priceEl.innerText.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
                            const price = parseFloat(rawPrice);
                            if (isNaN(price)) return;
                            const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            let link = linkEl.href;
                            if (!link.startsWith('http')) link = 'https://www.kabum.com.br' + link;
                            let image = '';
                            if (imageEl) image = imageEl.src;
                            results.push({ title, price, formattedPrice, link, image, store: 'Kabum' });
                        }
                    });
                    return results;
                }, userQuery);

                if (kabumProducts.length === 0) {
                    const debug = await page.evaluate(() => document.title);
                    console.log(`[Scraper] ⚠️ ZERO ITEMS. Title: "${debug}"`);
                }

                console.log(`[Scraper] ✅ Kabum found ${kabumProducts.length} items.`);
                await browser.close();
                return kabumProducts;

            } catch (error) {
                console.error(`[Scraper] ❌ Kabum Error: ${error.message}`);
                errors.push(`Kabum: ${error.message}`);
                if (browser) await browser.close();
                return [];
            }
        })());
    }

    // --- 3. WAIT FOR ALL AND MERGE ---
    const results = await Promise.allSettled(promises);

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            allProducts.push(...result.value);
        }
    });

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
