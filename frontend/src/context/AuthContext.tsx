"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    phone?: string;
    token?: string;
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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (session?.user) {
                const meta = session.user.user_metadata || {};
                const currentUser: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: meta.name || session.user.email?.split('@')[0],
                    role: meta.role || 'user',
                    phone: meta.phone || '',
                    token: session.access_token
                };
                setUser(currentUser);
                localStorage.setItem("user", JSON.stringify(currentUser));
            } else {
                setUser(null);
                localStorage.removeItem("user");
            }
            setIsLoading(false);

            // Listen for auth changes
            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    const meta = session.user.user_metadata || {};
                    const currentUser: User = {
                        id: session.user.id,
                        email: session.user.email || '',
                        name: meta.name || session.user.email?.split('@')[0],
                        role: meta.role || 'user',
                        phone: meta.phone || '',
                        token: session.access_token
                    };
                    setUser(currentUser);
                    localStorage.setItem("user", JSON.stringify(currentUser));
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    localStorage.removeItem("user");
                }
            });

            return () => {
                authListener.subscription.unsubscribe();
            };
        };
        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (error) {
                alert(error.message);
                return false;
            }

            // onAuthStateChange handles state setting, but we can do it here too for instant visual update
            if (data.session) {
                const meta = data.user.user_metadata || {};
                const currentUser: User = {
                    id: data.user.id,
                    email: data.user.email || '',
                    name: meta.name || data.user.email?.split('@')[0],
                    role: meta.role || 'user',
                    phone: meta.phone || '',
                    token: data.session.access_token
                };
                setUser(currentUser);
                localStorage.setItem("user", JSON.stringify(currentUser));
            }
            return true;
        } catch (error: any) {
            console.error("Login Error", error);
            alert(error.message || "Login failed");
            return false;
        }
    };

    const register = async (email: string, password: string, name?: string) => {
        try {
            const res = await fetch("http://localhost:5001/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password, name })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // Immediately login the new user to grab session
            return await login(email, password);
        } catch (error: any) {
            console.error("Register Error", error);
            alert(error.message || "Registration failed");
            return false;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem("user");
        router.push("/login");
    };

    const updateProfile = async (name: string, phone: string) => {
        if (user) {
            const { data, error } = await supabase.auth.updateUser({
                data: { name, phone }
            });
            if (!error && data.user) {
                const updatedUser = { ...user, name, phone };
                setUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
            } else {
                alert("Failed to update profile: " + (error?.message || "Unknown error"));
            }
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
