import { useState } from "react";
import { Download, FileDown } from "lucide-react";
import {
  type DownloadSource,
  type Release,
  type ReleaseAsset,
  buildDownloadUrl,
  formatDate,
  formatSize,
  getAssetTypeLabel,
  getTotalDownloads,
  hasOneDriveSource,
  parseChangelog,
} from "@/hooks/useGitHubReleases";
import { SourceSwitcher } from "./SourceSwitcher";

interface ReleaseCardProps {
  release: Release;
  /** 是否为最新版本（影响 changelog 标题：更新内容 vs 更新日志） */
  isFirst: boolean;
}

export function ReleaseCard({ release, isFirst }: ReleaseCardProps) {
  const [source, setSource] = useState<DownloadSource>("github");
  const tagName = release.tag_name;
  const showOneDrive = hasOneDriveSource(tagName);
  const totalDownloads = getTotalDownloads(release.assets);
  const changelog = parseChangelog(release.body);

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
      {/* Version header */}
      <div>
        <div
          className="text-3xl font-bold"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--foreground)",
          }}
        >
          {tagName}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className="text-sm whitespace-nowrap"
            style={{ color: "var(--muted-foreground)" }}
          >
            发布日期 {formatDate(release.published_at)}
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
            总下载 {totalDownloads.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Download source switcher */}
      <SourceSwitcher
        active={source}
        onChange={setSource}
        showOneDrive={showOneDrive}
      />

      {/* Asset list */}
      {release.assets.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {release.assets.map((asset) => (
            <AssetItem
              key={asset.name}
              asset={asset}
              source={source}
              tagName={tagName}
            />
          ))}
        </div>
      ) : (
        <div
          className="mt-4 p-4 text-sm"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          此版本暂无下载资源
        </div>
      )}

      {/* Changelog */}
      {(changelog.updates.length > 0 || changelog.notes.length > 0) && (
        <div className="mt-6">
          {changelog.updates.length > 0 && (
            <ChangelogCategory
              title={isFirst ? "更新内容" : "更新日志"}
              items={changelog.updates}
            />
          )}
          {changelog.notes.length > 0 && (
            <div className={changelog.updates.length > 0 ? "mt-4" : ""}>
              <ChangelogCategory title="注意事项" items={changelog.notes} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   内部组件 — AssetItem
   ============================================================ */
interface AssetItemProps {
  asset: ReleaseAsset;
  source: DownloadSource;
  tagName: string;
}

function AssetItem({ asset, source, tagName }: AssetItemProps) {
  const url = buildDownloadUrl(source, asset, tagName);
  const typeLabel = getAssetTypeLabel(asset.name);

  return (
    <div
      className="flex items-center justify-between p-4 gap-3"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--muted)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <FileDown
          className="h-5 w-5 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className="truncate text-sm"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--foreground)",
            }}
          >
            {asset.name}
          </span>
          <span
            className="truncate text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {typeLabel} · {formatSize(asset.size)} ·{" "}
            {asset.download_count.toLocaleString()} 次下载
          </span>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="ml-3 flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-[filter,transform] duration-150 hover:brightness-110 active:scale-95"
        style={{
          background: "var(--accent-blue)",
          color: "var(--accent-blue-foreground)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <Download className="h-3.5 w-3.5" />
        <span>下载</span>
      </a>
    </div>
  );
}

/* ============================================================
   内部组件 — ChangelogCategory
   ============================================================ */
interface ChangelogCategoryProps {
  title: string;
  items: string[];
}

function ChangelogCategory({ title, items }: ChangelogCategoryProps) {
  return (
    <div>
      <div className="mb-2 flex items-center">
        <span
          className="mr-2 inline-block"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--accent-blue)",
          }}
        />
        <span
          className="text-[11px] uppercase tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--muted-foreground)",
          }}
        >
          {title}
        </span>
      </div>
      <ul className="flex flex-col">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="py-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            - {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ReleaseCard;
