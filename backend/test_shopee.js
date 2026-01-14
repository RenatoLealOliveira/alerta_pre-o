const axios = require('axios');

async function runTests() {
    console.log("🚀 Starting Shopee API Tests...\n");

    const commonHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shopee.com.br/',
        'X-Requested-With': 'XMLHttpRequest', // Common AJAX header
        'Af-Ac-Enc-Dat': 'null', // Sometimes required by Shopee, trying null/empty
    };

    // TEST 1: Autosuggest (Usually easier to hit)
    try {
        console.log("🔹 TEST 1: Autosuggest (search_hint)");
        const resHint = await axios.get('https://shopee.com.br/api/v4/search/search_hint', {
            params: { keyword: 'iphone', search_type: 0, version: 1 },
            headers: commonHeaders
        });
        console.log("   ✅ Status:", resHint.status);
        console.log("   DATA:", resHint.data.keywords ? `Found ${resHint.data.keywords.length} hints` : resHint.data);
    } catch (e) {
        console.log("   ❌ Failed:", e.message);
        if (e.response) console.log("      Status:", e.response.status);
    }

    console.log("\n------------------------------------------------\n");

    // TEST 2: Product Search (The one giving 403)
    try {
        console.log("🔹 TEST 2: Product Search (search_items)");
        const resSearch = await axios.get('https://shopee.com.br/api/v4/search/search_items', {
            params: {
                by: 'relevancy',
                keyword: 'iphone',
                limit: 10,
                newest: 0,
                order: 'desc',
                page_type: 'search',
                scenario: 'PAGE_GLOBAL_SEARCH',
                version: 2
            },
            headers: commonHeaders
        });
        console.log("   ✅ Status:", resSearch.status);
        if (resSearch.data.items) {
            console.log("   DATA:", `Found ${resSearch.data.items.length} items`);
        } else {
            console.log("   DATA: 'items' key missing. Keys found:", Object.keys(resSearch.data));
            console.log("   FULL DATA PREVIEW:", JSON.stringify(resSearch.data, null, 2).slice(0, 500));
        }
    } catch (e) {
        console.log("   ❌ Failed:", e.message);
        if (e.response) {
            console.log("      Status:", e.response.status);
            console.log("      Error Data:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

runTests();
