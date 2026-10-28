import { WeeklyReview } from "@/components/WeeklyReview";
import { getClaims } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const claims = await getClaims();
  return <WeeklyReview userId={claims!.sub} />;
}
