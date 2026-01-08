// frontend/src/api.js

// DIRECT LINK TO RENDER (Temporary Fix)
const API_BASE_URL = "https://music-tutor-app.onrender.com"; 

// Remove trailing slash to be safe
const cleanBaseUrl = API_BASE_URL.replace(/\/$/, "");

export const getApiUrl = (endpoint) => `${cleanBaseUrl}${endpoint}`;