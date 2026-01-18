const axios = require('axios');

async function testApi() {
    try {
        const query = "iphone 15 128gb";
        const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}`;

        console.log(`Testing API URL: ${url}`);

        const response = await axios.get(url);

        if (response.status === 200) {
            const results = response.data.results;
            console.log(`Success! Found ${results.length} results.`);

            if (results.length > 0) {
                const first = results[0];
                console.log("First item:", {
                    title: first.title,
                    price: first.price,
                    link: first.permalink,
                    thumbnail: first.thumbnail
                });
            }
        }
    } catch (error) {
        console.error("API Error:", error.response ? error.response.status : error.message);
        if (error.response) console.error(error.response.data);
    }
}

testApi();
