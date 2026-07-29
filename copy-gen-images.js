import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brainDir = path.join('C:', 'Users', 'vrushabh', '.gemini', 'antigravity-ide', 'brain', '779dcca0-d499-42a1-9c67-d32a07661b4c');
const destDir = path.join(__dirname, 'public', 'ui-images');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const mapping = {
  'web_ui_dashboard_1785327225238.png': 'web-ui-1.png',
  'web_ui_webhooks_1785327242594.png': 'web-ui-2.png',
  'web_ui_analytics_1785327262589.png': 'web-ui-3.png',
  'web_ui_gst_invoice_1785327280269.png': 'web-ui-4.png',
  'mobile_ui_dashboard_1785327298673.png': 'mobile-ui-1.png',
  'mobile_ui_dialing_1785327321445.png': 'mobile-ui-2.png',
  'mobile_ui_disposition_1785327338627.png': 'mobile-ui-3.png',
  'mobile_ui_history_1785327355314.png': 'mobile-ui-4.png',
};

Object.entries(mapping).forEach(([srcFile, destName]) => {
  const srcPath = path.join(brainDir, srcFile);
  const destPath = path.join(destDir, destName);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${srcFile} -> ${destName}`);
  } else {
    console.error(`Source file not found: ${srcPath}`);
  }
});

console.log('All custom generated UI images copied successfully!');
