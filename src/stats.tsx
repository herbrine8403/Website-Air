import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import StatsPage from "@/components/stats/StatsPage";
import { AuthProvider } from "@/hooks/useAuth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <StatsPage />
    </AuthProvider>
  </StrictMode>
);
