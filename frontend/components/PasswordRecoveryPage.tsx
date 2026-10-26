"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ForgotPasswordForm,
  ResetPasswordForm,
} from "@/components/PasswordResetForms";
import { eyebrow, pageShell } from "@/lib/ui";

export default function PasswordRecoveryPage({
  resetOnly = false,
}: {
  resetOnly?: boolean;
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const resetting = resetOnly || Boolean(token);

  return (
    <main className={`${pageShell} flex flex-1 items-center justify-center py-12 sm:py-16`}>
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <p className={eyebrow}>Account recovery</p>
        <h1 className="mt-3 font-heading text-3xl">
          {resetting ? "Choose a new password." : "Reset your password."}
        </h1>
        {resetting ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Enter your account email and we’ll send a reset link if it matches
              an account.
            </p>
            <ForgotPasswordForm />
          </>
        )}
        <Link
          href="/login"
          className="mt-6 block text-center text-sm font-semibold text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
