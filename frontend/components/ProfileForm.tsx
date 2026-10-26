"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import RequireAuth from "@/components/RequireAuth";
import { getApiErrorMessage, getAssetUrl } from "@/lib/api/client";
import { updateProfile } from "@/lib/api/profile";
import { contentButton, eyebrow, errorNotice, fieldHint, fieldLabel, pageShell } from "@/lib/ui";

function ProfileContent() {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setPhone(updatedUser.phone ?? "");
      setBio(updatedUser.bio ?? "");
      toast.success("Your profile has been updated.");
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (requestError) => toast.error(getApiErrorMessage(requestError)),
  });

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (image && image.size > 5 * 1024 * 1024) {
      setError("Profile images must be 5 MB or smaller.");
      return;
    }
    const payload = new FormData();
    payload.append("phone", phone);
    payload.append("bio", bio);
    if (image) payload.append("image", image);
    updateMutation.mutate(payload);
  }

  return (
    <main className={`${pageShell} flex-1 py-12 sm:py-16`}>
      <div className="max-w-2xl">
        <p className={eyebrow}>Your account</p>
        <h1 className="mt-3 font-heading text-4xl sm:text-5xl">Profile settings</h1>
        <p className="mt-3 text-muted-foreground">Update the details readers see about you.</p>
      </div>
      <form className="mt-9 flex max-w-2xl flex-col gap-5" onSubmit={submit}>
        <div className="flex items-center gap-5">
          {previewUrl || user?.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={previewUrl ?? user?.profile_image}
            src={previewUrl ?? getAssetUrl(user?.profile_image)}
            alt="Your profile"
            className="size-24 rounded-full border border-border bg-secondary object-cover"
          />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-full border border-border bg-secondary text-2xl font-semibold text-secondary-foreground">
              {user?.first_name?.slice(0, 1) ?? user?.email.slice(0, 1).toUpperCase()}
            </span>
          )}
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Choose a new photo and save your profile to update it.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            First name
            <input value={user?.first_name ?? ""} readOnly />
          </label>
          <label className={fieldLabel}>
            Last name
            <input value={user?.last_name ?? ""} readOnly />
          </label>
        </div>
        <label className={fieldLabel}>
          Email address
          <input value={user?.email ?? ""} type="email" readOnly />
        </label>
        <label className={fieldLabel}>
          Phone number
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 123 4567" />
        </label>
        <label className={fieldLabel}>
          Short bio
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} rows={4} />
          <span className={fieldHint}>Up to 500 characters</span>
        </label>
        <label className={fieldLabel}>
          Profile image
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="text-sm font-normal text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:font-semibold file:text-secondary-foreground"
            onChange={(event) => {
              const nextImage = event.target.files?.[0] ?? null;
              if (nextImage && !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(nextImage.type)) {
                setError("Choose a JPG, PNG, WEBP, or GIF image.");
                setImage(null);
                event.target.value = "";
                return;
              }
              setError("");
              setImage(nextImage);
            }}
          />
          <span className={fieldHint}>JPG, PNG, WEBP, or GIF. Maximum 5 MB.</span>
        </label>
        {error && <p role="alert" className={errorNotice}>{error}</p>}
        <button type="submit" disabled={updateMutation.isPending} className={`${contentButton} w-fit`}>
          {updateMutation.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}

export default function ProfileForm() {
  return <RequireAuth><ProfileContent /></RequireAuth>;
}
