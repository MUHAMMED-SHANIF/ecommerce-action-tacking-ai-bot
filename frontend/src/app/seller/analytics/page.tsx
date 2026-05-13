'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { TrendingUp, Tag, IndianRupee, Package, ShoppingBag, Clock, ChevronDown, ChevronUp, Search, X, Download } from 'lucide-react';

export default function SellerAnalytics() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [range, setRange] = useState('all');
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [autoDownload, setAutoDownload] = useState(false);

    // Search state
    const [searchMode, setSearchMode] = useState<'products' | 'orders'>('products');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchStats = async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        try {
            setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/seller/stats?range=${range}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            if (res.ok) setData(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const dateFilter = searchParams.get('date_filter');
        const shouldDownload = searchParams.get('download_csv') === 'true';

        if (dateFilter) {
            const map: any = {
                'today': 'day',
                'weekly': 'week',
                'monthly': 'month',
                '3months': '3month',
                '6months': '6month',
                '1year': 'year',
                'all': 'all'
            };
            if (map[dateFilter]) setRange(map[dateFilter]);
        }
        if (shouldDownload) {
            setAutoDownload(true);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchStats();
    }, [range]);

    const handleDownloadCSV = () => {
        if (!data) return;

        const rows = [];
        rows.push(["SELLER ANALYTICS REPORT"]);
        rows.push(["Time Range:", range]);
        rows.push(["Generated At:", new Date().toLocaleString()]);
        rows.push([]);

        // KPI Section
        rows.push(["KEY METRICS"]);
        rows.push(["Total Products", data.totalProducts]);
        rows.push(["Total Orders", data.totalOrders]);
        rows.push(["Pending Orders", data.pendingOrders]);
        rows.push(["Total Revenue", `Rs ${data.totalRevenue}`]);
        rows.push([]);

        // Top Products Section
        rows.push(["TOP PRODUCTS"]);
        rows.push(["Rank", "Product Name", "Category", "Price", "Units Sold", "Revenue", "Stock Left"]);
        (data.topProducts || []).forEach((p: any) => {
            rows.push([
                p.rank, p.name, p.category, p.price, p.totalQty, p.totalRevenue, p.stock
            ]);
        });
        rows.push([]);

        // Top Categories Section
        rows.push(["TOP CATEGORIES"]);
        rows.push(["Rank", "Category Name", "Units Sold", "Revenue"]);
        (data.topCategories || []).forEach((c: any, i: number) => {
            rows.push([
                i + 1, c.name, c.totalQty, c.totalRevenue
            ]);
        });

        const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `analytics_report_${range}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!loading && data && autoDownload) {
            const timer = setTimeout(() => {
                handleDownloadCSV();
                setAutoDownload(false);
                if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/seller/analytics');
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, autoDownload, data]);

    const medal = (rank: number) =>
        rank === 1 ? 'bg-[#F59E0B] text-white' :
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
                <div className="flex gap-4 items-center">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none shadow-sm text-sm"
                    >
                        <option value="all">Full History</option>
                        <option value="day">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="3month">Last 3 Months</option>
                        <option value="6month">Last 6 Months</option>
                        <option value="year">Last 1 Year</option>
                    </select>
                    <button onClick={handleDownloadCSV} className="text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition font-medium flex items-center gap-2 border border-slate-300">
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                    <Link href="/seller/orders" className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition font-medium">
                        View Orders
                    </Link>
                </div>
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
