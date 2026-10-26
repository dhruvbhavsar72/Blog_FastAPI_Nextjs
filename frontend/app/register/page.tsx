import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Join Fieldnotes",
  description: "Create an account and join the Fieldnotes community.",
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-14 sm:px-8">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Join the community
        </p>
        <h1 className="mt-3 font-heading text-3xl text-card-foreground">
          Make yourself at home.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Create an account to get closer to the stories and ideas you love.
        </p>

        <RegisterForm />
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          By joining, you agree to our community guidelines.
        </p>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Just browsing?{" "}
          <Link
            href="/blog"
            className="font-semibold text-primary hover:underline"
          >
            Read the blog
          </Link>
        </p>
      </div>
    </main>
  );
}
