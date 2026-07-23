import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = saved === "dark" || (!saved && prefersDark);
    setIsDark(shouldDark);
    if (shouldDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("icon-btn relative rounded p-2", className)}
      aria-label="切换主题"
    >
      {/* 浅色态：显示月亮（点击切到深色）；深色态：显示太阳 */}
      <Moon className="h-5 w-5 block dark:hidden" />
      <Sun className="h-5 w-5 hidden dark:block" />
    </button>
  );
}
