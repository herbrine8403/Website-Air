import { AlertCircle, RotateCw } from "lucide-react";
import { useGitHubReleases } from "@/hooks/useGitHubReleases";
import { ReleaseCard } from "./ReleaseCard";

interface LegacyReleasesCardProps {
  /** 是否激活（仅在 Tab 切换到 legacy 时才加载，避免无谓请求） */
  active: boolean;
}

export function LegacyReleasesCard({ active }: LegacyReleasesCardProps) {
  const { releases, loading, error, reload } = useGitHubReleases(active);

  return (
    <div className="flex flex-col gap-4">
      {/* 数据来源提示 */}
      <div
        className="text-[11px]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
          padding: "8px 12px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--muted)",
        }}
      >
        数据来源于 GitHub Releases API · 切换下载源可加速下载
      </div>

      {/* 加载状态 */}
      {loading && <LoadingState />}

      {/* 错误状态 */}
      {!loading && error && (
        <ErrorState message={error} onRetry={reload} />
      )}

      {/* 正常内容 */}
      {!loading && !error && releases.length === 0 && <EmptyState />}

      {!loading && !error && releases.length > 0 && (
        <>
          {releases.map((release, idx) => (
            <ReleaseCard
              key={release.id}
              release={release}
              isFirst={idx === 0}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* ============================================================
   内部组件 — 状态展示
   ============================================================ */
function LoadingState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-12"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        boxShadow: "var(--shadow-sm)",
        color: "var(--muted-foreground)",
      }}
    >
      <div
        className="h-10 w-10 rounded-full border-[3px] animate-spin"
        style={{
          borderColor: "var(--border)",
          borderTopColor: "var(--accent-blue)",
        }}
      />
      <div className="text-sm">正在加载版本信息...</div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-12 text-center"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <AlertCircle
        className="h-12 w-12"
        style={{ color: "var(--destructive)" }}
      />
      <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        加载失败：{message}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-[filter,transform] duration-150 hover:brightness-110 active:scale-95"
        style={{
          background: "var(--accent-blue)",
          color: "var(--accent-blue-foreground)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <RotateCw className="h-4 w-4" />
        重新加载
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex items-center justify-center p-12 text-sm"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        boxShadow: "var(--shadow-sm)",
        color: "var(--muted-foreground)",
      }}
    >
      暂无版本信息
    </div>
  );
}

export default LegacyReleasesCard;
