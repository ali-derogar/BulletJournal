import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES = ['en', 'fa'];

function readLocale(locale) {
  const file = path.join(ROOT, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function flattenKeys(obj, prefix = '', out = []) {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      const next = prefix ? `${prefix}.${key}` : key;
      flattenKeys(obj[key], next, out);
    }
    return out;
  }

  out.push(prefix);
  return out;
}

function reportDiff(baseLocale, compareLocale, baseKeys, compareKeys) {
  const missing = [...baseKeys].filter((key) => !compareKeys.has(key));
  if (missing.length === 0) return 0;

  console.error(`\nMissing keys in ${compareLocale} (present in ${baseLocale}): ${missing.length}`);
  for (const key of missing) {
    console.error(`- ${key}`);
  }

  return missing.length;
}

const localeMaps = new Map();
for (const locale of LOCALES) {
  localeMaps.set(locale, readLocale(locale));
}

const keySets = new Map();
for (const [locale, messages] of localeMaps) {
  keySets.set(locale, new Set(flattenKeys(messages)));
}

let missingCount = 0;
for (let i = 0; i < LOCALES.length; i += 1) {
  for (let j = 0; j < LOCALES.length; j += 1) {
    if (i === j) continue;
    const from = LOCALES[i];
    const to = LOCALES[j];
    missingCount += reportDiff(from, to, keySets.get(from), keySets.get(to));
  }
}

if (missingCount > 0) {
  console.error(`\ni18n key parity check failed with ${missingCount} missing key(s).`);
  process.exit(1);
}

console.log('i18n key parity check passed.');
