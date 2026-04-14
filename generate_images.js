const fs = require('fs');

// A simple 1x1 grey pixel in base64 (JPEG format)
const greyPixelBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAv//////////////////////EQAv/aAAgBAQABPxA=';
const buffer = Buffer.from(greyPixelBase64, 'base64');

fs.writeFileSync('public/images/hero.jpg', buffer);
fs.writeFileSync('public/images/fruits.jpg', buffer);
fs.writeFileSync('public/images/legumes.jpg', buffer);
fs.writeFileSync('public/images/fromages.jpg', buffer);

console.log("Placeholder images created.");