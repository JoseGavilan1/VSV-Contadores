import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const supabase = createClient(
  "https://bcfckukvgojnfmmwoqpf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjZmNrdWt2Z29qbmZtbXdvcXBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY0MDYwMywiZXhwIjoyMDgzMjE2NjAzfQ.7LDDXBHX553xbzvnLgyojXmAU6wtEA64Agh1el90IvI"
);

async function fetchAllRows(tableName, pageSize = 1000) {
  let all = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, to);

    if (error) throw error;

    all = all.concat(data || []);

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

async function main() {
  const table = process.argv[2]; // tabla por argumento
  if (!table) {
    console.error("Uso: node export-table.mjs <nombre_tabla>");
    process.exit(1);
  }

  const rows = await fetchAllRows(table);
  fs.writeFileSync(`${table}.json`, JSON.stringify(rows, null, 2));
  console.log(`OK: ${rows.length} filas guardadas en ${table}.json`);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
