// Reminder: Run `npm install zustand axios` if not already installed
import { create, StateCreator } from "zustand";
import axios from "axios";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const api = axios.create({
  baseURL: backendUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the Bearer token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return config;
});

interface User {
  id: string;
  name: string;
  email: string;
  // Add more fields as needed
}

interface AuthResponse {
  user: User;
  token: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const getInitialAuth = () => {
  let token = null;
  let user = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = null;
      }
    }
  }
  return { token, user };
};

export const useAuthStore = create<AuthState>((set, _get) => {
  const { token, user } = getInitialAuth();
  return {
    user: user,
    token: token,
    loading: false,
    error: null,

    login: async (email: string, password: string) => {
      set({ loading: true, error: null });
      try {
        const res = await api.post<AuthResponse>("/auth/login", {
          email,
          password,
        });
        set({
          user: res.data.user,
          token: res.data.token,
          loading: false,
          error: null,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      } catch (err: any) {
        set({
          error: err.response?.data?.message || "Login failed",
          loading: false,
        });
      }
    },

    signup: async (name: string, email: string, password: string) => {
      set({ loading: true, error: null });
      try {
        const res = await api.post<AuthResponse>("/auth/signup", {
          name,
          email,
          password,
        });
        set({
          user: res.data.user,
          token: res.data.token,
          loading: false,
          error: null,
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("token", res.data.token);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      } catch (err: any) {
        set({
          error: err.response?.data?.message || "Signup failed",
          loading: false,
        });
      }
    },

    logout: () => {
      set({ user: null, token: null });
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    },
  };
});
