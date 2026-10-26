import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Heart, Sprout } from "lucide-react";

export const metadata: Metadata = {
  title: "About us",
  description: "Learn about Fieldnotes and the ideas behind our community.",
};

const values = [
  {
    title: "Stay curious",
    description:
      "We make room for questions, fresh perspectives, and ideas that help us see familiar things differently.",
    icon: BookOpen,
  },
  {
    title: "Grow thoughtfully",
    description:
      "We believe the best work takes care, time, and a willingness to learn along the way.",
    icon: Sprout,
  },
  {
    title: "Share generously",
    description:
      "Stories bring us closer. We create space for voices and experiences worth listening to.",
    icon: Heart,
  },
];

export default function AboutPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            About Fieldnotes
          </p>
          <h1 className="mt-4 font-heading text-4xl leading-tight text-foreground sm:text-6xl">
            A place for stories, ideas, and the curious among us.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
            Fieldnotes is an independent journal about creativity, culture, and
            everyday life. We share thoughtful writing to help us pause, notice
            more, and feel a little more connected to the world around us.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-card text-card-foreground">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              What matters to us
            </p>
            <h2 className="mt-3 font-heading text-3xl text-card-foreground">
              A few guiding principles.
            </h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {values.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-heading text-xl text-card-foreground">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-heading text-3xl">Come read along.</h2>
            <p className="mt-2 max-w-xl leading-7 opacity-80">
              Explore the latest stories and find something that stays with
              you.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90"
          >
            Explore the blog <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
