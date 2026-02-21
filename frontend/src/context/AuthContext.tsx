"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    phone?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, name?: string) => Promise<boolean>;
    logout: () => void;
    updateProfile: (name: string, phone: string) => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "http://127.0.0.1:5001/api";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    // Verify with backend
                    const res = await fetch(`${API_URL}/auth/verify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: parsedUser.id })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                        localStorage.setItem("user", JSON.stringify(data.user));
                    } else {
                        // Backend doesn't know this user (e.g. valid session but DB wiped)
                        console.warn("User not found in backend, logging out.");
                        localStorage.removeItem("user");
                        setUser(null);
                    }
                } catch (error) {
                    console.error("Failed to parse user data or verify", error);
                    localStorage.removeItem("user");
                    setUser(null);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Login failed");
                return false;
            }

            const data = await res.json();
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            return true;
        } catch (error) {
            console.error("Login Error", error);
            return false;
        }
    };

    const register = async (email: string, password: string, name?: string) => {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Registration failed");
                return false;
            }

            const data = await res.json();
            // Option: Auto-login after register, or redirect to login. The backend returns 'user' in data.user if we want.
            // For now, let's just return true and let UI handle redirect to login or auto-login.
            // Let's Auto-Login for better UX:
            setUser(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
            return true;
        } catch (error) {
            console.error("Register Error", error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        router.push("/login"); // or router.push('/') if preferred
    };

    const updateProfile = (name: string, phone: string) => {
        if (user) {
            const updatedUser = { ...user, name, phone };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, updateProfile, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
