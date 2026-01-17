const { searchProducts } = require('./scraper');

async function testIntegration() {
    console.log("Testing scraper integration...");
    try {
        // Test only Mercado Livre to isolate the fix
        const result = await searchProducts('playstation 5', { google: 'false', ml: 'true' });
        console.log("Integration Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Integration Error:", error.message);
    }
}

testIntegration();
