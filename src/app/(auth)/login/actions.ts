"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

const fail = (message: string): never => redirect(`/login?error=${encodeURIComponent(message)}`);

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) fail(error.message);
  redirect("/");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    ...credentials(formData),
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) fail(error.message);
  // No session means email confirmation is required.
  if (!data.session) redirect("/login?message=Check your email to confirm your account");
  redirect("/");
}

export async function forgotPassword(formData: FormData) {
  const { email } = credentials(formData);
  if (!email) fail("Enter your email first, then tap “Forgot password”.");
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  // Same message whether or not the account exists, so the form can't be used to probe for emails.
  redirect("/login?message=If that email has an account, a reset link is on its way.");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const back = (error: string): never => redirect(`/reset-password?error=${encodeURIComponent(error)}`);
  if (password.length < 6) back("Use at least 6 characters.");
  if (password !== String(formData.get("confirm") ?? "")) back("The passwords don't match.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) back(error.message);
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
