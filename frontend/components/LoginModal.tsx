"use client";

import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LoginModalProps = {
  onClose: () => void;
};

export default function LoginModal({ onClose }: LoginModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl sm:max-w-md">
        <div className="p-7 sm:p-9">
          <DialogHeader className="gap-0">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Welcome back
            </p>
            <DialogTitle className="mt-3 text-3xl normal-case tracking-normal">
              Log in to Fieldnotes.
            </DialogTitle>
            <DialogDescription className="mt-3 leading-6">
              Pick up where you left off and keep exploring.
            </DialogDescription>
          </DialogHeader>

          <LoginForm onSuccess={onClose} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Fieldnotes?{" "}
            <Link
              href="/register"
              onClick={onClose}
              className="font-semibold text-primary hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
