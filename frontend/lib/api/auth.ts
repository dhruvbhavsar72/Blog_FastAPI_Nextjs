import { API_BASE_URL, api } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export type RegistrationResponse = {
  msg: string;
  user: User;
};

export type OtpDestinationType = "email" | "phone";

export type OtpRequestResponse = {
  destination: string;
  destination_type: OtpDestinationType;
  expires_at: string;
};

let currentUserRequest: Promise<User | null> | undefined;

export function getOAuthLoginUrl(provider: "google" | "github") {
  return `${API_BASE_URL}/users/auth/${provider}/login`;
}

export async function login(email: string, password: string): Promise<void> {
  await api.post("/users/login", { email, password });
}

export async function requestLoginOtp(
  destination: string,
  destinationType: OtpDestinationType,
): Promise<OtpRequestResponse> {
  const response = await api.post<OtpRequestResponse>("/users/otp_generate", {
    destination,
    destination_type: destinationType,
  });
  return response.data;
}

export async function verifyLoginOtp(
  destination: string,
  destinationType: OtpDestinationType,
  otpCode: string,
): Promise<void> {
  await api.post("/users/otp_verify", {
    destination,
    destination_type: destinationType,
    otp_code: otpCode,
  });
}

export async function register(
  payload: FormData,
): Promise<RegistrationResponse> {
  const response = await api.post<RegistrationResponse>(
    "/users/register",
    payload,
  );
  return response.data;
}

export function getCurrentUser(): Promise<User | null> {
  currentUserRequest ??= api
    .get<User | null>("/users/me")
    .then((response) => response.data)
    .finally(() => {
      currentUserRequest = undefined;
    });
  return currentUserRequest;
}

export async function logout(): Promise<void> {
  await api.post("/users/logout");
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/users/send-password-reset-email", { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post("/users/reset-password", { new_password: newPassword }, {
    params: { token },
  });
}
