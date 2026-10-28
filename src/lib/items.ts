import { createClient } from "@/lib/supabase/client";
import { KINDS, kindOf } from "@/config/kinds";
import { nextDue, ymd, type Repeat } from "@/lib/dates";
import { rejected, withOutbox as merge } from "@/lib/outbox";

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
  done_at?: string; // when it was last completed (updated_at also changes on any edit)
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
const FAILED = "outbox:failed"; // edits the database refused; kept (never silently dropped) until retried or discarded
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
  const rows = Object.values(read<Record<string, Item>>(OUTBOX, {}));
  if (!rows.length) return;
  const items = () => createClient().from("items");
  let done = rows;
  const { error } = await items().upsert(rows);
  if (error) {
    if (!rejected(error)) return; // offline or login expired: keep everything for the next try
    // One refused row fails the whole batch, so send them singly: good rows sync, refused ones are parked.
    done = [];
    const failed = read<Record<string, Item>>(FAILED, {});
    for (const r of rows) {
      const { error: e } = await items().upsert(r);
      if (e && !rejected(e)) break; // connection dropped mid-way: the rest stay queued
      if (e) failed[r.id] = r;
      done.push(r);
    }
    write(FAILED, failed);
  }
  const current = read<Record<string, Item>>(OUTBOX, {});
  for (const r of done) if (current[r.id]?.updated_at === r.updated_at) delete current[r.id];
  write(OUTBOX, current);
}

// Parked edits, surfaced in Settings > Sync.
export const failedCount = () => Object.keys(read<Record<string, Item>>(FAILED, {})).length;
export function retryFailed() {
  write(OUTBOX, { ...read<Record<string, Item>>(FAILED, {}), ...read<Record<string, Item>>(OUTBOX, {}) });
  write(FAILED, {});
  return flush();
}
export const discardFailed = () => write(FAILED, {});

const withOutbox = (data: Item[], keep: (i: Item) => boolean) => merge(data, read<Record<string, Item>>(OUTBOX, {}), keep);

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

// Shared rules, so every screen (lists, Today, reminders, weekly review) counts the same way.
export const RANK = { none: 0, low: 1, medium: 2, high: 3 } as const;
export const isOverdue = (i: Item, today: string) => i.status === "open" && !!i.due_date && i.due_date < today;
export const isReviewDue = (i: Item, today: string) =>
  i.kind === "learning" && i.status === "open" && !!i.meta?.next_review && i.meta.next_review <= today;
export const isRevisitDue = (i: Item, today: string) => i.kind === "decision" && !i.meta?.outcome && !!i.due_date && i.due_date <= today;
// When something was completed. Older rows predate done_at, so fall back to updated_at.
export const doneAt = (i: Item) => i.meta?.done_at ?? i.updated_at;

// Completing a repeating item keeps it as done (history and streaks) and queues the next occurrence.
// shortcut: re-opening a completed repeat doesn't remove the occurrence it spawned; delete that one by hand.
export function toggleDone(item: Item): Item[] {
  if (item.status === "done") return saveItem({ ...item, status: "open", meta: { ...item.meta, done_at: undefined } });
  const list = saveItem({ ...item, status: "done", meta: { ...item.meta, done_at: new Date().toISOString() } });
  const repeat = item.meta?.repeat;
  if (!repeat) return list;
  const now = new Date().toISOString();
  const today = ymd(new Date());
  return saveItem({
    ...item, id: crypto.randomUUID(), status: "open", due_date: nextDue(item.due_date ?? today, repeat, today), meta: { ...item.meta, done_at: undefined },
    created_at: now, updated_at: now, deleted_at: null,
  });
}
