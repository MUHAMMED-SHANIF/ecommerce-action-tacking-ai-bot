'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, Tag, IndianRupee, Package, ShoppingBag, Clock, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export default function SellerAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    // Search state
    const [searchMode, setSearchMode] = useState<'products' | 'orders'>('products');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);
            try {
                const res = await fetch('http://localhost:5001/api/seller/stats', {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) setData(await res.json());
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchStats();
    }, []);

    const medal = (rank: number) =>
        rank === 1 ? 'bg-yellow-400 text-white' :
            rank === 2 ? 'bg-gray-300 text-gray-700' :
                rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500';

    const statusColor = (s: string) => ({
        pending: 'bg-yellow-100 text-yellow-700',
        shipped: 'bg-blue-100 text-blue-700',
        delivered: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700',
        accepted: 'bg-emerald-100 text-emerald-700',
    }[s?.toLowerCase()] || 'bg-slate-100 text-slate-600');

    // Filtered results based on search
    const filteredResults = useMemo(() => {
        if (!data) return [];
        const q = searchQuery.toLowerCase();

        if (searchMode === 'products') {
            return (data.topProducts || []).filter((p: any) =>
                p.name?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q)
            );
        }

        if (searchMode === 'orders') {
            return (data.recentOrders || []).filter((o: any) =>
                o.id?.toLowerCase().includes(q) ||
                o.status?.toLowerCase().includes(q) ||
                o.items?.some((i: any) => i.name?.toLowerCase().includes(q))
            );
        }

        return [];
    }, [data, searchMode, searchQuery]);

    if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading analytics...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Sales Analytics</h1>
                    <p className="text-slate-500 text-sm mt-1">Your personal performance overview</p>
                </div>
                <Link href="/seller/orders" className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition font-medium">
                    View All Orders
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'My Products', value: data.totalProducts, icon: <Package className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
                    { label: 'Total Orders', value: data.totalOrders, icon: <ShoppingBag className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50' },
                    { label: 'Pending Orders', value: data.pendingOrders, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' },
                    { label: 'Total Revenue', value: `₹${(data.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <IndianRupee className="w-5 h-5 text-green-500" />, bg: 'bg-green-50' },
                ].map(kpi => (
                    <div key={kpi.label} className={`${kpi.bg} rounded-xl p-5 flex items-center gap-4 shadow-sm border border-white`}>
                        <div className="p-2 bg-white rounded-lg shadow-sm">{kpi.icon}</div>
                        <div>
                            <div className="text-xl font-bold text-slate-900">{kpi.value}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Top Products & Categories leaderboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                        <TrendingUp className="w-4 h-4 text-green-500" /> My Top Products
                    </h2>
                    {data.topProducts?.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-6">No sales data yet.</p>
                    )}
                    <div className="space-y-3">
                        {(data.topProducts || []).map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(p.rank)}`}>{p.rank}</span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                                        <div className="text-xs text-slate-400">{p.category} · ₹{p.price.toLocaleString('en-IN')}</div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="text-sm font-bold text-green-600">₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-slate-400">{p.totalQty} sold · {p.stock} left</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                        <Tag className="w-4 h-4 text-orange-500" /> My Top Categories
                    </h2>
                    {data.topCategories?.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-6">No category data yet.</p>
                    )}
                    <div className="space-y-3">
                        {(data.topCategories || []).map((c: any, i: number) => (
                            <div key={c.name} className="flex items-center justify-between border-b pb-3 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(i + 1)}`}>{i + 1}</span>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                                        <div className="text-xs text-slate-400">{c.totalQty} units sold</div>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-orange-600">
                                    ₹{c.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── SEARCH SECTION ── */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-violet-500" /> Search My Data
                </h2>

                {/* Mode Tabs */}
                <div className="flex gap-2 mb-4">
                    {(['products', 'orders'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => { setSearchMode(mode); setSearchQuery(''); }}
                            className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all ${searchMode === mode
                                ? 'bg-violet-600 text-white shadow'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {mode === 'products' ? 'My Products' : 'My Orders'}
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
                        placeholder={searchMode === 'products' ? 'Search products by name or category...' : 'Search orders by ID, status or product name...'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Products Results */}
                {searchMode === 'products' && (
                    <div className="overflow-x-auto">
                        {filteredResults.length === 0
                            ? <p className="text-slate-400 text-sm text-center py-8">No products found.</p>
                            : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr className="text-slate-500 text-xs font-medium">
                                            <th className="text-left p-3">Rank</th>
                                            <th className="text-left p-3">Product Name</th>
                                            <th className="text-left p-3">Category</th>
                                            <th className="text-right p-3">Price</th>
                                            <th className="text-right p-3">Stock Left</th>
                                            <th className="text-right p-3">Units Sold</th>
                                            <th className="text-right p-3">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredResults.map((p: any) => (
                                            <tr key={p.id} className="border-b hover:bg-slate-50 transition">
                                                <td className="p-3">
                                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${medal(p.rank)}`}>{p.rank}</span>
                                                </td>
                                                <td className="p-3 font-medium text-slate-800">{p.name}</td>
                                                <td className="p-3 text-slate-500">{p.category}</td>
                                                <td className="p-3 text-right text-slate-700">₹{parseFloat(p.price).toLocaleString('en-IN')}</td>
                                                <td className="p-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${p.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                        {p.stock}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-bold text-violet-600">{p.totalQty}</td>
                                                <td className="p-3 text-right font-bold text-green-600">₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                    </div>
                )}

                {/* Orders Results */}
                {searchMode === 'orders' && (
                    <div className="space-y-3">
                        {filteredResults.length === 0
                            ? <p className="text-slate-400 text-sm text-center py-8">No orders found.</p>
                            : filteredResults.map((order: any) => (
                                <div key={order.id} className="border rounded-lg overflow-hidden">
                                    <button
                                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition text-left"
                                        onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                                    >
                                        <div>
                                            <div className="font-mono text-xs text-slate-400">#{order.id.slice(0, 8)}…</div>
                                            <div className="text-sm text-slate-600 mt-0.5">{order.items?.length} item(s) · {new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>{order.status}</span>
                                            {expanded === order.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </button>
                                    {expanded === order.id && (
                                        <div className="border-t bg-slate-50 px-4 pb-4 pt-2">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-slate-400 text-xs border-b">
                                                        <th className="text-left pb-2 font-medium">Product</th>
                                                        <th className="text-right pb-2 font-medium">Qty</th>
                                                        <th className="text-right pb-2 font-medium">Revenue</th>
                                                        <th className="text-right pb-2 font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.items.map((item: any, i: number) => (
                                                        <tr key={i} className="border-b last:border-0">
                                                            <td className="py-2 text-slate-700">{item.name}</td>
                                                            <td className="py-2 text-right text-slate-500">{item.qty}</td>
                                                            <td className="py-2 text-right font-semibold text-slate-800">₹{(item.price * item.qty).toLocaleString('en-IN')}</td>
                                                            <td className="py-2 text-right">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${statusColor(item.sellerStatus || 'pending')}`}>
                                                                    {item.sellerStatus || 'pending'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
