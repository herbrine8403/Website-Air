import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChevronDown, Megaphone, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { announcements } from "@/data/announcements";
import { cn } from "@/lib/utils";

export default function AnnouncementsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      <Navbar forceActive="announcements" />
      <div className="navbar-spacer" aria-hidden="true" />

      <main className="mx-auto max-w-[960px] px-6">
        {/* Page Header */}
        <section className="flex flex-col gap-3 py-16 sm:py-20">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" style={{ color: "var(--accent-blue)" }} />
            <span
              className="text-xs uppercase tracking-wider"
              style={{
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Announcements
            </span>
          </div>
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
            公告中心
          </h1>
          <p
            className="text-base"
            style={{ color: "var(--muted-foreground)" }}
          >
            查看 Air 启动器的最新动态、功能更新和维护通知
          </p>
        </section>

        {/* Announcement List */}
        <section className="pb-16">
          <div className="flex flex-col gap-4">
            {announcements.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <article
                  key={item.id}
                  className={cn(
                    "relative overflow-hidden rounded-[var(--radius)] border bg-[var(--card)] p-6 transition-[border-color] duration-200",
                    "hover:border-[var(--border-strong)]"
                  )}
                  style={{
                    borderColor: isExpanded ? "var(--border-strong)" : "var(--border)",
                    borderLeft: item.priority === "high" ? "3px solid var(--accent-blue)" : undefined,
                  }}
                >
                  {/* Card Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <h2
                        className="text-xl font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {item.title}
                      </h2>
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--muted-foreground)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {item.date}
                        </span>
                        {item.priority === "high" && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                            style={{
                              background: "var(--accent-blue)",
                              color: "var(--accent-blue-foreground)",
                            }}
                          >
                            重要
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                      style={{ color: "var(--muted-foreground)" }}
                    />
                  </button>

                  {/* Summary (always visible) */}
                  <p
                    className="mt-3 text-sm leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {item.summary}
                  </p>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div
                          className="mt-4 pt-4"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <div
                            className="prose prose-sm max-w-none"
                            style={{
                              color: "var(--foreground)",
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {item.content}
                            </ReactMarkdown>
                          </div>

                          {/* Action Button */}
                          {item.action_url && item.action_title && (
                            <a
                              href={item.action_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-blue mt-6 inline-flex"
                            >
                              {item.action_title}
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
