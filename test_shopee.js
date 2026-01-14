const axios = require('axios');

async function testShopee() {
    try {
        console.log("Fetching Shopee...");
        const response = await axios.get('https://shopee.com.br/api/v4/search/search_items', {
            params: {
                by: 'relevancy',
                keyword: 'placas 3d adesiva de parede', // Query that failed for user
                limit: 60,
                newest: 0,
                order: 'desc',
                page_type: 'search',
                scenario: 'PAGE_GLOBAL_SEARCH',
                version: 2
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://shopee.com.br/',
                'Accept': 'application/json'
            }
        });

        console.log("Status:", response.status);
        console.log("Items Count:", response.data.items ? response.data.items.length : 'undefined');

        if (response.data.items && response.data.items.length > 0) {
            console.log("First Item:", JSON.stringify(response.data.items[0].item_basic, null, 2));
        } else {
            console.log("Full Data Keys:", Object.keys(response.data));
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) {
            console.log("Data:", error.response.data);
            console.log("Status:", error.response.status);
        }
    }
}

testShopee();
