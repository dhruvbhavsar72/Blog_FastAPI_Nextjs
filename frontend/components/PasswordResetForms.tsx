"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/api/client";
import { requestPasswordReset, resetPassword } from "@/lib/api/auth";
import { contentButton, errorNotice, fieldLabel } from "@/lib/ui";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(16, "Password must be no more than 16 characters.")
  .regex(/[A-Z]/, "Add at least one uppercase letter.")
  .regex(/\d/, "Add at least one number.")
  .regex(/[^A-Za-z0-9]/, "Add at least one special character.");

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await requestPasswordReset(email);
      toast.success("If an account matches that email, a reset link will be sent.");
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={submit}>
      <label className={fieldLabel}>
        Email address
        <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <button className={contentButton} type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validated = passwordSchema.safeParse(password);
    if (!validated.success) {
      setError(validated.error.issues[0]?.message ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      toast.success("Your password has been reset. You can now sign in.");
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <p role="alert" className={`${errorNotice} mt-8`}>The password reset token is missing. Open the reset link from your email.</p>;
  }

  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={submit}>
      <label className={fieldLabel}>
        New password
        <input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <label className={fieldLabel}>
        Confirm new password
        <input type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">Use 8–16 characters with an uppercase letter, a number, and a special character.</p>
      {error && <p role="alert" className={errorNotice}>{error}</p>}
      <button className={contentButton} type="submit" disabled={busy}>{busy ? "Resetting…" : "Reset password"}</button>
    </form>
  );
}
