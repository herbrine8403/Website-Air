import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AnnouncementsPage from "@/components/announcements/AnnouncementsPage";
import { AuthProvider } from "@/hooks/useAuth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <AnnouncementsPage />
    </AuthProvider>
  </StrictMode>
);
