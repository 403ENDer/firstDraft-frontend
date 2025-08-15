export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Simulate user storage (in a real app, this would be a database)
const USERS_STORAGE_KEY = "FirstDraft_users";
const CURRENT_USER_KEY = "FirstDraft_current_user";

export const auth = {
  // Initialize users storage
  init: () => {
    if (typeof window !== "undefined") {
      const existingUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (!existingUsers) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([]));
      }
    }
  },

  // Sign up a new user
  signup: async (
    email: string,
    password: string,
    name: string
  ): Promise<User> => {
    if (typeof window === "undefined") {
      throw new Error("Cannot signup on server side");
    }

    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");

    // Check if user already exists
    const existingUser = users.find((user: any) => user.email === email);
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name,
      createdAt: new Date(),
    };

    // Store user (in a real app, you'd hash the password)
    users.push({ ...newUser, password });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Set as current user
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

    return newUser;
  },

  // Sign in existing user
  login: async (email: string, password: string): Promise<User> => {
    if (typeof window === "undefined") {
      throw new Error("Cannot login on server side");
    }

    const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");

    // Find user by email and password
    const user = users.find(
      (u: any) => u.email === email && u.password === password
    );
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Set as current user
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithoutPassword));

    return userWithoutPassword;
  },

  // Sign out user
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  // Get current user
  getCurrentUser: (): User | null => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const userStr = localStorage.getItem(CURRENT_USER_KEY);
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
      };
    } catch (error) {
      console.error("Error parsing current user:", error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return auth.getCurrentUser() !== null;
  },
};

// Initialize auth on import (only on client side)
if (typeof window !== "undefined") {
  // Use a small delay to ensure DOM is ready
  setTimeout(() => {
    auth.init();
  }, 0);
}
