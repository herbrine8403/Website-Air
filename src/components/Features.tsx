import { motion } from "framer-motion";
import {
  Puzzle,
  Sparkles,
  Package,
  Image as ImageIcon,
  Globe,
  Users,
  LayoutGrid,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

type FeatureCard = {
  id: string;
  size: "lg" | "md" | "sm";
  icon: LucideIcon;
  tag: string;
  title: string;
  description: string;
  /** 大卡片右下角装饰图标 */
  decoIcon?: LucideIcon;
};

const features: FeatureCard[] = [
  {
    id: "mod",
    size: "lg",
    icon: Puzzle,
    tag: "核心功能",
    title: "Mod 管理",
    description:
      "查看、启用/禁用和删除 Mod，支持通过搜索框快速查找。为你的 Minecraft 世界添加无限可能，轻松管理所有 Mod 文件。",
    decoIcon: Puzzle,
  },
  {
    id: "shader",
    size: "sm",
    icon: Sparkles,
    tag: "视觉增强",
    title: "光影包管理",
    description: "轻松管理光影包，一键启用或禁用，享受更逼真的游戏画面。",
  },
  {
    id: "modpack",
    size: "sm",
    icon: Package,
    tag: "快速部署",
    title: "整合包导入",
    description: "支持导入 ZIP 格式整合包，快速部署完整的 Mod 组合。",
  },
  {
    id: "wallpaper",
    size: "md",
    icon: ImageIcon,
    tag: "个性化",
    title: "自定义壁纸",
    description:
      "支持自定义启动器背景壁纸，包括图片和视频背景，打造专属启动器外观。",
  },
  {
    id: "download",
    size: "sm",
    icon: Globe,
    tag: "网络优化",
    title: "智能下载源",
    description: "自动选择最佳下载源，支持 GitHub、ghproxy、edgeone 等多种来源。",
  },
  {
    id: "accounts",
    size: "sm",
    icon: Users,
    tag: "账户管理",
    title: "多账户支持",
    description: "支持微软账户、本地账户和第三方认证，轻松切换不同账户。",
  },
  {
    id: "home",
    size: "sm",
    icon: LayoutGrid,
    tag: "界面定制",
    title: "个性化主页",
    description: "卡片式主页布局，支持自定义磁贴和个性化设置。",
  },
  {
    id: "touch",
    size: "sm",
    icon: Gamepad2,
    tag: "触屏控制",
    title: "TouchController",
    description: "通过 UDP 本地代理实现触屏控制，为 iOS 提供更好的游戏体验。",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 20 } as const,
  },
};

export function Features() {
  return (
    <section id="features" className="px-6 py-24">
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
          核心功能
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
          强大功能，一应俱全
        </h2>
      </motion.div>

      {/* Bento Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="bento-grid"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          const Deco = feature.decoIcon;
          const sizeClass =
            feature.size === "lg"
              ? "bento-card--lg"
              : feature.size === "md"
              ? "bento-card--md"
              : "bento-card--sm";
          return (
            <motion.article
              key={feature.id}
              variants={itemVariants}
              className={`bento-card ${sizeClass} flex flex-col`}
            >
              <div className="relative z-10 flex flex-1 flex-col">
                <Icon
                  className="mb-4 h-6 w-6"
                  style={{ color: "var(--muted-foreground)" }}
                  aria-hidden="true"
                />
                <span
                  className="mb-1 block text-[11px] uppercase tracking-wider"
                  style={{
                    color: "var(--muted-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {feature.tag}
                </span>
                <h3
                  className={`mb-2 font-semibold ${
                    feature.size === "lg" ? "text-2xl" : "text-lg"
                  }`}
                  style={{ color: "var(--foreground)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    feature.size === "lg" ? "line-clamp-4 max-w-md" : "line-clamp-3"
                  } ${feature.size === "md" ? "max-w-sm" : ""}`}
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {feature.description}
                </p>
              </div>
              {Deco && (
                <Deco
                  className="pointer-events-none absolute -bottom-6 -right-6 h-44 w-44"
                  style={{
                    color: "var(--foreground)",
                    opacity: 0.05,
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}
