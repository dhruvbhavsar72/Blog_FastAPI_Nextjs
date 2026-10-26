"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  getOAuthLoginUrl,
  requestLoginOtp,
  type OtpDestinationType,
} from "@/lib/api/auth";
import { contentButton, fieldLabel } from "@/lib/ui";

export default function LoginForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { signIn, signInWithOtp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [destinationType, setDestinationType] =
    useState<OtpDestinationType>("email");
  const [destination, setDestination] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      onSuccess?.();
      router.push("/dashboard");
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function sendOtp() {
    setSubmitting(true);
    try {
      const result = await requestLoginOtp(destination, destinationType);
      setDestination(result.destination);
      setDestinationType(result.destination_type);
      setExpiresAt(result.expires_at);
      setOtpSent(true);
      setCooldown(60);
      setOtpCode("");
      toast.success("One-time code sent.");
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signInWithOtp(destination, destinationType, otpCode);
      onSuccess?.();
      router.push("/dashboard");
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: "password" | "otp") {
    setMode(nextMode);
    setOtpSent(false);
    setOtpCode("");
    setCooldown(0);
    setExpiresAt("");
  }

  const otpExpiryText = expiresAt
    ? `Code expires ${new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(expiresAt))}.`
    : "The code is valid for 5 minutes.";

  return (
    <div className="mt-7 space-y-5">
      <div className="grid grid-cols-2 rounded-xl bg-secondary p-1" role="tablist" aria-label="Sign-in method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === "password" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          onClick={() => changeMode("password")}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "otp"}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${mode === "otp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          onClick={() => changeMode("otp")}
        >
          One-time code
        </button>
      </div>

      {mode === "password" ? (
        <form className="space-y-5" onSubmit={submitPassword}>
          <label className={fieldLabel}>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className={fieldLabel}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </label>
          <button className={`${contentButton} w-full`} type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
            {!submitting && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>
      ) : otpSent ? (
        <form className="space-y-5" onSubmit={verifyOtp}>
          <div className="rounded-xl border border-border bg-secondary/60 p-4">
            <p className="text-sm font-medium">
              Enter the 6-digit code sent to{" "}
              <span className="break-all">{destination}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{otpExpiryText}</p>
          </div>
          <label className={fieldLabel}>
            One-time code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otpCode}
              onChange={(event) =>
                setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="text-center font-mono text-xl tracking-[0.4em]"
            />
          </label>
          <button className={`${contentButton} w-full`} type="submit" disabled={submitting || otpCode.length !== 6}>
            {submitting ? "Verifying…" : "Verify and sign in"}
            {!submitting && <ArrowRight size={16} aria-hidden="true" />}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => changeMode("otp")}
            >
              <ArrowLeft size={14} aria-hidden="true" /> Change destination
            </button>
            <button
              type="button"
              className="font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || cooldown > 0}
              onClick={() => void sendOtp()}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
        <form
          id="otp-destination-form"
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void sendOtp();
          }}
        >
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="col-span-2 mb-2 text-sm font-semibold text-foreground">Send code by</legend>
            <button
              type="button"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent ${destinationType === "email" ? "border-primary text-primary" : ""}`}
              aria-pressed={destinationType === "email"}
              onClick={() => setDestinationType("email")}
            >
              <Mail size={16} aria-hidden="true" /> Email
            </button>
            <button
              type="button"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent ${destinationType === "phone" ? "border-primary text-primary" : ""}`}
              aria-pressed={destinationType === "phone"}
              onClick={() => setDestinationType("phone")}
            >
              <Phone size={16} aria-hidden="true" /> Phone
            </button>
          </fieldset>
          <label className={fieldLabel}>
            {destinationType === "email" ? "Email address" : "Phone number"}
            <input
              type={destinationType === "email" ? "email" : "tel"}
              autoComplete={destinationType === "email" ? "email" : "tel"}
              required
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={destinationType === "email" ? "you@example.com" : "+1 555 123 4567"}
            />
          </label>
          {destinationType === "phone" && (
            <p className="text-xs leading-5 text-muted-foreground">
              Phone codes are enabled by the backend, but the current backend
              logs them to its console instead of sending an SMS.
            </p>
          )}
          <button className={`${contentButton} w-full`} type="submit" disabled={submitting}>
            {submitting ? "Sending code…" : "Send one-time code"}
            {!submitting && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>
      )}

      {mode === "password" && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent" href={getOAuthLoginUrl("google")}>
              Google
            </a>
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:bg-accent" href={getOAuthLoginUrl("github")}>
              GitHub
            </a>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              onClick={onSuccess}
              className="font-semibold text-primary hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
