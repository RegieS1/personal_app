import Link from "next/link";
import { ItemList } from "@/components/items/ItemList";
import { KINDS } from "@/config/kinds";
import { createClient } from "@/lib/supabase/server";

const GROWTH = KINDS.filter((k) => "growth" in k);
const TABS = GROWTH.filter((k) => !("tabHidden" in k));

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; lesson?: string }> }) {
  const { tab, q = "", lesson } = await searchParams;
  const active = GROWTH.find((t) => t.slug === tab) ?? TABS[0];
  // Topics have no tab of their own; they sit under Lessons.
  const tabFor = active.kind === "topic" ? "lesson" : active.kind;
  const parentFilter = active.kind === "topic" ? lesson : undefined;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <nav aria-label="Growth sections" className="mb-5 flex gap-1 rounded-xl border border-border bg-surface/60 p-1">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/growth?tab=${t.slug}`} aria-current={t.kind === tabFor ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm transition ${t.kind === tabFor ? "bg-accent/15 font-medium" : "text-muted hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {/* ?lesson=<id> on Topics shows only that lesson's topics. */}
      <ItemList
        key={`${active.kind}:${q}:${parentFilter ?? ""}`}
        kind={active.kind}
        label={active.label}
        userId={user!.id}
        initialQuery={q}
        parentFilter={parentFilter}
      />
    </>
  );
}
