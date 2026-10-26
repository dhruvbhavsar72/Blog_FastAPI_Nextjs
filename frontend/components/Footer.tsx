import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex w-[calc(100%-2rem)] max-w-6xl flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="inline-flex items-center gap-2 font-heading text-lg">
          <BookOpen size={18} aria-hidden="true" />
          Fieldnotes
        </Link>
        <p className="text-sm text-muted-foreground">
          Thoughtful stories for curious minds.
        </p>
        <nav aria-label="Footer navigation" className="flex gap-5 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">Journal</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/register" className="hover:text-foreground">Join us</Link>
        </nav>
      </div>
    </footer>
  );
}
