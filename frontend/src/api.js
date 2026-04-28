// frontend/src/api.js

// Read the API URL from Vite environment variables, fallback to localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"; 

// Remove trailing slash if present to prevent double slashes
const cleanBaseUrl = API_BASE_URL.replace(/\/$/, "");

export const getApiUrl = (endpoint) => `${cleanBaseUrl}${endpoint}`;