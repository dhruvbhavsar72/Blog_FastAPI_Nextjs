"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/api/client";
import { register as registerAccount } from "@/lib/api/auth";
import { contentButton, fieldError, fieldHint, fieldLabel } from "@/lib/ui";

const registrationSchema = z.object({
  first_name: z.string().trim().min(1, "Please enter your first name.").max(100),
  last_name: z.string().trim().min(1, "Please enter your last name.").max(100),
  email: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Please enter a valid email address.")
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(16, "Password must be no more than 16 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/\d/, "Password must contain at least one number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character."),
  phone: z
    .string()
    .trim()
    .refine(
      (phone) => !phone || /^\+?\d{8,15}$/.test(phone.replace(/[\s\-().]/g, "")),
      "Enter a phone number with 8 to 15 digits.",
    ),
  bio: z.string().trim().max(500, "Bio must be 500 characters or fewer."),
  image: z
    .custom<FileList>(
      (value) => typeof FileList !== "undefined" && value instanceof FileList,
      "Select a valid image.",
    )
    .optional(),
});

type RegistrationFormInput = z.input<typeof registrationSchema>;
type RegistrationValues = z.output<typeof registrationSchema>;

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormInput, unknown, RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone: "",
      bio: "",
    },
  });

  const onSubmit: SubmitHandler<RegistrationValues> = async (values) => {
    const payload = new FormData();
    payload.append("first_name", values.first_name);
    payload.append("last_name", values.last_name);
    payload.append("email", values.email);
    payload.append("password", values.password);
    if (values.phone) payload.append("phone", values.phone);
    if (values.bio) payload.append("bio", values.bio);
    if (values.image?.[0]) payload.append("image", values.image[0]);

    try {
      const response = await registerAccount(payload);
      if (!response.user?.id) {
        toast.error("The server response did not confirm registration.");
        return;
      }
      toast.success("Your account has been created. You can now sign in.");
      reset();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError));
    }
  };

  return (
    <>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={fieldLabel}>
            First name
            <input type="text" autoComplete="given-name" aria-invalid={Boolean(errors.first_name)} {...register("first_name")} />
            {errors.first_name && <span className={fieldError}>{errors.first_name.message}</span>}
          </label>
          <label className={fieldLabel}>
            Last name
            <input type="text" autoComplete="family-name" aria-invalid={Boolean(errors.last_name)} {...register("last_name")} />
            {errors.last_name && <span className={fieldError}>{errors.last_name.message}</span>}
          </label>
        </div>
        <label className={fieldLabel}>
          Email address
          <input type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          {errors.email && <span className={fieldError}>{errors.email.message}</span>}
        </label>
        <label className={fieldLabel}>
          Password
          <input type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} placeholder="8–16 characters" {...register("password")} />
          {errors.password && <span className={fieldError}>{errors.password.message}</span>}
          <span className={fieldHint}>Use 8–16 characters, including an uppercase letter, a number, and a special character.</span>
        </label>
        <label className={fieldLabel}>
          Phone number <span className={fieldHint}>(optional)</span>
          <input type="tel" autoComplete="tel" placeholder="+1 555 123 4567" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
          {errors.phone && <span className={fieldError}>{errors.phone.message}</span>}
        </label>
        <label className={fieldLabel}>
          Bio <span className={fieldHint}>(optional)</span>
          <textarea rows={3} placeholder="A little about yourself" aria-invalid={Boolean(errors.bio)} {...register("bio")} />
          {errors.bio && <span className={fieldError}>{errors.bio.message}</span>}
        </label>
        <label className={fieldLabel}>
          Profile image <span className={fieldHint}>(optional)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-invalid={Boolean(errors.image)} {...register("image")} />
          {errors.image && <span className={fieldError}>{errors.image.message}</span>}
        </label>
        <button type="submit" disabled={isSubmitting} className={`${contentButton} w-full`}>
          {isSubmitting ? "Creating account…" : "Create account"}
          {!isSubmitting && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </form>
    </>
  );
}
