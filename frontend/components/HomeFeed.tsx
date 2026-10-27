"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import BlogPostCard, {
  formatPostDate,
  readingMinutes,
} from "@/components/BlogPostCard";
import LoadingState from "@/components/LoadingState";
import { getApiErrorMessage, getAssetUrl } from "@/lib/api/client";
import { getPosts } from "@/lib/api/posts";
import { queryKeys } from "@/lib/query-keys";

export default function HomeFeed() {
  const {
    data: posts = [],
    isPending: loading,
    error: requestError,
  } = useQuery({
    queryKey: queryKeys.posts.published(),
    queryFn: getPosts,
  });
  const error = requestError ? getApiErrorMessage(requestError) : "";

  const featured = posts[0];
  const featuredImage = featured?.media.find((item) => item.media_type === "image");

  return (
    <main className="flex-1">
      <section className="border-b border-border bg-linear-to-b from-secondary/40 to-background">
        <div className="mx-auto grid w-[calc(100%-2rem)] max-w-6xl gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span className="size-2 rounded-full bg-primary" />
              An independent journal
            </p>
            <h1 className="mt-6 font-heading text-5xl font-medium leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              A little more curious. A little more connected.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Stories about creativity, culture, and the small things that make
              everyday life feel extraordinary.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/blog" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">
                Explore the journal <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent">
                Share your story
              </Link>
            </div>
            <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen size={15} aria-hidden="true" />
              A quiet corner of the internet, made for good reading.
            </p>
          </motion.div>

          {loading ? (
            <div className="animate-pulse min-h-80 rounded-4xl bg-secondary sm:min-h-104" />
          ) : error ? (
            <div className="flex min-h-80 flex-col items-start justify-end rounded-4xl border border-border bg-card p-8 sm:min-h-104 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Journal temporarily unavailable</p>
              <h2 className="mt-4 max-w-md font-heading text-3xl leading-tight sm:text-4xl">
                We could not load the latest stories.
              </h2>
              <p role="alert" className="mt-3 max-w-md text-sm text-destructive">{error}</p>
            </div>
          ) : featured ? (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <Link
                href={`/blog/${featured.id}`}
                className="group relative isolate flex min-h-80 flex-col justify-between overflow-hidden rounded-4xl bg-linear-to-br from-primary/80 via-primary/50 to-foreground p-7 text-white sm:min-h-104 sm:p-10"
              >
                {featuredImage ? (
                  <Image
                    src={getAssetUrl(featuredImage.file_url)}
                    alt=""
                    fill
                    unoptimized
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500/60 via-primary/60 to-foreground" aria-hidden="true" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-black/10" />
                <div className="relative flex items-center justify-between">
                  <span className="rounded-full border border-white/40 bg-black/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    Latest story
                  </span>
                  <ArrowRight
                    size={20}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </div>
                <div className="relative">
                  <p className="mb-3 text-sm text-white/80">
                    {featured.categories[0]?.category_name ?? "From the journal"}
                  </p>
                  <h2 className="max-w-lg font-heading text-3xl leading-tight sm:text-4xl">
                    {featured.title}
                  </h2>
                  <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                    <time dateTime={featured.published_at ?? featured.created_at}>
                      {formatPostDate(featured.published_at ?? featured.created_at)}
                    </time>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} aria-hidden="true" />
                      {readingMinutes(featured.description)} min read
                    </span>
                  </p>
                </div>
              </Link>
            </motion.div>
          ) : (
            <div className="flex min-h-80 flex-col items-start justify-end rounded-4xl border border-border bg-card p-8 sm:min-h-104 sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">The first page is yours</p>
              <h2 className="mt-4 max-w-md font-heading text-3xl leading-tight sm:text-4xl">
                No stories just yet. Help us start the conversation.
              </h2>
              <Link href="/register" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">
                Join the community <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-[calc(100%-2rem)] max-w-6xl py-16 sm:py-20">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Fresh from the journal</p>
            <h2 className="mt-3 font-heading text-3xl sm:text-4xl">
              Stories to settle into
            </h2>
          </div>
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Browse all stories <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {loading ? (
          <div className="mt-9">
            <LoadingState label="Loading the latest stories" />
          </div>
        ) : error ? (
          <p role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>
        ) : posts.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-muted-foreground">Published stories will appear here.</p>
        ) : (
          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex w-[calc(100%-2rem)] max-w-6xl flex-col gap-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Have something to say?</p>
            <h2 className="mt-2 font-heading text-3xl">Make room for your words.</h2>
          </div>
          <Link href="/posts/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110">
            Write a story <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
