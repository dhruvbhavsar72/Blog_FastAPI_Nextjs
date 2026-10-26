import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { eyebrow, pageShell } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to manage your Fieldnotes stories.",
};

export default function LoginPage() {
  return (
    <main className={`${pageShell} flex flex-1 items-center justify-center py-12 sm:py-16`}>
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <p className={eyebrow}>Welcome back</p>
        <h1 className="mt-3 font-heading text-3xl">Sign in to Fieldnotes.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Pick up where you left off and keep exploring.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
