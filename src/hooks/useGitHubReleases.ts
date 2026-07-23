import { useCallback, useEffect, useState } from "react";

/* ============================================================
   类型定义 — 与 GitHub Releases API 响应对齐
   ============================================================ */
export interface ReleaseAsset {
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface Release {
  id: number;
  tag_name: string;
  name: string | null;
  published_at: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

export type DownloadSource = "github" | "ghproxy" | "edgeone" | "onedrive";

export interface ParsedChangelog {
  updates: string[];
  notes: string[];
}

/* ============================================================
   常量 — 与原 install.html 保持一致
   ============================================================ */
const GITHUB_API =
  "https://gh-proxy.com/https://api.github.com/repos/herbrine8403/Amethyst-iOS-MyRemastered/releases";
const ONEDRIVE_BASE = "http://amethyst.infinityfree.me";

/* v4.0.1+ 版本提供 OneDrive 源 */
const ONEDRIVE_MIN_VERSION = "4.0.1";

/* ============================================================
   工具函数
   ============================================================ */

/** 格式化文件大小（字节 → KB/MB/GB） */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

/** 格式化发布日期 → YYYY/MM/DD */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

/** 计算一个 Release 的总下载量 */
export function getTotalDownloads(assets: ReleaseAsset[]): number {
  return assets.reduce((sum, a) => sum + a.download_count, 0);
}

/** 语义版本号比较（返回 -1/0/1） */
export function compareVersions(v1: string, v2: string): number {
  const arr1 = v1.replace(/^v/, "").split(".").map(Number);
  const arr2 = v2.replace(/^v/, "").split(".").map(Number);
  const len = Math.max(arr1.length, arr2.length);
  for (let i = 0; i < len; i++) {
    const num1 = arr1[i] || 0;
    const num2 = arr2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/** 判断指定版本是否提供 OneDrive 下载源 */
export function hasOneDriveSource(tagName: string): boolean {
  return compareVersions(tagName, ONEDRIVE_MIN_VERSION) >= 0;
}

/**
 * 解析 release.body 中的 changelog
 * 支持 `## 更新内容` / `## 更新日志` / `## 注意事项` 三个章节
 */
export function parseChangelog(body: string | null): ParsedChangelog {
  const result: ParsedChangelog = { updates: [], notes: [] };
  if (!body) return result;

  const lines = body.split("\n");
  let currentSection: string | null = null;
  let currentItems: string[] = [];

  const flush = () => {
    if (currentItems.length === 0 || !currentSection) return;
    if (currentSection === "注意事项") {
      result.notes.push(...currentItems);
    } else if (
      currentSection === "更新内容" ||
      currentSection === "更新日志"
    ) {
      result.updates.push(...currentItems);
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      currentSection = line.replace("## ", "").trim();
      currentItems = [];
    } else if (line.startsWith("- ")) {
      const item = line.replace(/^-\s*/, "").replace(/\*\*/g, "").trim();
      if (item) currentItems.push(item);
    }
  }
  flush();

  return result;
}

/**
 * 根据下载源类型与 asset 拼接最终下载 URL
 */
export function buildDownloadUrl(
  source: DownloadSource,
  asset: ReleaseAsset,
  tagName: string
): string {
  const githubUrl = asset.browser_download_url;
  switch (source) {
    case "github":
      return githubUrl;
    case "ghproxy":
      return `https://ghfast.top/${githubUrl}`;
    case "edgeone":
      return `https://edgeone.gh-proxy.com/${githubUrl}`;
    case "onedrive":
      return `${ONEDRIVE_BASE}/?/${tagName}/${asset.name}`;
    default:
      return githubUrl;
  }
}

/** 推断 asset 的安装方式标签 */
export function getAssetTypeLabel(name: string): string {
  if (name.includes(".tipa")) return "TrollStore";
  if (name.includes("AltStore")) return "AltStore";
  return "通用";
}

/* ============================================================
   Hook
   ============================================================ */
interface UseGitHubReleasesState {
  releases: Release[];
  loading: boolean;
  error: string | null;
}

export function useGitHubReleases(enabled: boolean) {
  const [state, setState] = useState<UseGitHubReleasesState>({
    releases: [],
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState({ releases: [], loading: true, error: null });
    try {
      const resp = await fetch(GITHUB_API);
      if (!resp.ok) throw new Error(`API request failed: ${resp.status}`);
      const data: Release[] = await resp.json();
      const filtered = data.filter((r) => !r.draft);
      setState({ releases: filtered, loading: false, error: null });
    } catch (err) {
      console.error("Failed to load releases:", err);
      setState({
        releases: [],
        loading: false,
        error: err instanceof Error ? err.message : "未知错误",
      });
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { ...state, reload: load };
}
