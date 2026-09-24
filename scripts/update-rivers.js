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
  "Prefer": "resolution=merge-duplicates", // Use UPSERT logic
};

async function loadDataFile(path) {
  const raw = await readFile(path, "utf8");
  const mod = await import(
    `data:text/javascript;base64,${Buffer.from(raw).toString("base64")}`
  );
  const named = Object.values(mod).find(
    (v) => Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === "object" && "short_name" in v[0]
  );
  return named || mod.default || mod.riversBatch;
}

async function main() {
  const dataPaths = process.argv.slice(2);
  if (dataPaths.length === 0) {
    console.error("Usage: node scripts/update-rivers.js scripts/rivers-data/<batch>.js");
    process.exit(1);
  }

  let allRivers = [];
  for (const dataPath of dataPaths) {
    const batch = await loadDataFile(dataPath);
    allRivers = allRivers.concat(batch);
  }

  console.log(`Updating ${allRivers.length} rivers in database...`);

  // We process in chunks of 50 to avoid payload limits
  const chunkSize = 50;
  for (let i = 0; i < allRivers.length; i += chunkSize) {
    const chunk = allRivers.slice(i, i + chunkSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rivers`, {
      method: "POST",
      headers: { 
        ...headers, 
        "Prefer": "resolution=merge-duplicates" 
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      console.error(`Failed to update chunk ${i/chunkSize}: ${await res.text()}`);
    } else {
      console.log(`Updated chunk ${i/chunkSize + 1}/${Math.ceil(allRivers.length/chunkSize)}`);
    }
  }

  console.log("Database update complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
