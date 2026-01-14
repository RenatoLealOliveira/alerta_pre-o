const fs = require('fs');
const https = require('https');
const path = require('path');

// URL for a high-quality MacBook Pro Space Black image
// Using a reliable source that allows direct download
const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Apple_MacBook_Pro_14_%282021%29.jpg/800px-Apple_MacBook_Pro_14_%282021%29.jpg";

// Destination path
const destPath = path.join(__dirname, 'frontend', 'public', 'macbook_hero.png');

console.log("Downloading image...");
console.log("URL:", imageUrl);
console.log("Dest:", destPath);

const file = fs.createWriteStream(destPath);

https.get(imageUrl, function (response) {
    if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(() => {
                console.log("\n✅ SUCESSO! Imagem baixada e salva com sucesso.");
                console.log("Pode recarregar o site.");
            });
        });
    } else {
        console.error(`\n❌ Erro ao baixar: Status Code ${response.statusCode}`);
        file.close();
        fs.unlink(destPath, () => { }); // Delete partial file
    }
}).on('error', function (err) {
    fs.unlink(destPath, () => { });
    console.error("\n❌ Erro de conexão:", err.message);
});
