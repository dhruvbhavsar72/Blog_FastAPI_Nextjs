"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Search, SlidersHorizontal } from "lucide-react";
import BlogPostCard from "@/components/BlogPostCard";
import LoadingState from "@/components/LoadingState";
import { getApiErrorMessage } from "@/lib/api/client";
import { getPosts } from "@/lib/api/posts";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 6;

export default function BlogListing() {
  const {
    data: posts = [],
    isPending: loading,
    error: requestError,
  } = useQuery({
    queryKey: queryKeys.posts.published(),
    queryFn: getPosts,
  });
  const error = requestError ? getApiErrorMessage(requestError) : "";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          posts.flatMap((post) =>
            post.categories.map((item) => [item.id, item.category_name] as const),
          ),
        ),
      ),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts
      .filter((post) => {
        const matchesSearch =
          !query ||
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.tags.some((tag) => tag.tag_name.toLowerCase().includes(query));
        const matchesCategory =
          category === "all" ||
          post.categories.some((item) => String(item.id) === category);
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const dateA = new Date(a.published_at ?? a.created_at).getTime();
        const dateB = new Date(b.published_at ?? b.created_at).getTime();
        return sort === "oldest" ? dateA - dateB : dateB - dateA;
      });
  }, [posts, search, category, sort]);

  useEffect(() => setPage(1), [search, category, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const pagePosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="mx-auto container flex-1 py-12 sm:py-16">
      <motion.header
        className="max-w-3xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">The Fieldnotes journal</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight sm:text-6xl">
          Stories for a curious life.
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Notes on creativity, culture, and paying attention to the world around
          us.
        </p>
      </motion.header>

      <section aria-label="Filter stories" className="mt-9 flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-3">
        <label className="flex min-h-11 flex-[1_1_16rem] items-center gap-2 rounded-xl border border-border px-3 text-muted-foreground focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search stories</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search stories"
            className="w-full border-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="flex min-h-11 flex-[0_1_12rem] items-center rounded-xl border border-border px-3 text-muted-foreground">
          <span className="sr-only">Filter by category</span>
          <select
            className="w-full bg-transparent text-foreground outline-none"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 flex-[0_1_12rem] items-center gap-2 rounded-xl border border-border px-3 text-muted-foreground">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span className="sr-only">Sort stories</span>
          <select className="w-full bg-transparent text-foreground outline-none" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </section>

      {loading ? (
        <div className="mt-9"><LoadingState /></div>
      ) : error ? (
        <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
      ) : pagePosts.length === 0 ? (
        <div className="mt-9 rounded-3xl border border-dashed border-border bg-card p-8 sm:p-12">
          <h2 className="font-heading text-2xl">
            {posts.length ? "No stories match those filters." : "Nothing published yet."}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {posts.length
              ? "Try another search or category."
              : "Check back soon for the first story."}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground" aria-live="polite">
            {filteredPosts.length} {filteredPosts.length === 1 ? "story" : "stories"}
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {pagePosts.map((post) => <BlogPostCard key={post.id} post={post} />)}
          </div>
          {pageCount > 1 && (
            <nav aria-label="Story pages" className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
