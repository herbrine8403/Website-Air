import { getAccessToken, getRefreshToken, setTokens, clearTokens, isTokenExpired } from './auth';

const API_BASE = '/api';

export interface ApiOptions extends RequestInit {
  json?: unknown; // 如果提供，作为 JSON body 发送
  auth?: boolean; // 是否需要认证，默认 true
  noRedirect?: boolean; // 是否禁用 401 自动跳转登录页（用于 OAuth 回调等场景）
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refresh = getRefreshToken();
  if (!refresh || isTokenExpired(refresh)) return false;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success && data.access_token && data.refresh_token) {
        setTokens(data.access_token, data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, auth = true, noRedirect = false, headers = {}, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    ...headers as Record<string, string>,
  };
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getAccessToken();
    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  // 401 自动 refresh 重试一次
  if (res.status === 401 && auth) {
    const ok = await refreshAccessToken();
    if (ok) {
      const newToken = getAccessToken();
      if (newToken) finalHeaders['Authorization'] = `Bearer ${newToken}`;
      const retryRes = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: finalHeaders,
        body: json !== undefined ? JSON.stringify(json) : rest.body,
      });
      if (retryRes.status === 401) {
        clearTokens();
        // 跳转登录页（避免循环）—— 除非调用方明确要求不跳转（用于 OAuth 回调等场景）
        if (!noRedirect) {
          const hash = window.location.hash || '';
          if (!hash.startsWith('#/account/sign-in')) {
            const redirect = encodeURIComponent(hash + window.location.search);
            window.location.href = `/account.html#/account/sign-in?redirect=${redirect}`;
          }
        }
        throw new ApiError('未登录或登录已过期', 401, 'unauthorized');
      }
      return await retryRes.json() as T;
    } else {
      clearTokens();
      if (!noRedirect) {
        const hash = window.location.hash || '';
        if (!hash.startsWith('#/account/sign-in')) {
          const redirect = encodeURIComponent(hash + window.location.search);
          window.location.href = `/account.html#/account/sign-in?redirect=${redirect}`;
        }
      }
      throw new ApiError('未登录或登录已过期', 401, 'unauthorized');
    }
  }

  if (!res.ok) {
    let errMsg = `请求失败 (${res.status})`;
    let code: string | undefined;
    try {
      const errData = await res.json();
      errMsg = errData.error || errData.message || errMsg;
      code = errData.code;
    } catch {}
    throw new ApiError(errMsg, res.status, code);
  }

  // 防御性检查：确保响应是 JSON 格式
  // InfinityFree 的 Bot Protection 可能返回 HTML 挑战页
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // 尝试解析为 JSON，失败则抛出明确错误
    try {
      const text = await res.text();
      // 检测 InfinityFree Bot Protection 挑战页
      if (text.includes('__test') || text.includes('slowAES')) {
        throw new ApiError('服务暂时不可用，请刷新页面后重试', res.status, 'bot_protection');
      }
      const data = JSON.parse(text);
      return data as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('服务器返回了非 JSON 数据，请刷新页面后重试', res.status, 'non_json_response');
    }
  }

  return await res.json() as T;
}

// 便捷方法
export const api = {
  get: <T = unknown>(path: string, options?: Omit<ApiOptions, 'method' | 'json'>) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(path: string, json?: unknown, options?: Omit<ApiOptions, 'method' | 'json'>) =>
    apiFetch<T>(path, { ...options, method: 'POST', json }),
  put: <T = unknown>(path: string, json?: unknown, options?: Omit<ApiOptions, 'method' | 'json'>) =>
    apiFetch<T>(path, { ...options, method: 'PUT', json }),
  delete: <T = unknown>(path: string, options?: Omit<ApiOptions, 'method' | 'json'>) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
