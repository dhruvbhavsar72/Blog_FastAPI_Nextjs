import type { Metadata } from "next";
import { Suspense } from "react";
import PasswordRecoveryPage from "@/components/PasswordRecoveryPage";
import { eyebrow, pageShell } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your account.",
};

export default function ResetPasswordRoute() {
  return (
    <Suspense
      fallback={
        <main className={`${pageShell} flex flex-1 items-center justify-center py-12 sm:py-16`}>
          <section
            className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9"
            aria-busy="true"
          >
            <p className={eyebrow}>Account recovery</p>
            <div className="mt-4 h-9 w-4/5 animate-pulse rounded-lg bg-secondary" />
            <div className="mt-7 h-12 w-full animate-pulse rounded-xl bg-secondary" />
          </section>
        </main>
      }
    >
      <PasswordRecoveryPage resetOnly />
    </Suspense>
  );
}
