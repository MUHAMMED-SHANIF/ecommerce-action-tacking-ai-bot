"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";

interface Message {
    role: "user" | "bot";
    text: string;
}

export default function ChatbotPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "bot", text: "Hello! I'm your EMart AI assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: "user", text: userMessage }]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("http://localhost:8000/analyze_intent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text_input: userMessage }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();
            setMessages(prev => [...prev, { role: "bot", text: data.reply_text }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: "bot", text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex-1 container mx-auto p-4 max-w-2xl flex flex-col h-[calc(100vh-64px)]"> {/* Adjust height for navbar */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="bg-[#22c55e] text-white p-4 flex items-center gap-3">
                        <Bot className="w-6 h-6" />
                        <h1 className="font-bold text-lg">EMart AI Assistant</h1>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`flex items-start gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-gray-200" : "bg-[#22c55e]/10"
                                            }`}
                                    >
                                        {msg.role === "user" ? (
                                            <User className="w-5 h-5 text-gray-600" />
                                        ) : (
                                            <Bot className="w-5 h-5 text-[#22c55e]" />
                                        )}
                                    </div>
                                    <div
                                        className={`p-3 rounded-lg text-sm ${msg.role === "user"
                                                ? "bg-[#22c55e] text-white rounded-br-none"
                                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 max-w-[80%]">
                                    <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 flex items-center justify-center shrink-0">
                                        <Bot className="w-5 h-5 text-[#22c55e]" />
                                    </div>
                                    <div className="bg-gray-100 p-3 rounded-lg rounded-bl-none flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type your message..."
                                className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-[#22c55e]"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                className="bg-[#22c55e] text-white p-3 rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
