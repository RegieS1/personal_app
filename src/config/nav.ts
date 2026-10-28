import { KINDS } from "./kinds";

const GROWTH_ICON = "M12 22V12 M12 12C12 7 8 4 3 4c0 5 4 8 9 8z M12 14c0-4 3-7 9-7 0 4-3 7-9 7z";

// Single source of truth for navigation. First four are the mobile bottom-bar tabs; the rest go under "More".
export const NAV_ITEMS = [
  { href: "/", label: "Today", icon: "M12 3v2 M12 19v2 M5 12H3 M21 12h-2 M18.4 5.6 17 7 M7 17l-1.4 1.4 M18.4 18.4 17 17 M7 7 5.6 5.6 M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  ...KINDS.filter((k) => !("growth" in k)).map((k) => ({ href: `/${k.slug}`, label: k.label, icon: k.icon })),
  { href: "/growth", label: "Growth", icon: GROWTH_ICON },
  { href: "/review", label: "Weekly review", icon: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M9 16l2 2 4-4" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
];
