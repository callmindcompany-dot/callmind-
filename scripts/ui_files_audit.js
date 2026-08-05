import fs from 'node:fs';
import path from 'node:path';

const UI_EXTENSIONS = new Set(['.tsx', '.jsx']);
const SRC_DIR = path.join(process.cwd(), 'src');

function scanUiFiles(dirPath, stats = {
  totalUiFiles: 0,
  filesByFolder: {},
  totalLines: 0,
  totalWords: 0,
  totalLetters: 0,
  totalDigits: 0,
  totalSymbols: 0,
  fileList: [],
}) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanUiFiles(fullPath, stats);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (UI_EXTENSIONS.has(ext)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relFolder = path.relative(SRC_DIR, path.dirname(fullPath)) || 'root';

          stats.totalUiFiles += 1;
          stats.filesByFolder[relFolder] = (stats.filesByFolder[relFolder] || 0) + 1;

          const lines = content.split('\n').length;
          const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;

          let letters = 0;
          let digits = 0;
          let symbols = 0;

          for (let i = 0; i < content.length; i++) {
            const ch = content[i];
            if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
              letters += 1;
            } else if (ch >= '0' && ch <= '9') {
              digits += 1;
            } else if (!/\s/.test(ch)) {
              symbols += 1;
            }
          }

          stats.totalLines += lines;
          stats.totalWords += words;
          stats.totalLetters += letters;
          stats.totalDigits += digits;
          stats.totalSymbols += symbols;

          stats.fileList.push({
            name: entry.name,
            folder: relFolder,
            lines,
            words,
            sizeBytes: content.length,
          });
        } catch (err) {
          // Ignore unreadable
        }
      }
    }
  }

  return stats;
}

console.log("Starting UI Components Audit for src/...");
const uiStats = scanUiFiles(SRC_DIR);

// Sort files by line count to see largest UI components
uiStats.fileList.sort((a, b) => b.lines - a.lines);

console.log("\n==================================================");
console.log("           CALLMIND UI COMPONENTS AUDIT           ");
console.log("==================================================");
console.log(`🎨 Total UI Files (.tsx / .jsx) : ${uiStats.totalUiFiles.toLocaleString()}`);
console.log(`📜 Total Lines of UI Code       : ${uiStats.totalLines.toLocaleString()}`);
console.log(`📝 Total Words in UI Code       : ${uiStats.totalWords.toLocaleString()}`);
console.log(`🔤 Total Letters (a-z, A-Z)     : ${uiStats.totalLetters.toLocaleString()}`);
console.log(`🔢 Total Numerical Digits       : ${uiStats.totalDigits.toLocaleString()}`);
console.log(`⚙️ Total Symbols & JSX Tags     : ${uiStats.totalSymbols.toLocaleString()}`);
console.log("--------------------------------------------------");
console.log("UI Components Distribution by Folder:");
console.table(uiStats.filesByFolder);

console.log("Top 10 Largest UI Component Files (by Lines of Code):");
console.table(uiStats.fileList.slice(0, 10));
console.log("==================================================\n");

fs.writeFileSync(path.join(process.cwd(), 'scripts', 'ui_audit_results.json'), JSON.stringify(uiStats, null, 2));
