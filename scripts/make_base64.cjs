const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../fund/public/logo.png');
const outPath = path.join(__dirname, '../fund/src/assets/logoBase64.ts');

const buf = fs.readFileSync(pngPath);
const b64 = buf.toString('base64');
const content = `export const LOGO_PNG_BASE64 = 'data:image/png;base64,${b64}';\n`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Successfully generated logoBase64.ts, size:', b64.length);
