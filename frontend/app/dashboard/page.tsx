import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Your stories",
  description: "Manage your drafts and published stories.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
