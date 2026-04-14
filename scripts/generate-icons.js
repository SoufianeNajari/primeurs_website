const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../public/icons');

// Création du dossier s'il n'existe pas
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Le SVG de l'icône : un carré vert avec un P blanc au centre
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1D9E75"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-weight="bold" font-size="320" fill="white" text-anchor="middle" dominant-baseline="central">P</text>
</svg>
`;

async function generateIcons() {
  try {
    console.log("Génération de l'icône 192x192...");
    await sharp(Buffer.from(svgIcon))
      .resize(192, 192)
      .png()
      .toFile(path.join(iconsDir, 'icon-192.png'));

    console.log("Génération de l'icône 512x512...");
    await sharp(Buffer.from(svgIcon))
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon-512.png'));

    console.log("✅ Icônes PWA générées avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de la génération des icônes :", error);
  }
}

generateIcons();
