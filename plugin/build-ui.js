/**
 * Build script: inlines ui.js into ui.html as a single distributable file.
 * Run after esbuild has compiled ui.tsx → dist/ui.js
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const htmlPath = path.join(__dirname, 'src', 'ui.html');
const jsPath = path.join(distDir, 'ui.js');
const outPath = path.join(distDir, 'ui.html');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

// Replace <script src="ui.js"></script> with inline script
const result = html.replace(
  '<script src="ui.js"></script>',
  `<script>${js}</script>`
);

fs.writeFileSync(outPath, result);
console.log('✓ ui.html built with inlined JS →', outPath);
