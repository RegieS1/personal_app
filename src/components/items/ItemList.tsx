"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadItems, saveItem, searchText, toggleDone, type Item, type Meta } from "@/lib/items";
import { addDays, friendlyDate, parseQuickAdd, REPEAT_LABEL, ymd, type Repeat } from "@/lib/dates";
import { kindOf } from "@/config/kinds";
import { DatePicker } from "@/components/DatePicker";
import { startFocus } from "@/components/FocusTimer";
import dynamic from "next/dynamic";
import { goalProgress, MoodFace, ProgressRing, projectHealth } from "./extras";
import { TopicBody } from "./TopicBody";

// The per-area panels (budget, heatmap, review queue…) live in one chunk that only areas using a panel download;
// Goals/Projects/Tasks never fetch it. They render after the list has loaded (client-side), so ssr:false costs nothing.
const CheckIn = dynamic(() => import("./panels").then((m) => m.CheckIn), { ssr: false });
const DecisionStats = dynamic(() => import("./panels").then((m) => m.DecisionStats), { ssr: false });
const ExportWins = dynamic(() => import("./panels").then((m) => m.ExportWins), { ssr: false });
const FinanceSummary = dynamic(() => import("./panels").then((m) => m.FinanceSummary), { ssr: false });
const Heatmap = dynamic(() => import("./panels").then((m) => m.Heatmap), { ssr: false });
const ReviewQueue = dynamic(() => import("./panels").then((m) => m.ReviewQueue), { ssr: false });

// Long lists render in chunks: the first PAGE rows, then another PAGE each time the end scrolls into view.
const PAGE = 30;

const FILTERS = ["all", "open", "done", "overdue"] as const;
const SORTS = { newest: "Newest", due: "Due date", priority: "Priority" } as const;
const RANK = { none: 0, low: 1, medium: 2, high: 3 } as const;
const BADGE = {
  low: "bg-accent-2/15 text-accent-2",
  medium: "bg-amber-400/15 text-amber-300",
  high: "bg-red-500/15 text-red-400",
} as const;
// Which kind an item can be linked to (project -> goal, task -> project), and which kinds hang below it.
const PARENT_KIND: Record<string, string> = { project: "goal", task: "project", topic: "lesson" };
const CHILD_KINDS: Record<string, string[]> = { goal: ["project", "task"], project: ["task"], lesson: ["topic"] };
// Where the "From: …" banner's "show all" link goes when a list is filtered to one parent.
const ALL_LINK: Record<string, [string, string]> = { topic: ["/growth?tab=lessons", "All lessons"] };
const BAD = "text-red-400";

// Unsaved add-form input is kept in localStorage per area, so leaving the page (or the tab being discarded) doesn't lose it.
function saveDraft(form: HTMLFormElement, key: string) {
  try {
    localStorage.setItem(key, JSON.stringify(Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v)]))));
  } catch {
    // storage blocked: the draft just isn't kept
  }
}

function restoreDraft(form: HTMLFormElement | null, key: string, only?: string) {
  let draft: Record<string, string> = {};
  try {
    draft = JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return;
  }
  for (const [name, value] of Object.entries(draft)) {
    if (only && name !== only) continue;
    const el = form?.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.value = value;
      el.dispatchEvent(new Event("restore")); // lets custom fields like DatePicker pick up the value
    }
  }
}

// parentFilter shows only the items linked to one parent (e.g. the topics of one lesson).
export function ItemList({ kind, label, userId, initialQuery = "", parentFilter }: {
  kind: string; label: string; userId: string; initialQuery?: string; parentFilter?: string;
}) {
  const cfg = kindOf(kind)!;
  const [items, setItems] = useState<Item[]>([]);
  const [parents, setParents] = useState<Item[]>([]);
  const [related, setRelated] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("newest");
  const [editing, setEditing] = useState<string | null>(null);
  const [more, setMore] = useState(kind === "topic"); // a topic is mostly its content, so show those fields up front
  const [open, setOpen] = useState<string | null>(null); // topic shown in full (read view)
  const [undo, setUndo] = useState<Item | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const sentinel = useRef<HTMLLIElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  // Per parent too, so a half-typed topic for one lesson never restores (with its link) inside another.
  const draftKey = `draft:${kind}${parentFilter ? `:${parentFilter}` : ""}`;

  const refresh = useCallback(() => {
    const show = (list: Item[]) => { setItems(list); setLoaded(true); };
    return loadItems(kind, show).then(show); // device copy first, then the fresh one
  }, [kind]);
  const today = ymd(new Date());
  const isOverdue = (i: Item) => cfg.status && i.status === "open" && !!i.due_date && i.due_date < today;
  const scoped = parentFilter ? items.filter((i) => i.parent_id === parentFilter) : items;
  const openCount = scoped.filter((i) => i.status === "open").length;
  const update = (item: Item) => setItems(saveItem(item));
  const sorts = (Object.keys(SORTS) as (keyof typeof SORTS)[]).filter((s) => s === "newest" || cfg[s === "due" ? "due" : "priority"]);

  useEffect(() => {
    void refresh();
    const parentKind = PARENT_KIND[kind];
    if (parentKind) void loadItems(parentKind, setParents).then(setParents);
    void Promise.all((CHILD_KINDS[kind] ?? []).map((k) => loadItems(k))).then((lists) => setRelated(lists.flat()));
    window.addEventListener("online", refresh);
    return () => window.removeEventListener("online", refresh);
  }, [kind, refresh]);

  useEffect(() => restoreDraft(formRef.current, draftKey), [draftKey]);
  // The parent <select> only has options once its items load, so restore that one field again then.
  useEffect(() => { if (parents.length) restoreDraft(formRef.current, draftKey, "parent_id"); }, [parents, draftKey]);

  // The undo toast disappears after a few seconds.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(t);
  }, [undo]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped
      .filter((i) => !q || searchText(i).includes(q))
      .filter((i) => filter === "all" || (filter === "overdue" ? i.status === "open" && !!i.due_date && i.due_date < today : i.status === filter))
      .sort((a, b) => {
        if (sort === "priority") return RANK[b.priority ?? "none"] - RANK[a.priority ?? "none"];
        // Items without a due date sort last.
        if (sort === "due") return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
        // Topics keep the order they were added, like a syllabus; everything else is newest first.
        return kind === "topic" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at);
      });
  }, [scoped, query, filter, sort, today, kind]);

  // Load the next chunk when the "Show more" row scrolls into view (the button stays for keyboard users).
  const hasMore = visible.length > limit;
  useEffect(() => {
    const el = sentinel.current;
    if (!hasMore || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setLimit((l) => l + PAGE), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit]);

  function newItem(fields: Partial<Item> & { title: string }): Item {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(), user_id: userId, kind, notes: null, status: "open", due_date: null, priority: "none",
      amount: null, parent_id: null, created_at: now, updated_at: now, deleted_at: null, ...fields,
    };
  }

  // Shared by the add form and the inline edit form.
  function readForm(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const fields: Partial<Item> & { title: string } = {
      title: text("title"),
      notes: text("notes") || null,
      due_date: text("due_date") || null,
      priority: (text("priority") || "none") as Item["priority"],
      amount: kind === "finance" && text("amount") ? Number(text("amount")) : null,
    };
    // Only touch the link when the selector was shown, so editing while parents haven't loaded keeps it.
    if (data.has("parent_id")) fields.parent_id = text("parent_id") || null;
    const meta: Meta = {};
    if (kind === "decision") Object.assign(meta, { pros: text("pros"), cons: text("cons"), confidence: Number(text("confidence")) });
    if (kind === "finance") Object.assign(meta, { type: text("type"), category: text("category") });
    if (kind === "task") meta.repeat = (text("repeat") || undefined) as Repeat | undefined;
    if (kind === "topic") {
      // Code keeps its indentation; only blank leading lines and trailing whitespace go.
      const code = String(data.get("code") ?? "").replace(/^(\s*\n)+/, "").trimEnd();
      Object.assign(meta, { details: text("details") || undefined, example: text("example") || undefined, code: code || undefined });
    }
    return { fields, meta };
  }

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { fields, meta } = readForm(e.currentTarget);
    if (!fields.title) return;

    if (kind === "task") {
      const q = parseQuickAdd(fields.title);
      fields.title = q.title;
      fields.due_date ??= q.due_date ?? null;
      if (fields.priority === "none" && q.priority) fields.priority = q.priority;
      meta.repeat ??= q.repeat;
    }
    if (kind === "learning") Object.assign(meta, { next_review: ymd(addDays(new Date(), 1)), step: 0 });

    setItems(saveItem(newItem({ ...fields, ...(Object.keys(meta).length && { meta }) })));
    e.currentTarget.reset();
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // nothing to clear
    }
  }

  function saveEdit(e: React.FormEvent<HTMLFormElement>, item: Item) {
    e.preventDefault();
    const { fields, meta } = readForm(e.currentTarget);
    if (!fields.title) return;
    update({ ...item, ...fields, ...(Object.keys(meta).length && { meta: { ...item.meta, ...meta } }) });
    setEditing(null);
  }

  function remove(item: Item) {
    update({ ...item, deleted_at: new Date().toISOString() });
    setEditing(null);
    setUndo(item);
  }

  const categories = [...new Set(items.map((i) => i.meta?.category).filter(Boolean))] as string[];
  const dateLabel = kind === "decision" ? "Revisit on" : "Due date";

  const titleInput = (item?: Item) => (
    <input
      name="title"
      required
      autoFocus={!!item}
      defaultValue={item?.title}
      placeholder={item ? "Title" : kind === "topic" && parentFilter ? "Add a topic to this lesson…" : kind === "lesson" ? "New lesson, e.g. React basics" : kind === "task" ? 'Add a task… try "Gym every monday !high"' : `Add to ${label.toLowerCase()}…`}
      aria-label="Title"
      className="input min-w-0 flex-1"
    />
  );
  const amountInput = (item?: Item) =>
    kind === "finance" && (
      <input name="amount" type="number" inputMode="decimal" step="0.01" min="0" required defaultValue={item?.amount ?? ""} placeholder="Amount" aria-label="Amount" className="input w-28" />
    );

  // Everything below the title row; `item` pre-fills it for editing.
  const renderExtras = (item?: Item) => {
    const m = item?.meta ?? {};
    return (
      <>
        {kind === "topic" || kind === "lesson" ? (
          <textarea name="notes" defaultValue={item?.notes ?? ""} rows={kind === "topic" ? 4 : 2}
            placeholder={kind === "topic" ? "Explanation, in your own words" : "What this lesson covers"} aria-label={kind === "topic" ? "Explanation" : "Description"} className="input sm:col-span-2" />
        ) : (
          <input name="notes" defaultValue={item?.notes ?? ""} placeholder={kind === "goal" ? "Why does this matter?" : kind === "learning" ? "What did you learn? (answer for review)" : "Notes"} aria-label="Notes" className="input sm:col-span-2" />
        )}
        {kind === "topic" && (
          <>
            <textarea name="details" defaultValue={m.details} rows={3} placeholder="Notes" aria-label="Notes" className="input sm:col-span-2" />
            <textarea name="example" defaultValue={m.example} rows={3} placeholder="Examples" aria-label="Examples" className="input sm:col-span-2" />
            <textarea name="code" defaultValue={m.code} rows={6} placeholder="Code snippet" aria-label="Code snippet" spellCheck={false}
              autoCorrect="off" autoCapitalize="none" wrap="off" className="input font-mono text-sm sm:col-span-2" />
          </>
        )}
        {kind === "decision" && (
          <>
            <textarea name="pros" defaultValue={m.pros} placeholder="Pros" aria-label="Pros" rows={2} className="input" />
            <textarea name="cons" defaultValue={m.cons} placeholder="Cons" aria-label="Cons" rows={2} className="input" />
            <label className="flex items-center gap-3 text-sm text-muted sm:col-span-2">
              Confidence
              <input name="confidence" type="range" min="1" max="5" defaultValue={m.confidence ?? 3} className="flex-1 accent-[var(--accent)]" />
            </label>
          </>
        )}
        {kind === "finance" && (
          <>
            <select name="type" aria-label="Type" defaultValue={m.type ?? "expense"} className="input">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input name="category" list="categories" defaultValue={m.category} placeholder="Category" aria-label="Category" className="input" />
          </>
        )}
        {parents.length > 0 && (
          <select name="parent_id" aria-label={`Link to ${PARENT_KIND[kind]}`} defaultValue={item?.parent_id ?? parentFilter ?? ""} className="input">
            <option value="">No {PARENT_KIND[kind]}</option>
            {parents.filter((p) => p.status === "open" || p.id === item?.parent_id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
        {cfg.due && (
          <DatePicker
            name="due_date"
            label={dateLabel}
            defaultValue={item?.due_date ?? ""}
            onPick={item ? undefined : () => formRef.current && saveDraft(formRef.current, draftKey)}
          />
        )}
        {cfg.priority && (
          <label className="text-xs text-muted">
            Priority
            <select name="priority" defaultValue={item?.priority ?? "none"} className="input mt-1 text-base">
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        )}
        {kind === "task" && (
          <label className="text-xs text-muted">
            Repeat
            <select name="repeat" defaultValue={m.repeat ?? ""} className="input mt-1 text-base">
              <option value="">Doesn&apos;t repeat</option>
              {(Object.keys(REPEAT_LABEL) as Repeat[]).map((r) => <option key={r} value={r}>{REPEAT_LABEL[r]}</option>)}
            </select>
          </label>
        )}
      </>
    );
  };

  const editForm = (item: Item) => (
      <form
        onSubmit={(e) => saveEdit(e, item)}
        onKeyDown={(e) => {
          // Escape cancels, unless it was meant for an open popup like the date picker.
          if (e.key === "Escape" && !(e.target as HTMLElement).closest('[role="dialog"],[aria-expanded="true"]')) setEditing(null);
        }}
        autoCorrect="on"
        autoCapitalize="sentences"
        aria-label={`Edit ${item.title}`}
        className="grid gap-2 rounded-xl bg-accent/5 p-3 ring-1 ring-accent/40 sm:grid-cols-2"
      >
        <div className="flex gap-2 sm:col-span-2">
          {titleInput(item)}
          {amountInput(item)}
        </div>
        {renderExtras(item)}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="btn-primary flex-1">Save</button>
          <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1">Cancel</button>
          <button type="button" onClick={() => remove(item)} className="btn-secondary text-red-400 hover:border-red-400/60">Delete</button>
        </div>
      </form>
  );

  return (
    <>
      {/* Inside a lesson, the page is titled with the lesson itself and its topics are counted. */}
      {/* Shown on every topics view (one lesson or "search all"), since topics have no tab of their own. */}
      {ALL_LINK[kind] && (
        <Link href={ALL_LINK[kind][0]} className="btn-secondary mb-3 min-h-11 gap-2">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {ALL_LINK[kind][1]}
        </Link>
      )}
      <h1 className="title">{parentFilter ? (parents.find((p) => p.id === parentFilter)?.title ?? label) : label}</h1>
      {parentFilter && parents.find((p) => p.id === parentFilter)?.notes && (
        <p className="mt-1 max-w-prose whitespace-pre-wrap text-muted">{parents.find((p) => p.id === parentFilter)?.notes}</p>
      )}
      <p className="mt-1 text-sm text-muted">
        {!loaded ? "Loading…"
          : kind === "topic" ? `${scoped.length} ${scoped.length === 1 ? "topic" : "topics"}`
          : cfg.status ? `${openCount} open · ${scoped.length - openCount} done`
          : `${scoped.length} ${scoped.length === 1 ? "entry" : "entries"}`}
      </p>
      {kind === "lesson" && (
        <Link href="/growth?tab=topics" className="mt-2 inline-block text-sm text-muted underline hover:text-foreground">Search all topics →</Link>
      )}

      {loaded && kind === "learning" && <ReviewQueue items={scoped} today={today} onUpdate={update} />}
      {loaded && kind === "decision" && <DecisionStats items={items} />}
      {loaded && kind === "finance" && <FinanceSummary items={items} today={today} userId={userId} />}
      {loaded && kind === "development" && (
        <>
          <CheckIn onSave={(mood, text) => update(newItem({ title: text || "Check-in", meta: { mood } }))} />
          <Heatmap items={items} today={today} />
        </>
      )}

      {/* Quick-add bar; the rest of the fields sit behind "More options" (still submitted when hidden). */}
      <form ref={formRef} onSubmit={add} autoCorrect="on" autoCapitalize="sentences" onChange={(e) => saveDraft(e.currentTarget, draftKey)}
        className="card mt-5 grid gap-2 p-3 sm:grid-cols-2">
        <div className="flex gap-2 sm:col-span-2">
          {titleInput()}
          {amountInput()}
          <button className="btn-primary">Add</button>
        </div>
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="justify-self-start px-1 text-xs text-muted hover:text-foreground">
          {more ? "Fewer options ▴" : "More options ▾"}
        </button>
        <div className={more ? "contents" : "hidden"}>{renderExtras()}</div>
      </form>
      {kind === "finance" && <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>}

      {loaded && kind === "career" && <ExportWins items={items} />}

      <div className="mt-6 space-y-3">
        <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="Search…" aria-label="Search" className="input" />
        {(cfg.status || sorts.length > 1) && (
          <div className="flex flex-wrap items-center gap-2">
            {cfg.status && FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => { setFilter(f); setLimit(PAGE); }} className="chip capitalize">{f}</button>
            ))}
            {sorts.length > 1 && (
              <select value={sort} onChange={(e) => { setSort(e.target.value as keyof typeof SORTS); setLimit(PAGE); }} aria-label="Sort by" className="input ml-auto w-auto py-1">
                {sorts.map((k) => <option key={k} value={k}>{SORTS[k]}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {kind === "lesson" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 empty:hidden">
          {visible.map((item) => {
            if (editing === item.id) return <div key={item.id} className="card p-3 sm:col-span-2">{editForm(item)}</div>;
            const topics = related.filter((r) => r.parent_id === item.id);
            // "Updated" reflects the newest change to the lesson or any of its topics.
            const touched = Math.max(...[item, ...topics].map((i) => Date.parse(i.updated_at)));
            return (
              <div key={item.id} className="rise card group relative flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:border-accent">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent" aria-hidden>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z M12 6.5v13" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  {/* Stretched link: the whole card opens the lesson, and it stays one focusable link for keyboards. */}
                  <Link href={`/growth?tab=topics&lesson=${item.id}`} className="font-semibold after:absolute after:inset-0 after:rounded-2xl group-hover:text-accent">
                    {item.title}
                  </Link>
                  {item.notes && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.notes}</p>}
                  <p className="mt-2 text-xs text-muted">
                    {topics.length ? `${topics.length} topic${topics.length > 1 ? "s" : ""}` : "No topics yet"} · Updated {friendlyDate(ymd(new Date(touched)), today)}
                  </p>
                </div>
                <button type="button" onClick={() => setEditing(item.id)} aria-label={`Edit ${item.title}`}
                  className="relative z-10 -m-1 grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-foreground">
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
      <ul className="card mt-4 divide-y divide-border px-4 empty:hidden">
        {visible.slice(0, limit).map((item, idx) => {
          const priority = item.priority ?? "none";
          const overdue = isOverdue(item);
          const m = item.meta ?? {};
          const pct = kind === "goal" ? goalProgress(item, related) : null;
          const health = kind === "project" ? projectHealth(item, related, today) : null;
          const parent = parents.find((p) => p.id === item.parent_id);
          const amount = item.amount != null && `${kind === "finance" && m.type !== "income" ? "−" : kind === "finance" ? "+" : ""}${item.amount.toLocaleString()}`;
          const decisionDue = kind === "decision" && !m.outcome && !!item.due_date && item.due_date <= today;
          // Areas without due dates show when the entry was made instead.
          const dateLine = cfg.due
            ? item.due_date && `${overdue ? "Overdue · " : kind === "decision" ? "Revisit " : "Due "}${friendlyDate(item.due_date, today)}`
            : friendlyDate(ymd(new Date(item.created_at)), today);

          if (editing === item.id) {
            return (
              <li key={item.id} className="py-3">
                {editForm(item)}
              </li>
            );
          }

          return (
            <li key={item.id} className="rise flex items-start gap-3 py-3">
              {cfg.status && (
                /* Padded label gives the checkbox a 44px tap target. */
                <label className="-m-2.5 grid size-11 shrink-0 place-items-center">
                  <input
                    type="checkbox"
                    aria-label={`Mark ${item.title} done`}
                    checked={item.status === "done"}
                    onChange={() => setItems(toggleDone(item))}
                    className="size-5 accent-[var(--accent)]"
                  />
                </label>
              )}
              {kind === "topic" && (
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-semibold tabular-nums text-accent" aria-hidden>
                  {idx + 1}
                </span>
              )}
              {/* The whole row opens the editor; the title is the keyboard-reachable control for it. */}
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => {
                if (kind === "topic") setOpen(open === item.id ? null : item.id);
                else if (kind === "lesson") router.push(`/growth?tab=topics&lesson=${item.id}`);
                else setEditing(item.id);
              }}>
                <p className={item.status === "done" && cfg.status ? "line-through opacity-50" : ""}>
                  {kind === "development" && m.mood && <MoodFace mood={m.mood} className="mr-2 inline size-5 align-text-bottom text-accent" />}
                  <button type="button" title={kind === "topic" ? "Show topic" : kind === "lesson" ? "Open lesson" : "Edit"} aria-expanded={kind === "topic" ? open === item.id : undefined} className="text-left hover:text-accent">{item.title}</button>
                  {cfg.priority && priority !== "none" && <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-xs capitalize ${BADGE[priority]}`}>{priority}</span>}
                  {health && <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-xs ${health.cls}`}>{health.label}</span>}
                  {m.repeat && <span className="ml-2 align-middle text-xs text-muted" title="Repeats">↻ {REPEAT_LABEL[m.repeat]}</span>}
                </p>
                {dateLine && <p className={`text-xs ${overdue ? `font-medium ${BAD}` : "text-muted"}`}>{dateLine}</p>}
                <p className={`text-sm text-muted empty:hidden ${kind === "topic" ? "line-clamp-2" : ""}`}>
                  {[!(kind === "topic" && open === item.id) && item.notes, parent && `↳ ${parent.title}`, m.category, amount && <span key="a" className={kind === "finance" ? (m.type === "income" ? "text-emerald-400" : BAD) : ""}>{amount}</span>]
                    .filter(Boolean)
                    .map((part, i) => <span key={i}>{i > 0 && " · "}{part}</span>)}
                </p>
                {kind === "topic" && open === item.id && <TopicBody item={item} onEdit={() => setEditing(item.id)} />}
                {kind === "lesson" && (() => {
                  const count = related.filter((r) => r.parent_id === item.id).length;
                  return (
                    <div className="mt-1 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/growth?tab=topics&lesson=${item.id}`} className="chip inline-flex items-center">
                        {count ? `${count} topic${count > 1 ? "s" : ""} →` : "Add topics →"}
                      </Link>
                      <button type="button" onClick={() => setEditing(item.id)} className="chip">Edit</button>
                    </div>
                  );
                })()}
                {kind === "learning" && (
                  <p className="text-xs text-muted">
                    {item.status === "done" ? "Mastered" : m.next_review && `Next review ${friendlyDate(m.next_review, today)}`}
                  </p>
                )}
                {kind === "decision" && (
                  <div className="mt-1 space-y-0.5 text-sm">
                    {m.pros && <p className="text-emerald-400">+ {m.pros}</p>}
                    {m.cons && <p className={BAD}>− {m.cons}</p>}
                    <p className="text-xs text-muted">Confidence {m.confidence ?? "–"}/5{m.outcome && ` · ${m.outcome === "good" ? "Good call" : "Bad call"}`}</p>
                    {decisionDue && (
                      <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button className="chip" onClick={() => update({ ...item, status: "done", meta: { ...m, outcome: "good" } })}>Good call</button>
                        <button className="chip" onClick={() => update({ ...item, status: "done", meta: { ...m, outcome: "bad" } })}>Bad call</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {pct !== null && <ProgressRing pct={pct} />}
              {kind === "task" && item.status === "open" && (
                <button className="-my-1 rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent/10" onClick={() => startFocus(item.title)}>Focus</button>
              )}
            </li>
          );
        })}
        {visible.length > limit && (
          <li ref={sentinel} className="py-3 text-center text-xs text-muted">
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="underline hover:text-foreground">
              Show more ({visible.length - limit} left)
            </button>
          </li>
        )}
      </ul>
      )}
      {loaded && visible.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {items.length === 0 ? `Nothing in ${label.toLowerCase()} yet. Add your first one above.` : "No items match."}
        </p>
      )}

      {undo && (
        <div role="status" className="card fixed bottom-24 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 px-4 py-3 text-sm lg:bottom-6 lg:left-72">
          <span className="truncate">Deleted “{undo.title}”</span>
          <button onClick={() => { update({ ...undo, deleted_at: null }); setUndo(null); }} className="font-semibold text-accent hover:underline">Undo</button>
        </div>
      )}
    </>
  );
}
