const axios = require('axios');
require('dotenv').config();

async function testSerper() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error("No GOOGLE_API_KEY found in .env");
        return;
    }

    const query = "site:mercadolivre.com.br iphone 15 128gb";
    console.log(`Testing Serper with query: ${query}`);

    try {
        const config = {
            method: 'post',
            url: 'https://google.serper.dev/shopping',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                "q": query,
                "gl": "br",
                "hl": "pt-br"
            })
        };

        const response = await axios.request(config);
        const items = response.data.shopping || [];

        console.log(`Found ${items.length} items.`);

        items.slice(0, 3).forEach((item, i) => {
            console.log(`[${i}] Source: ${item.source} | Title: ${item.title} | Price: ${item.price}`);
        });

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.error(error.response.data);
    }
}

testSerper();
