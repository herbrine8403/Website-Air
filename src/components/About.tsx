import { motion } from "framer-motion";
import { Github, Gift, Languages, MessageSquare, type LucideIcon } from "lucide-react";

type AboutCard = {
  id: string;
  size: "md" | "sm";
  icon: LucideIcon;
  tag: string;
  title: string;
  badge: string;
  description: string;
};

const aboutCards: AboutCard[] = [
  {
    id: "open-source",
    size: "md",
    icon: Github,
    tag: "开源",
    title: "开源项目",
    badge: "开源",
    description: "Air 是一个开源项目，代码托管在 GitHub 上，欢迎参与贡献。",
  },
  {
    id: "free",
    size: "sm",
    icon: Gift,
    tag: "免费",
    title: "免费使用",
    badge: "免费",
    description: "完全免费使用，不会收取任何费用。",
  },
  {
    id: "i18n",
    size: "sm",
    icon: Languages,
    tag: "本地化",
    title: "本地化支持",
    badge: "中文",
    description: "支持完整的中文本地化，为中文用户提供更好的体验。",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 20 } as const,
  },
};

export function About() {
  return (
    <section id="about" className="px-6 py-24">
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
          关于项目
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
          开源 · 免费 · 本地化
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
        {aboutCards.map((card) => {
          const Icon = card.icon;
          const sizeClass = card.size === "md" ? "bento-card--md" : "bento-card--sm";
          return (
            <motion.article
              key={card.id}
              variants={itemVariants}
              className={`bento-card ${sizeClass}`}
            >
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
                {card.tag}
              </span>
              <div className="mb-2 flex items-center gap-2">
                <h3
                  className={`min-w-0 truncate font-semibold ${
                    card.size === "md" ? "text-lg" : "text-base"
                  }`}
                  style={{ color: "var(--foreground)" }}
                >
                  {card.title}
                </h3>
                <span
                  className="shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-[11px]"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {card.badge}
                </span>
              </div>
              <p
                className={`line-clamp-3 text-sm leading-relaxed ${
                  card.size === "md" ? "max-w-sm" : ""
                }`}
                style={{ color: "var(--muted-foreground)" }}
              >
                {card.description}
              </p>
            </motion.article>
          );
        })}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="mt-8 flex flex-wrap gap-3"
      >
        <a
          href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-blue"
        >
          <Github className="h-4 w-4" />
          访问 GitHub
        </a>
        <a
          href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          <MessageSquare className="h-4 w-4" />
          提交反馈
        </a>
      </motion.div>
    </section>
  );
}
