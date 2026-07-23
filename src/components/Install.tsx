import { useState } from "react";
import { motion } from "framer-motion";
import {
  Apple,
  Download,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  Terminal,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const installMethods = [
  {
    id: "trollstore",
    title: "TrollStore",
    subtitle: "推荐 · iOS 14.5 - 17.0",
    icon: Smartphone,
    color: "#0ea5e9",
    steps: [
      "确保你的设备已安装 TrollStore",
      "下载 Air 的 .tipa 安装包",
      "使用 TrollStore 打开 .tipa 文件",
      "安装完成后在设置中启用 JIT",
      "启动 Air 即可开始游戏",
    ],
    note: "TrollStore 提供最佳的 JIT 体验，无需每次手动启用。",
  },
  {
    id: "altstore",
    title: "AltStore / SideStore",
    subtitle: "iOS 14+",
    icon: Apple,
    color: "#38bdf8",
    steps: [
      "安装 AltStore 或 SideStore 到设备",
      "下载 Air 的 .ipa 安装包",
      "通过 AltStore/SideStore 安装 IPA",
      "使用 JIT 启用工具（如 StikJIT）",
      "启动 Air 开始游戏",
    ],
    note: "需要每 7 天刷新一次签名，或使用付费开发者证书。",
  },
  {
    id: "jailbreak",
    title: "越狱设备",
    subtitle: "任意 iOS 版本",
    icon: Terminal,
    color: "#0284c7",
    steps: [
      "确保设备已完成越狱",
      "添加 Air 的软件源（如有）",
      "或通过 Filza 直接安装 .deb/.ipa",
      "安装完成后即可启动",
      "越狱环境自动支持 JIT",
    ],
    note: "越狱设备拥有最高权限，游戏体验最完整。",
  },
];

export function Install() {
  const [expanded, setExpanded] = useState<string | null>("trollstore");

  return (
    <section id="install" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-50/50 to-transparent" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gradient mb-4">
            安装指南
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            选择适合你设备的安装方式，三步即可在 iOS 上畅玩 Minecraft Java 版。
          </p>
        </motion.div>

        {/* Download CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card rounded-2xl p-8 mb-10 text-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="text-left">
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                最新版本
              </h3>
              <p className="text-sm text-slate-400">
                从 GitHub Releases 下载最新构建
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="gap-2" asChild>
                <a
                  href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                  下载 IPA
                </a>
              </Button>
              <Button variant="secondary" className="gap-2" asChild>
                <a
                  href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                  下载 TIPA
                </a>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Install Methods */}
        <div className="space-y-4">
          {installMethods.map((method, index) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div
                className={cn(
                  "glass-card rounded-2xl overflow-hidden transition-all duration-300",
                  expanded === method.id && "ring-1 ring-sky-200"
                )}
              >
                {/* Header */}
                <button
                  onClick={() =>
                    setExpanded(expanded === method.id ? null : method.id)
                  }
                  className="w-full flex items-center gap-4 p-5 sm:p-6 text-left"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                    style={{
                      background: `${method.color}12`,
                      color: method.color,
                    }}
                  >
                    <method.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-700">
                        {method.title}
                      </h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: `${method.color}12`,
                          color: method.color,
                        }}
                      >
                        {method.subtitle}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-slate-400 shrink-0 transition-transform duration-300",
                      expanded === method.id && "rotate-180"
                    )}
                  />
                </button>

                {/* Content */}
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    expanded === method.id
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-6 pt-0">
                      <div className="border-t border-slate-100 pt-5">
                        <ol className="space-y-3">
                          {method.steps.map((step, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm text-slate-500"
                            >
                              <CheckCircle2
                                className="h-4 w-4 mt-0.5 shrink-0"
                                style={{ color: method.color }}
                              />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>{method.note}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* External Links */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub 仓库
          </a>
          <span className="text-slate-200">|</span>
          <a
            href="https://ios.cfw.guide/installing-trollstore/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            TrollStore 安装教程
          </a>
          <span className="text-slate-200">|</span>
          <a
            href="https://altstore.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            AltStore 官网
          </a>
        </motion.div>
      </div>
    </section>
  );
}
