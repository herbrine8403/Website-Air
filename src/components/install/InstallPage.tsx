import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VersionTabs, type VersionTab } from "./VersionTabs";
import { AirNewVersionCard } from "./AirNewVersionCard";
import { LegacyReleasesCard } from "./LegacyReleasesCard";
import { InstallGuide } from "./InstallGuide";

export default function InstallPage() {
  const [tab, setTab] = useState<VersionTab>("latest");

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      <Navbar forceActive="install" />
      {/* 固定导航栏占位 */}
      <div className="navbar-spacer" aria-hidden="true" />

      <main className="mx-auto max-w-[960px] px-6">
        {/* SECTION 1: PAGE HEADER */}
        <section className="flex flex-col gap-3 py-16 sm:py-20">
          <h1
            className="text-4xl"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--foreground)",
              textWrap: "balance",
              wordBreak: "keep-all",
              overflowWrap: "break-word",
            }}
          >
            安装中心
          </h1>
          <p
            className="text-base"
            style={{ color: "var(--muted-foreground)" }}
          >
            选择适合你的安装方式，开始 Air 之旅
          </p>
        </section>

        {/* SECTION 2: VERSION TABS */}
        <section className="pb-8">
          <VersionTabs active={tab} onChange={setTab} />
        </section>

        {/* SECTION 3 / 4: 版本卡片（根据 Tab 切换） */}
        <section className="pb-8">
          {tab === "latest" ? (
            <AirNewVersionCard />
          ) : (
            <LegacyReleasesCard active={tab === "legacy"} />
          )}
        </section>

        {/* SECTION 5: INSTALL GUIDE */}
        <InstallGuide />
      </main>

      <Footer />
    </div>
  );
}
