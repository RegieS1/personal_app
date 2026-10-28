"use client";

import { friendlyDate } from "@/lib/dates";
import { isRevisitDue, type Item } from "@/lib/items";

const BAD = "text-red-400";

// Area-specific lines under a list row: the learning review schedule, a decision's pros/cons and outcome.
export function RowDetails({ item, today, onUpdate }: { item: Item; today: string; onUpdate: (i: Item) => void }) {
  const m = item.meta ?? {};
  if (item.kind === "learning") {
    return (
      <p className="text-xs text-muted">
        {item.status === "done" ? "Mastered" : m.next_review && `Next review ${friendlyDate(m.next_review, today)}`}
      </p>
    );
  }
  if (item.kind !== "decision") return null;
  return (
    <div className="mt-1 space-y-0.5 text-sm">
      {m.pros && <p className="text-emerald-400">+ {m.pros}</p>}
      {m.cons && <p className={BAD}>− {m.cons}</p>}
      <p className="text-xs text-muted">Confidence {m.confidence ?? "–"}/5{m.outcome && ` · ${m.outcome === "good" ? "Good call" : "Bad call"}`}</p>
      {isRevisitDue(item, today) && (
        <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          <button className="chip" onClick={() => onUpdate({ ...item, status: "done", meta: { ...m, outcome: "good" } })}>Good call</button>
          <button className="chip" onClick={() => onUpdate({ ...item, status: "done", meta: { ...m, outcome: "bad" } })}>Bad call</button>
        </div>
      )}
    </div>
  );
}
