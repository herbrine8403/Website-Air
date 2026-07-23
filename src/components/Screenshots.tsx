import { motion } from "framer-motion";
import {
  LayoutGrid,
  Puzzle,
  Layers,
  SlidersHorizontal,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

type ShotCard = {
  id: string;
  size: "lg" | "md" | "sm";
  icon: LucideIcon;
  title: string;
  subtitle: string;
};

const screenshots: ShotCard[] = [
  {
    id: "home",
    size: "lg",
    icon: LayoutGrid,
    title: "主页磁贴",
    subtitle: "个性化卡片式主页",
  },
  {
    id: "mod",
    size: "md",
    icon: Puzzle,
    title: "Mod 管理",
    subtitle: "强大的 Mod 管理界面",
  },
  {
    id: "version",
    size: "md",
    icon: Layers,
    title: "版本管理",
    subtitle: "多版本游戏管理",
  },
  {
    id: "controls",
    size: "sm",
    icon: SlidersHorizontal,
    title: "自定义控件",
    subtitle: "灵活的自定义控制布局",
  },
  {
    id: "settings",
    size: "sm",
    icon: Settings,
    title: "设置面板",
    subtitle: "丰富的设置选项",
  },
  {
    id: "accounts",
    size: "sm",
    icon: Users,
    title: "账户系统",
    subtitle: "多账户管理",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 20 } as const,
  },
};

export function Screenshots() {
  return (
    <section id="screenshots" className="px-6 py-24">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-12 flex flex-col gap-2"
      >
        <span
          className="text-xs uppercase tracking-wider"
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
        >
          界面预览
        </span>
        <h2
          className="text-4xl font-bold"
          style={{
            color: "var(--foreground)",
            fontFamily: "var(--font-sans)",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
          }}
        >
          直观的操作体验
        </h2>
      </motion.div>

      {/* Screenshot Bento Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="screenshot-grid"
      >
        {screenshots.map((shot) => {
          const Icon = shot.icon;
          const sizeClass =
            shot.size === "lg"
              ? "ss-card--lg"
              : shot.size === "md"
              ? "ss-card--md"
              : "ss-card--sm";
          return (
            <motion.article
              key={shot.id}
              variants={itemVariants}
              className={`ss-card ${sizeClass}`}
            >
              <div
                className="flex flex-1 flex-col items-center justify-center"
                style={{
                  background: "var(--muted)",
                  minHeight: shot.size === "lg" ? "400px" : "200px",
                }}
              >
                <Icon
                  className="h-12 w-12"
                  style={{
                    color: "var(--muted-foreground)",
                    opacity: 0.4,
                  }}
                  aria-hidden="true"
                />
              </div>
              <div className="p-4">
                <h3
                  className="truncate text-sm font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {shot.title}
                </h3>
                <p
                  className="truncate text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {shot.subtitle}
                </p>
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}
