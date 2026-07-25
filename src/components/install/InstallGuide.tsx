import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallMethod {
  id: string;
  title: string;
  /** 徽章文字 */
  badge: string;
  /** 徽章是否高亮（推荐用蓝色，其他用灰色） */
  badgeHighlight: boolean;
  steps: string[];
  note: string;
}

const installMethods: InstallMethod[] = [
  {
    id: "trollstore",
    title: "TrollStore",
    badge: "推荐",
    badgeHighlight: true,
    steps: [
      "下载 TrollStore 安装包并安装到设备",
      "通过 TrollStore 安装下载的 .tipa 文件",
      "启动 Air，享受游戏",
    ],
    note: "TrollStore 需要特定 iOS 版本，请参考官方教程",
  },
  {
    id: "altstore",
    title: "AltStore / SideStore",
    badge: "7天",
    badgeHighlight: false,
    steps: [
      "安装 AltStore 或 SideStore",
      "连接电脑并信任应用",
      "通过 AltStore 安装 .ipa 文件",
    ],
    note: "需要每 7 天重新签名",
  },
  {
    id: "jailbreak",
    title: "越狱设备",
    badge: "高级",
    badgeHighlight: false,
    steps: [
      "确保设备已越狱",
      "通过 Filza 安装 .ipa 文件",
      "在设置中信任应用",
    ],
    note: "越狱有风险，请谨慎操作",
  },
];

export function InstallGuide() {
  // 默认展开 TrollStore（推荐方式）
  const [expanded, setExpanded] = useState<string | null>("trollstore");

  const toggle = (id: string) => {
    setExpanded((cur) => (cur === id ? null : id));
  };

  return (
    <section className="py-16 sm:py-20">
      <div className="mb-6">
        <div
          className="text-xs uppercase tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          安装指南
        </div>
        <h2
          className="mt-1 text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          三种安装方式
        </h2>
      </div>
      <div className="flex flex-col gap-4">
        {installMethods.map((method) => {
          const isOpen = expanded === method.id;
          return (
            <div
              key={method.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--card)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => toggle(method.id)}
                className="flex w-full items-center justify-between p-5 sm:p-6 text-left"
                aria-expanded={isOpen}
                aria-controls={`install-method-${method.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <h3
                    className="text-lg font-semibold truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {method.title}
                  </h3>
                  <span
                    className="rounded px-2 py-0.5 text-[11px] whitespace-nowrap shrink-0"
                    style={{
                      background: method.badgeHighlight
                        ? "var(--accent-blue)"
                        : "var(--muted)",
                      color: method.badgeHighlight
                        ? "var(--accent-blue-foreground)"
                        : "var(--muted-foreground)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {method.badge}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-300",
                    isOpen && "rotate-180"
                  )}
                  style={{ color: "var(--muted-foreground)" }}
                />
              </button>

              {/* Content — grid-rows 动画实现平滑展开 */}
              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                )}
                id={`install-method-${method.id}`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 sm:px-6 pb-6 pt-0">
                    <div className="flex flex-col gap-3">
                      {method.steps.map((step, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3"
                        >
                          <span
                            className="shrink-0 text-sm font-bold"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "var(--muted-foreground)",
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className="text-sm"
                            style={{ color: "var(--foreground)" }}
                          >
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      className="mt-4 p-3 text-xs"
                      style={{
                        background: "var(--muted)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {method.note}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default InstallGuide;
