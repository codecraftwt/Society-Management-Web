


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
  if (userStr) {
    try {
      const parsedUser = JSON.parse(userStr);
      const activeRole = parsedUser.activeRole || parsedUser.role;
      if (activeRole) {
        config.headers["x-active-role"] = activeRole;
      }
    } catch (e) {}
  }

  // --- NEW: Intercept & Attach Super Admin Global Filter ---
  // If the Super Admin has selected a specific society, attach it to all requests
  const saFilter = localStorage.getItem("superadmin_society_filter");
  if (saFilter && saFilter !== "ALL") {
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
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.clear();
      window.location.href = "/login";
    }
    if (error.response?.status === 403) {
      const msg = error.response?.data?.message || "You do not have permission to perform this action.";
      customAlert.showUnauthorized(msg);
    }
    return Promise.reject(error);
  }
);

export default API;