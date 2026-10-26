import { api } from "@/lib/api/client";
import type { BlogPost, Category, Tag } from "@/lib/api/types";

export async function getPosts(): Promise<BlogPost[]> {
  const response = await api.get<BlogPost[]>("/posts/all_posts");
  return response.data;
}

export async function getPost(postId: number): Promise<BlogPost> {
  const response = await api.get<BlogPost>(`/posts/${postId}`);
  return response.data;
}

export async function getMyPosts(): Promise<BlogPost[]> {
  const response = await api.get<BlogPost[]>("/posts/posts_by_user");
  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>("/categories/all_categories");
  return response.data;
}

export async function getTags(): Promise<Tag[]> {
  const response = await api.get<Tag[]>("/tags/all_tags");
  return response.data;
}

export async function createCategory(category_name: string): Promise<Category> {
  const response = await api.post<Category>("/categories/create_category", {
    category_name,
  });
  return response.data;
}

export async function createTag(tag_name: string): Promise<Tag> {
  const response = await api.post<Tag>("/tags/create_tag", { tag_name });
  return response.data;
}

export async function createPost(payload: FormData): Promise<BlogPost> {
  const response = await api.post<BlogPost>("/posts/create_post", payload);
  return response.data;
}

export async function updatePost(
  postId: number,
  payload: FormData,
): Promise<BlogPost> {
  const response = await api.put<BlogPost>(
    `/posts/edit_post/${postId}`,
    payload,
  );
  return response.data;
}

export async function deletePost(postId: number): Promise<void> {
  await api.delete(`/posts/delete_post/${postId}`);
}
