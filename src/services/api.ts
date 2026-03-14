import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TokenPair = {
  accessToken: string | null;
  refreshToken: string | null;
};

type ApiError = {
  status: number;
  data: any;
  message: string;
};

type ApiResponse<T> = {
  data: T;
  status: number;
};

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

async function getTokens(): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  ]);
  return { accessToken, refreshToken };
}

async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

async function clearTokens(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
  ]);
}

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;

  private constructor() {
    const baseURL = process.env.API_BASE_URL ?? '';
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 15000,
    });

    this.axiosInstance.interceptors.request.use(this.attachAuthHeader);
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleResponseError,
    );
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private attachAuthHeader = async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
    const { accessToken } = await getTokens();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  };

  private handleResponseError = async (error: any): Promise<AxiosResponse | Promise<never>> => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${refreshed}`;
        }
        return this.axiosInstance(originalRequest);
      }
    }
    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      data: error.response?.data,
      message: error.message,
    };
    return Promise.reject(apiError);
  };

  private refreshAccessToken = async (): Promise<string | null> => {
    const { refreshToken } = await getTokens();
    if (!refreshToken) {
      await clearTokens();
      return null;
    }
    try {
      const response = await axios.post(
        `${process.env.API_BASE_URL ?? ''}/auth/refresh`,
        { refreshToken },
      );
      const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
      await setTokens(newAccess, newRefresh);
      return newAccess;
    } catch {
      await clearTokens();
      return null;
    }
  };

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.get<T>(url, config);
    return { data: response.data, status: response.status };
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return { data: response.data, status: response.status };
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return { data: response.data, status: response.status };
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return { data: response.data, status: response.status };
  }
}

export const api = ApiService.getInstance();
export type { ApiResponse, ApiError };