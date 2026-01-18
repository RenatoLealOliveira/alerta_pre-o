async function test() {
    const url = "https://api.mercadolibre.com/sites/MLB/search?q=iphone";
    console.log("Fetching with native fetch:", url);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (macintosh; intel mac os x 10_15_7) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 safari/537.36'
            }
        });
        console.log("Status:", response.status);
        if (!response.ok) {
            console.log("Text:", await response.text());
        } else {
            const data = await response.json();
            console.log("Success! Found:", data.results?.length);
            if (data.results?.length) {
                console.log("First item:", data.results[0].title);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
