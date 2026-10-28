import Link from "next/link";
import { ItemList } from "@/components/items/ItemList";
import { KINDS } from "@/config/kinds";
import { createClient } from "@/lib/supabase/server";

const TABS = KINDS.filter((k) => "growth" in k);

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab, q = "" } = await searchParams;
  const active = TABS.find((t) => t.slug === tab) ?? TABS[0];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <nav aria-label="Growth sections" className="mb-5 flex gap-1 rounded-xl border border-border bg-surface/60 p-1">
        {TABS.map((t) => (
          <Link key={t.slug} href={`/growth?tab=${t.slug}`} aria-current={t === active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm transition ${t === active ? "bg-accent/15 font-medium" : "text-muted hover:text-foreground"}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      <ItemList key={`${active.kind}:${q}`} kind={active.kind} label={active.label} userId={user!.id} initialQuery={q} />
    </>
  );
}
