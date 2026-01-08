// frontend/src/api.js

// REPLACE THIS with the URL you got from Render in Phase 1
const API_BASE_URL = "https://music-tutor-app.onrender.com"; 

// Remove trailing slash if present to prevent double slashes
const cleanBaseUrl = API_BASE_URL.replace(/\/$/, "");

export const getApiUrl = (endpoint) => `${cleanBaseUrl}${endpoint}`;