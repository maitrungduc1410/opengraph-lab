// Usage: node scripts/summarize-tail.js [file] [tagFilter]
// Reads the output of `wrangler tail --format json` (a stream of pretty-printed JSON objects).
import fs from "node:fs";

const file = process.argv[2] || ".tmp/tail.ndjson";
const filter = process.argv[3];
const raw = fs.readFileSync(file, "utf8").trim();

const rows = [];
for (const block of raw.split(/\n(?=\{)/)) {
  let event;
  try {
    event = JSON.parse(block);
  } catch {
    continue;
  }
  for (const l of event.logs || []) {
    try {
      rows.push(JSON.parse(l.message[0]));
    } catch {}
  }
}

rows.sort((a, b) => a.t.localeCompare(b.t));
for (const r of rows) {
  const u = new URL(r.url);
  const target = u.pathname + u.search;
  if (filter && !target.includes(filter)) continue;
  console.log(
    [
      r.t.slice(11, 23),
      r.method.padEnd(4),
      r.route.padEnd(8),
      target,
      `| ${r.ip} AS${r.asn} ${r.asOrg} ${r.country}/${r.city}`,
      `| ${r.ua}`,
      r.range ? `| range=${r.range}` : "",
    ].join(" "),
  );
}
