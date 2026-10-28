"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hrefOf, kindOf } from "@/config/kinds";
import { addDays, friendlyDate, ymd } from "@/lib/dates";
import { loadAll, saveItem, type Item } from "@/lib/items";

// A short guided look back at the last 7 days and ahead at the next 7. The reflection is saved as a Growth check-in.
export function WeeklyReview({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadAll(setItems).then(setItems);
  }, []);

  if (!items) return <><h1 className="title">Weekly review</h1><p className="mt-1 text-sm text-muted">Loading…</p></>;

  const now = new Date();
  const today = ymd(now);
  const weekAgo = ymd(addDays(now, -7));
  const weekAhead = ymd(addDays(now, 7));
  const local = (iso: string) => ymd(new Date(iso));
  const tracked = items.filter((i) => kindOf(i.kind)?.status);

  const done = tracked.filter((i) => i.status === "done" && local(i.updated_at) > weekAgo);
  const slipped = tracked.filter((i) => i.status === "open" && i.due_date && i.due_date < today);
  const upcoming = tracked
    .filter((i) => i.status === "open" && i.due_date && i.due_date >= today && i.due_date <= weekAhead)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const wins = items.filter((i) => i.kind === "career" && local(i.created_at) > weekAgo);
  const checkins = items.filter((i) => i.kind === "development" && i.meta?.mood && local(i.created_at) > weekAgo);
  const avgMood = checkins.length ? checkins.reduce((s, i) => s + (i.meta?.mood ?? 0), 0) / checkins.length : null;
  const spent = items
    .filter((i) => i.kind === "finance" && (i.meta?.type ?? "expense") === "expense" && local(i.created_at) > weekAgo)
    .reduce((s, i) => s + (i.amount ?? 0), 0);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = String(new FormData(e.currentTarget).get("reflection") ?? "").trim();
    if (!text) return;
    const stamp = new Date().toISOString();
    saveItem({
      id: crypto.randomUUID(), user_id: userId, kind: "development", title: `Weekly review — ${friendlyDate(today, today)}`,
      notes: text, status: "open", due_date: null, priority: "none", amount: null, parent_id: null,
      created_at: stamp, updated_at: stamp, deleted_at: null,
    });
    e.currentTarget.reset();
    setSaved(true);
  }

  const list = (title: string, rows: Item[], empty: string, showDate = false) => (
    <section className="card mt-4 px-4 py-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{title} · {rows.length}</h2>
      {rows.length ? (
        <ul className="mt-1 divide-y divide-border">
          {rows.slice(0, 12).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <Link href={hrefOf(kindOf(i.kind)!)} className="truncate hover:text-accent">{i.title}</Link>
              <span className="shrink-0 text-xs text-muted">{showDate && i.due_date ? friendlyDate(i.due_date, today) : kindOf(i.kind)!.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-muted">{empty}</p>
      )}
    </section>
  );

  const stat = (label: string, value: string) => (
    <div className="card p-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );

  return (
    <>
      <h1 className="title">Weekly review</h1>
      <p className="mt-1 text-sm text-muted">The last 7 days, and what&apos;s coming up.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Completed", String(done.length))}
        {stat("New wins", String(wins.length))}
        {stat("Avg mood", avgMood ? `${avgMood.toFixed(1)}/5` : "–")}
        {stat("Spent", spent.toLocaleString(undefined, { maximumFractionDigits: 2 }))}
      </div>

      {list("Got done", done, "Nothing completed this week yet.")}
      {list("Slipped", slipped, "Nothing overdue. Nice.", true)}
      {list("Next 7 days", upcoming, "Nothing scheduled. Plan a few tasks for the week.", true)}

      <form onSubmit={save} autoCorrect="on" autoCapitalize="sentences" className="card mt-4 space-y-3 p-4">
        <label className="block text-xs font-medium uppercase tracking-wide text-muted" htmlFor="reflection">Reflection</label>
        <textarea id="reflection" name="reflection" rows={4} onChange={() => setSaved(false)}
          placeholder="What went well? What will you do differently next week?" className="input" />
        <div className="flex items-center gap-3">
          <button className="btn-primary">Save reflection</button>
          {saved && <p role="status" className="text-sm text-emerald-400">Saved to Growth › Check-ins.</p>}
        </div>
      </form>
    </>
  );
}
