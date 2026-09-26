import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { getAccessToken, clearTokens, setTokens } from '@/lib/auth';
import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  github_username: string | null;
  bilibili_username: string | null;
  role: string;
  is_admin?: boolean;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'set_user'; user: AuthUser | null }
  | { type: 'set_loading'; loading: boolean }
  | { type: 'logout' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'set_user': return { ...state, user: action.user, isLoading: false };
    case 'set_loading': return { ...state, isLoading: action.loading };
    case 'logout': return { user: null, isLoading: false };
    default: return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, isLoading: true });

  const fetchMe = async (): Promise<AuthUser | null> => {
    const token = getAccessToken();
    if (!token) return null;
    try {
      // noRedirect: true —— 避免 OAuth 回调页面在 fetchMe 失败时自动跳转到登录页
      // （由调用方自行决定如何处理 401 错误）
      const data = await api.get<{ success: boolean; user: AuthUser }>('/auth/me.php', { auth: true, noRedirect: true });
      return data.user;
    } catch {
      return null;
    }
  };

  const refresh = async () => {
    const user = await fetchMe();
    dispatch({ type: 'set_user', user });
  };

  const login = async (accessToken: string, refreshToken: string) => {
    setTokens(accessToken, refreshToken);
    await refresh();
  };

  const logout = () => {
    clearTokens();
    dispatch({ type: 'logout' });
    // 调用后端 signout（不阻塞）
    api.post('/auth/signout.php').catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
