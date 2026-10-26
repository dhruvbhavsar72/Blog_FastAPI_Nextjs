import type { Metadata } from "next";
import RequireAuth from "@/components/RequireAuth";
import PostEditor from "@/components/PostEditor";
import { eyebrow, errorNotice, pageShell } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Edit story",
  description: "Update one of your stories.",
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId < 1) {
    return (
      <main className={`${pageShell} flex-1 py-16`}>
        <p role="alert" className={errorNotice}>The story ID is invalid.</p>
      </main>
    );
  }
  return (
    <main className={`${pageShell} flex-1 py-12 sm:py-16`}>
      <div className="max-w-3xl">
        <p className={eyebrow}>Your writing desk</p>
        <h1 className="mt-3 font-heading text-4xl sm:text-5xl">Edit your story</h1>
        <RequireAuth>
          <PostEditor postId={postId} />
        </RequireAuth>
      </div>
    </main>
  );
}
