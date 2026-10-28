"use client";

// Helpers used on every list row (kept out of panels.tsx so rows don't pull in the per-area panels).
import { isOverdue, type Item } from "@/lib/items";

/* ---------- Goals & projects ---------- */

// Progress counts tasks under the goal (directly or via its projects); falls back to projects when it has no tasks.
export function goalProgress(goal: Item, related: Item[]) {
  const projects = related.filter((i) => i.kind === "project" && i.parent_id === goal.id);
  const ids = new Set([goal.id, ...projects.map((p) => p.id)]);
  const tasks = related.filter((i) => i.kind === "task" && i.parent_id && ids.has(i.parent_id));
  const leaves = tasks.length ? tasks : projects;
  const done = leaves.filter((i) => i.status === "done").length;
  return leaves.length ? Math.round((done / leaves.length) * 100) : null;
}

export function ProgressRing({ pct }: { pct: number }) {
  return (
    <div
      className="grid size-11 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--border) 0)` }}
      title={`${pct}% complete`}
    >
      <div className="grid size-8 place-items-center rounded-full bg-surface text-[11px] tabular-nums">{pct}%</div>
    </div>
  );
}

export function projectHealth(project: Item, related: Item[], today: string) {
  const tasks = related.filter((i) => i.kind === "task" && i.parent_id === project.id);
  const open = tasks.filter((t) => t.status === "open");
  if (project.status === "done") return { label: "Done", cls: "bg-accent/15 text-accent" };
  if (!tasks.length) return { label: "No tasks", cls: "bg-border text-muted" };
  if (open.some((t) => isOverdue(t, today))) return { label: "At risk", cls: "bg-red-500/15 text-red-400" };
  const lastTouched = Math.max(...tasks.map((t) => Date.parse(t.updated_at)));
  if (open.length && Date.now() - lastTouched > 14 * 864e5) return { label: "Stalled", cls: "bg-amber-400/15 text-amber-300" };
  return { label: "On track", cls: "bg-emerald-400/15 text-emerald-300" };
}

/* ---------- Development ---------- */

export const MOOD_NAMES = ["Very low", "Low", "Okay", "Good", "Great"];
const MOUTHS = [
  "M8.5 16.5c1-1.5 2.2-2 3.5-2s2.5.5 3.5 2",
  "M9 15.8c1-.6 2-.8 3-.8s2 .2 3 .8",
  "M9 15h6",
  "M8.5 14c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2",
  "M8 13.5c.5 3 2 4 4 4s3.5-1 4-4z",
];

export function MoodFace({ mood, className }: { mood: number; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={MOOD_NAMES[mood - 1]}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="9" cy="10" r=".6" fill="currentColor" />
      <circle cx="15" cy="10" r=".6" fill="currentColor" />
      <path d={MOUTHS[mood - 1]} />
    </svg>
  );
}
