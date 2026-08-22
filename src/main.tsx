import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import AuthProvider from "./contexts/AuthProvider";

import "./global.css";
import "./styles/colors.css";
import "./styles/typography.css";

createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);