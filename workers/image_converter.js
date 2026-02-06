const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, '../public/media');
const outputDir = path.join(__dirname, '../public/media-webp');

// Zorg dat output directory bestaat
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Recursief converteren
function convertDirToWebp(srcDir, destDir) {
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach(dirent => {
    const srcPath = path.join(srcDir, dirent.name);
    const destPath = path.join(destDir, dirent.name.replace(/\.(jpg|jpeg|png)$/i, '.webp'));

    if (dirent.isDirectory()) {
      // Maak submap aan in output
      if (!fs.existsSync(path.join(destDir, dirent.name))) {
        fs.mkdirSync(path.join(destDir, dirent.name), { recursive: true });
      }
      convertDirToWebp(srcPath, path.join(destDir, dirent.name));
    } else if (dirent.isFile()) {
      const ext = path.extname(dirent.name).toLowerCase();
      if (!['.jpg', '.jpeg', '.png'].includes(ext)) return;

      // Check of het bestand al bestaat
      fs.access(destPath, fs.constants.F_OK, (err) => {
        if (err) {
          sharp(srcPath)
            .toFormat('webp')
            .toFile(destPath)
            .then(() => console.log(`✅ Geconverteerd naar WebP: ${destPath}`))
            .catch(err => console.error(`❌ Fout bij converteren ${srcPath}:`, err));
        }
      });
    }
  });
}

// Initieel: converteer alle bestaande bestanden en mappen
convertDirToWebp(inputDir, outputDir);

// Kijk voor nieuwe bestanden of updates (alleen in root, voor volledige support is een watcher-lib nodig)
fs.watch(inputDir, { recursive: true }, (eventType, filename) => {
  if (filename) {
    const srcPath = path.join(inputDir, filename);
    const destPath = path.join(outputDir, filename.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
    // Wacht heel even om te zorgen dat het bestand volledig is geschreven
    setTimeout(() => {
      if (fs.existsSync(srcPath) && ['.jpg', '.jpeg', '.png'].includes(path.extname(srcPath).toLowerCase())) {
        // Maak submap aan indien nodig
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        sharp(srcPath)
          .toFormat('webp')
          .toFile(destPath)
          .then(() => console.log(`✅ Geconverteerd naar WebP: ${destPath}`))
          .catch(err => console.error(`❌ Fout bij converteren ${srcPath}:`, err));
      }
    }, 100); // 100ms delay
  }
});
