import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        install: path.resolve(__dirname, "install.html"),
        announcements: path.resolve(__dirname, "announcements.html"),
        stats: path.resolve(__dirname, "stats.html"),
        resources: path.resolve(__dirname, "resources.html"),
        forum: path.resolve(__dirname, "forum.html"),
        account: path.resolve(__dirname, "account.html"),
        callback: path.resolve(__dirname, "callback.html"),
      },
    },
  },
});
