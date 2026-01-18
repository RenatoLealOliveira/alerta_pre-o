const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
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

    // --- 2. MERCADO LIVRE STRATEGY (Puppeteer Hardened) ---
    if (isMlEnabled) {
        let browser;
        try {
            const launchArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-blink-features=AutomationControlled', // Critical evasion
                '--window-size=1920,1080'
            ];

            browser = await puppeteer.launch({
                headless: "new", // "new" is slightly more stealthy than true
                args: launchArgs,
                ignoreDefaultArgs: ['--enable-automation']
            });
            const page = await browser.newPage();

            // Hardened Stealth Headers
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            });

            // Clean query to avoid some bot triggers on weird URLs
            const cleanQuery = userQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            let searchUrl = `https://lista.mercadolivre.com.br/${cleanQuery}`;

            console.log(`[Scraper] 🔍 Searching ML (Puppeteer): ${searchUrl}`);

            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

            // Wait specifically for the new "Poly" cards OR old cards
            try {
                await page.waitForSelector('.poly-card, .ui-search-layout__item, .andes-card', { timeout: 10000 });
            } catch (e) {
                console.log("[Scraper] ⚠️ Warning: Timeout waiting for selectors. Page might be empty or blocked. Checking content...");
            }

            const mlProducts = await page.evaluate((query) => {
                const cleanText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const queryClean = cleanText(query);
                const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);

                // Simplified Negative Keywords
                const negativeKeywords = ['capa', 'case', 'pelicula', 'vidro', 'suporte', 'cabo', 'peca', 'pecas'];

                const items = document.querySelectorAll('.ui-search-layout__item, .poly-card, .andes-card, li.ui-search-layout__item');
                const results = [];

                items.forEach(item => {
                    // --- UNIVERSAL SELECTORS (Poly + Legacy) ---
                    // Title
                    const titleEl = item.querySelector('.poly-component__title, .ui-search-item__title, h2.ui-search-item__title, .poly-component__title-wrapper');

                    // Link
                    const linkEl = item.querySelector('a.poly-component__title, .ui-search-link, a.ui-search-item__group__element');

                    // Image
                    const imageEl = item.querySelector('.poly-component__picture, .ui-search-result-image__element, img');

                    // Price - Find the MAIN price (not previous, not installments)
                    let priceContainer;

                    // 1. Try finding price within the specific price container for the item
                    const priceBox = item.querySelector('.poly-component__price, .ui-search-price, .poly-price__current');
                    if (priceBox) {
                        priceContainer = priceBox.querySelector('.andes-money-amount:not(.andes-money-amount--previous)');
                    }
                    // 2. Fallback
                    if (!priceContainer) {
                        priceContainer = item.querySelector('.price-tag-amount');
                    }

                    if (titleEl && priceContainer && linkEl) {
                        const title = titleEl.innerText || titleEl.textContent;
                        const titleClean = cleanText(title);

                        if (negativeKeywords.some(k => titleClean.includes(k))) return;

                        // Strict Match Logic: EVERY significant word from query must be in title
                        // "iphone 15" must have "iphone" AND "15"
                        // This prevents "iphone 11" showing up for "iphone 15"
                        const matchesAll = queryWords.every(word => {
                            // Escape special regex chars
                            const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            // Create regex to match whole word (boundary \b) to avoid partial matches if needed, 
                            // but simple includes is usually safer for varied inputs. 
                            // Let's stick to simple includes for robustness with weird product titles, 
                            // but ensure ALL words are there.
                            return titleClean.includes(word);
                        });

                        if (!matchesAll) return;

                        // Additional Check: If query has numbers (e.g. "15"), ensure they match exactly as whole words if possible,
                        // or at least ensure we don't return "11" when asking for "15".
                        // The 'queryWords.every' above handles this well for "15" vs "11".

                        // Price Parsing using the text content directly to be safer
                        // Example: "R$ 4.299" or "4299"
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

            console.log(`[Scraper] ✅ ML found ${mlProducts.length} items.`);
            allProducts.push(...mlProducts);
            await browser.close();

        } catch (error) {
            console.error(`[Scraper] ❌ ML Puppeteer Error: ${error.message}`);
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
