"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="mx-auto flex min-h-[55vh] w-[calc(100%-2rem)] max-w-6xl items-center justify-center">
        <p className="text-sm text-muted-foreground" role="status">
          {loading ? "Checking your session…" : "Redirecting to sign in…"}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
