const { searchProducts } = require('./scraper');

async function testKabum() {
    console.log("Testing Kabum scraper...");
    try {
        // Query from the screenshot
        const query = "Pendrive Altomex Al-u-16 16gb 2.0 Pen Drive Preto";
        // 'ml: true' enables the Kabum strategy in scraper.js
        const result = await searchProducts(query, { google: 'false', ml: 'true' });
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testKabum();
