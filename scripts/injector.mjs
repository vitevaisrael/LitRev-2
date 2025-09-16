#!/usr/bin/env node
// Lightweight injector for idempotent import and JSX insertion.
// Usage:
//   node scripts/injector.mjs \
//     --file packages/web/src/App.tsx \
//     --import "./global/GlobalDock" \
//     --symbol GlobalDock \
//     --after "</Routes>" \
//     --jsx "<GlobalDock />"

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

function insertImport(content, symbol, importPath) {
  const already = content.includes(`from "${importPath}"`) || content.includes(`from '${importPath}'`);
  if (already) return { content, changed: false };
  const importLine = `import { ${symbol} } from "${importPath}";`;
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s.+from\s+["'].+["'];?\s*$/.test(lines[i])) lastImportIdx = i;
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
    return { content: lines.join('\n'), changed: true };
  }
  return { content: importLine + '\n' + content, changed: true };
}

function insertJsxAfter(content, anchor, jsx) {
  if (content.includes(jsx)) return { content, changed: false };
  const idx = content.indexOf(anchor);
  if (idx === -1) return { content, changed: false, missing: true };
  const before = content.slice(0, idx + anchor.length);
  const after = content.slice(idx + anchor.length);
  const injection = `\n            ${jsx}\n`;
  return { content: before + injection + after, changed: true };
}

(function main() {
  const args = parseArgs(process.argv);
  const file = args.file;
  const importPath = args.import;
  const symbol = args.symbol;
  const anchor = args.after || '</Routes>';
  const jsx = args.jsx;

  if (!file || !importPath || !symbol || !jsx) {
    console.error('Usage error: --file <path> --import <path> --symbol <Name> --jsx <JSX> [--after "</Routes>"]');
    process.exit(1);
  }

  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }

  let src = fs.readFileSync(abs, 'utf8');
  let changed = false;

  const imp = insertImport(src, symbol, importPath);
  src = imp.content; changed = changed || imp.changed;

  const inj = insertJsxAfter(src, anchor, jsx);
  if (inj.missing) {
    console.log('ℹ Anchor not found; no JSX injection performed.');
  } else {
    src = inj.content; changed = changed || inj.changed;
  }

  if (changed) {
    fs.writeFileSync(abs, src);
    console.log('✓ Injection applied:', path.relative(process.cwd(), abs));
  } else {
    console.log('ℹ No changes (already up to date):', path.relative(process.cwd(), abs));
  }
})();

