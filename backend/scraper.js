
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

    // --- 2. MERCADO LIVRE STRATEGY (PUPPETEER) ---
    if (isMlEnabled) {
        promises.push((async () => {
            let browser;
            try {
                console.log("[Scraper] 🚀 Launching Browser (Mercado Livre Mode)...");
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

                const cleanQuery = userQuery.replace(/\s+/g, '-');
                const searchUrl = `https://lista.mercadolivre.com.br/${cleanQuery}`;
                console.log(`[Scraper] 🔍 Direct Navigation to: ${searchUrl}`);

                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                try {
                    await page.waitForSelector('.ui-search-layout__item, .andes-card, li.ui-search-layout__item', { timeout: 20000 });
                } catch (e) {
                    console.log("[Scraper] ⚠️ Warning: Timeout waiting for product cards.");
                }

                const mlProducts = await page.evaluate((query) => {
                    const cleanText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const items = document.querySelectorAll('.ui-search-layout__item, .andes-card, li.ui-search-layout__item');
                    const results = [];

                    items.forEach(item => {
                        // Title
                        const titleEl = item.querySelector('.poly-component__title, .ui-search-item__title, h2.ui-search-item__title');
                        // Link
                        const linkEl = item.querySelector('a.poly-component__title, .ui-search-link, .ui-search-item__group__element.ui-search-link');
                        // Image
                        const imageEl = item.querySelector('.poly-component__picture, img.ui-search-result-image__element');
                        // Price
                        const priceBlock = item.querySelector('.poly-component__price, .ui-search-price');

                        if (titleEl && priceBlock && linkEl) {
                            const title = titleEl.innerText || titleEl.textContent;

                            // Simple price extraction (ignoring previous price)
                            let priceContainer = priceBlock.querySelector('.andes-money-amount:not(.andes-money-amount--previous)');
                            if (!priceContainer) {
                                // Fallback
                                priceContainer = item.querySelector('.ui-search-price__second-line .andes-money-amount');
                            }

                            if (priceContainer) {
                                // Extract price parts
                                const currencySymbol = priceContainer.querySelector('.andes-money-amount__currency-symbol')?.innerText || 'R$';
                                const integerPart = priceContainer.querySelector('.andes-money-amount__fraction')?.innerText || '0';
                                const centsPart = priceContainer.querySelector('.andes-money-amount__cents')?.innerText || '00';

                                const rawPrice = integerPart.replace(/\./g, '') + '.' + centsPart;
                                const price = parseFloat(rawPrice);

                                if (!isNaN(price)) {
                                    const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                                    let link = linkEl.href;
                                    let image = '';
                                    if (imageEl) {
                                        // Prioritize src, then data-src for lazy loading
                                        image = imageEl.getAttribute('src') || imageEl.getAttribute('data-src') || '';
                                    }

                                    results.push({
                                        title,
                                        price,
                                        formattedPrice,
                                        link,
                                        image,
                                        store: 'Mercado Livre'
                                    });
                                }
                            }
                        }
                    });

                    // Simple text match filter on backend side or scraping side (optional, but good for relevance)
                    // Checking if at least one word from query exists in title
                    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
                    return results.filter(r => {
                        const t = r.title.toLowerCase();
                        return queryWords.some(w => t.includes(w));
                    });

                }, userQuery);

                if (mlProducts.length === 0) {
                    const debug = await page.evaluate(() => document.title);
                    console.log(`[Scraper] ⚠️ ZERO ITEMS. Title: "${debug}"`);
                }

                console.log(`[Scraper] ✅ Mercado Livre found ${mlProducts.length} items.`);
                await browser.close();
                return mlProducts;

            } catch (error) {
                console.error(`[Scraper] ❌ Mercado Livre Error: ${error.message}`);
                errors.push(`Mercado Livre: ${error.message}`);
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
