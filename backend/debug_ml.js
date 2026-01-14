const axios = require('axios');
const fs = require('fs');

try {
    const url = "https://http2.mlstatic.com/resources/sites/MLB/autosuggest?showFilters=true&limit=6&api_version=2&q=plaistatio";
    console.log("Fetching:", url);
    const response = await axios.get(url);

    console.log("Status:", response.status);
    const data = response.data;

    console.log("Data structure:", JSON.stringify(data, null, 2));

    fs.writeFileSync('debug_output.json', JSON.stringify(data, null, 2));
    console.log("Saved to debug_output.json");

} catch (e) {
    console.error("Error:", e.message);
}
}

test();
