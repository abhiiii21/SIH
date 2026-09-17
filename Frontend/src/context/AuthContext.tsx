import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  name: string;
  email: string;
  role: string;
  organization: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => { success: boolean; error?: string };
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    organization: string;
    agreeTerms: boolean;
  }) => { success: boolean; error?: string };
  socialLogin: (provider: "google" | "facebook") => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("sahayya_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("sahayya_auth") === "true";
  });

  useEffect(() => {
    if (user && isAuthenticated) {
      localStorage.setItem("sahayya_user", JSON.stringify(user));
      localStorage.setItem("sahayya_auth", "true");
    } else {
      localStorage.removeItem("sahayya_user");
      localStorage.removeItem("sahayya_auth");
    }
  }, [user, isAuthenticated]);

  const login = (email: string, password: string, rememberMe: boolean = false) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { success: false, error: "Please enter your email address." };
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return { success: false, error: "This is an invalid email. Please enter a valid email address (e.g. user@domain.com)." };
    }
    if (!password) {
      return { success: false, error: "Please enter your password." };
    }
    if (password.length < 3) {
      return { success: false, error: "Password must be at least 3 characters." };
    }

    const newUser: User = {
      name: trimmedEmail.split("@")[0].toUpperCase(),
      email: trimmedEmail,
      role: "Coast Guard",
      organization: "Maritime Defense Command",
    };

    setUser(newUser);
    setIsAuthenticated(true);
    if (rememberMe) {
      localStorage.setItem("sahayya_remember_email", trimmedEmail);
    } else {
      localStorage.removeItem("sahayya_remember_email");
    }

    return { success: true };
  };

  const register = (data: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    organization: string;
    agreeTerms: boolean;
  }) => {
    if (!data.fullName.trim()) {
      return { success: false, error: "Please enter your full name." };
    }
    const trimmedEmail = data.email.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!data.password || data.password.length < 3) {
      return { success: false, error: "Password must be at least 3 characters." };
    }
    if (data.password !== data.confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }
    if (!data.organization) {
      return { success: false, error: "Please select your organization or role." };
    }
    if (!data.agreeTerms) {
      return { success: false, error: "You must agree to the Terms of Use and Privacy Policy." };
    }

    const newUser: User = {
      name: data.fullName.trim(),
      email: trimmedEmail,
      role: data.organization,
      organization: data.organization,
    };

    setUser(newUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  const socialLogin = (provider: "google" | "facebook") => {
    const defaultUser: User = {
      name: "S. Kumar",
      email: provider === "google" ? "s.kumar@gov.in" : "s.kumar@coastguard.gov.in",
      role: "Coast Guard",
      organization: "Ministry of Defence / Coast Guard",
    };
    setUser(defaultUser);
    setIsAuthenticated(true);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      const base = prev || {
        name: "Commander S. Kumar",
        email: "s.kumar@indiancoastguard.gov.in",
        role: "Coast Guard",
        organization: "Indian Coast Guard (West HQ)",
      };
      const updated = { ...base, ...updatedFields };
      localStorage.setItem("sahayya_user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("sahayya_user");
    localStorage.removeItem("sahayya_auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        socialLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
