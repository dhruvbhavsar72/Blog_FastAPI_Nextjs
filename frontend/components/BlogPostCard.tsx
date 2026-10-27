"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { motion } from "motion/react";
import type { BlogPost } from "@/lib/api/types";
import { getAssetUrl } from "@/lib/api/client";

export function readingMinutes(text: string) {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 220));
}

export function formatPostDate(value: string | null) {
  if (!value) {
    return "Recently";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

export default function BlogPostCard({ post }: { post: BlogPost }) {
  const image = post.media.find((item) => item.media_type === "image");
  const authorName = [
    post.author.first_name,
    post.author.last_name,
  ].filter(Boolean).join(" ");
  const excerpt =
    post.description.length > 165
      ? `${post.description.slice(0, 162).trimEnd()}…`
      : post.description;

  return (
    <motion.article
      className="group overflow-hidden rounded-2xl border border-border bg-card text-card-foreground transition-shadow duration-200 hover:shadow-xl hover:shadow-foreground/5"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Link
        href={`/blog/${post.id}`}
        className="relative block h-52 overflow-hidden bg-secondary"
        aria-label={`Read ${post.title}`}
      >
        {image ? (
          <Image
            src={getAssetUrl(image.file_url)}
            alt=""
            fill
            unoptimized
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-end bg-linear-to-br from-secondary via-background to-primary/20 p-5">
            <span className="font-heading text-3xl text-foreground/70">
              {post.categories[0]?.category_name ?? "Fieldnotes"}
            </span>
          </div>
        )}
        {post.categories[0] && (
          <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur">
            {post.categories[0].category_name}
          </span>
        )}
      </Link>
      <div className="flex min-h-64 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {authorName && (
            <span className="font-medium text-foreground">By {authorName}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} aria-hidden="true" />
            {readingMinutes(post.description)} min
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Created{" "}
            <time dateTime={post.created_at}>{formatPostDate(post.created_at)}</time>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Updated{" "}
            <time dateTime={post.updated_at}>{formatPostDate(post.updated_at)}</time>
          </span>
        </div>
        <h2 className="mt-4 font-heading text-2xl leading-snug">
          <Link href={`/blog/${post.id}`} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h2>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
          {excerpt}
        </p>
        <Link
          href={`/blog/${post.id}`}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          Read story
          <ArrowUpRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </motion.article>
  );
}
