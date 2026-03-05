import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthService } from '../services/AuthService';
import type { User } from '../types/models';

interface AuthState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      logout: () => {
        AuthService.clearToken();
        set({ currentUser: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
