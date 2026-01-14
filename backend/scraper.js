const puppeteer = require('puppeteer');
const axios = require('axios');

const GOOGLE_API_KEY = 'b31cd72ead4c5d918798f845c319c2e12397a535';

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

    // --- 2. MERCADO LIVRE STRATEGY (Puppeteer) ---
    if (isMlEnabled) {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                // args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

            let searchUrl = `https://lista.mercadolivre.com.br/${userQuery.replace(/\s+/g, '-')}`;
            console.log(`[Scraper] 🔍 Searching ML: ${searchUrl}`);

            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for items
            try {
                await page.waitForSelector('.ui-search-layout__item, .andes-card, li.ui-search-layout__item', { timeout: 5000 });
            } catch (e) { /* ignore timeout */ }

            const mlProducts = await page.evaluate((query) => {
                const cleanText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const queryClean = cleanText(query);

                const negativeKeywords = ['capa', 'case', 'pelicula', 'vidro', 'suporte', 'cabo', 'carregador', 'peca', 'peça', 'controle', 'jogo', 'bag', 'bolsa'];
                const activeNegativeKeywords = negativeKeywords.filter(k => !queryClean.includes(k));
                const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2 || !isNaN(w));

                const items = document.querySelectorAll('.ui-search-layout__item, .andes-card, li.ui-search-layout__item');
                const results = [];

                items.forEach(item => {
                    // Title Selector
                    const titleEl = item.querySelector('.ui-search-item__title, .poly-component__title, h2');

                    // Link Selector
                    const linkEl = item.querySelector('.ui-search-link, .poly-component__title-link, a');

                    // Image Selector
                    const imageEl = item.querySelector('.ui-search-result-image__element, .poly-component__picture');

                    // Price Container Selector (Look for the selling price container)
                    // CRITICAL: We must avoid the "previous price" (struck through) which often appears first.
                    // 1. Try specific "current price" classes first.
                    // 2. Look for the second line of the price block (standard ML behavior for discounted items).
                    let priceContainer = item.querySelector('.poly-price__current');

                    if (!priceContainer) {
                        priceContainer = item.querySelector('.ui-search-price__second-line');
                    }

                    if (!priceContainer) {
                        // Fallback: Check for a price that is NOT inside an 'original-value' container
                        // This selector looks for a price part that is NOT a strike-through
                        priceContainer = item.querySelector('.ui-search-price__part:not(.ui-search-price__original-value)');
                    }

                    if (!priceContainer) {
                        // Last resort for old layouts
                        priceContainer = item.querySelector('.price-tag-amount');
                    }

                    if (titleEl && priceContainer && linkEl) {
                        const title = titleEl.innerText;
                        const titleClean = cleanText(title);

                        if (activeNegativeKeywords.some(k => titleClean.includes(k))) return;

                        // Strict Match Logic
                        const matchesAllWords = queryWords.every(word => {
                            const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const patterns = [safeWord];
                            if (word.endsWith('s')) patterns.push(safeWord.slice(0, -1));
                            else patterns.push(safeWord + 's');
                            return patterns.some(pattern => new RegExp(`\\b${pattern}\\b`, 'i').test(titleClean));
                        });
                        if (!matchesAllWords) return;

                        // Price Extraction Logic (Fraction + Cents)
                        const fractionEl = priceContainer.querySelector('.andes-money-amount__fraction, .price-tag-fraction');
                        const centsEl = priceContainer.querySelector('.andes-money-amount__cents, .price-tag-cents');

                        if (fractionEl) {
                            const fraction = fractionEl.innerText.replace(/\./g, '');
                            const cents = centsEl ? centsEl.innerText : '00';

                            // Reconstruct full float: "599" + "." + "99" -> 599.99
                            const price = parseFloat(`${fraction}.${cents}`);

                            // Formatted string fallback
                            const formattedPrice = `R$ ${fractionEl.innerText}${centsEl ? ',' + cents : ',00'}`;

                            const link = linkEl.href;
                            let image = '';
                            if (imageEl) image = imageEl.getAttribute('src') || imageEl.getAttribute('data-src') || imageEl.getAttribute('content') || '';

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
                });
                return results;
            }, userQuery);

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
