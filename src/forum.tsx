import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ForumApp from "@/components/forum/ForumApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ForumApp />
  </StrictMode>
);
