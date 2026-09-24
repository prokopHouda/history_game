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
  "X-Client-Info": "seed-mountains/1.0",
};

async function loadDataFile(path) {
  const raw = await readFile(path, "utf8");
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(raw).toString("base64")}`
  );
  // Accept any named export (e.g. mountainsBatch, himalayaBatch) or default
  const named = Object.values(mod).find(
    (v) => Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === "object" && "short_name" in v[0]
  );
  return named || mod.default || mod.mountainsBatch;
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
    console.error("Usage: node scripts/seed-mountains.js scripts/mountains-data/<batch>.js [more-batches...]");
    process.exit(1);
  }

  let allMountains = [];
  for (const dataPath of dataPaths) {
    const batch = await loadDataFile(dataPath);
    console.log(`Loaded ${batch.length} mountains from ${dataPath}`);
    allMountains = allMountains.concat(batch);
  }
  console.log(`Total: ${allMountains.length} mountains`);

  const mountains = allMountains;
  if (!mountains.every((m) => m.id && m.short_name && Number.isInteger(m.elevation))) {
    console.error(
      "Each mountain must have: id (int), short_name (string), elevation (int). Other cols: description, countries, range, fun_fact."
    );
    process.exit(1);
  }

  // Detect duplicate ids within the batch itself
  const ids = new Set();
  for (const m of mountains) {
    if (ids.has(m.id)) {
      console.error(`Duplicate id in batch: ${m.id} (${m.short_name})`);
      process.exit(1);
    }
    ids.add(m.id);
  }

  // Dedupe by short_name against existing rows.
  const names = mountains.map((m) => m.short_name);
  const inList = encodeURIComponent(names.join(","));
  const existing = await supabaseGet(
    `mountains?select=id,short_name,elevation&short_name=in.(${inList})`
  );
  const existingNames = new Set((existing || []).map((m) => m.short_name));

  const toInsert = mountains.filter((m) => !existingNames.has(m.short_name));

  if (toInsert.length === 0) {
    console.log("All mountains already exist. Nothing to insert.");
    return;
  }

  console.log(
    `Inserting ${toInsert.length} new mountains (skipping ${mountains.length - toInsert.length} duplicates)...`
  );

  const inserted = await supabasePost(
    "mountains?select=id,short_name,elevation,countries,range",
    toInsert
  );

  console.log(`Inserted ${inserted.length} rows:`);
  for (const row of inserted) {
    console.log(
      `  id=${row.id}  ${row.short_name}  elevation=${row.elevation}  ${row.countries} / ${row.range}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});