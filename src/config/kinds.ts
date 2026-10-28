// One entry per item kind; the route slug maps to items.kind. `icon` is SVG path data (24x24, stroked).
// Flags pick which fields an area uses: `status` = checkbox + open/done, `priority`, `due` = due/revisit date.
// `growth` kinds are shown as tabs on the Growth page instead of having their own sidebar entry.
export const KINDS = [
  { slug: "goals", kind: "goal", label: "Goals", status: true, priority: true, due: true, icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
  { slug: "projects", kind: "project", label: "Projects", status: true, priority: true, due: true, icon: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" },
  { slug: "tasks", kind: "task", label: "Tasks", status: true, priority: true, due: true, icon: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { slug: "decisions", kind: "decision", label: "Decisions", status: false, priority: false, due: true, icon: "M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9" },
  { slug: "finances", kind: "finance", label: "Finances", status: false, priority: false, due: false, icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v12 M15 9.5c0-1-1.3-2-3-2s-3 .9-3 2 1.3 2 3 2 3 .9 3 2-1.3 2-3 2-3-1-3-2" },
  { slug: "learning", kind: "learning", label: "Learning", growth: true, status: false, priority: false, due: false, icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
  { slug: "career", kind: "career", label: "Wins", growth: true, status: false, priority: false, due: false, icon: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" },
  { slug: "development", kind: "development", label: "Check-ins", growth: true, status: false, priority: false, due: false, icon: "M22 7l-8.5 8.5-5-5L2 17 M16 7h6v6" },
] as const;

export type KindConfig = (typeof KINDS)[number];
export const kindOf = (kind: string) => KINDS.find((k) => k.kind === kind);
// Where an item of this kind lives in the UI (growth kinds are tabs on /growth).
export const hrefOf = (k: KindConfig) => ("growth" in k ? `/growth?tab=${k.slug}` : `/${k.slug}`);
