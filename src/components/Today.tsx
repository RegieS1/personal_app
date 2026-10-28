"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hrefOf, KINDS, kindOf } from "@/config/kinds";
import { addDays, friendlyDate, parseQuickAdd, REPEAT_LABEL, ymd } from "@/lib/dates";
import { loadAll, saveItem, toggleDone, type Item } from "@/lib/items";
import { startFocus } from "@/components/FocusTimer";

const RANK: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

// Home page. Runs in the browser so "today" is the user's local day, and reads the offline cache when there's no network.
export function Today({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    const load = () => loadAll(setItems).then(setItems); // device copy first, then the fresh one
    void load();
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, []);

  if (!items) return <><h1 className="title">Today</h1><p className="mt-1 text-sm text-muted">Loading…</p></>;

  const now = new Date();
  const today = ymd(now);
  const open = items.filter((i) => i.status === "open" && kindOf(i.kind)?.status);
  const overdue = open.filter((i) => i.due_date && i.due_date < today);
  const dueToday = open.filter((i) => i.due_date === today);
  const important = open
    .filter((i) => !i.due_date && (RANK[i.priority ?? "none"] ?? 0) >= 2)
    .sort((a, b) => RANK[b.priority ?? "none"] - RANK[a.priority ?? "none"])
    .slice(0, 5);
  const reviews = items.filter((i) => i.kind === "learning" && i.status === "open" && i.meta?.next_review && i.meta.next_review <= today).length;
  const revisits = items.filter((i) => i.kind === "decision" && !i.meta?.outcome && i.due_date && i.due_date <= today).length;

  // Streak: consecutive local days (ending today, or yesterday if nothing is done yet today) with something completed.
  const doneDays = new Set(items.filter((i) => i.status === "done").map((i) => ymd(new Date(i.updated_at))));
  let streak = 0;
  for (let d = doneDays.has(today) ? now : addDays(now, -1); doneDays.has(ymd(d)); d = addDays(d, -1)) streak++;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function complete(item: Item) {
    const list = toggleDone(item);
    setItems((prev) => [...(prev ?? []).filter((i) => i.kind !== item.kind), ...list]);
  }

  function quickAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("title") as HTMLInputElement;
    const raw = input.value.trim();
    if (!raw) return;
    const q = parseQuickAdd(raw);
    const stamp = new Date().toISOString();
    const list = saveItem({
      id: crypto.randomUUID(), user_id: userId, kind: "task", title: q.title, notes: null, status: "open",
      due_date: q.due_date ?? today, priority: q.priority ?? "none", amount: null, parent_id: null,
      created_at: stamp, updated_at: stamp, deleted_at: null, ...(q.repeat && { meta: { repeat: q.repeat } }),
    });
    setItems((prev) => [...(prev ?? []).filter((i) => i.kind !== "task"), ...list]);
    input.value = "";
  }

  const row = (i: Item) => {
    const k = kindOf(i.kind)!;
    const late = !!i.due_date && i.due_date < today;
    return (
      <li key={i.id} className="rise flex items-center gap-3 py-2.5">
        <label className="-m-2.5 grid size-11 shrink-0 place-items-center">
          <input type="checkbox" aria-label={`Mark ${i.title} done`} onChange={() => complete(i)} className="size-5 accent-[var(--accent)]" />
        </label>
        <div className="min-w-0 flex-1">
          <p className="truncate">{i.title}</p>
          <p className="text-xs text-muted">
            <Link href={hrefOf(k)} className="hover:text-accent">{k.label}</Link>
            {i.due_date && <span className={late ? "text-red-400" : ""}> · {late ? "Overdue · " : ""}{friendlyDate(i.due_date, today)}</span>}
            {i.meta?.repeat && <> · ↻ {REPEAT_LABEL[i.meta.repeat]}</>}
            {(i.priority ?? "none") !== "none" && <span className="capitalize"> · {i.priority}</span>}
          </p>
        </div>
        {i.kind === "task" && (
          <button onClick={() => startFocus(i.title)} className="-my-1 rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent/10">Focus</button>
        )}
      </li>
    );
  };

  const section = (title: string, list: Item[]) =>
    list.length > 0 && (
      <section className="card mt-4 px-4 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">{title} · {list.length}</h2>
        <ul className="divide-y divide-border">{list.map(row)}</ul>
      </section>
    );

  const counts = new Map<string, number>();
  items.forEach((i) => {
    if (!kindOf(i.kind)?.status || i.status === "open") counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  });

  return (
    <>
      <p className="text-sm text-muted">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="title">{greeting}</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm">
          <svg viewBox="0 0 24 24" className="size-4 text-accent-2" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          {streak} day streak
        </span>
      </div>

      <form onSubmit={quickAdd} autoCorrect="on" autoCapitalize="sentences" className="card mt-5 flex gap-2 p-3">
        <input name="title" placeholder='Add a task for today… try "Gym every monday !high"' aria-label="New task" className="input min-w-0 flex-1" />
        <button className="btn-primary">Add</button>
      </form>

      {(reviews > 0 || revisits > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {reviews > 0 && <Link href="/growth?tab=learning" className="chip inline-flex items-center border-accent/50 text-foreground">{reviews} learning review{reviews > 1 && "s"} due</Link>}
          {revisits > 0 && <Link href="/decisions" className="chip inline-flex items-center border-accent/50 text-foreground">{revisits} decision{revisits > 1 && "s"} to revisit</Link>}
        </div>
      )}

      {section("Overdue", overdue)}
      {section("Due today", dueToday)}
      {section("Important, no date", important)}
      {!overdue.length && !dueToday.length && !important.length && (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">Nothing due today. Enjoy the calm, or plan ahead in Tasks.</p>
      )}

      <nav aria-label="Areas" className="mt-6 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Link key={k.kind} href={hrefOf(k)} className="chip inline-flex items-center gap-2">
            {k.label}
            <span className="tabular-nums text-foreground">{counts.get(k.kind) ?? 0}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
