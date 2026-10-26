export const queryKeys = {
  posts: {
    all: ["posts"] as const,
    lists: () => [...queryKeys.posts.all, "list"] as const,
    published: () => [...queryKeys.posts.lists(), "published"] as const,
    mine: (userId?: number) =>
      userId === undefined
        ? ([...queryKeys.posts.lists(), "mine"] as const)
        : ([...queryKeys.posts.lists(), "mine", userId] as const),
    detail: (postId: number) =>
      [...queryKeys.posts.all, "detail", postId] as const,
  },
  categories: (userId?: number) =>
    userId === undefined
      ? (["categories"] as const)
      : (["categories", userId] as const),
  tags: (userId?: number) =>
    userId === undefined ? (["tags"] as const) : (["tags", userId] as const),
  comments: (postId: number) => ["comments", postId] as const,
  postLike: (postId: number, userId: number) =>
    ["post-like", postId, userId] as const,
};
