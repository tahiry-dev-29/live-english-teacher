#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC_DIR = 'apps/frontend/src';
const FORBIDDEN_PATTERNS = [
  { regex: /\bbg-white\b/, label: 'bg-white' },
  { regex: /\bbg-black\b/, label: 'bg-black' },
  { regex: /bg-\[/, label: 'bg-[' },
  { regex: /\bdark:/, label: 'dark:' },
  { regex: /\btext-gray-/, label: 'text-gray-' },
  { regex: /\bbg-gray-/, label: 'bg-gray-' },
  { regex: /\bfrom-blue\b/, label: 'from-blue' },
  { regex: /\btext-blue\b/, label: 'text-blue' },
];

const VALID_EXTENSIONS = new Set(['.html', '.ts', '.css', '.scss']);

function scanDirectory(dir, errors = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath, errors);
    } else if (stat.isFile() && VALID_EXTENSIONS.has(extname(fullPath))) {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Skip comment lines in TS/CSS if needed
        const trimmed = line.trim();
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*')
        ) {
          return;
        }
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.regex.test(line)) {
            errors.push({
              file: fullPath,
              line: index + 1,
              match: pattern.label,
              content: trimmed,
            });
          }
        }
      });
    }
  }
  return errors;
}

const errors = scanDirectory(SRC_DIR);

if (errors.length > 0) {
  console.error(
    `\x1b[31m[THEME TOKENS ERROR]\x1b[0m Found ${errors.length} forbidden theme tokens in ${SRC_DIR}:`,
  );
  for (const err of errors) {
    console.error(
      `  \x1b[33m${err.file}:${err.line}\x1b[0m - matches '${err.match}': ${err.content}`,
    );
  }
  console.error(
    '\nPlease use semantic daisyUI tokens instead (e.g., bg-base-100, bg-base-content/40, text-base-content, etc.).',
  );
  process.exit(1);
} else {
  console.log(
    '\x1b[32m[THEME TOKENS OK]\x1b[0m All files in ' +
      SRC_DIR +
      ' use valid theme tokens.',
  );
  process.exit(0);
}
