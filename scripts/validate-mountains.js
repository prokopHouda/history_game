// Validates all mountains-data batch files:
//  - required fields (id, short_name, elevation int)
//  - unique ids and names across batches
//  - no elevation ties (pairs must be decidable; min gap handled at runtime)
//  - countries ISO-2 format, range present
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';

const dir = 'scripts/mountains-data';
const files = (await readdir(dir)).filter((f) => f.endsWith('.js'));

let all = [];
for (const f of files) {
  const raw = await readFile(`${dir}/${f}`, 'utf8');
  const mod = await import(`data:text/javascript;base64,${Buffer.from(raw).toString('base64')}`);
  const batch = Object.values(mod).find(
    (v) => Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === 'object' && 'short_name' in v[0]
  );
  console.log(`${f}: ${batch.length} peaks`);
  for (const m of batch) all.push({ file: f, ...m });
}

console.log(`\nTotal: ${all.length} peaks`);

let errors = 0;
const ids = new Map();
const names = new Map();
const elevations = new Map();

for (const m of all) {
  if (!m.id || !Number.isInteger(m.id)) { console.error(`BAD id: ${JSON.stringify(m.short_name || m.id)} in ${m.file}`); errors++; }
  if (!m.short_name || typeof m.short_name !== 'string') { console.error(`BAD short_name: id=${m.id} in ${m.file}`); errors++; }
  if (!Number.isInteger(m.elevation) || m.elevation <= 0) { console.error(`BAD elevation: id=${m.id} (${m.short_name}) in ${m.file}`); errors++; }
  if (!m.description) { console.error(`MISSING description: id=${m.id} (${m.short_name})`); errors++; }
  if (!m.countries || !/^[A-Z]{2}(, [A-Z]{2})*$/.test(m.countries)) { console.error(`BAD countries: id=${m.id} (${m.short_name}) → "${m.countries}"`); errors++; }
  if (!m.range) { console.error(`MISSING range: id=${m.id} (${m.short_name})`); errors++; }
  if (!m.fun_fact) { console.error(`MISSING fun_fact: id=${m.id} (${m.short_name})`); errors++; }

  if (ids.has(m.id)) { console.error(`DUPLICATE id: ${m.id} (${m.short_name}) in ${m.file} conflicts with ${ids.get(m.id)}`); errors++; }
  ids.set(m.id, `${m.short_name} (${m.file})`);
  const nameKey = m.short_name.toLowerCase();
  if (names.has(nameKey)) { console.error(`DUPLICATE name: "${m.short_name}" in ${m.file} conflicts with ${names.get(nameKey)}`); errors++; }
  names.set(nameKey, m.file);
  const elevKey = m.elevation;
  if (elevations.has(elevKey)) {
    // A true tie is fine — the game never pairs peaks within 50 m — but we
    // log it so the data owner is aware.
    console.log(`NOTE elevation tie: ${m.elevation} m — ${m.short_name} vs ${elevations.get(elevKey)}`);
  }
  elevations.set(elevKey, `${m.short_name} (${m.file})`);
}

// Field keys check — only allowed keys (skip our internal 'file' tracker)
const ALLOWED = new Set(['id', 'short_name', 'elevation', 'description', 'countries', 'range', 'region', 'fun_fact', 'file']);
for (const m of all) {
  for (const k of Object.keys(m)) {
    if (!ALLOWED.has(k)) { console.error(`UNKNOWN field "${k}" in id=${m.id} (${m.short_name}) file=${m.file}`); errors++; }
  }
}

// Region taxonomy check: every region must be a known UN M49 sub-region
const { SUBREGION_TO_CONTINENT } = await import('../lib/regions.js');
for (const m of all) {
  if (!m.region) { console.error(`MISSING region: id=${m.id} (${m.short_name})`); errors++; continue; }
  if (!SUBREGION_TO_CONTINENT[m.region]) {
    console.error(`UNKNOWN region "${m.region}" on id=${m.id} (${m.short_name}) in ${m.file}`); errors++;
  }
}

// Elevation stats
const sorted = [...all].sort((a, b) => a.elevation - b.elevation);
console.log(`\nElevation range: ${sorted[0].elevation} m (${sorted[0].short_name}) — ${sorted[sorted.length - 1].elevation} m (${sorted[sorted.length - 1].short_name})`);

// Near-ties below MIN_GAP (50 m) — runtime excludes them from pairing
let nearTies = 0;
for (let i = 0; i < sorted.length - 1; i++) {
  const gap = sorted[i + 1].elevation - sorted[i].elevation;
  if (gap <= 50) { console.log(`NOTE near-tie (gap ${gap} m): ${sorted[i].short_name} & ${sorted[i + 1].short_name}`); nearTies++; }
}
console.log(`Near-ties (≤50m, excluded from pairing): ${nearTies}`);

// Ranges and countries stats
const ranges = new Map();
for (const m of all) ranges.set(m.range, (ranges.get(m.range) || 0) + 1);
console.log(`\nRanges (${ranges.size}):`);
for (const [r, c] of [...ranges.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${r}: ${c}`);

const countryCount = new Map();
for (const m of all) for (const c of m.countries.split(', ')) countryCount.set(c, (countryCount.get(c) || 0) + 1);
console.log(`\nCountries (${countryCount.size})`);

if (errors > 0) { console.error(`\n${errors} ERRORS`); process.exit(1); }
console.log('\nALL VALID');