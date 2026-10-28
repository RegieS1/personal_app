import { SubmitButton } from "@/components/SubmitButton";
import { updatePassword } from "@/app/(auth)/login/actions";

// Reached from the reset email: the callback signs the user in, then they choose a new password here.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <form className="card mx-auto max-w-sm space-y-4 p-6">
      <h1 className="title">New password</h1>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
      <label className="block space-y-1 text-sm font-medium">
        New password
        <input name="password" type="password" required minLength={6} autoComplete="new-password" className="input font-normal" />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Confirm password
        <input name="confirm" type="password" required minLength={6} autoComplete="new-password" className="input font-normal" />
      </label>
      <SubmitButton formAction={updatePassword} className="btn-primary w-full">Save password</SubmitButton>
    </form>
  );
}
