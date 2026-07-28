import { useState, useEffect } from "react";
import { Menu, X, Github, Bell, LogOut, LayoutDashboard, Settings, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "首页", href: "/", active: "home", key: "home" },
  { label: "资源", href: "/resources.html", active: "resources", key: "resources" },
  { label: "论坛", href: "/forum.html", active: "forum", key: "forum" },
  { label: "安装", href: "/install.html", active: "install", key: "install" },
  { label: "公告", href: "/announcements.html", active: "announcements", key: "announcements" },
  // 统计页面已设为隐藏，仅可通过直接访问 /stats.html 进入（需 GitHub Token 验证）
];

interface NavbarProps {
  /** 强制高亮的导航项（用于叶子页，如安装页传 "install"）；不传则按滚动位置自动同步 */
  forceActive?: string;
}

export function Navbar({ forceActive }: NavbarProps = {}) {
  const { user, isLoading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [unreadCount, setUnreadCount] = useState(0);

  // 滚动时为导航栏添加背景与底边
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 根据滚动位置同步高亮当前 section（叶子页强制高亮时跳过 observer）
  useEffect(() => {
    if (forceActive) {
      setActiveSection(forceActive);
      return;
    }
    const sections = ["home", "announcements"];
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [forceActive]);

  // 通知未读数轮询：登录后每 60 秒拉一次
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await api.get<{ success: boolean; count: number }>(
          "/account/notifications.php?unread=1",
          { auth: true }
        );
        if (res.success) setUnreadCount(res.count);
      } catch {
        // 静默失败：不阻塞 UI
      }
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 60000);
    return () => clearInterval(timer);
  }, [user]);

  const handleMobileLogout = () => {
    setMobileOpen(false);
    logout();
    // 跳转首页（不使用 useNavigate，因为首页可能不在 Router 上下文中）
    window.location.href = "/";
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={cn("navbar", scrolled && "scrolled", mobileOpen && "mobile-menu-open")}
      data-nav-active={activeSection}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        {/* 左：Logo */}
        <div className="flex items-center gap-2.5">
          <a
            href="/"
            className="text-xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-sans)" }}
          >
            Air
          </a>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider"
            style={{
              background: "var(--muted)",
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Preview
          </span>
        </div>

        {/* 中：桌面导航 */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={cn(
                "nav-link rounded px-3 py-1.5 text-sm",
                `nav-${link.key}`
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 右：操作 */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <a
            href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn rounded p-2"
            aria-label="GitHub 仓库"
          >
            <Github className="h-5 w-5" />
          </a>

          {/* 登录态切换区（桌面端） */}
          {!isLoading && (
            <div className="hidden md:flex items-center gap-2 ml-2">
              {!user ? (
                <a
                  href="/account.html#/account/sign-in"
                  className="btn-blue btn-sm"
                >
                  登录
                </a>
              ) : (
                <>
                  {/* 通知图标 */}
                  <a
                    href="/account.html#/account/notifications"
                    className="icon-btn relative rounded p-2"
                    aria-label={unreadCount > 0 ? `通知（${unreadCount} 条未读）` : "通知"}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 flex min-w-[16px] h-4 px-1 items-center justify-center rounded-full text-[10px] font-semibold"
                        style={{
                          background: "var(--destructive)",
                          color: "var(--destructive-foreground)",
                          lineHeight: 1,
                        }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </a>
                  <UserMenu />
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className="icon-btn nav-toggle relative rounded p-2 md:hidden"
            aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5 block" />
            ) : (
              <Menu className="h-5 w-5 block" />
            )}
          </button>
        </div>
      </div>

      {/* 移动端菜单面板 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden"
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--background)",
              overflow: "hidden",
            }}
          >
            <nav
              className="mx-auto flex max-w-[1280px] flex-col gap-1 px-6 py-4"
              aria-label="移动端导航"
            >
              {navLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "nav-link rounded px-3 py-2 text-sm",
                    `nav-${link.key}`
                  )}
                >
                  {link.label}
                </a>
              ))}

              {/* 分隔线 */}
              <div style={{ borderTop: "1px solid var(--border)", margin: "8px 0" }} />

              {/* 登录态相关入口 */}
              {!isLoading && (
                <>
                  {user ? (
                    <>
                      <a
                        href="/account.html#/account/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="nav-link rounded px-3 py-2 text-sm flex items-center gap-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <LayoutDashboard size={16} /> 控制台
                      </a>
                      <a
                        href="/account.html#/account/notifications"
                        onClick={() => setMobileOpen(false)}
                        className="nav-link rounded px-3 py-2 text-sm flex items-center gap-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Bell size={16} /> 通知
                        {unreadCount > 0 && (
                          <span
                            className="ml-auto inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full text-[10px] font-semibold"
                            style={{ background: "var(--destructive)", color: "var(--destructive-foreground)" }}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </a>
                      <a
                        href="/account.html#/account/settings"
                        onClick={() => setMobileOpen(false)}
                        className="nav-link rounded px-3 py-2 text-sm flex items-center gap-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <Settings size={16} /> 设置
                      </a>
                      <a
                        href={`/account.html#/account/profile/${user.username}`}
                        onClick={() => setMobileOpen(false)}
                        className="nav-link rounded px-3 py-2 text-sm flex items-center gap-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <UserIcon size={16} /> 我的主页
                      </a>
                      <button
                        type="button"
                        onClick={handleMobileLogout}
                        className="nav-link rounded px-3 py-2 text-sm flex items-center gap-2 text-left"
                        style={{ color: "var(--destructive)" }}
                      >
                        <LogOut size={16} /> 退出登录
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 pt-2">
                      <a
                        href="/account.html#/account/sign-in"
                        onClick={() => setMobileOpen(false)}
                        className="btn-blue btn-sm w-full"
                      >
                        登录
                      </a>
                      <a
                        href="/account.html#/account/sign-up"
                        onClick={() => setMobileOpen(false)}
                        className="btn-outline btn-sm w-full"
                      >
                        注册
                      </a>
                    </div>
                  )}
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
