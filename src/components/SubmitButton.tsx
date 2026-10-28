"use client";

import { useFormStatus } from "react-dom";

// Disables itself while the surrounding form's server action is running.
export function SubmitButton({ formAction, className, children, formNoValidate }: {
  formAction: (formData: FormData) => void | Promise<void>;
  className: string;
  children: React.ReactNode;
  formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button formAction={formAction} formNoValidate={formNoValidate} disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "Please wait…" : children}
    </button>
  );
}
