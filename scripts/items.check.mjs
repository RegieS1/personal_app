// Run: node scripts/items.check.mjs
import assert from "node:assert/strict";
import { rejected, withOutbox } from "../src/lib/outbox.ts";

const row = (id, title, deleted_at = null) => ({ id, title, deleted_at });
const server = [row("a", "server A"), row("b", "server B")];

// A queued edit replaces the server copy, and isn't duplicated.
assert.deepEqual(withOutbox(server, { a: row("a", "local A") }, () => true).map((r) => r.title), ["local A", "server B"]);
// A queued delete hides the row even though the server still has it.
assert.deepEqual(withOutbox(server, { b: row("b", "server B", "2026-10-28") }, () => true).map((r) => r.id), ["a"]);
// A queued new row shows up; `keep` limits it to the area being loaded.
assert.deepEqual(withOutbox([], { c: row("c", "new") }, (r) => r.id === "c").map((r) => r.id), ["c"]);
assert.deepEqual(withOutbox([], { c: row("c", "new") }, () => false), []);

// Permanent rejections vs. worth retrying.
assert.equal(rejected({ code: "23514" }), true); // check constraint (e.g. kind not allowed yet)
assert.equal(rejected({ code: "42501" }), true); // row-level security (another account's row)
assert.equal(rejected({ code: "" }), false); // network failure
assert.equal(rejected({ code: "PGRST301" }), false); // expired login
assert.equal(rejected(null), false);
console.log("items ok");
