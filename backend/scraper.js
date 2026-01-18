
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

    // --- 2. MERCADO LIVRE STRATEGY (PUPPETEER - DOCKER READY) ---
    if (isMlEnabled) {
        let browser;
        try {
            console.log("[Scraper] 🚀 Launching Browser...");

            const puppeteer = require('puppeteer-extra');
            const StealthPlugin = require('puppeteer-extra-plugin-stealth');
            puppeteer.use(StealthPlugin());

            // Standard launch options for Docker/Render
            // The Dockerfile env var PUPPETEER_EXECUTABLE_PATH handles the chrome path
            const launchConfig = {
                headless: "new",
                args: [
                    '--no-sandbox', // Critical for Docker/Root
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // Critical for Docker memory
                    '--disable-gpu',
                    '--no-first-run',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ]
            };

            browser = await puppeteer.launch(launchConfig);
            const page = await browser.newPage();

            // Shared Stealth Headers
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // --- HUMAN SIMULATION FLOW ---
            // 1. Go to Home Page first (creates session/cookies)
            console.log("[Scraper] 🚶 Visiting Home Page first...");
            await page.goto('https://www.mercadolivre.com.br/', { waitUntil: 'domcontentloaded', timeout: 30000 });

            // 2. Wait a bit (Human think time)
            await new Promise(r => setTimeout(r, 2000));

            // 3. Handle Cookie Consent (if any)
            try {
                const cookieBtn = await page.$('button[data-testid="action:understood-button"], button.cookie-consent-banner-opt-out__action--key-accept');
                if (cookieBtn) {
                    console.log("[Scraper] 🍪 Clicking Cookie Consent...");
                    await cookieBtn.click();
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (e) {
                // Ignore cookie errors
            }

            // 4. Type Query in Search Bar
            console.log(`[Scraper] ⌨️ Typing query: "${userQuery}"`);
            const searchInput = await page.waitForSelector('input.nav-search-input', { timeout: 10000 });

            // Clear existing text if any (focus and select all)
            await searchInput.click({ clickCount: 3 });
            await searchInput.type(userQuery, { delay: 100 }); // Slow typing like human

            // 5. Submit Search form
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
                searchInput.press('Enter')
            ]);

            // Clean query (Just for logging/fallback, not used for navigation anymore)
            const cleanQuery = userQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            let searchUrl = page.url();

            console.log(`[Scraper] 🔍 Landed on Search Page: ${searchUrl}`);

            try {
                // Wait for any relevant content
                await page.waitForSelector('.poly-card, .ui-search-layout__item, .andes-card', { timeout: 8000 });
            } catch (e) {
                console.log("[Scraper] ⚠️ Warning: Timeout waiting for selectors.");
            }

            const mlProducts = await page.evaluate((query) => {
                const cleanText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const queryClean = cleanText(query);
                const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);

                const negativeKeywords = ['capa', 'case', 'pelicula', 'vidro', 'suporte', 'cabo', 'peca', 'pecas'];

                const items = document.querySelectorAll('.ui-search-layout__item, .poly-card, .andes-card, li.ui-search-layout__item');
                const results = [];

                items.forEach(item => {
                    const titleEl = item.querySelector('.poly-component__title, .ui-search-item__title, h2.ui-search-item__title, .poly-component__title-wrapper');
                    const linkEl = item.querySelector('a.poly-component__title, .ui-search-link, a.ui-search-item__group__element');
                    const imageEl = item.querySelector('.poly-component__picture, .ui-search-result-image__element, img');

                    let priceContainer;
                    const priceBox = item.querySelector('.poly-component__price, .ui-search-price, .poly-price__current');
                    if (priceBox) priceContainer = priceBox.querySelector('.andes-money-amount:not(.andes-money-amount--previous)');
                    if (!priceContainer) priceContainer = item.querySelector('.price-tag-amount');

                    if (titleEl && priceContainer && linkEl) {
                        const title = titleEl.innerText || titleEl.textContent;
                        const titleClean = cleanText(title);

                        if (negativeKeywords.some(k => titleClean.includes(k))) return;

                        // Strict Word Match
                        const matchesAll = queryWords.every(word => {
                            const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            return titleClean.includes(word);
                        });
                        if (!matchesAll) return;

                        const rawPrice = priceContainer.innerText.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
                        const price = parseFloat(rawPrice);

                        if (isNaN(price)) return;

                        const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const link = linkEl.href;
                        let image = '';
                        if (imageEl) image = imageEl.getAttribute('src') || imageEl.getAttribute('data-src') || '';

                        results.push({
                            title,
                            price,
                            formattedPrice,
                            link,
                            image,
                            store: 'Mercado Livre'
                        });
                    }
                });
                return results;
            }, userQuery);

            if (mlProducts.length === 0) {
                const debugPage = await page.evaluate(() => ({
                    title: document.title,
                    text: document.body.innerText.substring(0, 200),
                    html_len: document.body.innerHTML.length
                }));
                console.log(`[Scraper] ⚠️ ZERO ITEMS. Page Title: "${debugPage.title}"`);
                console.log(`[Scraper] ⚠️ Page Start: "${debugPage.text.replace(/\n/g, ' ')}..."`);
            }

            console.log(`[Scraper] ✅ ML found ${mlProducts.length} items.`);
            allProducts.push(...mlProducts);
            await browser.close();

        } catch (error) {
            console.error(`[Scraper] ❌ ML Error: ${error.message}`);
            errors.push(`Mercado Livre: ${error.message}`);
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
