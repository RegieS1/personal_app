"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_ITEMS } from "@/config/nav";
import { hrefOf, kindOf } from "@/config/kinds";
import { loadAll, searchText, type Item } from "@/lib/items";
import { OPEN_EVENT, takePendingOpen } from "./SearchButton";

type Result = { key: string; label: string; hint: string; href: string };

// Ctrl/Cmd+K (or the search buttons) opens a search over every page and every saved item.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(takePendingOpen);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const show = () => {
      takePendingOpen(); // already handled live, so a later mount will not reopen it
      setOpen(true);
    };
    window.addEventListener("keydown", key);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadAll().then(setItems);
    const t = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = NAV_ITEMS.filter((n) => !q || n.label.toLowerCase().includes(q)).map((n) => ({ key: n.href, label: n.label, hint: "Go to", href: n.href }));
    if (!q) return pages;
    const found = items
      .filter((i) => searchText(i).includes(q))
      .slice(0, 20)
      .map((i) => {
        const k = kindOf(i.kind)!;
        const href = hrefOf(k);
        // The area page reads ?q= and starts with this search filled in.
        return { key: i.id, label: i.title, hint: k.label, href: `${href}${href.includes("?") ? "&" : "?"}q=${encodeURIComponent(i.title)}` };
      });
    return [...pages, ...found];
  }, [query, items]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function go(r: Result | undefined) {
    if (!r) return;
    close();
    router.push(r.href);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh] backdrop-blur-sm" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label="Search" className="card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <input
          ref={input}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Enter") go(results[active]);
          }}
          placeholder="Search everything…"
          aria-label="Search everything"
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `result-${results[active].key}` : undefined}
          className="w-full border-b border-border bg-transparent px-4 py-4 text-base outline-none"
        />
        <ul id="search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {results.map((r, i) => (
            <li key={r.key} id={`result-${r.key}`} role="option" aria-selected={i === active}>
              <button
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm ${i === active ? "bg-accent/15" : ""}`}
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-muted">{r.hint}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches.</li>}
        </ul>
      </div>
    </div>
  );
}
