import { useState, useEffect, useCallback } from "react";
import { Lock, Github, AlertCircle, RefreshCw, ShieldCheck, LogOut } from "lucide-react";

const REPO_OWNER = "herbrine8403";
const REPO_NAME = "Amethyst-iOS-MyRemastered";
const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;

// sessionStorage：关闭标签页即失效（默认）
// localStorage：勾选"记住此设备"后持久化
const STORAGE_KEY_SESSION = "air_admin_token_session";
const STORAGE_KEY_LOCAL = "air_admin_token_local";
const STORAGE_KEY_REMEMBER = "air_admin_remember";

interface AdminAuthProps {
  /** 验证通过后回调，传入有效 token */
  onAuthed: (token: string) => void;
  /** 当前是否已通过验证 */
  authed: boolean;
  /** 退出登录回调 */
  onLogout: () => void;
}

interface AuthState {
  loading: boolean;
  error: string | null;
  verifying: boolean;
}

/**
 * 调用 GitHub API 验证 token 对目标仓库是否有 push/admin 权限
 * 返回 null 表示通过，否则返回错误信息
 */
async function verifyToken(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed) return "请输入 GitHub Personal Access Token";

  try {
    const resp = await fetch(`https://api.github.com/repos/${REPO_FULL}`, {
      headers: {
        Authorization: `Bearer ${trimmed}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (resp.status === 401) return "Token 无效或已失效，请检查后重试";
    if (resp.status === 403) {
      // 可能是速率限制或权限不足
      const body = await resp.json().catch(() => null);
      if (body?.message?.includes("rate limit")) {
        return "GitHub API 速率限制，请稍后再试";
      }
      return "Token 权限不足，无法访问此仓库";
    }
    if (resp.status === 404) {
      return "未找到仓库或 Token 无访问权限（请确认 Token 已勾选 repo 权限）";
    }
    if (!resp.ok) return `GitHub API 异常：HTTP ${resp.status}`;

    const data = await resp.json();
    const perms = data?.permissions;
    if (!perms) return "响应中未包含权限信息";

    if (!perms.push && !perms.admin) {
      return `当前 Token 对 ${REPO_FULL} 没有写入权限，仅可读取。需要 push 或 admin 权限才能进入统计页面`;
    }
    return null;
  } catch (err) {
    return err instanceof Error ? `网络错误：${err.message}` : "验证失败";
  }
}

export function AdminAuth({ onAuthed, authed, onLogout }: AdminAuthProps) {
  const [token, setToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [state, setState] = useState<AuthState>({
    loading: true,
    error: null,
    verifying: false,
  });

  // 启动时从存储中恢复 token 并自动验证
  const restoreAndVerify = useCallback(async () => {
    const rememberFlag = localStorage.getItem(STORAGE_KEY_REMEMBER) === "1";
    const stored = rememberFlag
      ? localStorage.getItem(STORAGE_KEY_LOCAL)
      : sessionStorage.getItem(STORAGE_KEY_SESSION);

    if (!stored) {
      setState({ loading: false, error: null, verifying: false });
      return;
    }

    setRemember(rememberFlag);
    const err = await verifyToken(stored);
    if (err === null) {
      onAuthed(stored);
    } else {
      // 存储的 token 已失效，清除
      localStorage.removeItem(STORAGE_KEY_LOCAL);
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
      setState({ loading: false, error: `已保存的 Token 已失效：${err}，请重新输入`, verifying: false });
    }
  }, [onAuthed]);

  useEffect(() => {
    restoreAndVerify();
  }, [restoreAndVerify]);

  const handleVerify = async () => {
    setState({ loading: false, error: null, verifying: true });
    const err = await verifyToken(token);
    if (err === null) {
      const trimmed = token.trim();
      if (remember) {
        localStorage.setItem(STORAGE_KEY_LOCAL, trimmed);
        localStorage.setItem(STORAGE_KEY_REMEMBER, "1");
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
      } else {
        sessionStorage.setItem(STORAGE_KEY_SESSION, trimmed);
        localStorage.removeItem(STORAGE_KEY_LOCAL);
        localStorage.removeItem(STORAGE_KEY_REMEMBER);
      }
      onAuthed(trimmed);
      setState({ loading: false, error: null, verifying: false });
    } else {
      setState({ loading: false, error: err, verifying: false });
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem(STORAGE_KEY_LOCAL);
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);
    onLogout();
  };

  // 加载中（启动时检查已存 token）
  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--muted-foreground)" }} />
      </div>
    );
  }

  // 已通过验证，显示"已登录"状态条
  if (authed) {
    return (
      <div className="rounded-[var(--radius-sm)] border p-4 mb-6 flex items-center gap-3" style={{ borderColor: "var(--accent-blue)", background: "var(--accent-blue-muted, rgba(59,130,246,0.08))" }}>
        <ShieldCheck className="h-5 w-5 flex-shrink-0" style={{ color: "var(--accent-blue)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            管理员已验证
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            你具有 {REPO_FULL} 的写入权限
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs transition-colors hover:border-[var(--border-strong)]"
          style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
        >
          <LogOut className="h-3.5 w-3.5" />
          退出
        </button>
      </div>
    );
  }

  // 未验证：显示登录表单
  return (
    <section className="pb-16">
      <div className="mx-auto max-w-md">
        <div className="rounded-[var(--radius)] border bg-[var(--card)] p-8">
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div
              className="rounded-full p-3"
              style={{ background: "var(--muted)" }}
            >
              <Lock className="h-6 w-6" style={{ color: "var(--accent-blue)" }} />
            </div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
              管理员验证
            </h2>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              此页面仅对仓库协作者开放。请输入具有
              <code
                className="mx-1 px-1.5 py-0.5 rounded text-xs"
                style={{ background: "var(--muted)", fontFamily: "var(--font-mono)" }}
              >
                repo
              </code>
              权限的 GitHub Personal Access Token。
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Github
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && token.trim() && !state.verifying) {
                    handleVerify();
                  }
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-[var(--radius-sm)] border bg-[var(--background)] pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--accent-blue)]"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            <label
              className="flex items-center gap-2 text-xs cursor-pointer select-none"
              style={{ color: "var(--muted-foreground)" }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
              />
              在此设备记住我（关闭浏览器后仍保持登录）
            </label>

            {state.error && (
              <div
                className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  color: "var(--destructive)",
                  borderColor: "var(--destructive)",
                }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{state.error}</span>
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={!token.trim() || state.verifying}
              className="btn-blue w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  验证并进入
                </>
              )}
            </button>

            <div
              className="text-[11px] mt-2 leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              <p className="mb-1">如何获取 Token：</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>
                  访问{" "}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Air%20Stats%20Admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    GitHub Token 创建页
                  </a>
                </li>
                <li>勾选 <code style={{ fontFamily: "var(--font-mono)" }}>repo</code> 权限</li>
                <li>生成后复制 Token 粘贴到上方输入框</li>
              </ol>
              <p className="mt-2">
                Token 仅保存在浏览器本地，不会发送到任何服务器（除 GitHub API 外）。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
