"use client";

// Kept apart from CommandPalette so this tiny button can ship in the first bundle while the palette loads lazily.
export const OPEN_EVENT = "open-search";
// A tap before the lazy palette has loaded is remembered, so the palette opens as soon as it mounts.
let pending = false;
export const takePendingOpen = () => { const p = pending; pending = false; return p; };
export const openSearch = () => {
  pending = true;
  window.dispatchEvent(new Event(OPEN_EVENT));
};

export function SearchButton({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={openSearch} aria-label="Search everything" className={className}>
      <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
        <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3" />
      </svg>
      {children}
    </button>
  );
}
