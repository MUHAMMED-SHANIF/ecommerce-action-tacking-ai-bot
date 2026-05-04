"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("emart-theme");
        if (saved === "dark") {
            setIsDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("emart-theme", "dark");
            } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("emart-theme", "light");
            }
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
