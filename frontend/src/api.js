// frontend/src/api.js
const API_BASE_URL = ""; // Empty string = Relative path
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`;