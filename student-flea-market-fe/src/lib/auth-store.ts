///////////////////////////////////////////////////////////
//                                                       //
//                 AUTH STORE (ZUSTAND)                  //
//                                                       //
///////////////////////////////////////////////////////////

import { create } from 'zustand';
import axios, { AxiosError } from 'axios';
import {
  UserDto,
  AuthResultDto,
  LoginRequestDto,
  RefreshTokenRequestDto,
  RegisterRequestDto,
  RegisterResultDto,
} from '@/types/auth';
import { apiClient, setStoredAuth, clearStoredAuth, getStoredAccessToken, getStoredRefreshToken } from './api-client';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => void;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<AuthResultDto>;
  register: (payload: RegisterRequestDto) => Promise<RegisterResultDto>;
  verifyEmail: (email: string, code: string) => Promise<{ message: string }>;
  resendVerificationCode: (email: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  setUser: (user: UserDto) => void;
  clearError: () => void;
}

interface ApiErrorPayload {
  message?: string;
  Message?: string;
  errors?: Record<string, string[]>;
}

const getApiError = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const axiosError = error as AxiosError<ApiErrorPayload>;
  const details = axiosError.response?.data?.errors;
  if (details) {
    const messages = Object.values(details).flat().filter(Boolean);
    if (messages.length > 0) return messages.join('. ');
  }

  return (
    axiosError.response?.data?.message ||
    axiosError.response?.data?.Message ||
    (axiosError.code === 'ERR_NETWORK'
      ? 'Unable to connect to the backend server. Check NEXT_PUBLIC_API_URL and the API status.'
      : fallback)
  );
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  initAuth: () => {
    if (typeof window === 'undefined') return;

    try {
      const accessToken = getStoredAccessToken();
      const refreshToken = getStoredRefreshToken();
      const storedUser = localStorage.getItem('sfm_user');

      if (accessToken && storedUser) {
        const user: UserDto = JSON.parse(storedUser);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isInitialized: true,
        });
        return;
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
      clearStoredAuth();
    }

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  },

  login: async (identifier, password, rememberMe = true) => {
    set({ isLoading: true, error: null });

    try {
      const payload: LoginRequestDto = {
        identifier,
        password,
        rememberMe,
      };

      const response = await apiClient.post<AuthResultDto>('/Auth/login', payload);
      const authData = response.data;

      // Persist auth data in storage and cookies
      setStoredAuth(authData);

      set({
        user: authData.user,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return authData;
    } catch (err: unknown) {
      const errorMessage = getApiError(
        err,
        'Authentication failed. Please check your credentials.'
      );

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  },

  register: async (payload: RegisterRequestDto) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.post<RegisterResultDto>('/Auth/register', payload);
      set({ isLoading: false, error: null });
      return response.data;
    } catch (err: unknown) {
      const errorMessage = getApiError(
        err,
        'Registration failed. Please check your information and try again.'
      );

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  },

  verifyEmail: async (email: string, code: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.post<{ message: string }>('/Auth/verify-email', {
        email,
        code,
      });
      set({ isLoading: false, error: null });
      return response.data;
    } catch (err: unknown) {
      const errorMessage = getApiError(
        err,
        'Verification failed. Please check your 6-digit code.'
      );

      set({
        isLoading: false,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  },

  resendVerificationCode: async (email: string) => {
    try {
      const response = await apiClient.post<{ message: string }>('/Auth/resend-verification-code', {
        email,
      });
      return response.data;
    } catch (err: unknown) {
      const errorMessage = getApiError(err, 'Failed to resend verification code.');
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken || getStoredRefreshToken();

    try {
      if (refreshToken) {
        const payload: RefreshTokenRequestDto = { refreshToken };
        await apiClient.post('/Auth/logout', payload);
      }
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      clearStoredAuth();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  setUser: (user: UserDto) => {
    set({ user });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sfm_user', JSON.stringify(user));
    }
  },

  clearError: () => set({ error: null }),
}));
