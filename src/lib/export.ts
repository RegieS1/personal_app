import type { Item } from "./items";

const COLUMNS = ["id", "kind", "title", "notes", "status", "due_date", "priority", "amount", "parent_id", "created_at", "updated_at", "meta"] as const;

// RFC 4180 CSV. Cells starting with = + - @ (or tab/CR) get a leading ' so spreadsheets don't run them as formulas.
export function toCsv(items: Item[]) {
  const cell = (v: unknown) => {
    let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNS.join(","), ...items.map((i) => COLUMNS.map((c) => cell(i[c])).join(","))].join("\r\n");
}
