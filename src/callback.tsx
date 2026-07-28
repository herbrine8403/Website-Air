import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CallbackPage from "@/components/auth/CallbackPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CallbackPage />
  </StrictMode>
);
