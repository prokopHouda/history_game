import { readFile } from "node:fs/promises";

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wsxnspagxjitesktltev.supabase.co"
).replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "User-Agent": "node-fetch/seed-script",
  "X-Client-Info": "seed-rivers/1.0",
};

async function loadDataFile(path) {
  const raw = await readFile(path, "utf8");
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(raw).toString("base64")}`
  );
  // Accept any named export (e.g. riversBatch) or default
  const named = Object.values(mod).find(
    (v) => Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === "object" && "short_name" in v[0]
  );
  return named || mod.default || mod.riversBatch;
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function supabasePost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const dataPaths = process.argv.slice(2);
  if (dataPaths.length === 0) {
    console.error("Usage: node scripts/seed-rivers.js scripts/rivers-data/<batch>.js [more-batches...]");
    process.exit(1);
  }

  let allRivers = [];
  for (const dataPath of dataPaths) {
    const batch = await loadDataFile(dataPath);
    console.log(`Loaded ${batch.length} rivers from ${dataPath}`);
    allRivers = allRivers.concat(batch);
  }
  console.log(`Total: ${allRivers.length} rivers`);

  const rivers = allRivers;
  if (!rivers.every((r) => r.id && r.short_name && Number.isInteger(r.length))) {
    console.error(
      "Each river must have: id (int), short_name (string), length (int). Other cols: description, countries, region, fun_fact."
    );
    process.exit(1);
  }

  // Detect duplicate ids within the batch itself
  const ids = new Set();
  for (const r of rivers) {
    if (ids.has(r.id)) {
      console.error(`Duplicate id in batch: ${r.id} (${r.short_name})`);
      process.exit(1);
    }
    ids.add(r.id);
  }

  // Dedupe by short_name against existing rows.
  const names = rivers.map((r) => r.short_name);
  const inList = encodeURIComponent(names.join(","));
  const existing = await supabaseGet(
    `rivers?select=id,short_name,length&short_name=in.(${inList})`
  );
  const existingNames = new Set((existing || []).map((r) => r.short_name));

  const toInsert = rivers.filter((r) => !existingNames.has(r.short_name));

  if (toInsert.length === 0) {
    console.log("All rivers already exist. Nothing to insert.");
    return;
  }

  console.log(
    `Inserting ${toInsert.length} new rivers (skipping ${rivers.length - toInsert.length} duplicates)...`
  );

  const inserted = await supabasePost(
    "rivers?select=id,short_name,length,countries,region",
    toInsert
  );

  console.log(`Inserted ${inserted.length} rows:`);
  for (const row of inserted) {
    console.log(
      `  id=${row.id}  ${row.short_name}  length=${row.length}  ${row.countries} / ${row.region}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
