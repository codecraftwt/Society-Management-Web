


import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

export default API;