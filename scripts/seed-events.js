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
  "X-Client-Info": "seed-events/1.0",
};

async function loadDataFile(path) {
  const raw = await readFile(path, "utf8");
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(raw).toString("base64")}`
  );
  return mod.asiaBatch || mod.default;
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
  const dataPath = process.argv[2];
  if (!dataPath) {
    console.error("Usage: node scripts/seed-events.js scripts/events-data/<batch>.js");
    process.exit(1);
  }

  const events = await loadDataFile(dataPath);
  console.log(`Loaded ${events.length} events from ${dataPath}`);

  if (!events.every((e) => e.id && e.short_name && Number.isInteger(e.year))) {
    console.error(
      "Each event must have: id (int), short_name (string), year (int). Other cols: description, countries, region, fun_fact."
    );
    process.exit(1);
  }

  // Dedupe by short_name against existing rows.
  const names = events.map((e) => e.short_name);
  const inList = encodeURIComponent(names.join(","));
  const existing = await supabaseGet(
    `events?select=id,short_name,year&short_name=in.(${inList})`
  );
  const existingNames = new Set((existing || []).map((e) => e.short_name));

  const toInsert = events.filter((e) => !existingNames.has(e.short_name));

  if (toInsert.length === 0) {
    console.log("All events already exist. Nothing to insert.");
    return;
  }

  console.log(
    `Inserting ${toInsert.length} new events (skipping ${events.length - toInsert.length} duplicates)...`
  );

  const inserted = await supabasePost(
    "events?select=id,short_name,year,year_int,countries,region",
    toInsert
  );

  console.log(`Inserted ${inserted.length} rows:`);
  for (const row of inserted) {
    console.log(
      `  id=${row.id}  ${row.short_name}  year=${row.year}  year_int=${row.year_int}  ${row.countries} / ${row.region}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});