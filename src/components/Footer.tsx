import { Github } from "lucide-react";

type FooterLinkItem = { label: string; href: string; external?: boolean };

const footerGroups: { title: string; links: FooterLinkItem[] }[] = [
  {
    title: "产品",
    links: [
      { label: "首页", href: "/" },
      { label: "安装", href: "/install" },
      { label: "公告", href: "/announcements.html" },
      { label: "统计", href: "/stats.html" },
    ],
  },
  {
    title: "资源",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/herbrine8403/Amethyst-iOS-MyRemastered",
        external: true,
      },
      {
        label: "Issues",
        href: "https://github.com/herbrine8403/Amethyst-iOS-MyRemastered/issues",
        external: true,
      },
      {
        label: "Releases",
        href: "https://github.com/herbrine8403/Amethyst-iOS-MyRemastered/releases",
        external: true,
      },
      { label: "TrollStore 教程", href: "#" },
    ],
  },
  {
    title: "相关",
    links: [
      {
        label: "Amethyst iOS",
        href: "https://github.com/AngelAuraMC/Amethyst-iOS",
        external: true,
      },
      { label: "AltStore", href: "https://altstore.io", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--background)",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* 品牌 */}
          <div>
            <div
              className="text-lg font-bold"
              style={{
                color: "var(--foreground)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Air
            </div>
            <p
              className="mt-2 max-w-xs text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              一个强大的 iOS 端 Minecraft Java 版启动器
            </p>
          </div>

          {/* 链接组 */}
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3
                className="mb-3 text-[11px] uppercase tracking-wider"
                style={{
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="footer-link text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 底部条 */}
        <div
          className="mt-8 flex items-center justify-between pt-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <a
            href="https://icp.gov.moe/?keyword=20262011"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link text-xs"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            萌ICP备20262011号
          </a>
          <a
            href="https://github.com/herbrine8403/Amethyst-iOS-MyRemastered"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn rounded p-2"
            aria-label="GitHub 仓库"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
