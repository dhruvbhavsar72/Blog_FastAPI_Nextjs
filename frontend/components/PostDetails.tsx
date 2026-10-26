"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock3, Heart, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import LoadingState from "@/components/LoadingState";
import { formatPostDate, readingMinutes } from "@/components/BlogPostCard";
import {
  createComment,
  deleteComment,
  getComments,
  getPostLikeStatus,
  setPostLiked,
} from "@/lib/api/community";
import { getApiErrorMessage, getAssetUrl } from "@/lib/api/client";
import { deletePost, getPost } from "@/lib/api/posts";
import type { Comment } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";

export default function PostDetails() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const validPostId = Number.isInteger(postId) && postId > 0;
  const postQuery = useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => getPost(postId),
    enabled: validPostId,
  });
  const commentsQuery = useQuery({
    queryKey: queryKeys.comments(postId),
    queryFn: () => getComments(postId),
    enabled: validPostId,
  });
  const likeQuery = useQuery({
    queryKey: queryKeys.postLike(postId, user?.id ?? 0),
    queryFn: () => getPostLikeStatus(postId),
    enabled: validPostId && Boolean(user),
  });
  const post = postQuery.data;
  const comments = (commentsQuery.data ?? []).filter(
    (comment) => !comment.is_deleted,
  );
  const likeStatus = likeQuery.data;
  const [content, setContent] = useState("");
  const createCommentMutation = useMutation({
    mutationFn: (commentContent: string) => createComment(postId, commentContent),
    onSuccess: (created) => {
      queryClient.setQueryData<Comment[]>(
        queryKeys.comments(postId),
        (items = []) => [...items, created],
      );
      setContent("");
      toast.success("Comment posted.");
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });
  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.comments(postId),
      });
      toast.success("Comment deleted.");
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });
  const setLikeMutation = useMutation({
    mutationFn: (liked: boolean) => setPostLiked(postId, liked),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.postLike(postId, user?.id ?? 0),
        updated,
      );
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });
  const deletePostMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.mine() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.published() }),
      ]);
      toast.success("Story deleted.");
      router.push("/dashboard");
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });
  const busy =
    createCommentMutation.isPending ||
    deleteCommentMutation.isPending ||
    setLikeMutation.isPending ||
    deletePostMutation.isPending;
  const commentError = commentsQuery.error
    ? getApiErrorMessage(commentsQuery.error)
    : "";
  const likeError = likeQuery.error
    ? getApiErrorMessage(likeQuery.error)
    : "";
  const error = !validPostId
    ? "This story could not be found."
    : postQuery.error
      ? getApiErrorMessage(postQuery.error)
      : "";

  if (postQuery.isPending || authLoading) {
    return <main className="mx-auto w-[calc(100%-2rem)] max-w-6xl flex-1 py-12"><LoadingState label="Loading story" /></main>;
  }
  if (error || !post) {
    return (
      <main className="mx-auto w-[calc(100%-2rem)] max-w-6xl flex-1 py-16">
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error || "Story not found."}</p>
        <Link href="/blog" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent">Back to the journal</Link>
      </main>
    );
  }

  const isOwner = user?.id === post.user_id;
  if (post.status !== "published" && !isOwner) {
    return (
      <main className="mx-auto w-[calc(100%-2rem)] max-w-6xl flex-1 py-16">
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">This story is not available.</p>
        <Link href="/blog" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent">Back to the journal</Link>
      </main>
    );
  }
  const cover = post.media.find((item) => item.media_type === "image");

  function toggleLike() {
    if (!user) {
      router.push("/login");
      return;
    }
    setLikeMutation.mutate(!likeStatus?.liked);
  }

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    createCommentMutation.mutate(content.trim());
  }

  function removePost() {
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    deletePostMutation.mutate(postId);
  }

  function removeComment(commentId: number) {
    deleteCommentMutation.mutate(commentId);
  }

  return (
    <main className="flex-1">
      <article className="mx-auto w-[calc(100%-2rem)] max-w-4xl py-10 sm:py-14">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> All stories
        </Link>
        <header className="mx-auto mt-9 max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <span className="inline-flex w-fit items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground" key={category.id}>{category.category_name}</span>
            ))}
            {post.status === "draft" && <span className="inline-flex w-fit items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Draft</span>}
          </div>
          <h1 className="mt-5 font-heading text-4xl leading-tight sm:text-6xl">{post.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>
              By {[
                post.author?.first_name,
                post.author?.last_name,
              ].filter(Boolean).join(" ") ||
                (isOwner
                  ? [user?.first_name, user?.last_name].filter(Boolean).join(" ")
                  : "") ||
                "Author"}
            </span>
            <time dateTime={post.published_at ?? post.created_at}>
              {formatPostDate(post.published_at ?? post.created_at)}
            </time>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={15} aria-hidden="true" />
              {readingMinutes(post.description)} min read
            </span>
          </div>
          {isOwner && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/posts/${post.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent">
                <Pencil size={15} aria-hidden="true" /> Edit story
              </Link>
              <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-5 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50" onClick={removePost} disabled={busy}>
                <Trash2 size={15} aria-hidden="true" /> Delete
              </button>
            </div>
          )}
        </header>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getAssetUrl(cover.file_url)}
            alt=""
            className="mt-9 max-h-136 w-full rounded-3xl bg-secondary object-cover"
          />
        )}
        <div className="mx-auto mt-10 max-w-3xl space-y-6 text-base leading-8 text-foreground sm:text-lg sm:leading-9">
          {post.description.split(/\n{2,}/).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
          ))}
          {post.tags.length > 0 && (
            <div className="mt-9 flex flex-wrap gap-2">
              {post.tags.map((tag) => <span className="inline-flex w-fit items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground" key={tag.id}>#{tag.tag_name}</span>)}
            </div>
          )}
        </div>
        <div className="mx-auto mt-10 flex max-w-3xl items-center justify-between border-y border-border py-5">
          <p className="text-sm text-muted-foreground">Enjoyed this story?</p>
          <button
            type="button"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent disabled:opacity-50 ${likeStatus?.liked ? "text-destructive" : ""}`}
            aria-pressed={Boolean(likeStatus?.liked)}
            onClick={toggleLike}
            disabled={busy || Boolean(user && likeQuery.isPending)}
          >
            <Heart size={16} aria-hidden="true" />
            {likeStatus ? likeStatus.like_count : "Like"}
          </button>
        </div>
        {likeError && <p role="alert" className="mx-auto mt-3 max-w-3xl text-sm text-destructive">{likeError}</p>}
        <section className="mx-auto mt-12 max-w-3xl" aria-labelledby="comments-heading">
          <h2 id="comments-heading" className="font-heading text-3xl">Conversation</h2>
          <form className="mt-5" onSubmit={submitComment}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
              Leave a thoughtful comment
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={5000}
                rows={4}
                required
                placeholder={user ? "Add to the conversation…" : "Sign in to join the conversation"}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 font-normal text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </label>
            {commentError && <p role="alert" className="mt-2 text-sm text-destructive">{commentError}</p>}
            <button type="submit" disabled={busy || !content.trim()} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
              Post comment
            </button>
          </form>
          <div className="mt-8 space-y-4">
            {commentsQuery.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                Loading comments…
              </p>
            ) : commentsQuery.isError ? null : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No comments yet. Start the conversation.
              </p>
            ) : comments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {[comment.user.first_name, comment.user.last_name]
                        .filter(Boolean)
                        .join(" ") || "Reader"}
                    </p>
                    <time
                      className="mt-1 block text-xs text-muted-foreground"
                      dateTime={comment.created_at}
                    >
                      {formatPostDate(comment.created_at)}
                    </time>
                  </div>
                  {user?.id === comment.user_id && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => removeComment(comment.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {comment.content}
                </p>
              </article>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
