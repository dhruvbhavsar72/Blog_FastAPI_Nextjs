import type { Metadata } from "next";
import ProfileForm from "@/components/ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
  description: "Update your Fieldnotes profile.",
};

export default function ProfilePage() {
  return <ProfileForm />;
}
