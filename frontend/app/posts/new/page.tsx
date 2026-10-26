import type { Metadata } from "next";
import RequireAuth from "@/components/RequireAuth";
import PostEditor from "@/components/PostEditor";
import { eyebrow, pageShell } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Write a story",
  description: "Create and publish a new story.",
};

export default function NewPostPage() {
  return (
    <main className={`${pageShell} flex-1 py-12 sm:py-16`}>
      <div className="max-w-3xl">
        <p className={eyebrow}>Your writing desk</p>
        <h1 className="mt-3 font-heading text-4xl sm:text-5xl">A new story</h1>
        <p className="mt-3 text-muted-foreground">
          Write a draft to return to later, or publish it for everyone to read.
        </p>
        <RequireAuth>
          <PostEditor />
        </RequireAuth>
      </div>
    </main>
  );
}
