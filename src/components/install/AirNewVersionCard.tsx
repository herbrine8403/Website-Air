import { Github, ArrowRight } from "lucide-react";

const REPO_URL = "https://github.com/herbrine8403/Amethyst-iOS-MyRemastered";

export function AirNewVersionCard() {
  return (
    <div
      className="p-6 sm:p-8"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="text-3xl font-bold"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--foreground)",
        }}
      >
        v1.0.0
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span
          className="text-sm whitespace-nowrap"
          style={{ color: "var(--muted-foreground)" }}
        >
          即将发布
        </span>
        <span
          className="text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          ·
        </span>
        <span
          className="text-sm whitespace-nowrap"
          style={{ color: "var(--muted-foreground)" }}
        >
          iOS 14.5+
        </span>
      </div>
      <p
        className="mt-4 text-sm leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        Air 是 Amethyst iOS Remastered 的全新重构版本，采用全新 UI 设计和更强大的功能。即将发布，敬请期待。
      </p>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center justify-between p-4 transition-colors hover:[border-color:var(--accent-blue)]"
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Github
            className="h-5 w-5 shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          />
          <span
            className="truncate text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            GitHub 仓库
          </span>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        />
      </a>
    </div>
  );
}

export default AirNewVersionCard;
