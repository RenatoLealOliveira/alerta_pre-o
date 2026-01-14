const axios = require('axios');

const API_KEY = 'b31cd72ead4c5d918798f845c319c2e12397a535';

async function runGoogleTests() {
    console.log("🚀 Starting Google Serper.dev API Tests...\n");

    // TEST 1: Standard Search (as provided)
    // Good for general links, but maybe not structured price data
    try {
        console.log("🔹 TEST 1: Standard Search (/search)");
        let data = JSON.stringify({
            "q": "iphone 15 128gb",
            "gl": "br",
            "hl": "pt-br"
        });

        let config = {
            method: 'post',
            url: 'https://google.serper.dev/search',
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        const organic = response.data.organic || [];
        const shopping = response.data.shopping || []; /* Sometimes search returns 'shopping' key */

        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   Organic Results: ${organic.length}`);
        console.log(`   Shopping (Inline) Results: ${shopping.length}`);

        if (shopping.length > 0) {
            console.log("   Example Shopping Item:", JSON.stringify(shopping[0], null, 2));
        } else if (organic.length > 0) {
            console.log("   Example Organic Item:", JSON.stringify(organic[0], null, 2));
        }

    } catch (error) {
        console.log("   ❌ Failed:", error.message);
        if (error.response) console.log("      Data:", error.response.data);
    }

    console.log("\n------------------------------------------------\n");

    // TEST 2: Dedicated Shopping Endpoint (/shopping)
    // Usually gives structured: title, price, store, link, image
    try {
        console.log("🔹 TEST 2: Shopping Search (/shopping)");
        let data = JSON.stringify({
            "q": "iphone 15 128gb",
            "gl": "br",
            "hl": "pt-br"
        });

        let config = {
            method: 'post',
            url: 'https://google.serper.dev/shopping',
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json'
            },
            data: data
        };

        const response = await axios.request(config);
        console.log(`   ✅ Status: ${response.status}`);
        const items = response.data.shopping || [];
        console.log(`   Shopping Results: ${items.length}`);

        if (items.length > 0) {
            console.log("   Example Shopping Item:", JSON.stringify(items[0], null, 2));
        }

    } catch (error) {
        console.log("   ❌ Failed:", error.message);
        if (error.response) console.log("      Data:", error.response.data);
    }
}

runGoogleTests();
