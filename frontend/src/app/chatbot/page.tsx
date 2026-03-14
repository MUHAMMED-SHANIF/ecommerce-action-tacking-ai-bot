"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, Send, Bot, User, Loader2, Sparkles, Trash2,
  Package, ShoppingBag, Search, BarChart2, HelpCircle, Zap
} from "lucide-react";
import { startContinuousListening, stopListening } from "@/utils/voice";
import { speakText } from "@/utils/speak";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

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
  description?: string;
}

interface PendingConfirmation {
  action: string;
  params: Record<string, any>;
}

const QUICK_ACTIONS = [
  { icon: Search, label: "Search Products", query: "Search for products" },
  { icon: ShoppingBag, label: "Recommend Items", query: "Recommend some popular products for me" },
  { icon: Package, label: "Track My Order", query: "Track my latest order" },
  { icon: BarChart2, label: "Compare Products", query: "Compare two products for me" },
  { icon: Zap, label: "Cancel Order", query: "I want to cancel my order" },
  { icon: HelpCircle, label: "Get Help", query: "What can you help me with?" },
];

export default function ChatbotPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listeningStatus, setListeningStatus] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  useEffect(() => {
    if (!historyLoaded && user?.token) loadHistory();
  }, [historyLoaded, user?.token]);

  useEffect(() => {
    if (!user && historyLoaded) {
      router.push("/login");
    } else if (user && user.role !== "user") {
      router.push("/");
    }
  }, [user, router, historyLoaded]);

  // Early return AFTER all hooks

  const loadHistory = async () => {
    if (!user?.token) {
      setMessages([{ role: "assistant", text: "👋 Hi! Please log in to use the AI assistant.", timestamp: new Date() }]);
      setHistoryLoaded(true);
      return;
    }
    try {
      const res = await fetch(`${API}/api/assistant/history`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success && data.history.length > 0) {
        setMessages(data.history.map((h: any) => ({
          role: h.role, text: h.message, timestamp: new Date(h.created_at)
        })));
      } else {
        setMessages([{
          role: "assistant",
          text: "👋 Hi! I'm ActionBot, your EMart AI assistant powered by Mistral AI.\n\nI can help you:\n• 🔍 Search & discover products\n• 💡 Get personalized recommendations\n• 📦 Track & manage your orders\n• ⚖️ Compare products side-by-side\n• 🏠 Update delivery addresses\n\nHow can I help you today?",
          timestamp: new Date()
        }]);
      }
    } catch (_) {
      setMessages([{ role: "assistant", text: "👋 Hi! I'm ActionBot. How can I help you today?", timestamp: new Date() }]);
    }
    setHistoryLoaded(true);
  };

  const sendMessage = useCallback(async (
    text: string,
    confirmedAction?: { confirmed: boolean; action: string; params: any }
  ) => {
    if (!text.trim() || !user) return;

    setMessages(prev => [...prev, { role: "user", text, timestamp: new Date() }]);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`Message failed: ${res.status}`);
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.details || data.reply || data.error || "Unknown server error");
      }

      const msg: Message = {
        role: "assistant",
        text: data.reply,
        timestamp: new Date(),
        ...(data.data?.products?.length && { products: data.data.products }),
        ...(data.data?.comparison && { comparison: data.data.comparison }),
        ...(data.data?.order && { order: data.data.order }),
        ...(data.data?.product && { products: [data.data.product] })
      };
      setMessages(prev => [...prev, msg]);

      if (data.pendingConfirmation) {
        setPendingConfirmation(data.pendingConfirmation);
      }
      speakText(data.reply);
    } catch (err: any) {
      console.error("Chatbot Error:", err);
      const errMsg = err.message || "I'm having trouble right now. Please try again!";
      setMessages(prev => [...prev, { role: "assistant", text: errMsg, timestamp: new Date() }]);
      speakText(errMsg);
    } finally {
      setIsProcessing(false);
    }
  }, [user]);

  const handleConfirm = (yes: boolean) => {
    if (!pendingConfirmation) return;
    if (yes) {
      sendMessage("Yes, please proceed.", {
        confirmed: true, action: pendingConfirmation.action, params: pendingConfirmation.params
      });
    } else {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "No problem! Action cancelled. Is there anything else I can help you with?",
        timestamp: new Date()
      }]);
      setPendingConfirmation(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening(); setIsListening(false); setListeningStatus(""); return;
    }
    setIsListening(true); setListeningStatus("Listening...");
    startContinuousListening(
      (t) => {
        setListeningStatus("Processing...");
        sendMessage(t);
        setTimeout(() => setListeningStatus("Listening..."), 1500);
      },
      () => { setIsListening(false); setListeningStatus(""); },
      (err) => { setIsListening(false); setListeningStatus(""); },
      (interim) => { setInput(interim); } // Parallel conversion!
    );
  };

  const clearChat = async () => {
    if (!user?.token) return;
    await fetch(`${API}/api/assistant/history`, { method: "DELETE", headers: { Authorization: `Bearer ${user.token}` } });
    setMessages([{ role: "assistant", text: "Chat cleared! How can I help you today?", timestamp: new Date() }]);
    setPendingConfirmation(null);
  };


  if (!user || user.role !== "user") return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Left Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">ActionBot</p>
              <p className="text-xs text-gray-500">AI Shopping Assistant</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="space-y-1">
            {QUICK_ACTIONS.map(({ icon: Icon, label, query }) => (
              <button key={label} onClick={() => sendMessage(query)} disabled={isProcessing || !user}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left disabled:opacity-50">
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-gray-100">
          <button onClick={clearChat} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" /> Clear History
          </button>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col max-h-screen overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">ActionBot</h1>
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Powered by Mistral AI
              </p>
            </div>
          </div>
          {isListening && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-600 font-medium">{listeningStatus} — Say "stop" to end</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[70%] space-y-3 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-tr-sm"
                    : "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm"
                }`}>
                  {msg.text.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                  ))}
                </div>

                {/* Products grid */}
                {msg.products && msg.products.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {msg.products.map(p => (
                      <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
                        {p.image ? (
                          <img src={p.image.startsWith('/') ? `${API}${p.image}` : p.image}
                            alt={p.name} className="w-full h-32 object-cover rounded-xl mb-2 bg-gray-100" />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-2 flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <p className="font-semibold text-xs text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                        <p className="text-emerald-600 font-bold text-sm mt-1">₹{p.price?.toLocaleString()}</p>
                        {p.category && <p className="text-xs text-gray-400 mt-0.5">{p.category}</p>}
                        {p.stock !== undefined && (
                          <p className={`text-xs mt-1 font-medium ${p.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {p.stock > 10 ? '✓ In Stock' : p.stock > 0 ? `Only ${p.stock} left` : 'Out of Stock'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comparison table */}
                {msg.comparison && (
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden w-full">
                    <div className="bg-emerald-50 px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Product Comparison</p>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      {[msg.comparison.productA, msg.comparison.productB].map((p, idx) => (
                        <div key={idx} className="p-4">
                          {p.image && <img src={p.image.startsWith('/') ? `${API}${p.image}` : p.image} className="w-full h-24 object-cover rounded-lg mb-2" alt={p.name} />}
                          <p className="font-semibold text-sm text-gray-800 line-clamp-2">{p.name}</p>
                          <p className="text-emerald-600 font-bold text-lg mt-1">₹{p.price?.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 mt-1">{p.brand || p.category}</p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-3">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.timestamp && (
                  <p className="text-xs text-gray-400">
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm px-5 py-3.5 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Confirmation */}
          {pendingConfirmation && !isProcessing && (
            <div className="flex justify-start gap-3 pl-11">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <button onClick={() => handleConfirm(true)}
                  className="px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                  ✓ Yes, proceed
                </button>
                <button onClick={() => handleConfirm(false)}
                  className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-gray-100 p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder={user ? "Ask ActionBot anything..." : "Please log in to chat"}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input.trim())}
              disabled={isProcessing || !user}
              className={`flex-1 px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:border-emerald-400 disabled:bg-gray-50 transition-all ${
                isListening ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100" : "bg-white border-gray-200"
              }`}
            />
            <button onClick={() => sendMessage(input.trim())}
              disabled={!input.trim() || isProcessing || !user}
              className="px-4 py-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <Send className="w-5 h-5" />
            </button>
            <button onClick={toggleListening} disabled={isProcessing || !user}
              className={`px-4 py-3 rounded-2xl text-white transition-all disabled:opacity-40 ${
                isListening ? "bg-red-500 hover:bg-red-600" : "bg-gray-800 hover:bg-gray-900"
              }`}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
