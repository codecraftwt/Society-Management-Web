const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const BASE_URL = API_BASE.replace(/\/api$/, "");

export { API_BASE, BASE_URL };