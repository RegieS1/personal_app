import { PasswordInput } from "@/components/PasswordInput";
import { SubmitButton } from "@/components/SubmitButton";
import { forgotPassword, signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <form className="card w-full max-w-sm space-y-5 p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-accent to-accent-2 text-lg font-bold text-white shadow-lg shadow-accent/30" aria-hidden>B</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Be Positive</h1>
            <p className="text-sm text-muted">Sign in, or create a free account.</p>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">{message}</p>}
        <label className="block space-y-1 text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className="input font-normal" />
        </label>
        <label className="block space-y-1 text-sm font-medium">
          Password
          <PasswordInput name="password" required minLength={6} autoComplete="current-password" className="input font-normal" />
        </label>
        <div className="flex gap-2">
          <SubmitButton formAction={signIn} className="btn-primary flex-1">Sign in</SubmitButton>
          <SubmitButton formAction={signUp} className="btn-secondary flex-1">Create account</SubmitButton>
        </div>
        {/* formNoValidate: only the email is needed to send a reset link. */}
        <SubmitButton formAction={forgotPassword} formNoValidate className="w-full text-center text-sm text-muted underline hover:text-foreground">
          Forgot password? Enter your email above, then tap here
        </SubmitButton>
      </form>
    </main>
  );
}
