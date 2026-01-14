const fs = require('fs');
const path = require('path');

const source = "C:/Users/Renato/.gemini/antigravity/brain/e3a66af8-f7cd-414f-b535-f85efeaf9006/uploaded_image_1768405869642.png";
const dest = "e:/alerta preço/frontend/public/macbook_hero.png";

try {
    // Ensure directory exists
    const publicDir = path.dirname(dest);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.copyFileSync(source, dest);
    console.log("Image copied successfully to:", dest);
} catch (err) {
    console.error("Error copying file:", err);
    process.exit(1);
}
