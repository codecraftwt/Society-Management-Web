


import axios from "axios";
import { customAlert } from "../context/CustomAlertContext";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach active role if present
  const userStr = localStorage.getItem("user");
  let activeRole = "";
  if (userStr) {
    try {
      const parsedUser = JSON.parse(userStr);
      activeRole = String(parsedUser.activeRole || parsedUser.role || "").toUpperCase();
      if (activeRole) {
        config.headers["x-active-role"] = parsedUser.activeRole || parsedUser.role;
      }
    } catch {
      // Ignore malformed cached user data and omit the role-specific scope.
    }
  }

  // --- NEW: Intercept & Attach Super Admin Global Filter ---
  // If the Super Admin has selected a specific society, attach it to all requests
  const saFilter = activeRole === "SUPER_ADMIN"
    ? localStorage.getItem("superadmin_society_filter")
    : null;
  const requestPath = (config.url || "").split("?")[0];
  const isSocietyScopeExempt = /^\/?societies\/?$/.test(requestPath) || /^\/?auth(?:\/|$)/.test(requestPath);
  if (saFilter && saFilter !== "ALL" && !isSocietyScopeExempt && !config._skipSuperAdminSocietyFilter) {
    // Attach as header for all requests (POST, PUT, DELETE, etc.)
    config.headers["x-society-id"] = saFilter;
    
    // Also attach as query param for GET requests (backwards compatibility with some controllers)
    if (config.method === "get") {
      config.params = { ...config.params, society_id: saFilter };
    }
  }
  // ---------------------------------------------------------

  return config;
}, (error) => {
  return Promise.reject(error);
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const isInactiveOrRevoked =
      data?.code === "ACCOUNT_INACTIVE" ||
      data?.code === "ACCESS_REVOKED";

    if ((status === 401 || isInactiveOrRevoked) && localStorage.getItem("token")) {
      const msg = data?.message || "Access denied. Please connect to the admin or owner of the house.";
      try {
        sessionStorage.setItem("auth_logout_reason", msg);
      } catch (_) {}
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }
    if (status === 403) {
      const msg = data?.message || "You do not have permission to perform this action.";
      customAlert.showUnauthorized(msg);
    }
    return Promise.reject(error);
  }
);

export default API;
