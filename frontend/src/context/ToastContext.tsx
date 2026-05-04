"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ToastContextType {
    showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [message, setMessage] = useState("");
    const [visible, setVisible] = useState(false);

    const showToast = (msg: string) => {
        setMessage(msg);
        setVisible(true);
        setTimeout(() => {
            setVisible(false);
        }, 1000); // UI dismisses after 1 second as requested
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {visible && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#0B3D2E] text-white px-6 py-3 rounded-full shadow-2xl z-[9999] text-sm font-semibold transition-all duration-300 animate-in slide-in-from-bottom-5">
                    {message}
                </div>
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
