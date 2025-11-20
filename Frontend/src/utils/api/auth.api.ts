import { apiClient } from "../../lib/apiClient";

// Define the shape of the user object the API will return
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  tenantId: string;
}

// Define the credentials type for the login function
interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * This object (authService) contains all authentication-related API calls.
 */
export const authService = {
  /**
   * Calls the backend /api/auth/login route.
   * The backend will set the HttpOnly cookie.
   * This function returns the user object.
   */
  login: async (credentials: LoginCredentials): Promise<AuthUser> => {
    const response = await apiClient.post("/mainRoute/login", credentials);
    // The backend sends back { message: '...', user: {...} }
    // We just return the user object.
    console.log(response.data);
    return response.data.user;
  },

  /**
   * Calls the backend /api/auth/me route.
   * The browser automatically sends the HttpOnly cookie.
   * The backend returns the user object if the cookie is valid.
   */
  checkAuthStatus: async (): Promise<AuthUser> => {
    const response = await apiClient.get("/mainRoute/me");
    console.log(response.data);
    return response.data; // This is the user object
  },

  /**
   * Calls the backend /api/auth/logout route.
   * The backend will clear the HttpOnly cookie.
   */
  logout: async (): Promise<void> => {
    await apiClient.post("/mainRoute/logout");
  },
};
