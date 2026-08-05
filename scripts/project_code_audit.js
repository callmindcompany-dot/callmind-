import fs from 'node:fs';
import path from 'node:path';

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.antigravity-ide',
  '.gemini',
  '.vscode',
]);

const KEYWORD_REGEX = /\b(const|let|var|function|return|import|export|from|class|interface|type|async|await|if|else|switch|case|default|for|while|do|try|catch|finally|throw|new|this|super|extends|implements|public|private|protected|static|readonly|enum|as|of|in|instanceof|typeof|void|null|undefined|true|false|boolean|number|string|any|unknown|never|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|INNER|LEFT|RIGHT|OUTER|ON|CREATE|TABLE|DROP|ALTER|INDEX|TRIGGER|FUNCTION|SECURITY|DEFINER|BEGIN|COMMIT|ROLLBACK|POLICY|CONSTRAINT|PRIMARY|KEY|FOREIGN|REFERENCES|CHECK|DEFAULT|NOT|NULL|AND|OR|INTO|VALUES|SET|IF|EXISTS)\b/g;

function auditDirectory(dirPath, stats = {
  totalFiles: 0,
  filesByExt: {},
  totalLines: 0,
  totalWords: 0,
  totalLetters: 0,
  totalDigits: 0,
  totalSymbols: 0,
  totalKeywords: 0,
}) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      auditDirectory(fullPath, stats);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase() || 'no_extension';
      
      // Skip binary/large non-code media files if any
      if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.pdf', '.zip', '.gz'].includes(ext)) {
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf8');

        stats.totalFiles += 1;
        stats.filesByExt[ext] = (stats.filesByExt[ext] || 0) + 1;

        // Lines count
        const lines = content.split('\n').length;
        stats.totalLines += lines;

        // Words count (non-whitespace tokens)
        const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        stats.totalWords += words;

        // Character analysis
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

        stats.totalLetters += letters;
        stats.totalDigits += digits;
        stats.totalSymbols += symbols;

        // Keywords count
        const keywordMatches = content.match(KEYWORD_REGEX);
        if (keywordMatches) {
          stats.totalKeywords += keywordMatches.length;
        }
      } catch (err) {
        // Skip unreadable files silently
      }
    }
  }

  return stats;
}

const rootDir = process.cwd();
console.log(`Starting Codebase Audit for: ${rootDir}...`);

const stats = auditDirectory(rootDir);

console.log("\n==================================================");
console.log("             CALLMIND CODEBASE AUDIT              ");
console.log("==================================================");
console.log(`📁 Total Files scanned      : ${stats.totalFiles.toLocaleString()}`);
console.log(`📜 Total Lines of Code      : ${stats.totalLines.toLocaleString()}`);
console.log(`📝 Total Words              : ${stats.totalWords.toLocaleString()}`);
console.log(`🔤 Total Letters (a-z, A-Z) : ${stats.totalLetters.toLocaleString()}`);
console.log(`🔢 Total Numerical Digits   : ${stats.totalDigits.toLocaleString()}`);
console.log(`⚙️ Total Symbols/Specials   : ${stats.totalSymbols.toLocaleString()}`);
console.log(`🔑 Total Reserved Keywords  : ${stats.totalKeywords.toLocaleString()}`);
console.log("--------------------------------------------------");
console.log("Files breakdown by extension:");
console.table(stats.filesByExt);
console.log("==================================================\n");

// Write audit summary to JSON artifact
fs.writeFileSync(path.join(rootDir, 'scripts', 'audit_results.json'), JSON.stringify(stats, null, 2));
