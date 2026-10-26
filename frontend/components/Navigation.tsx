"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { BookOpen, Menu, X } from "lucide-react";
import toast from "react-hot-toast";
import LoginModal from "@/components/LoginModal";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";
import { getApiErrorMessage } from "@/lib/api/client";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

function NavigationLinks({
  onNavigate,
  pathname,
}: {
  onNavigate: () => void;
  pathname: string | null;
}) {
  return links.map(({ href, label }) => {
    const active = pathname
      ? href === "/"
        ? pathname === href
        : pathname.startsWith(href)
      : false;

    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors md:px-0 md:py-1 ${
          active
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  });
}

function ActiveNavigationLinks({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return <NavigationLinks onNavigate={onNavigate} pathname={pathname} />;
}

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 text-foreground backdrop-blur">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground"
          onClick={() => setMenuOpen(false)}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen size={19} aria-hidden="true" />
          </span>
          <span className="font-heading text-xl font-semibold tracking-tight">
            Fieldnotes
          </span>
        </Link>
        <ThemeToggle className="md:hidden" />
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <div
          id="primary-navigation"
          className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col gap-1 border-b border-border bg-background px-5 pb-5 pt-2 md:static md:flex md:flex-row md:items-center md:gap-4 md:border-0 md:bg-transparent md:p-0`}
        >
          <Suspense
            fallback={
              <NavigationLinks
                onNavigate={() => setMenuOpen(false)}
                pathname={null}
              />
            }
          >
            <ActiveNavigationLinks onNavigate={() => setMenuOpen(false)} />
          </Suspense>
          {authLoading ? null : user ? (
            <>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:px-0">My stories</Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:px-0">Profile</Link>
              <button
                type="button"
                onClick={async () => {
                  setMenuOpen(false);
                  try {
                    await signOut();
                    toast.success("You have been signed out.");
                  } catch (error) {
                    toast.error(getApiErrorMessage(error));
                  }
                }}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors  hover:text-foreground md:px-0"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setLoginOpen(true);
              }}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:px-0"
            >
              Log in
            </button>
          )}
          <ThemeToggle className="md:flex hidden" />
          {!authLoading && !user && (
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 md:mt-0"
            >
              Join us
            </Link>
          )}
        </div>
      </nav>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </header>
  );
}
