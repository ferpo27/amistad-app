export interface ErrorResponse {
  message: string;
  code?: number;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ErrorResponse;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export type UserResponse = ApiResponse<User>;

export interface AuthPayload {
  token: string;
  user: User;
  expiresAt?: string;
}

export type AuthResponse = ApiResponse<AuthPayload>;

export type GenericErrorResponse = ApiResponse<null>;