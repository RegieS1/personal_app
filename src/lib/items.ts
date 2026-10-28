import { createClient } from "@/lib/supabase/client";
import { KINDS, kindOf } from "@/config/kinds";
import { nextDue, ymd, type Repeat } from "@/lib/dates";

// Per-area extras stored in items.meta.
export type Meta = {
  next_review?: string; // learning: spaced-repetition due date
  step?: number; // learning: index into the review intervals
  pros?: string; // decision
  cons?: string;
  confidence?: number; // decision, 1-5
  outcome?: "good" | "bad";
  type?: "income" | "expense"; // finance
  category?: string;
  mood?: number; // development check-in, 1-5
  repeat?: Repeat; // task: recurring schedule
  details?: string; // topic: notes (the explanation lives in the notes column)
  example?: string; // topic
  code?: string; // topic: code snippet, whitespace kept
};

export type Item = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  notes: string | null;
  status: "open" | "done";
  due_date: string | null;
  priority?: "none" | "low" | "medium" | "high"; // optional: rows cached before the column existed lack it
  amount: number | null;
  meta?: Meta; // omitted when empty so rows stay valid before the column exists
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// Offline layer: localStorage cache per kind + an outbox of full rows to upsert.
// shortcut: last-write-wins, localStorage size limit; upgrade to IndexedDB/versioned sync if conflicts or volume matter.
const OUTBOX = "outbox";
const cacheKey = (kind: string) => `items:${kind}`;

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: skip caching, server remains the source of truth
  }
};

export async function flush() {
  const box = read<Record<string, Item>>(OUTBOX, {});
  const rows = Object.values(box);
  if (!rows.length) return;
  const { error } = await createClient().from("items").upsert(rows);
  if (error) return;
  const current = read<Record<string, Item>>(OUTBOX, {});
  for (const r of rows) if (current[r.id]?.updated_at === r.updated_at) delete current[r.id];
  write(OUTBOX, current);
}

// Rows still waiting in the outbox win over the server copy (they are newer).
function withOutbox(data: Item[], keep: (i: Item) => boolean) {
  const box = read<Record<string, Item>>(OUTBOX, {});
  return [...Object.values(box).filter((i) => keep(i) && !i.deleted_at), ...data.filter((i) => !box[i.id])];
}

const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

// Stale-while-revalidate: `onCached` gets this device's copy right away (so lists appear instantly, online or
// off), then the promise resolves with fresh server data. Offline it skips the network instead of waiting on it.
export async function loadItems(kind: string, onCached?: (items: Item[]) => void): Promise<Item[]> {
  const cached = read<Item[]>(cacheKey(kind), []);
  if (onCached && cached.length) onCached(cached);
  if (offline()) return cached;
  await flush();
  const { data, error } = await createClient()
    .from("items")
    .select("*")
    .eq("kind", kind)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return cached;
  const merged = withOutbox(data, (i) => i.kind === kind);
  write(cacheKey(kind), merged);
  return merged;
}

export function saveItem(item: Item): Item[] {
  const stamped = { ...item, updated_at: new Date().toISOString() };
  const rest = read<Item[]>(cacheKey(item.kind), []).filter((i) => i.id !== item.id);
  const next = stamped.deleted_at ? rest : [stamped, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at));
  write(cacheKey(item.kind), next);
  write(OUTBOX, { ...read<Record<string, Item>>(OUTBOX, {}), [item.id]: stamped });
  void flush();
  return next;
}

// What search matches against: title, notes, and the long-form topic fields.
export const searchText = (i: Item) =>
  [i.title, i.notes, i.meta?.details, i.meta?.example, i.meta?.code].filter(Boolean).join(" ").toLowerCase();

// Every area at once (Today, search, export, weekly review) in a single request, refreshing each area's cache.
// Rows of kinds the app no longer has (e.g. removed areas) are left out, as before.
export async function loadAll(onCached?: (items: Item[]) => void): Promise<Item[]> {
  const cachedAll = () => KINDS.flatMap((k) => read<Item[]>(cacheKey(k.kind), []));
  const cached = cachedAll();
  if (onCached && cached.length) onCached(cached);
  if (offline()) return cached;
  await flush();
  const { data, error } = await createClient()
    .from("items")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return cached;
  const merged = withOutbox(data, () => true).filter((i) => kindOf(i.kind));
  for (const k of KINDS) write(cacheKey(k.kind), merged.filter((i) => i.kind === k.kind));
  return merged;
}

// Completing a repeating item keeps it as done (history and streaks) and queues the next occurrence.
// shortcut: re-opening a completed repeat doesn't remove the occurrence it spawned; delete that one by hand.
export function toggleDone(item: Item): Item[] {
  if (item.status === "done") return saveItem({ ...item, status: "open" });
  const list = saveItem({ ...item, status: "done" });
  const repeat = item.meta?.repeat;
  if (!repeat) return list;
  const now = new Date().toISOString();
  const today = ymd(new Date());
  return saveItem({
    ...item, id: crypto.randomUUID(), status: "open", due_date: nextDue(item.due_date ?? today, repeat, today),
    created_at: now, updated_at: now, deleted_at: null,
  });
}
