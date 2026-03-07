"use client";

import { useState } from "react";
import { Mic, MicOff, MessageSquare, Loader2 } from "lucide-react";
import { startListening } from "@/utils/voice";
import { speakText } from "@/utils/speak";
import { useAuth } from "@/context/AuthContext";

export default function AIAssistant() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);

    if (user && (user.role === 'admin' || user.role === 'seller')) {
        return null;
    }

    const handleSpeak = () => {
        if (!user) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Please log in to use the voice assistant.' }]);
            speakText('Please log in to use the voice assistant.');
            return;
        }

        setIsListening(true);
        startListening(
            async (text) => {
                setIsListening(false);
                setMessages(prev => [...prev, { role: 'user', text }]);
                await processAudioText(text);
            },
            (error) => {
                setIsListening(false);
                const errorMsg = "I couldn't hear you clearly. Please try again.";
                setMessages(prev => [...prev, { role: 'assistant', text: errorMsg }]);
                speakText(errorMsg);
                console.error("Voice Error", error);
            }
        );
    };

    const processAudioText = async (text: string) => {
        setIsProcessing(true);
        try {
            // Note: In local dev we pass user ID if token missing, but normally we'd pass Auth token
            const headers: any = { 'Content-Type': 'application/json' };
            if (user?.id) headers['Authorization'] = `Bearer ${user?.token}`;

            const res = await fetch('http://localhost:5001/api/assistant/message', {
                method: 'POST',
                headers,
                body: JSON.stringify({ message: text, userId: user?.id })
            });

            const data = await res.json();
            if (data.success && data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
                speakText(data.reply);
            } else {
                throw new Error(data.error || "Failed to process");
            }
        } catch (err) {
            console.error(err);
            const fallback = "I'm sorry, I'm having trouble connecting right now.";
            setMessages(prev => [...prev, { role: 'assistant', text: fallback }]);
            speakText(fallback);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="bg-blue-600 text-white p-4 font-medium flex justify-between items-center">
                        <span className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" /> AI Assistant
                        </span>
                        <button onClick={() => setIsOpen(false)} className="hover:text-gray-200">&times;</button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-gray-50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 text-sm mt-10">
                                Tap the microphone and say something like:<br /><br />
                                <span className="italic">"Add an iPhone to my cart"</span>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-white text-gray-800 self-start border rounded-bl-none shadow-sm'}`}>
                                {msg.text}
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="bg-white border text-gray-500 self-start p-3 rounded-lg rounded-bl-none shadow-sm flex items-center gap-2 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t flex justify-center">
                        <button
                            onClick={handleSpeak}
                            disabled={isListening || isProcessing}
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'} disabled:opacity-50 disabled:hover:scale-100`}
                        >
                            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
                >
                    <Mic className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
