// frontend/src/api.js

// Leave this empty for development. 
// Vite's proxy will forward requests to http://127.0.0.1:8000
const API_BASE_URL = ""; 

export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;