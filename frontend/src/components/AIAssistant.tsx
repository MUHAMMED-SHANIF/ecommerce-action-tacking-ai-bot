"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, Send, X, Bot, User, Loader2,
  ShoppingCart, Package, Trash2, ChevronDown, Sparkles
} from "lucide-react";
import { startContinuousListening, stopListening } from "@/utils/voice";
import { speakText } from "@/utils/speak";
import { useAuth } from "@/context/AuthContext";

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:5001`;
  }
  return "http://localhost:5001";
};

const API = getApiUrl();


interface Message {
  role: "user" | "assistant";
  text: string;
  products?: Product[];
  comparison?: { productA: Product; productB: Product };
  order?: any;
  timestamp?: Date;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  brand?: string;
  stock?: number;
}

interface PendingConfirmation {
  action: string;
  params: Record<string, any>;
  question: string;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [listeningStatus, setListeningStatus] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // All hooks must be unconditional — put early return AFTER all hooks
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isProcessing]);

  // Load history when panel opens
  useEffect(() => {
    if (isOpen && !historyLoaded && user?.token) {
      loadHistory();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);


  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/api/assistant/history`, {
        headers: { Authorization: `Bearer ${user!.token}` }
      });
      if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success && data.history.length > 0) {
        const loaded: Message[] = data.history.map((h: any) => ({
          role: h.role as "user" | "assistant",
          text: h.message,
          timestamp: new Date(h.created_at)
        }));
        setMessages(loaded);
      } else {
        setMessages([{
          role: "assistant",
          text: "👋 Hi! I'm ActionBot, your EMart AI assistant. I can help you search products, track orders, get recommendations, and more. How can I help you today?",
          timestamp: new Date()
        }]);
      }
      setHistoryLoaded(true);
    } catch (_) {
      setMessages([{
        role: "assistant",
        text: "👋 Hi! I'm ActionBot, your EMart AI assistant. How can I help you today?",
        timestamp: new Date()
      }]);
      setHistoryLoaded(true);
    }
  };

  const sendMessage = useCallback(async (
    text: string,
    confirmedAction?: { confirmed: boolean; action: string; params: any }
  ) => {
    if (!text.trim() && !confirmedAction) return;

    if (!user) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Please log in to use the AI assistant.",
        timestamp: new Date()
      }]);
      return;
    }

    const userMsg: Message = { role: "user", text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    setPendingConfirmation(null);

    try {
      const body: any = { message: text };
      if (confirmedAction) {
        body.confirmed = confirmedAction.confirmed;
        body.pendingAction = confirmedAction.action;
        body.pendingParams = confirmedAction.params;
      }

      const res = await fetch(`${API}/api/assistant/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.details || data.reply || data.error || "Unknown server error");
      }

      const assistantMsg: Message = {
        role: "assistant",
        text: data.reply,
        timestamp: new Date(),
        ...(data.data?.products && { products: data.data.products }),
        ...(data.data?.comparison && { comparison: data.data.comparison }),
        ...(data.data?.order && { order: data.data.order }),
        ...(data.data?.product && { products: [data.data.product] })
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (data.pendingConfirmation) {
        setPendingConfirmation({
          ...data.pendingConfirmation,
          question: data.reply
        });
      }

      speakText(data.reply);
    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      const errMsg = err.message || "I'm having trouble right now. Please try again!";
      setMessages(prev => [...prev, {
        role: "assistant", text: errMsg, timestamp: new Date()
      }]);
      speakText(errMsg);
    } finally {

      setIsProcessing(false);
    }
  }, [user]);

  const handleSend = () => {
    if (input.trim()) sendMessage(input.trim());
  };

  const handleConfirm = (yes: boolean) => {
    if (!pendingConfirmation) return;
    if (yes) {
      sendMessage("Yes, please proceed.", {
        confirmed: true,
        action: pendingConfirmation.action,
        params: pendingConfirmation.params
      });
    } else {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "No problem! I've cancelled that action. Is there anything else I can help you with?",
        timestamp: new Date()
      }]);
      setPendingConfirmation(null);
      speakText("No problem, I've cancelled that action.");
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setListeningStatus("");
      return;
    }

    setIsListening(true);
    setListeningStatus("Listening...");

    startContinuousListening(
      (transcript) => {
        setListeningStatus("Processing...");
        sendMessage(transcript);
        setTimeout(() => setListeningStatus("Listening..."), 1500);
      },
      () => {
        setIsListening(false);
        setListeningStatus("");
      },
      (err) => {
        console.error("Voice error:", err);
        setListeningStatus("Error – try again");
        setTimeout(() => {
          setIsListening(false);
          setListeningStatus("");
        }, 2000);
      },
      (interim) => {
        setInput(interim); // Live update the text area!
      }
    );
  };

  const clearHistory = async () => {
    if (!user?.token) return;
    await fetch(`${API}/api/assistant/history`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${user.token}` }
    });
    setMessages([{
      role: "assistant",
      text: "Chat history cleared! How can I help you today?",
      timestamp: new Date()
    }]);
    setPendingConfirmation(null);
  };


  if (!user || user.role !== "user") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ===== CHAT PANEL ===== */}
      {isOpen && (
        <div className="w-[360px] h-[580px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ animation: "slideUp 0.25s ease-out" }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-none">ActionBot</p>
                <p className="text-xs text-green-100 mt-0.5">EMart AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearHistory} title="Clear chat"
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                <div className={`max-w-[78%] ${msg.role === "user" ? "" : "space-y-2"}`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-500 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm"
                  }`}>
                    {msg.text.split('\n').map((line, j) => (
                      <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                    ))}
                  </div>

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-1.5">
                      {msg.products.slice(0, 3).map((p) => (
                        <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm flex gap-2.5">
                          {p.image ? (
                            <img src={p.image.startsWith('/') ? `${API}${p.image}` : p.image}
                              alt={p.name}
                              className="w-14 h-14 object-cover rounded-lg shrink-0 bg-gray-100" />
                          ) : (
                            <div className="w-14 h-14 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                            <p className="text-emerald-600 font-bold text-sm mt-0.5">₹{p.price?.toLocaleString()}</p>
                            {p.category && <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comparison */}
                  {msg.comparison && (
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Comparison</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[msg.comparison.productA, msg.comparison.productB].map((p, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-2">
                            <p className="font-semibold text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                            <p className="text-emerald-600 font-bold mt-1">₹{p.price?.toLocaleString()}</p>
                            <p className="text-gray-400 mt-0.5">{p.brand || p.category}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isProcessing && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Confirmation buttons */}
            {pendingConfirmation && !isProcessing && (
              <div className="flex gap-2 justify-start pl-9">
                <button onClick={() => handleConfirm(true)}
                  className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-full hover:bg-emerald-600 transition-colors">
                  ✓ Yes, proceed
                </button>
                <button onClick={() => handleConfirm(false)}
                  className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full hover:bg-gray-200 transition-colors">
                  ✕ Cancel
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {["🔍 Search phones", "📦 Track order", "💡 Recommend laptops", "❌ Cancel order"].map(s => (
                <button key={s} onClick={() => sendMessage(s.replace(/^[^\s]+\s/, ''))}
                  className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-emerald-100 transition-colors shrink-0">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100">
            {isListening && (
              <div className="mb-2 flex items-center gap-2 text-xs text-red-500 font-medium">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                {listeningStatus || "Listening..."}
                <span className="text-gray-400 ml-auto">Say "stop" to end</span>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={user ? "Ask me anything..." : "Login to chat"}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={isProcessing || !user}
                className={`flex-1 text-sm px-3 py-2.5 border rounded-xl focus:outline-none focus:border-emerald-400 disabled:bg-gray-50 disabled:text-gray-400 transition-all ${
                  isListening ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100" : "bg-white border-gray-200"
                }`}
              />
              <button onClick={handleSend} disabled={!input.trim() || isProcessing || !user}
                className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Send className="w-4 h-4" />
              </button>
              <button onClick={toggleListening} disabled={isProcessing || !user}
                className={`p-2.5 rounded-xl text-white transition-all disabled:opacity-40 ${
                  isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-gray-700 hover:bg-gray-800"
                }`}>
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOGGLE BUTTON ===== */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen
            ? "bg-gray-700 hover:bg-gray-800"
            : "bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        }`}
      >
        {isOpen
          ? <ChevronDown className="w-6 h-6 text-white" />
          : <Sparkles className="w-6 h-6 text-white" />
        }
      </button>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
