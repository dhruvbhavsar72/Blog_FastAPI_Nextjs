import type { Metadata } from "next";
import BlogListing from "@/components/BlogListing";

export const metadata: Metadata = {
  title: "The blog",
  description: "Read the latest stories on creativity, culture, and everyday life.",
};

export default function BlogListingPage() {
  return <BlogListing />;
}
