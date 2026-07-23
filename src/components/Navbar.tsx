import { useState, useEffect } from "react";
import { Menu, X, Github } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "首页", href: "/", active: "home", key: "home" },
  { label: "功能", href: "#features", active: "features", key: "features" },
  { label: "安装", href: "/install", active: "install", key: "install" },
  { label: "截图", href: "#screenshots", active: "screenshots", key: "screenshots" },
  { label: "关于", href: "#about", active: "about", key: "about" },
];

interface NavbarProps {
  /** 强制高亮的导航项（用于叶子页，如安装页传 "install"）；不传则按滚动位置自动同步 */
  forceActive?: string;
}

export function Navbar({ forceActive }: NavbarProps = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

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
    const sections = ["home", "features", "announcements", "screenshots", "about"];
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
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
