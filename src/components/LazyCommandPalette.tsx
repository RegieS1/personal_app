"use client";

import dynamic from "next/dynamic";

// AppShell is a Server Component, where next/dynamic does not code-split; this client wrapper does.
// The palette stays out of the first page load and arrives right after hydration (it listens for Ctrl+K).
export const LazyCommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), { ssr: false });
