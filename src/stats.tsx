import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import StatsPage from "@/components/stats/StatsPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StatsPage />
  </StrictMode>
);
