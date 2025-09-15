import { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  devBypass: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const { data: user, isLoading, error: authError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get('/auth-v2/me');
      return (response.data as any).user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.post('/auth-v2/login', { email, password });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error?.response?.data?.error || 'Login failed');
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
      const response = await api.post('/auth-v2/register', { email, password, name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error?.response?.data?.error || 'Registration failed');
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth-v2/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      setError(null);
    },
    onError: (error: any) => {
      setError(error?.response?.data?.error || 'Logout failed');
    }
  });

  // Dev bypass mutation
  const devBypassMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth-v2/login', { devBypass: true });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setError(null);
    },
    onError: (error: any) => {
      setError(error?.response?.data?.error || 'Dev bypass failed');
    }
  });

  const login = async (email: string, password: string) => {
    setError(null);
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (email: string, password: string, name?: string) => {
    setError(null);
    await registerMutation.mutateAsync({ email, password, name });
  };

  const logout = async () => {
    setError(null);
    await logoutMutation.mutateAsync();
  };

  const devBypass = async () => {
    setError(null);
    await devBypassMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending || devBypassMutation.isPending,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    devBypass,
    error: error || (authError as any)?.response?.data?.error || null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
