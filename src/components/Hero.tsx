import { motion } from "framer-motion";
import { Download, ChevronRight } from "lucide-react";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex flex-col items-start gap-6 px-6 py-24 sm:py-28 md:py-32"
    >
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-2"
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--accent-blue)" }}
          aria-hidden="true"
        />
        <span
          className="text-xs uppercase tracking-wider"
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
          }}
        >
          新一代 iOS 端 Minecraft 启动器
        </span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
        className="text-[64px] leading-none sm:text-[80px] md:text-[96px]"
        style={{
          fontFamily: "var(--font-serif)",
          color: "var(--foreground)",
          letterSpacing: "var(--tracking-tight)",
          wordBreak: "keep-all",
          overflowWrap: "break-word",
        }}
      >
        Air
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
        className="text-2xl font-normal"
        style={{ color: "var(--muted-foreground)" }}
      >
        为 iOS 打造的 Minecraft 启动器
      </motion.p>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
        className="max-w-xl text-base leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        一款面向 iOS 和 iPadOS 平台的 Minecraft: Java Edition 高端启动器，基于官方 Amethyst 项目深度重构。提供了精致的移动端体验，集成了全面的 Mod 管理、智能渲染器选择以及深度的平台适配能力。
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
        className="mt-4 flex flex-wrap gap-3"
      >
        <a href="/install" className="btn-blue">
          <Download className="h-4 w-4" />
          立即下载
        </a>
        <a href="#features" className="btn-outline">
          了解更多
          <ChevronRight className="h-4 w-4" />
        </a>
      </motion.div>
    </section>
  );
}
