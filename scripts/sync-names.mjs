// Synkkaa `PEOPLE`-listan nimet public/app.js:stä firestore.rules:n
// `allowedName`-funktioon, jotta Firestore hylkää kaikki muut doc-ID:t.
//
// Käyttö (repo-juuressa):
//   node scripts/sync-names.mjs
//
// Aja aina kun lisäät, poistat tai uudelleennimeät henkilöitä PEOPLE-listassa.
// Sen jälkeen: firebase deploy --only firestore:rules --project ristiaiset-2026

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const appJsPath = resolve(root, "public/app.js");
const rulesPath = resolve(root, "firestore.rules");

const appJs = await readFile(appJsPath, "utf8");

const peopleMatch = appJs.match(/const\s+PEOPLE\s*=\s*\[([\s\S]*?)\];/);
if (!peopleMatch) {
  console.error("PEOPLE-lista ei löytynyt public/app.js:stä.");
  process.exit(1);
}

const names = [...peopleMatch[1].matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
if (!names.length) {
  console.error("PEOPLE-listasta ei löytynyt yhtään nimeä.");
  process.exit(1);
}

// Lajittele fi-locale-aakkosjärjestyksessä ja poista duplikaatit.
const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b, "fi"));
if (unique.length !== names.length) {
  console.warn(`Varoitus: PEOPLE-listassa ${names.length - unique.length} duplikaattinimeä.`);
}

// Muotoile listaus rules-blokkiin (4 nimeä per rivi).
const chunkSize = 4;
const lines = [];
for (let i = 0; i < unique.length; i += chunkSize) {
  const chunk = unique.slice(i, i + chunkSize).map(n => `'${n}'`).join(", ");
  const isLast = i + chunkSize >= unique.length;
  lines.push(`        ${chunk}${isLast ? "" : ","}`);
}

const allowedBlock = `    function allowedName(name) {
      return name in [
${lines.join("\n")}
      ];
    }`;

const rules = await readFile(rulesPath, "utf8");
const allowedRe = /    function allowedName\(name\) \{[\s\S]*?\n    \}/;
if (!allowedRe.test(rules)) {
  console.error("allowedName-funktiota ei löytynyt firestore.rules:sta.");
  process.exit(1);
}

const updated = rules.replace(allowedRe, allowedBlock);
if (updated === rules) {
  console.log(`firestore.rules jo ajan tasalla (${unique.length} nimeä).`);
  process.exit(0);
}

await writeFile(rulesPath, updated, "utf8");
console.log(`Synkattu ${unique.length} nimeä PEOPLE → firestore.rules.`);
console.log("Muista deployata: firebase deploy --only firestore:rules --project ristiaiset-2026");
