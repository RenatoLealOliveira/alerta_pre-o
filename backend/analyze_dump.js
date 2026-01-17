const fs = require('fs');
const path = require('path');

// Naive HTML parser / finder since we don't want to install cheerio just for this if not needed
// But we can use regex to find the first product card
const html = fs.readFileSync('ml_dump.html', 'utf8');

console.log("File read. Length:", html.length);

// Find first occurrence of "poly-card"
const cardStart = html.indexOf('poly-card');
if (cardStart === -1) {
    console.log("No poly-card found!");
} else {
    // Extract a chunk around it
    // Try to find the closing tag? It's hard with regex.
    // Let's just grab 2000 characters context
    console.log("--- POLY CARD CONTEXT ---");
    const snippet = html.substring(Math.max(0, cardStart - 100), cardStart + 2000);
    console.log(snippet);
}

// Also check for "ui-search-layout__item"
const layoutStart = html.indexOf('ui-search-layout__item');
if (layoutStart !== -1) {
    console.log("\n--- UI SEARCH LAYOUT ITEM CONTEXT ---");
    const snippet = html.substring(Math.max(0, layoutStart - 100), layoutStart + 2000);
    console.log(snippet);
}
