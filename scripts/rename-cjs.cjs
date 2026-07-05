#!/usr/bin/env node
/*
 * Post-processes the CommonJS build so it is a valid CommonJS package regardless
 * of the root package.json "type": "module" setting:
 *   1. Renames every emitted .js file under dist/cjs to .cjs.
 *   2. Rewrites intra-package require("./x.js") calls in those files to
 *      require("./x.cjs") so Node's CJS resolver finds them.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'dist', 'cjs');

if (!fs.existsSync(dir)) {
  console.error(`rename-cjs: ${dir} does not exist`);
  process.exit(1);
}

const jsFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

// First rename all .js -> .cjs (and .js.map -> .cjs.map if present).
for (const file of jsFiles) {
  const base = file.slice(0, -'.js'.length);
  fs.renameSync(path.join(dir, file), path.join(dir, base + '.cjs'));
  const map = path.join(dir, file + '.map');
  if (fs.existsSync(map)) {
    fs.renameSync(map, path.join(dir, base + '.cjs.map'));
  }
}

// Then rewrite require("./x.js") -> require("./x.cjs") and sourceMappingURL
// comments inside the renamed files.
const cjsFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.cjs'));

for (const file of cjsFiles) {
  const full = path.join(dir, file);
  const original = fs.readFileSync(full, 'utf8');
  let updated = original.replace(
    /(require\(\s*["'])(\.\.?\/[^"']+?)\.js(["']\s*\))/g,
    '$1$2.cjs$3'
  );
  updated = updated.replace(
    /(sourceMappingURL=\S+?)\.js\.map/g,
    '$1.cjs.map'
  );
  if (updated !== original) {
    fs.writeFileSync(full, updated);
  }
}
