// 公告数据源 — 同时作为页面渲染和 JSON API 的单一数据来源
// 修改公告内容时，请同步更新 public/api/announcements.json

export interface Announcement {
  id: string;
  title: string;
  date: string;        // ISO 日期格式
  summary: string;
  content: string;     // Markdown 格式
  priority: "high" | "normal" | "low";
  action_url?: string;
  action_title?: string;
  image_url?: string;
}

export const announcements: Announcement[] = [
  {
    id: "20260723001",
    title: "Air 启动器公告系统正式上线",
    date: "2026-07-23",
    summary: "我们很高兴地宣布，Air 启动器公告系统现已正式上线！今后，重要的功能更新、维护通知和社区活动信息都将通过此渠道第一时间推送给你。",
    content: `# Air 启动器公告系统正式上线

我们很高兴地宣布，**Air 启动器公告系统**现已正式上线！

## 这意味着什么？

今后，重要的功能更新、维护通知和社区活动信息都将通过此公告系统第一时间推送到你的启动器首页。

### 你可以期待

- **版本更新通知**：不再需要手动检查 GitHub Release，新版本发布后会直接在启动器首页显示
- **维护与故障公告**：当服务器或 Mojang API 出现问题时，我们会提前通知你
- **功能预告**：提前了解即将上线的新功能
- **社区活动**：联机活动、Mod 推荐等内容也会通过公告推送

## 如何使用

1. 打开 Air 启动器，首页公告磁贴会自动展示最新公告的标题和摘要
2. 点击公告磁贴进入公告列表，查看所有历史公告
3. 点击任意公告可查看完整正文

> 💡 你可以在 **设置 → 通用 → 公告预览** 中自定义首页磁贴显示的信息粒度。

---

感谢你使用 Air 启动器！如有任何问题或建议，欢迎在 [GitHub Issues](https://github.com/herbrine8403/Amethyst-iOS-MyRemastered/issues) 中反馈。`,
    priority: "high",
    action_url: "https://github.com/herbrine8403/Amethyst-iOS-MyRemastered",
    action_title: "前往 GitHub",
    image_url: ""
  }
];
