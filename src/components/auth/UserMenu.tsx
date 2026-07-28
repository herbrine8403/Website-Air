import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Bell, Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * 头像下拉菜单：登录后显示在 Navbar 右侧
 * - 桌面端显示头像 + 用户名 + 下拉箭头
 * - 移动端仅显示头像
 * - 点击外部关闭菜单
 *
 * 注意：本组件不使用 react-router-dom 的 Link/useNavigate，
 * 因为 Navbar 可能在非 Router 上下文中渲染（如首页 / 安装页 / 公告页）。
 * 使用 <a> 标签 + window.location.href 保证在所有入口均可工作。
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    setOpen(false);
    logout();
    // 跳转首页（全页刷新，兼容非 Router 上下文）
    window.location.href = '/';
  };

  // 取用户名前两位作为无头像时的占位文字
  const initials = user.username.slice(0, 2).toUpperCase();

  const menuItemClass = 'flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--muted)]';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 transition-colors"
        style={{
          background: open ? 'var(--muted)' : 'transparent',
        }}
        aria-label="用户菜单"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div
          className="avatar avatar-sm flex items-center justify-center font-semibold flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            color: 'var(--accent-blue-foreground)',
            fontSize: 12,
            overflow: 'hidden',
            backgroundImage: user.avatar_url ? `url(${user.avatar_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {!user.avatar_url && initials}
        </div>
        <span
          className="hidden md:inline text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          {user.username}
        </span>
        <ChevronDown
          size={14}
          className="hidden md:inline"
          style={{ color: 'var(--muted-foreground)' }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-md shadow-lg overflow-hidden"
          style={{
            background: 'var(--popover, var(--card))',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
          }}
        >
          <a
            href="/account/dashboard"
            onClick={() => setOpen(false)}
            className={menuItemClass}
            style={{ color: 'var(--foreground)' }}
            role="menuitem"
          >
            <LayoutDashboard size={16} /> 控制台
          </a>
          <a
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className={menuItemClass}
            style={{ color: 'var(--foreground)' }}
            role="menuitem"
          >
            <Bell size={16} /> 通知
          </a>
          <a
            href="/account/settings"
            onClick={() => setOpen(false)}
            className={menuItemClass}
            style={{ color: 'var(--foreground)' }}
            role="menuitem"
          >
            <Settings size={16} /> 设置
          </a>
          <a
            href={`/account/profile/${user.username}`}
            onClick={() => setOpen(false)}
            className={menuItemClass}
            style={{ color: 'var(--foreground)' }}
            role="menuitem"
          >
            <User size={16} /> 我的主页
          </a>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <button
            type="button"
            onClick={handleLogout}
            className={`${menuItemClass} w-full text-left`}
            style={{ color: 'var(--destructive)' }}
            role="menuitem"
          >
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
