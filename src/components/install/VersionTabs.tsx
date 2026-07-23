import { cn } from "@/lib/utils";

export type VersionTab = "latest" | "legacy";

interface VersionTabsProps {
  active: VersionTab;
  onChange: (tab: VersionTab) => void;
}

const tabs: { key: VersionTab; label: string; badge: string }[] = [
  { key: "latest", label: "Air 新版", badge: "新版" },
  { key: "legacy", label: "Amethyst 旧版", badge: "旧版" },
];

export function VersionTabs({ active, onChange }: VersionTabsProps) {
  return (
    <div
      className="flex gap-1 p-1"
      style={{
        background: "var(--muted)",
        borderRadius: "var(--radius)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200",
              "flex-1 justify-center sm:flex-none sm:justify-start"
            )}
            style={{
              background: isActive ? "var(--card)" : "transparent",
              color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
              borderRadius: "calc(var(--radius) - 4px)",
              boxShadow: isActive ? "var(--shadow-sm)" : "none",
            }}
            aria-pressed={isActive}
          >
            <span>{tab.label}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap"
              style={{
                background: isActive ? "var(--muted)" : "var(--background)",
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {tab.badge}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default VersionTabs;
