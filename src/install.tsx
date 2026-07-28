import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import InstallPage from "@/components/install/InstallPage";
import { AuthProvider } from "@/hooks/useAuth";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <InstallPage />
    </AuthProvider>
  </StrictMode>
);
