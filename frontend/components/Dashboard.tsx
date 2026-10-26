"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FilePlus2 } from "lucide-react";
import toast from "react-hot-toast";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { formatPostDate } from "@/components/BlogPostCard";
import { getApiErrorMessage } from "@/lib/api/client";
import { deletePost, getMyPosts } from "@/lib/api/posts";
import { queryKeys } from "@/lib/query-keys";
import type { BlogPost } from "@/lib/api/types";

function DashboardContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: posts = [],
    isPending: loading,
    error: postsError,
    refetch: refetchPosts,
  } = useQuery({
    queryKey: queryKeys.posts.mine(user?.id ?? 0),
    queryFn: getMyPosts,
    enabled: Boolean(user),
  });
  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.mine() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.published() }),
      ]);
      toast.success("Story deleted.");
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });
  const error = postsError ? getApiErrorMessage(postsError) : "";

  function removePost(post: BlogPost) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    deleteMutation.mutate(post.id);
  }

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-6xl flex-1 py-12 sm:py-16">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your writing desk</p>
          <h1 className="mt-3 font-heading text-4xl sm:text-5xl">
            Welcome{user?.first_name ? `, ${user.first_name}` : " back"}.
          </h1>
          <p className="mt-3 text-muted-foreground">Create, edit, and manage your stories.</p>
        </div>
        <Link href="/posts/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">
          <FilePlus2 size={16} aria-hidden="true" /> New story
        </Link>
      </div>
      {error && <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {loading ? (
        <p role="status" className="py-12 text-sm text-muted-foreground">Loading your stories…</p>
      ) : postsError && posts.length === 0 ? (
        <div className="mt-9 rounded-3xl border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground">
            Your stories could not be loaded.
          </p>
          <button
            type="button"
            onClick={() => void refetchPosts()}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent"
          >
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-9 rounded-3xl border border-dashed border-border bg-card p-8 sm:p-12">
          <h2 className="font-heading text-2xl">Your writing desk is clear.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Start with a draft or publish your first story.</p>
          <Link href="/posts/new" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">Create a story <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      ) : (
        <div className="mt-9 space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-heading text-xl">{post.title}</h2>
                  <span className={`inline-flex w-fit items-center rounded-full border border-border px-3 py-1 text-xs font-semibold ${post.status === "published" ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {post.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Updated {formatPostDate(post.updated_at)}
                  {post.categories.length > 0 && ` · ${post.categories.map((item) => item.category_name).join(", ")}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link href={`/blog/${post.id}`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent">View</Link>
                <Link href={`/posts/${post.id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent">Edit</Link>
                <button type="button" disabled={deleteMutation.isPending} className="inline-flex min-h-10 items-center justify-center rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50" onClick={() => void removePost(post)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default function Dashboard() {
  return <RequireAuth><DashboardContent /></RequireAuth>;
}
