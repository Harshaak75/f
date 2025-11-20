import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
console.log("API_URL:", API_URL);

/**
 * Create a central axios instance for all API calls.
 */
const apiClient = axios.create({
  // Set the base URL for all API requests
  // This lets you call `apiClient.get('/auth/me')` instead of
  // `axios.get('http://localhost:3000/api/auth/me')`
  baseURL: API_URL,

  /**
   * THIS IS THE MOST IMPORTANT PART
   * This tells the browser to automatically send cookies
   * (like your 'token' cookie) with every single request.
   */
  withCredentials: true,
});

export { apiClient };
