import { notFound, redirect } from "next/navigation";
import { ItemList } from "@/components/items/ItemList";
import { hrefOf, KINDS } from "@/config/kinds";
import { createClient } from "@/lib/supabase/server";

export default async function KindPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { kind: slug } = await params;
  const { q = "" } = await searchParams;
  const entry = KINDS.find((k) => k.slug === slug);
  if (!entry) notFound();
  // Learning, Wins and Check-ins live as tabs on /growth; keep their old URLs working.
  if ("growth" in entry) redirect(`${hrefOf(entry)}${q ? `&q=${encodeURIComponent(q)}` : ""}`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Keyed on the search too, so arriving from global search with a new ?q= starts fresh.
  return <ItemList key={`${entry.kind}:${q}`} kind={entry.kind} label={entry.label} userId={user!.id} initialQuery={q} />;
}
