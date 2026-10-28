"use client";

import Link from "next/link";
import { friendlyDate, ymd } from "@/lib/dates";
import type { Item } from "@/lib/items";

// The Lessons tab: one card per lesson; the whole card opens its topics, the pencil edits it in place.
export function LessonCards({ lessons, related, today, editingId, renderEdit, onEdit }: {
  lessons: Item[];
  related: Item[]; // the topics, used for counts and "updated"
  today: string;
  editingId: string | null;
  renderEdit: (item: Item) => React.ReactNode;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 empty:hidden">
      {lessons.map((item) => {
        if (editingId === item.id) return <div key={item.id} className="card p-3 sm:col-span-2">{renderEdit(item)}</div>;
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
            <button type="button" onClick={() => onEdit(item.id)} aria-label={`Edit ${item.title}`}
              className="relative z-10 -m-1 grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-border/50 hover:text-foreground">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
