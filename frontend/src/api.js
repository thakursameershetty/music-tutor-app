// frontend/src/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const cleanBaseUrl = API_BASE_URL.replace(/\/$/, ""); // Remove trailing slash if present

export const getApiUrl = (endpoint) => `${cleanBaseUrl}${endpoint}`;