import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import InstallPage from "@/components/install/InstallPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InstallPage />
  </StrictMode>
);
