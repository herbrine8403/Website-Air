import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'air_access_token';
const REFRESH_TOKEN_KEY = 'air_refresh_token';

export interface JwtPayload {
  sub: string; // user_id
  iat: number;
  exp: number;
  type?: 'access' | 'refresh';
}

// 手写 JWT 解码（不引入 jwt-decode）
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1];
    // base64url -> base64
    let base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return Cookies.get(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return Cookies.get(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  // access token 存 cookie（2小时），refresh token 存 cookie（30天）+ localStorage 兜底
  Cookies.set(ACCESS_TOKEN_KEY, access, { expires: 1/12, sameSite: 'lax' });
  Cookies.set(REFRESH_TOKEN_KEY, refresh, { expires: 30, sameSite: 'lax' });
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function getCurrentUserId(): string | null {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) return null;
  const payload = decodeJwt(token);
  return payload?.sub || null;
}
