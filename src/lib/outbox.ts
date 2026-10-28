// Pure sync rules, kept free of app imports so scripts/items.check.mjs can test them with plain Node.

type Row = { id: string; deleted_at: string | null };

// Rows still waiting in the outbox win over the server copy (they are newer); a queued delete hides the row.
export function withOutbox<T extends Row>(data: T[], box: Record<string, T>, keep: (i: T) => boolean): T[] {
  return [...Object.values(box).filter((i) => keep(i) && !i.deleted_at), ...data.filter((i) => !box[i.id])];
}

// Postgres refused the row itself (SQLSTATE like 23514 check failed, 42501 security rule): retrying won't help.
// Network failures have no code and PostgREST/auth errors use longer PGRST… codes; those are worth retrying.
export const rejected = (e: { code?: string } | null) => !!e?.code && /^[0-9A-Z]{5}$/.test(e.code);
