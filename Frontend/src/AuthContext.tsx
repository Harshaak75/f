import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { authService } from "./utils/api/auth.api";
import { jwtDecode } from "jwt-decode";

// --- Define Types ---
interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  tenantId: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>; // <-- 2. Updated login function
  logout: () => Promise<void>;
}
// --- End Types ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Get user from localStorage for quick refresh (it's not a secret)
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   const token = params.get("token");

  //   if (token) {
  //     // ✅ Save cookie on HRM domain
  //     document.cookie = `token=${token}; path=/; max-age=86400`;

  //     // ✅ Also save user for frontend
  //     const decoded: any = jwtDecode(token);

  //     const user = {
  //       user_id: decoded.userId,
  //       email: decoded.email,
  //       name: decoded.name,
  //       role: decoded.role,
  //       tenantId: decoded.tenantId,
  //     };

  //     localStorage.setItem("user", JSON.stringify(user));

  //     // ✅ Clean the url
  //     window.history.replaceState({}, document.title, "/employee");

  //     // ✅ Reload so RequireAuth works
  //     window.location.reload();
  //   }
  // }, []);

  // This effect runs ONCE when the app loads
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 3. Use the authService to check the cookie
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        console.log("👉 token from url:", token);

        if (token) {
          // ✅ Save cookie on HRM domain
          document.cookie = `token=${token}; path=/; max-age=86400`;

          // ✅ Also save user for frontend
          const decoded: any = jwtDecode(token);

          const user = {
            user_id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
            tenantId: decoded.tenantId,
          };

          localStorage.setItem("user", JSON.stringify(user));

          // ✅ Clean the url
          window.history.replaceState({}, document.title, "/employee");

          // ✅ Reload so RequireAuth works
          window.location.reload();
        }
        const userData = await authService.checkAuthStatus();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        // No valid cookie, user is logged out
        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []); // Empty array means this runs only once

  /**
   * Login function that calls the authService.
   * This is what your LoginPage will use.
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      // 4. Use the authService to log in
      const loggedInUser = await authService.login(credentials);

      // 5. On success, store the user in state and localStorage
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      return loggedInUser;
    } catch (error) {
      // If login fails, clear state and re-throw the error
      setUser(null);
      localStorage.removeItem("user");
      throw error; // Let the LoginPage handle the error (e.g., show "Invalid credentials")
    }
  }, []);

  /**
   * Logout function that calls the authService.
   * This is what your Sidebar button will use.
   */
  const logout = useCallback(async () => {
    try {
      // 6. Use the authService to log out
      await authService.logout();
    } catch (error) {
      console.error("Logout failed, but clearing client state anyway:", error);
    } finally {
      // 7. Always clear user from state and local storage
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  // Use useMemo to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to easily use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
