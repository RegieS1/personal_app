"use client";

import { useState } from "react";
import type { Item } from "@/lib/items";

// Read view of a lesson topic: explanation, notes, examples and code, shown in full.
export function TopicBody({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const [copied, setCopied] = useState(false);
  const m = item.meta ?? {};

  async function copy() {
    try {
      await navigator.clipboard.writeText(m.code ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: the code can still be selected by hand
    }
  }

  const block = (label: string, text?: string | null) =>
    text && (
      <section className="border-l-2 border-accent/50 pl-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      </section>
    );

  return (
    // Clicks inside (selecting text, copying) shouldn't collapse the row.
    <div className="mt-3 cursor-auto space-y-4 rounded-xl bg-background/40 p-3" onClick={(e) => e.stopPropagation()}>
      {block("Explanation", item.notes)}
      {block("Notes", m.details)}
      {block("Examples", m.example)}
      {m.code && (
        <section className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Code</h3>
            <button type="button" onClick={copy} className="min-h-9 rounded-lg px-3 text-xs font-medium text-accent hover:bg-accent/10" aria-live="polite">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto bg-background/80 p-3 font-mono text-sm leading-relaxed"><code>{m.code}</code></pre>
        </section>
      )}
      {!item.notes && !m.details && !m.example && !m.code && <p className="text-sm text-muted">Nothing written yet.</p>}
      <div className="flex justify-end">
        <button type="button" onClick={onEdit} className="btn-secondary">Edit topic</button>
      </div>
    </div>
  );
}
