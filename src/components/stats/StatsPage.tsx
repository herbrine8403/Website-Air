import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminAuth } from "@/components/stats/AdminAuth";
import { RefreshCw, Users, AlertCircle, Gamepad2, Clock, Power, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsData {
  online_users: number;
  total_users: number;
  total_mc_launches: number;
  total_crashes: number;
  total_play_time_hours: number;
  launcher_opens: number;
  device_models: { model: string; count: number; label: string }[];
  ios_versions: { version: string; count: number }[];
  launcher_versions: { version: string; count: number }[];
  jailbreak_distribution: { status: string; count: number }[];
  original_amethyst_installed: number;
  mc_version_stats: { version: string; launch_count: number; play_time_hours: number; crash_count: number }[];
  recent_crashes: { crash_type: string; mc_version: string; device_model: string; count: number }[];
  last_updated: string;
}

// 在线用户数字使用绿色
const ACCENT_GREEN = "var(--color-success)";

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function formatJailbreakStatus(status: string): string {
  const map: Record<string, string> = {
    trollstore: "TrollStore",
    altstore: "AltStore",
    jailbroken: "已越狱",
    none: "无",
  };
  return map[status] || status;
}

// 统计卡片组件
function StatCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
        >
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold" style={{ color: color || "var(--foreground)" }}>
        {value}
      </p>
    </div>
  );
}

// 分布列表项类型（兼容 device_models / ios_versions 等不同结构）
interface DistributionItem {
  count: number;
  [key: string]: string | number;
}

// 分布列表组件
function DistributionList({
  items,
  formatLabel,
}: {
  items: DistributionItem[];
  formatLabel?: (item: DistributionItem) => string;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (items.length === 0) return <p style={{ color: "var(--muted-foreground)" }}>暂无数据</p>;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, idx) => {
        const label = formatLabel
          ? formatLabel(item)
          : String(item.version || item.model || item.status || "");
        const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>
              {label}
            </span>
            <div className="flex-1 h-2 rounded-full" style={{ background: "var(--muted)" }}>
              <div
                className="h-2 rounded-full"
                style={{ width: `${percent}%`, background: "var(--accent-blue)" }}
              />
            </div>
            <span
              className="text-xs w-20 text-right"
              style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            >
              {item.count} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 管理员验证状态
  const [authed, setAuthed] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://[2409:8a14:670:1e81:d9e2:38f5:7964:d1cb]:8080/api/stats.php");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 仅在已通过管理员验证后才拉取统计数据
    if (!authed) return;
    fetchStats();
    // 每 5 分钟自动刷新
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats, authed]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      <Navbar forceActive="stats" />
      <div className="navbar-spacer" aria-hidden="true" />

      <main className="mx-auto max-w-[960px] px-6">
        {/* Page Header */}
        <section className="flex flex-col gap-3 py-16 sm:py-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" style={{ color: "var(--accent-blue)" }} />
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
              >
                Analytics
              </span>
            </div>
            {authed && (
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)] disabled:opacity-50"
                style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                刷新
              </button>
            )}
          </div>
          <h1 className="text-4xl" style={{ fontFamily: "var(--font-serif)", color: "var(--foreground)" }}>
            使用统计
          </h1>
          <p className="text-base" style={{ color: "var(--muted-foreground)" }}>
            Air 启动器的实时使用数据（每 5 分钟自动刷新）
          </p>
        </section>

        {/* 管理员验证拦截层：未验证则只显示登录表单 */}
        {!authed ? (
          <AdminAuth
            authed={authed}
            onAuthed={() => setAuthed(true)}
            onLogout={() => setAuthed(false)}
          />
        ) : (
          <>
            {/* 已登录状态条 */}
            <AdminAuth
              authed={authed}
              onAuthed={() => setAuthed(true)}
              onLogout={() => setAuthed(false)}
            />

            {/* Loading / Error / Content */}
            {loading && !stats ? (
              <section className="pb-16">
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--muted-foreground)" }} />
                </div>
              </section>
            ) : error ? (
              <section className="pb-16">
                <div className="flex flex-col items-center gap-3 py-20">
                  <AlertCircle className="h-8 w-8" style={{ color: "var(--destructive)" }} />
                  <p style={{ color: "var(--muted-foreground)" }}>加载失败：{error}</p>
                  <button onClick={fetchStats} className="btn-blue">
                    重试
                  </button>
                </div>
              </section>
            ) : stats ? (
              <>
            {/* 顶部数据卡片 */}
            <section className="pb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard
                  icon={<Users className="h-4 w-4" style={{ color: ACCENT_GREEN }} />}
                  label="在线用户"
                  value={stats.online_users}
                  color={ACCENT_GREEN}
                />
                <StatCard icon={<Users className="h-4 w-4" />} label="总用户数" value={stats.total_users} />
                <StatCard
                  icon={<Gamepad2 className="h-4 w-4" />}
                  label="MC启动次数"
                  value={stats.total_mc_launches}
                />
                <StatCard
                  icon={<AlertCircle className="h-4 w-4" style={{ color: "var(--destructive)" }} />}
                  label="崩溃次数"
                  value={stats.total_crashes}
                  color="var(--destructive)"
                />
                <StatCard
                  icon={<Clock className="h-4 w-4" />}
                  label="游戏时长"
                  value={formatHours(stats.total_play_time_hours)}
                />
                <StatCard
                  icon={<Power className="h-4 w-4" />}
                  label="启动器开启"
                  value={stats.launcher_opens}
                />
              </div>
            </section>

            {/* 分布统计 */}
            <section className="pb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 设备型号分布 */}
                <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                    设备型号分布
                  </h3>
                  <DistributionList
                    items={stats.device_models}
                    formatLabel={(item) => String(item.label || item.model || "")}
                  />
                </div>
                {/* 系统版本分布 */}
                <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                    系统版本分布
                  </h3>
                  <DistributionList items={stats.ios_versions} />
                </div>
                {/* 启动器版本分布 */}
                <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                    启动器版本分布
                  </h3>
                  <DistributionList items={stats.launcher_versions} />
                </div>
                {/* 签名/越狱状态 */}
                <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                    签名/越狱状态
                  </h3>
                  <DistributionList
                    items={stats.jailbreak_distribution}
                    formatLabel={(item) => formatJailbreakStatus(String(item.status || ""))}
                  />
                </div>
              </div>
            </section>

            {/* 原版 Amethyst 安装数 */}
            <section className="pb-8">
              <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  原版 Amethyst 安装数
                </h3>
                <p className="text-2xl font-bold" style={{ color: "var(--accent-blue)" }}>
                  {stats.original_amethyst_installed}
                  <span
                    className="text-sm font-normal ml-2"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    / {stats.total_users} 用户
                  </span>
                </p>
              </div>
            </section>

            {/* MC 版本统计表格 */}
            <section className="pb-8">
              <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                  Minecraft 版本统计
                </h3>
                {stats.mc_version_stats.length === 0 ? (
                  <p style={{ color: "var(--muted-foreground)" }}>暂无数据</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <th className="text-left py-2 px-3" style={{ color: "var(--muted-foreground)" }}>
                            版本
                          </th>
                          <th
                            className="text-right py-2 px-3"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            启动次数
                          </th>
                          <th
                            className="text-right py-2 px-3"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            游戏时长
                          </th>
                          <th
                            className="text-right py-2 px-3"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            崩溃次数
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.mc_version_stats.map((v, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td className="py-2 px-3" style={{ color: "var(--foreground)" }}>
                              {v.version}
                            </td>
                            <td
                              className="text-right py-2 px-3"
                              style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)" }}
                            >
                              {v.launch_count}
                            </td>
                            <td
                              className="text-right py-2 px-3"
                              style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)" }}
                            >
                              {formatHours(v.play_time_hours)}
                            </td>
                            <td
                              className="text-right py-2 px-3"
                              style={{
                                color: v.crash_count > 0 ? "var(--destructive)" : "var(--foreground)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {v.crash_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* 近期崩溃统计 */}
            <section className="pb-16">
              <div className="rounded-[var(--radius)] border bg-[var(--card)] p-6">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
                  近期崩溃统计（7天内）
                </h3>
                {stats.recent_crashes.length === 0 ? (
                  <p style={{ color: "var(--muted-foreground)" }}>暂无崩溃记录</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stats.recent_crashes.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <span
                          className="rounded px-2 py-0.5 text-xs font-mono"
                          style={{ background: "var(--destructive)", color: "white" }}
                        >
                          {c.crash_type}
                        </span>
                        <span style={{ color: "var(--foreground)" }}>MC {c.mc_version}</span>
                        <span style={{ color: "var(--muted-foreground)" }}>{c.device_model}</span>
                        <span
                          className="ml-auto"
                          style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                        >
                          {c.count}次
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
            ) : null}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
