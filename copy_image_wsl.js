const fs = require('fs');
const path = require('path');

// WSL Path to the uploaded artifact
const source = "/mnt/c/Users/Renato/.gemini/antigravity/brain/e3a66af8-f7cd-414f-b535-f85efeaf9006/uploaded_image_1768405869642.png";
// Relative path from project root
const dest = "./frontend/public/macbook_hero.png";

try {
    const publicDir = path.dirname(dest);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log("Created directory:", publicDir);
    }

    // Check if source exists
    if (!fs.existsSync(source)) {
        console.error("Source file not found at:", source);
        // Fallback: try to list the dir to debug
        process.exit(1);
    }

    fs.copyFileSync(source, dest);
    console.log("SUCCESS: Image copied to:", dest);
} catch (err) {
    console.error("FAILURE:", err);
    process.exit(1);
}
