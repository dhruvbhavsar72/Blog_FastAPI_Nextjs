import type { Metadata } from "next";
import { Suspense } from "react";
import PostDetails from "@/components/PostDetails";
import LoadingState from "@/components/LoadingState";

export const metadata: Metadata = {
  title: "Story",
  description: "Read stories from the Fieldnotes journal.",
};

export default function BlogDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-[calc(100%-2rem)] max-w-6xl flex-1 py-12">
          <LoadingState label="Loading story" />
        </main>
      }
    >
      <PostDetails />
    </Suspense>
  );
}
