import { api } from "@/lib/api/client";
import type { Comment, LikeStatus } from "@/lib/api/types";

export async function getComments(postId: number): Promise<Comment[]> {
  const response = await api.get<Comment[]>(`/comments/post/${postId}`);
  return response.data;
}

export async function createComment(
  postId: number,
  content: string,
): Promise<Comment> {
  const response = await api.post<Comment>(`/comments/post/${postId}`, {
    content,
  });
  return response.data;
}

export async function deleteComment(commentId: number): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

export async function getPostLikeStatus(postId: number): Promise<LikeStatus> {
  const response = await api.get<LikeStatus>(`/likes/posts/${postId}`);
  return response.data;
}

export async function setPostLiked(
  postId: number,
  liked: boolean,
): Promise<LikeStatus> {
  const response = liked
    ? await api.post<LikeStatus>(`/likes/posts/${postId}`)
    : await api.delete<LikeStatus>(`/likes/posts/${postId}`);
  return response.data;
}
