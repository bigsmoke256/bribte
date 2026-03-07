import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole, mockStudentUser, mockLecturerUser, mockAdminUser } from "./mock-data";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((email: string, _password: string, role: UserRole): boolean => {
    // Mock login - in production would validate against backend
    if (!email) return false;
    switch (role) {
      case "student":
        setUser(mockStudentUser);
        break;
      case "lecturer":
        setUser(mockLecturerUser);
        break;
      case "admin":
        setUser(mockAdminUser);
        break;
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
