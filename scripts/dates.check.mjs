// Run: node scripts/dates.check.mjs
import assert from "node:assert/strict";
import { friendlyDate, nextDue, parseQuickAdd } from "../src/lib/dates.ts";

const wed = new Date(2026, 9, 28); // Wed 28 Oct 2026
const none = { due_date: undefined, priority: undefined, repeat: undefined };

// Quick-add parsing
assert.deepEqual(parseQuickAdd("Call mom tomorrow !high", wed), { title: "Call mom", due_date: "2026-10-29", priority: "high", repeat: undefined });
assert.equal(parseQuickAdd("Report on friday", wed).due_date, "2026-10-30");
assert.equal(parseQuickAdd("Report on friday", wed).title, "Report");
assert.equal(parseQuickAdd("Gym wednesday", wed).due_date, "2026-11-04"); // same weekday -> next week
assert.equal(parseQuickAdd("Pay rent today", wed).due_date, "2026-10-28");
assert.deepEqual(parseQuickAdd("Buy milk", wed), { title: "Buy milk", ...none });
assert.equal(parseQuickAdd("tomorrow", wed).title, "tomorrow"); // never returns an empty title
assert.deepEqual(parseQuickAdd("Water plants daily", wed), { title: "Water plants", due_date: "2026-10-28", priority: undefined, repeat: "daily" });
assert.deepEqual(parseQuickAdd("Gym every monday !medium", wed), { title: "Gym", due_date: "2026-11-02", priority: "medium", repeat: "weekly" });
assert.equal(parseQuickAdd("Pay rent every month", wed).repeat, "monthly");
assert.equal(parseQuickAdd("Review weekly on friday", wed).due_date, "2026-10-30");

// Repeating schedule
assert.equal(nextDue("2026-10-28", "daily", "2026-10-28"), "2026-10-29");
assert.equal(nextDue("2026-10-20", "daily", "2026-10-28"), "2026-10-29"); // overdue: skips past dates
assert.equal(nextDue("2026-10-28", "weekly", "2026-10-28"), "2026-11-04");
assert.equal(nextDue("2026-11-02", "weekly", "2026-10-28"), "2026-11-09"); // done early: one period after due
assert.equal(nextDue("2026-01-31", "monthly", "2026-01-31"), "2026-02-28"); // clamps to month end
assert.equal(nextDue("2026-12-15", "monthly", "2026-12-15"), "2027-01-15"); // year rollover

// Friendly dates
assert.equal(friendlyDate("2026-10-28", "2026-10-28"), "Today");
assert.equal(friendlyDate("2026-10-29", "2026-10-28"), "Tomorrow");
assert.equal(friendlyDate("2026-10-27", "2026-10-28"), "Yesterday");
assert.notEqual(friendlyDate("2026-10-30", "2026-10-28"), "2026-10-30");
assert.match(friendlyDate("2027-03-01", "2026-10-28"), /2027/); // other year shows the year

console.log("dates ok");
