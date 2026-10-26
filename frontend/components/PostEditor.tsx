"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { useAuth } from "@/components/AuthProvider";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  createCategory,
  createPost,
  createTag,
  getCategories,
  getPost,
  getTags,
  updatePost,
} from "@/lib/api/posts";
import type { Category, Tag } from "@/lib/api/types";
import { queryKeys } from "@/lib/query-keys";
import {
  contentButton,
  errorNotice,
  fieldHint,
  fieldLabel,
  secondaryButton,
} from "@/lib/ui";

const postSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(200, "Title must be 200 characters or fewer."),
  description: z.string().trim().min(1, "Write the body of your story."),
});

export default function PostEditor({ postId }: { postId?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(user?.id ?? 0),
    queryFn: getCategories,
    enabled: Boolean(user),
  });
  const tagsQuery = useQuery({
    queryKey: queryKeys.tags(user?.id ?? 0),
    queryFn: getTags,
    enabled: Boolean(user),
  });
  const postQuery = useQuery({
    queryKey: queryKeys.posts.detail(postId ?? 0),
    queryFn: () => getPost(postId!),
    enabled: postId !== undefined,
  });
  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const post = postQuery.data ?? null;
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [file, setFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!post) return;
    setTitle(post.title);
    setDescription(post.description);
    setStatus(post.status === "published" ? "published" : "draft");
    setCategoryIds(post.categories.map((item) => item.id));
    setTagIds(post.tags.map((item) => item.id));
  }, [post]);

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(
        queryKeys.categories(user?.id ?? 0),
        (items = []) => [...items, category],
      );
      setCategoryIds((items) => [...items, category.id]);
      setNewCategory("");
      toast.success("Category added.");
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: (tag) => {
      queryClient.setQueryData<Tag[]>(
        queryKeys.tags(user?.id ?? 0),
        (items = []) => [...items, tag],
      );
      setTagIds((items) => [...items, tag.id]);
      setNewTag("");
      toast.success("Tag added.");
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FormData }) =>
      id ? updatePost(id, payload) : createPost(payload),
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.posts.detail(saved.id), saved);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.posts.mine(user?.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.posts.published() }),
      ]);
      toast.success(postId ? "Story updated." : "Story saved.");
      router.push("/dashboard");
      router.refresh();
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });

  const loading =
    categoriesQuery.isPending ||
    tagsQuery.isPending ||
    (postId !== undefined && postQuery.isPending);
  const lookupRequestError =
    categoriesQuery.error ?? tagsQuery.error ?? postQuery.error;

  function addCategory() {
    if (!newCategory.trim()) return;
    createCategoryMutation.mutate(newCategory.trim());
  }

  function addTag() {
    if (!newTag.trim()) return;
    createTagMutation.mutate(newTag.trim());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validation = postSchema.safeParse({ title, description });
    if (!validation.success) {
      setError(validation.error.issues.map((issue) => issue.message).join(" "));
      return;
    }

    const payload = new FormData();
    payload.append("title", validation.data.title);
    payload.append("description", validation.data.description);
    payload.append("status", status);
    categoryIds.forEach((id) => payload.append("category_ids", String(id)));
    tagIds.forEach((id) => payload.append("tag_ids", String(id)));
    if (file) payload.append("file", file);

    saveMutation.mutate({ id: postId, payload });
  }

  if (loading) {
    return <p role="status" className="py-10 text-sm text-muted-foreground">Loading editor…</p>;
  }
  if (lookupRequestError || (postId && !post && postQuery.isError)) {
    return <p role="alert" className={errorNotice}>{getApiErrorMessage(lookupRequestError ?? postQuery.error)}</p>;
  }

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
      <label className={fieldLabel}>
        Story title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          placeholder="Give your story a thoughtful title"
        />
      </label>
      <label className={fieldLabel}>
        Story
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={14}
          required
          placeholder="Start writing…"
        />
        <span className={fieldHint}>
          Separate paragraphs with a blank line. Your article text is published as plain text.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={fieldLabel}>
          Categories
          <select
            multiple
            value={categoryIds.map(String)}
            onChange={(event) =>
              setCategoryIds(
                Array.from(event.target.selectedOptions, (item) => Number(item.value)),
              )
            }
            className="min-h-32"
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.category_name}</option>
            ))}
          </select>
        </label>
        <label className={fieldLabel}>
          Tags
          <select
            multiple
            value={tagIds.map(String)}
            onChange={(event) =>
              setTagIds(
                Array.from(event.target.selectedOptions, (item) => Number(item.value)),
              )
            }
            className="min-h-32"
          >
            {tags.map((item) => <option key={item.id} value={item.id}>{item.tag_name}</option>)}
          </select>
        </label>
      </div>
      {post && (post.categories.length > 0 || post.tags.length > 0) && (
        <p className={fieldHint}>
          The update API cannot clear every category or tag at once. If you leave
          either selection empty, its existing associations will remain.
        </p>
      )}

      <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <label className={`${fieldLabel} flex-1`}>
            Add a category
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addCategory();
                }
              }}
              maxLength={100}
            />
          </label>
          <button
            className={`${secondaryButton} shrink-0`}
            type="button"
            aria-label="Create category"
            onClick={() => void addCategory()}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label className={`${fieldLabel} flex-1`}>
            Add a tag
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addTag();
                }
              }}
              maxLength={100}
            />
          </label>
          <button
            className={`${secondaryButton} shrink-0`}
            type="button"
            aria-label="Create tag"
            onClick={() => void addTag()}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <label className={fieldLabel}>
        Cover image or PDF <span className={fieldHint}>(optional, up to 10 MB)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="text-sm font-normal text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-secondary-foreground"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        {file && (
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setFile(null)}
          >
            <X size={13} aria-hidden="true" /> Remove {file.name}
          </button>
        )}
        {post?.media[0] && !file && (
          <span className={fieldHint}>Current attachment: {post.media[0].original_filename}</span>
        )}
      </label>

      <label className={`${fieldLabel} max-w-xs`}>
        Publishing status
        <select value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}>
          <option value="draft">Save as draft</option>
          <option value="published">Publish now</option>
        </select>
      </label>
      {error && <p role="alert" className={errorNotice}>{error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <button className={contentButton} type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : postId ? "Save changes" : status === "published" ? "Publish story" : "Save draft"}
        </button>
        <button className={secondaryButton} type="button" onClick={() => router.back()} disabled={saveMutation.isPending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
