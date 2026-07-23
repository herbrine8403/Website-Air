import { cn } from "@/lib/utils";
import type { DownloadSource } from "@/hooks/useGitHubReleases";

interface SourceSwitcherProps {
  active: DownloadSource;
  onChange: (source: DownloadSource) => void;
  /** 是否显示 OneDrive 源（仅 v4.0.1+） */
  showOneDrive: boolean;
}

const sourceLabels: { key: DownloadSource; label: string }[] = [
  { key: "github", label: "GitHub" },
  { key: "ghproxy", label: "GitHub Proxy" },
  { key: "edgeone", label: "EdgeOne" },
  { key: "onedrive", label: "OneDrive" },
];

export function SourceSwitcher({
  active,
  onChange,
  showOneDrive,
}: SourceSwitcherProps) {
  const sources = sourceLabels.filter(
    (s) => s.key !== "onedrive" || showOneDrive
  );

  return (
    <div className="mt-6">
      <div
        className="mb-2 text-[11px] uppercase tracking-wider"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--muted-foreground)",
        }}
      >
        下载源
      </div>
      <div
        className="flex gap-1 p-1 overflow-x-auto no-scrollbar"
        style={{
          background: "var(--muted)",
          borderRadius: "var(--radius)",
        }}
      >
        {sources.map((source) => {
          const isActive = active === source.key;
          return (
            <button
              key={source.key}
              type="button"
              onClick={() => onChange(source.key)}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200"
              )}
              style={{
                background: isActive ? "var(--card)" : "transparent",
                color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                borderRadius: "calc(var(--radius) - 4px)",
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
              }}
              aria-pressed={isActive}
            >
              {source.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SourceSwitcher;
