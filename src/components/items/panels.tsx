"use client";

// Per-area panels. Each is used on one page only, so ItemList loads them lazily with next/dynamic.
import { useEffect, useState } from "react";
import type { Item } from "@/lib/items";
import { addDays, ymd } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { MOOD_NAMES, MoodFace } from "./extras";

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

const cacheBudget = (n: number) => {
  try {
    localStorage.setItem("budget", String(n));
  } catch {
    // storage blocked: the profile copy is still saved
  }
};

/* ---------- Learning ---------- */

export const REVIEW_INTERVALS = [1, 3, 7, 21, 60];

export function ReviewQueue({ items, today, onUpdate }: { items: Item[]; today: string; onUpdate: (i: Item) => void }) {
  const due = items.filter((i) => i.status === "open" && i.meta?.next_review && i.meta.next_review <= today);
  if (!due.length) return null;
  const item = due[0];
  const step = item.meta?.step ?? 0;

  const remembered = () => {
    const next = step + 1;
    onUpdate(
      next >= REVIEW_INTERVALS.length
        ? { ...item, status: "done", meta: { ...item.meta, step: next } }
        : { ...item, meta: { ...item.meta, step: next, next_review: ymd(addDays(new Date(), REVIEW_INTERVALS[next])) } },
    );
  };
  const forgot = () =>
    onUpdate({ ...item, meta: { ...item.meta, step: 0, next_review: ymd(addDays(new Date(), 1)) } });

  return (
    <div className="card mt-5 border-accent p-4">
      <p className="text-xs uppercase tracking-wide text-muted">Review queue · {due.length} due</p>
      <p className="mt-2 text-lg">{item.title}</p>
      {item.notes && (
        <details className="mt-1 text-sm text-muted">
          <summary className="cursor-pointer">Show answer</summary>
          {item.notes}
        </details>
      )}
      <div className="mt-3 flex gap-2">
        <button onClick={remembered} className="btn-primary flex-1">Remembered</button>
        <button onClick={forgot} className="btn-secondary flex-1">Forgot</button>
      </div>
    </div>
  );
}

/* ---------- Decisions ---------- */

export function DecisionStats({ items }: { items: Item[] }) {
  const confident = items.filter((i) => i.meta?.outcome && (i.meta.confidence ?? 0) >= 4);
  const good = confident.filter((i) => i.meta?.outcome === "good").length;
  return (
    <p className="card mt-5 px-4 py-3 text-sm text-muted">
      {confident.length
        ? `Your confident calls (4-5) that worked out: ${good} of ${confident.length} (${Math.round((good / confident.length) * 100)}%)`
        : "Log outcomes after the revisit date to see how reliable your confident calls are."}
    </p>
  );
}

/* ---------- Career ---------- */

export function ExportWins({ items }: { items: Item[] }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const text = items.map((i) => `• ${i.title}${i.notes ? ` — ${i.notes}` : ""}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: nothing to do
    }
  }
  if (!items.length) return null;
  return (
    <button onClick={copy} className="btn-secondary mt-5">
      {copied ? "Copied!" : "Copy wins as resume bullets"}
    </button>
  );
}

/* ---------- Finances ---------- */

// The monthly budget is stored on the user's profile (synced across devices); localStorage keeps a copy for offline.
export function FinanceSummary({ items, today, userId }: { items: Item[]; today: string; userId: string }) {
  const [budget, setBudget] = useState(() => {
    try {
      return Number(localStorage.getItem("budget")) || 0;
    } catch {
      return 0;
    }
  });
  const [text, setText] = useState(budget ? String(budget) : "");

  useEffect(() => {
    void createClient().from("profiles").select("budget").eq("id", userId).maybeSingle().then(({ data }) => {
      if (data?.budget == null) return;
      setBudget(Number(data.budget));
      setText(String(data.budget));
      cacheBudget(Number(data.budget));
    });
  }, [userId]);
  const month = items.filter((i) => ymd(new Date(i.created_at)).slice(0, 7) === today.slice(0, 7));
  const sum = (type: string) => month.filter((i) => (i.meta?.type ?? "expense") === type).reduce((s, i) => s + (i.amount ?? 0), 0);
  const income = sum("income");
  const expense = sum("expense");

  const byCategory = new Map<string, number>();
  month
    .filter((i) => (i.meta?.type ?? "expense") === "expense")
    .forEach((i) => byCategory.set(i.meta?.category || "Other", (byCategory.get(i.meta?.category || "Other") ?? 0) + (i.amount ?? 0)));
  const rows = [...byCategory].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;

  function saveBudget() {
    const n = Math.max(0, Number(text) || 0);
    if (n === budget) return;
    setBudget(n);
    cacheBudget(n);
    void createClient().from("profiles").upsert({ id: userId, budget: n });
  }

  return (
    <div className="card mt-5 space-y-4 p-4">
      <p className="text-xs uppercase tracking-wide text-muted">This month</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-sm text-muted">Income</p><p className="text-lg font-semibold text-emerald-400 tabular-nums">{money(income)}</p></div>
        <div><p className="text-sm text-muted">Spent</p><p className="text-lg font-semibold text-red-400 tabular-nums">{money(expense)}</p></div>
        <div><p className="text-sm text-muted">Balance</p><p className="text-lg font-semibold tabular-nums">{money(income - expense)}</p></div>
      </div>
      <div>
        <label className="flex items-center justify-between gap-2 text-sm text-muted">
          Monthly budget
          <input type="number" inputMode="decimal" min="0" value={text} onChange={(e) => setText(e.target.value)} onBlur={saveBudget}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} placeholder="0" aria-label="Monthly budget" className="input w-32 py-1 text-right" />
        </label>
        {budget > 0 && (
          <div className="mt-2" role="meter" aria-valuenow={expense} aria-valuemax={budget} aria-label="Budget used">
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full ${expense > budget ? "bg-red-500" : "bg-linear-to-r from-accent to-accent-2"}`} style={{ width: `${Math.min(100, (expense / budget) * 100)}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{expense > budget ? `Over by ${money(expense - budget)}` : `${money(budget - expense)} left`}</p>
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map(([cat, v]) => (
            <li key={cat} className="text-sm">
              <div className="flex justify-between"><span>{cat}</span><span className="text-muted tabular-nums">{money(v)}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-border"><div className="h-full rounded-full bg-accent" style={{ width: `${(v / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


export function CheckIn({ onSave }: { onSave: (mood: number, text: string) => void }) {
  // Mounted only after the list loads (client-side), so reading localStorage here can't cause a hydration mismatch.
  const [draft] = useState<{ mood: number; text: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem("draft:checkin") ?? "") ?? { mood: 0, text: "" };
    } catch {
      return { mood: 0, text: "" };
    }
  });
  const [mood, setMood] = useState(draft.mood);
  const [text, setText] = useState(draft.text);
  useEffect(() => {
    try {
      localStorage.setItem("draft:checkin", JSON.stringify({ mood, text }));
    } catch {
      // storage blocked: draft not kept
    }
  }, [mood, text]);
  return (
    <form
      className="card mt-5 space-y-3 p-4"
      autoCorrect="on"
      autoCapitalize="sentences"
      onSubmit={(e) => {
        e.preventDefault();
        if (!mood) return;
        onSave(mood, text.trim());
        setMood(0);
        setText("");
      }}
    >
      <p className="text-xs uppercase tracking-wide text-muted">Daily check-in</p>
      <div className="flex gap-2" role="radiogroup" aria-label="Mood">
        {MOOD_NAMES.map((name, i) => (
          <button key={name} type="button" role="radio" aria-checked={mood === i + 1} aria-label={name} onClick={() => setMood(i + 1)}
            className={`grid size-12 place-items-center rounded-xl border transition ${mood === i + 1 ? "border-accent bg-accent/20 text-foreground" : "border-border text-muted hover:border-accent/60"}`}>
            <MoodFace mood={i + 1} className="size-7" />
          </button>
        ))}
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="One thing I'm grateful for…" aria-label="Gratitude" className="input" />
      <button className="btn-primary w-full" disabled={!mood}>Save check-in</button>
    </form>
  );
}

// 12 weeks, one column per week (Sun-Sat); darker = more entries that day.
export function Heatmap({ items, today }: { items: Item[]; today: string }) {
  const counts = new Map<string, number>();
  items.forEach((i) => {
    const d = ymd(new Date(i.created_at));
    counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  const now = new Date();
  const start = addDays(now, -(now.getDay() + 7 * 11));
  const days = Array.from({ length: 84 }, (_, i) => ymd(addDays(start, i)));

  let streak = 0;
  for (let d = counts.has(today) ? now : addDays(now, -1); counts.has(ymd(d)); d = addDays(d, -1)) streak++;

  const shade = (n: number) => (n >= 3 ? "bg-accent" : n === 2 ? "bg-accent/60" : n === 1 ? "bg-accent/30" : "bg-border/60");
  return (
    <div className="card mt-5 p-4">
      <p className="text-sm"><span className="text-xl font-semibold">{streak}</span> day streak</p>
      <div className="mt-3 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto" aria-label="Activity, last 12 weeks">
        {days.map((d) => (
          <div key={d} title={d} className={`size-3.5 rounded-sm ${d > today ? "opacity-0" : shade(counts.get(d) ?? 0)}`} />
        ))}
      </div>
    </div>
  );
}
