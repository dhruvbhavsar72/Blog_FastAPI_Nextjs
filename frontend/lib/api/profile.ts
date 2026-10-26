import { api } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export async function updateProfile(payload: FormData): Promise<User> {
  const response = await api.put<User>("/users/update_profile", payload);
  return response.data;
}
