import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";
import "./light.css";

/*
  LanguageProvider is NO LONGER here.
  Each layout mounts its own isolated provider with its own role:
    AdminLayout    → <LanguageProvider role="admin">
    ResidentLayout → <LanguageProvider role="resident">

  This ensures Admin and Resident language preferences are
  completely independent of each other.
*/

import { SidebarProvider } from "./context/SidebarContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AuthProvider>
      <SidebarProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SidebarProvider>
    </AuthProvider>
  </ThemeProvider>
);