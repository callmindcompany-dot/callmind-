import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'imges');
const destDir = path.join(__dirname, 'public', 'ui-images');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png'));
console.log(`Found ${files.length} images in imges folder.`);

files.forEach((file, index) => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(destDir, `ui-img-${index + 1}.png`);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${file} -> ui-img-${index + 1}.png`);
});

console.log('All UI images copied successfully!');
