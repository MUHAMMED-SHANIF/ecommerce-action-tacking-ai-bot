"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, Send, Square, X, Bot, User, Loader2,
  ShoppingCart, Package, Trash2, ChevronDown, Sparkles
} from "lucide-react";
import { startContinuousListening, stopListening } from "@/utils/voice";
import { speakText } from "@/utils/speak";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRouter } from "next/navigation";

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    return `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}`}`;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}`;
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
  discount?: number;
}

interface PendingConfirmation {
  action: string;
  params: Record<string, any>;
  question: string;
}

export default function AIAssistant() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { fetchCart } = useCart();
  const { fetchWishlist } = useWishlist();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [listeningStatus, setListeningStatus] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingConfirmationRef = useRef<PendingConfirmation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    pendingConfirmationRef.current = pendingConfirmation;
  }, [pendingConfirmation]);

  // All hooks must be unconditional — put early return AFTER all hooks
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isProcessing]);

  // Reset history when user changes so it reloads fresh
  useEffect(() => {
    setHistoryLoaded(false);
    setMessages([]);
  }, [user?.id]);

  // Load history when panel opens and user is available
  useEffect(() => {
    if (isOpen && !historyLoaded && user?.token) {
      loadHistory();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, user, historyLoaded]);

  // Persist isOpen state across navigations
  useEffect(() => {
    const saved = sessionStorage.getItem('ai-assistant-open');
    if (saved === 'true') setIsOpen(true);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('ai-assistant-open', isOpen.toString());
  }, [isOpen]);

  useEffect(() => {
    const handleToggle = () => setIsOpen(true);
    window.addEventListener('toggle-ai-chat', handleToggle);
    return () => window.removeEventListener('toggle-ai-chat', handleToggle);
  }, []);


  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/api/assistant/history`, {
        headers: { Authorization: `Bearer ${user!.token}` },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`History fetch failed: ${res.status}`);
      const data = await res.json();
      const currentRole = user?.role || 'user';
      const welcomeMsg = {
        user:   "👋 Hi! I'm ActionBot, your EMart AI assistant. I can help you search products, track orders, get recommendations, and more. How can I help you today?",
        seller: "📊 Hi! I'm SellerBot, your business assistant. Ask me about sales, inventory, orders, or product management!",
        admin:  "⚙️ Hi! I'm AdminBot, your platform operations assistant. Ask me about revenue, sellers, pending approvals, or platform stats!",
      }[currentRole] || "👋 Hi! How can I help?";
      if (data.success && data.history.length > 0) {
        const loaded: Message[] = data.history.map((h: any) => ({
          role: h.role as "user" | "assistant",
          text: h.message,
          timestamp: new Date(h.created_at)
        }));
        setMessages(loaded);
      } else {
        setMessages([{ role: "assistant", text: welcomeMsg, timestamp: new Date() }]);
      }
      setHistoryLoaded(true);
    } catch (_) {
      setMessages([{ role: "assistant", text: "👋 Hi! How can I help you today?", timestamp: new Date() }]);
      setHistoryLoaded(true);
    }
  };

  const sendMessage = useCallback(async (
    text: string,
    confirmedAction?: { confirmed: boolean; action: string; params: any }
  ) => {
    if (!text.trim() && !confirmedAction) return;
    if (isProcessing) return; // Prevent concurrent processing which causes audio pipeline overlapping

    if (!user) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Please log in to use the AI assistant.",
        timestamp: new Date()
      }]);
      return;
    }

    // Intercept spoken or typed answers to an active confirmation prompt
    if (pendingConfirmationRef.current && !confirmedAction) {
      const lower = text.toLowerCase().trim();
      const isCancel = ['no', 'cancel', 'cancel it', 'stop', 'nope', 'nevermind', 'cancel order'].includes(lower);
      const isConfirm = ['yes', 'yeah', 'ok', 'okay', 'proceed', 'do it', 'confirm', 'yep', 'place order', 'yes please'].includes(lower);
      
      if (isCancel) {
        setMessages(prev => [...prev, 
          { role: "user", text, timestamp: new Date() }, 
          { role: "assistant", text: "No problem! I've cancelled that action. Is there anything else I can help you with?", timestamp: new Date() }
        ]);
        setPendingConfirmation(null);
        speakText("No problem, I've cancelled that action.");
        setInput("");
        setIsProcessing(false);
        return;
      } else if (isConfirm) {
        // Automatically inject the confirmedAction struct and proceed
        confirmedAction = {
          confirmed: true,
          action: pendingConfirmationRef.current.action,
          params: pendingConfirmationRef.current.params
        };
      }
    }

    const userMsg: Message = { role: "user", text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    setPendingConfirmation(null);

    // Abort any ongoing request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

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
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal
      });

      const data = await res.json();

      if (!data.success) {
        // Prefer friendly reply for the user to hear/see, keep details for console
        console.error("AI Assistant Server Error Details:", data.details);
        throw new Error(data.reply || data.error || "I'm sorry, I ran into an issue. Please try again!");
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

      // --- UI ACTION ROUTING (customer + seller + admin) ---
      if (data.tool) {
        if (data.tool === 'add_to_cart' || data.tool === 'update_cart_quantity' || data.tool === 'remove_from_cart' || data.tool === 'move_wishlist_to_cart') {
          showToast(data.tool === 'remove_from_cart' ? "Removed from cart!" : "Cart updated! 🛒");
          fetchCart();
        }
        if (data.tool === 'add_to_wishlist' || data.tool === 'remove_from_wishlist') {
          showToast(data.tool === 'remove_from_wishlist' ? "Removed from wishlist!" : "Wishlist updated! ❤️");
          fetchWishlist();
        }
        if (data.tool === 'seller_pause_product') showToast("Product paused ⏸️");
        if (data.tool === 'admin_approve_product') showToast("Product approved ✅");

        // Handle CSV download
        if (data.data?.download && data.data?.csv_data_uri) {
          const link = document.createElement('a');
          link.href = data.data.csv_data_uri;
          link.download = data.data.filename || 'report.csv';
          link.click();
        }

        setTimeout(() => {
          switch (data.tool) {
            // ── CUSTOMER ROUTES ──────────────────────────────────────
            case "search_products":
            case "recommend_products":
            case "view_products":
              if (data.data?.products?.length === 1) {
                router.push(`/product/${data.data.products[0].id}`);
              } else {
                const sq = data.data?.query; 
                const sc = data.data?.category; 
                const sp = data.data?.max_price;
                const minP = data.data?.min_price;
                
                const qp = new URLSearchParams();
                if (sq) qp.set("search", sq); 
                if (sc) qp.set("category", sc); 
                if (sp) qp.set("max_price", sp.toString());
                if (minP) qp.set("min_price", minP.toString());
                
                router.push(`/search?${qp.toString()}`);
              }
              break;
            case "get_product_details":
              if (data.data?.product?.id) router.push(`/product/${data.data.product.id}`);
              else if (data.data?.id) router.push(`/product/${data.data.id}`);
              break;
            case "view_cart": case "add_to_cart": case "remove_from_cart":
            case "update_cart_quantity": case "move_wishlist_to_cart":
              router.push('/cart'); break;
            case "add_to_wishlist": case "remove_from_wishlist": case "view_wishlist":
              router.push('/wishlist'); break;
            case "track_order": case "cancel_order": case "create_order":
            case "return_order": case "view_orders":
              router.push('/profile?tab=orders'); break;
            case "view_profile": case "update_address":
              router.push('/profile'); break;
            case "navigate_home": router.push('/'); break;
            case "go_back": router.back(); break;
            case "show_deals": router.push('/search'); break;
            // ── SELLER ROUTES ────────────────────────────────────────
            case "seller_view_orders": case "seller_update_order_status":
              router.push('/seller/orders'); break;
            case "seller_view_requests": case "seller_request_category":
              router.push('/seller/requests'); break;
            case "seller_check_inventory": case "seller_pause_product":
            case "seller_add_product": case "seller_edit_product":
              router.push('/seller/products'); break;
            case "seller_sales_report": case "seller_best_products":
            case "seller_cancelled_orders": case "seller_revenue_today":
            case "seller_pending_orders":
              router.push('/seller/analytics'); break;
            case "seller_navigate": {
              const target = data.data?.target;
              const buildQS = () => {
                const qp = new URLSearchParams();
                if (data.data?.date_filter) qp.set("date_filter", data.data.date_filter);
                if (data.data?.status_filter) qp.set("status_filter", data.data.status_filter);
                if (data.data?.download_csv) qp.set("download_csv", "true");
                if (data.data?.filter_type) qp.set("filter_type", data.data.filter_type);
                if (data.data?.filter_status) qp.set("filter_status", data.data.filter_status);
                if (data.data?.bulk_action) qp.set("bulk_action", data.data.bulk_action);
                return qp.toString();
              };
              if (target === 'orders') {
                const qs = buildQS();
                router.push(`/seller/orders${qs ? `?${qs}` : ''}`);
              } else if (target === 'analytics') {
                const qs = buildQS();
                router.push(`/seller/analytics${qs ? `?${qs}` : ''}`);
              } else if (target === 'dashboard') {
                const qs = buildQS();
                router.push(`/seller/dashboard${qs ? `?${qs}` : ''}`);
              } else if (target === 'requests') {
                const qs = buildQS();
                router.push(`/seller/requests${qs ? `?${qs}` : ''}`);
              } else if (target === 'products') router.push('/seller/products');
              else if (target === 'settings') router.push('/seller/settings');
              else if (target === 'add_product') router.push('/seller/products/add');
              else if (target === 'category_request') router.push('/seller/category-request');
              break;
            }
            // ── ADMIN ROUTES ─────────────────────────────────────────
            case "admin_navigate": {
              const adminTarget = data.data?.target;
              const adminRoutes: Record<string, string> = {
                dashboard: '/admin/dashboard',
                products: '/admin/products',
                orders: '/admin/orders',
                users: '/admin/users',
                suppliers: '/admin/suppliers',
                categories: '/admin/categories',
                requests: '/admin/requests',
                banners: '/admin/banners',
                'adjust-home': '/admin/adjust-home',
              };
              const adminBase = adminRoutes[adminTarget];
              if (adminBase) {
                const qp = new URLSearchParams();
                if (data.data?.date_filter) qp.set('date_filter', data.data.date_filter);
                if (data.data?.status_filter) qp.set('status_filter', data.data.status_filter);
                if (data.data?.seller_name) qp.set('seller_name', data.data.seller_name);
                if (data.data?.download_csv) qp.set('download_csv', 'true');
                if (data.data?.filter_type) qp.set('filter_type', data.data.filter_type);
                if (data.data?.filter_status) qp.set('filter_status', data.data.filter_status);
                if (data.data?.action) qp.set('action', data.data.action);
                const qs = qp.toString();
                router.push(`${adminBase}${qs ? `?${qs}` : ''}`);
              }
              break;
            }
            case "admin_platform_stats": case "admin_platform_revenue":
            case "admin_dashboard_stats": case "admin_growth_metrics":
              router.push('/admin/dashboard'); break;
            case "admin_pending_products": case "admin_approve_product":
            case "admin_reject_product": case "admin_edit_any_product":
              router.push('/admin/products'); break;
            case "admin_all_orders": case "admin_orders_report":
            case "admin_revenue_report":
              router.push('/admin/orders'); break;
            case "admin_all_sellers": case "admin_view_sellers":
            case "admin_trust_seller": case "admin_add_seller":
              router.push('/admin/suppliers'); break;
            case "admin_view_users": case "admin_delete_user":
            case "admin_change_user_role":
              router.push('/admin/users'); break;
            case "admin_add_category": case "admin_edit_category":
            case "admin_delete_category":
              router.push('/admin/categories'); break;
            case "admin_view_requests": case "admin_approve_request":
            case "admin_reject_request":
              router.push('/admin/requests'); break;
            case "admin_add_banner": case "admin_view_banners":
              router.push('/admin/banners'); break;
            case "admin_get_home_layout": case "admin_update_home_layout":
              router.push('/admin/adjust-home'); break;
            default:
              console.log("[AIAssistant] Unhandled tool:", data.tool); break;
          }
        }, 1500);
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Request aborted by user.");
        return;
      }
      console.error("AI Assistant Error:", err);
      const errMsg = err.message || "I'm having trouble right now. Please try again!";
      setMessages(prev => [...prev, {
        role: "assistant", text: errMsg, timestamp: new Date()
      }]);
      speakText(errMsg);
    } finally {

      setIsProcessing(false);
    }
  }, [user, isProcessing, input, pendingConfirmation]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsProcessing(false);
  };

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


  const toggleListening = async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setListeningStatus("");
      return;
    }

    setIsListening(true);
    setListeningStatus("Requesting mic...");

    await startContinuousListening(
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
    setListeningStatus("Listening...");
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


  const [visibleProducts, setVisibleProducts] = useState<Record<number, number>>({});

  const toggleShowMore = (msgIdx: number) => {
    setVisibleProducts(prev => ({
      ...prev,
      [msgIdx]: (prev[msgIdx] || 3) + 3
    }));
  };

  // Show for all roles: customer, seller, admin
  if (!user) return null;
  const role = user.role || 'user';

  // Role-based branding
  const roleConfig = {
    user:   { label: 'ActionBot', sub: 'EMart AI Assistant',   gradient: 'from-green-600 to-emerald-500',  bubble: 'from-green-500 to-emerald-600',  bubbleHover: 'from-green-600 to-emerald-700',  avatar: 'bg-emerald-100', icon: 'text-emerald-600' },
    seller: { label: 'SellerBot', sub: 'Business Assistant',   gradient: 'from-blue-600 to-indigo-500',    bubble: 'from-blue-500 to-indigo-600',    bubbleHover: 'from-blue-600 to-indigo-700',    avatar: 'bg-blue-100',    icon: 'text-blue-600'    },
    admin:  { label: 'AdminBot',  sub: 'Platform Control',     gradient: 'from-purple-600 to-violet-500',  bubble: 'from-purple-500 to-violet-600',  bubbleHover: 'from-purple-600 to-violet-700',  avatar: 'bg-purple-100',  icon: 'text-purple-600'  },
  }[role] || { label: 'ActionBot', sub: 'EMart AI', gradient: 'from-green-600 to-emerald-500', bubble: 'from-green-500 to-emerald-600', bubbleHover: 'from-green-600 to-emerald-700', avatar: 'bg-emerald-100', icon: 'text-emerald-600' };

  const quickSuggestions = {
    user:   ['Search phones', 'Track order', 'Recommend laptops', 'Cancel order'],
    seller: ['Sales this month', 'Pending orders', 'Check inventory', 'Best products'],
    admin:  ['Platform stats', 'Pending approvals', 'Revenue today', 'All sellers'],
  }[role] || [];

  const welcomeText = {
    user:   "👋 Hi! I'm ActionBot, your EMart AI assistant. I can help you search products, track orders, and more!",
    seller: "📊 Hi! I'm SellerBot, your business assistant. Ask me about sales, inventory, orders, or product management.",
    admin:  "⚙️ Hi! I'm AdminBot, your platform operations assistant. Ask me about revenue, sellers, pending approvals, or platform stats.",
  }[role] || "👋 Hi! How can I help you today?";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* ===== CHAT PANEL ===== */}
      {isOpen && (
        <div className="w-[360px] h-[580px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ animation: "slideUp 0.25s ease-out" }}>

          {/* Header */}
          <div className={`bg-gradient-to-r ${roleConfig.gradient} text-white px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-none">{roleConfig.label}</p>
                <p className="text-xs text-white/80 mt-0.5">{roleConfig.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">{role}</span>
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
                      {msg.products.slice(0, visibleProducts[i] || 3).map((p) => (
                        <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm flex gap-2.5 hover:border-emerald-200 transition-colors cursor-pointer" onClick={() => router.push(`/product/${p.id}`)}>
                          {p.image ? (
                            <img src={p.image.startsWith('/') ? `${API}${p.image}` : p.image}
                              alt={p.name}
                              className="w-14 h-14 object-contain rounded-lg shrink-0 bg-gray-50" />
                          ) : (
                            <div className="w-14 h-14 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-emerald-600 font-bold text-sm">₹{p.price?.toLocaleString()}</p>
                                {p.discount && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1 rounded">-{p.discount}%</span>}
                            </div>
                            {p.category && <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-tighter">{p.category}</p>}
                          </div>
                        </div>
                      ))}
                      {msg.products.length > (visibleProducts[i] || 3) && (
                        <button 
                          onClick={() => toggleShowMore(i)}
                          className="w-full py-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100 mt-1"
                        >
                          Show more (+{Math.min(3, msg.products.length - (visibleProducts[i] || 3))})
                        </button>
                      )}
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

          {/* Quick suggestions — role-aware */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {quickSuggestions.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors shrink-0 border ${
                    role === 'seller' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                    role === 'admin'  ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}>
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
              {isProcessing ? (
                <button onClick={handleStop}
                  className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors" title="Stop AI">
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button onClick={handleSend} disabled={!input.trim() || !user}
                  className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Send message">
                  <Send className="w-4 h-4" />
                </button>
              )}
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
            : `bg-gradient-to-br ${roleConfig.bubble} hover:${roleConfig.bubbleHover}`
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
