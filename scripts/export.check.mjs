// Run: node scripts/export.check.mjs
import assert from "node:assert/strict";
import { toCsv } from "../src/lib/export.ts";

const base = {
  id: "1", kind: "task", title: "Plain", notes: null, status: "open", due_date: null, priority: "none",
  amount: null, parent_id: null, created_at: "c", updated_at: "u", deleted_at: null,
};
const lines = toCsv([
  base,
  { ...base, id: "2", title: 'Say "hi", then\nleave', meta: { repeat: "daily" } },
  { ...base, id: "3", title: "=HYPERLINK(\"x\")", notes: "-5", amount: 12.5 },
]).split("\r\n");

assert.equal(lines[0], "id,kind,title,notes,status,due_date,priority,amount,parent_id,created_at,updated_at,meta");
assert.equal(lines[1], "1,task,Plain,,open,,none,,,c,u,");
// Row 2's newline is inside a quoted cell (\n, rows end in \r\n), so it stays on one split line.
assert.ok(lines[2].startsWith('2,task,"Say ""hi"", then\nleave"')); // quotes doubled, comma/newline quoted
assert.ok(lines[2].endsWith('"{""repeat"":""daily""}"')); // meta as JSON
assert.ok(lines[3].startsWith(`3,task,"'=HYPERLINK(""x"")",'-5,`)); // formula + leading minus neutralised
assert.ok(lines[3].includes(",12.5,"));
assert.equal(lines.length, 4);
console.log("export ok");
