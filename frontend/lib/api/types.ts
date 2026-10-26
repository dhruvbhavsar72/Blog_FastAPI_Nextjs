export type Category = {
  id: number;
  category_name: string;
};

export type Tag = {
  id: number;
  tag_name: string;
};

export type PostMedia = {
  id: number;
  original_filename: string;
  file_url: string;
  mime_type: string;
  media_type: string;
  created_at: string;
};

export type PostAuthor = {
  first_name: string | null;
  last_name: string | null;
};

export type BlogPost = {
  id: number;
  user_id: number;
  author: PostAuthor;
  title: string;
  description: string;
  status: "draft" | "published" | string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories: Category[];
  tags: Tag[];
  media: PostMedia[];
};

export type User = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  profile_image: string | null;
  bio: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
};

export type Comment = {
  id: number;
  user_id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    first_name: string | null;
    last_name: string | null;
  };
};

export type LikeStatus = {
  target_id: number;
  target_type: "post" | "comment";
  liked: boolean;
  like_count: number;
};
