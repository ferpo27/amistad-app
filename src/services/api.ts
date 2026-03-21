import fetch, { RequestInit } from 'node-fetch';
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
  private fetchInstance: (url: string, init: RequestInit) => Promise<any>;

  private constructor() {
    const baseURL = process.env.API_BASE_URL ?? '';
    this.fetchInstance = async (url: string, init: RequestInit) => {
      const response = await fetch(`${baseURL}${url}`, init);
      return response.json();
    };

    this.attachAuthHeader();
    this.handleResponseError();
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private attachAuthHeader = async () => {
    const { accessToken } = await getTokens();
    if (accessToken) {
      this.fetchInstance = async (url: string, init: RequestInit) => {
        init.headers = {
          ...init.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return await this.fetchInstance(url, init);
      };
    }
  };

  private handleResponseError = async () => {
    const originalFetchInstance = this.fetchInstance;
    this.fetchInstance = async (url: string, init: RequestInit) => {
      try {
        const response = await originalFetchInstance(url, init);
        if (response.status === 401) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            init.headers = {
              ...init.headers,
              Authorization: `Bearer ${refreshed}`,
            };
            return await this.fetchInstance(url, init);
          }
        }
        return response;
      } catch (error: any) {
        const apiError: ApiError = {
          status: error.status ?? 0,
          data: error.data,
          message: error.message,
        };
        throw apiError;
      }
    };
  };

  private refreshAccessToken = async (): Promise<string | null> => {
    const { refreshToken } = await getTokens();
    if (!refreshToken) {
      await clearTokens();
      return null;
    }
    try {
      const response = await fetch(`${process.env.API_BASE_URL ?? ''}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json();
      await setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch (error) {
      await clearTokens();
      return null;
    }
  };

  public async get<T>(url: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await this.fetchInstance(url, init);
    return { data: response, status: 200 };
  }

  public async post<T>(url: string, data: any, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await this.fetchInstance(url, { ...init, method: 'POST', body: JSON.stringify(data) });
    return { data: response, status: 200 };
  }

  public async put<T>(url: string, data: any, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await this.fetchInstance(url, { ...init, method: 'PUT', body: JSON.stringify(data) });
    return { data: response, status: 200 };
  }

  public async delete<T>(url: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await this.fetchInstance(url, { ...init, method: 'DELETE' });
    return { data: response, status: 200 };
  }
}

export default ApiService;