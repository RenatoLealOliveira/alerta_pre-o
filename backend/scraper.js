
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

    // --- 2. MERCADO LIVRE STRATEGY (Official API) ---
    if (isMlEnabled) {
        try {
            console.log(`[Scraper] 🔍 Searching ML API for: "${userQuery}"`);

            // Clean query for API
            const cleanQuery = userQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const apiUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(cleanQuery)}&limit=15`;

            const response = await axios.get(apiUrl);
            const items = response.data.results || [];

            console.log(`[Scraper] ✅ ML API found ${items.length} items.`);

            // We want to filter out accessories if possible. 
            // The API returns 'domain_id' or 'category_id' which can help, but keywords are still effective.
            const negativeKeywords = ['capa', 'case', 'pelicula', 'vidro', 'suporte', 'cabo', 'carregador', 'peca', 'peça', 'controle', 'jogo', 'bag', 'bolsa'];

            const mlProducts = items.map(item => {
                const title = item.title;
                const titleLower = title.toLowerCase();

                // Keyword filtering
                if (negativeKeywords.some(k => titleLower.includes(k))) return null;

                // Query matching verification (simple)
                // Split query into significant words and check presence
                const queryWords = cleanQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const matchesAll = queryWords.every(w => titleLower.includes(w));

                // If it doesn't match roughly, we might skip. But ML API is usually good.
                // Let's rely on ML ranking mostly, but filter obvious mismatches if strict mode is needed.
                // For now, let's keep it permissive like the API.

                const price = item.price;
                const link = item.permalink;
                // Use higher res thumbnail if available (API usually returns 'http://http2.mlstatic.com/D_...I.jpg')
                // replace 'I.jpg' with 'W.jpg' or similar often gives better res, but default thumbnail is safe.
                const image = item.thumbnail.replace('http:', 'https:').replace('I.jpg', 'V.jpg'); // Attempt to get slightly better image if possible

                const formattedPrice = price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                return {
                    title,
                    price,
                    formattedPrice,
                    link,
                    image,
                    store: 'Mercado Livre'
                };
            }).filter(p => p !== null);

            allProducts.push(...mlProducts);

        } catch (error) {
            console.error(`[Scraper] ❌ ML API Error: ${error.message}`);
            errors.push(`Mercado Livre API: ${error.message}`);
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
