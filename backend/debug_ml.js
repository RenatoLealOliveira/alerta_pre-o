const { searchProducts } = require('./scraper');

async function test() {
    try {
        const query = "iphone 15 128gb";
        console.log(`Testing search for: ${query} (Kabum Mode)`);

        const result = await searchProducts(query, { ml: 'true', google: 'false' }); // Test only Kabum

        console.log("Result:", JSON.stringify(result, null, 2));

    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
