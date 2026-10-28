import { WeeklyReview } from "@/components/WeeklyReview";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <WeeklyReview userId={user!.id} />;
}
