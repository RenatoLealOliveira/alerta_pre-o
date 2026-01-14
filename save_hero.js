const fs = require('fs');
const path = require('path');

// WSL Path to the uploaded artifact (Source)
// Note: We use the Linux path format because you likely run Node in WSL or Git Bash.
// If this fails on Windows Command Prompt, changed '/mnt/c' to 'C:'
const source = "/mnt/c/Users/Renato/.gemini/antigravity/brain/e3a66af8-f7cd-414f-b535-f85efeaf9006/uploaded_image_1768405869642.png";

// Destination: frontend/public/macbook_hero.png
const dest = path.join(__dirname, 'frontend', 'public', 'macbook_hero.png');

console.log("=================================");
console.log("   RECOVERING HERO IMAGE   ");
console.log("=================================");
console.log("Source:", source);
console.log("Dest:  ", dest);

try {
    const publicDir = path.dirname(dest);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log("Created directory:", publicDir);
    }

    if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        console.log("\n✅ SUCESSO! Imagem copiada.");
        console.log("Pode recarregar o site agora.");
    } else {
        console.error("\n❌ ERRO: Arquivo de origem não encontrado.");
        console.error("Verifique se o caminho abaixo existe:");
        console.error(source);

        // Try fallback for standard Windows path if /mnt/c fails
        const winSource = source.replace('/mnt/c', 'C:').replace(/\//g, '\\');
        if (fs.existsSync(winSource)) {
            console.log("Tentando caminho Windows...");
            fs.copyFileSync(winSource, dest);
            console.log("\n✅ SUCESSO! Imagem copiada (Modo Windows).");
        }
    }
} catch (err) {
    console.error("\n❌ EXCEPTION:", err);
}
console.log("=================================\n");
