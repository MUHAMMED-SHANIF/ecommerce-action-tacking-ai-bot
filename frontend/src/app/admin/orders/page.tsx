'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, TrendingUp, Users, Tag, IndianRupee, Package, Search, ChevronDown, ChevronUp, X, Download } from 'lucide-react';

export default function AdminOrdersPage() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateFilter, setDateFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sellerFilter, setSellerFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Order expand
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [autoDownload, setAutoDownload] = useState(false);

    // Read URL params set by AI (on mount)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const p = new URLSearchParams(window.location.search);
        if (p.get('date_filter')) setDateFilter(p.get('date_filter')!);
        if (p.get('status_filter')) setStatusFilter(p.get('status_filter')!);
        // seller_filter may be a seller name — resolved after data loads
        if (p.get('seller_name')) setSavedSellerName(p.get('seller_name')!);
        if (p.get('download_csv') === 'true') setAutoDownload(true);
    }, []);

    const [savedSellerName, setSavedSellerName] = useState('');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchData();
            // Poll every 30s silently to auto-pick up new sellers/orders
            const interval = setInterval(() => fetchData(true), 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // Once data loads, resolve seller name -> id
    useEffect(() => {
        if (data && savedSellerName) {
            const match = (data.allSellerStats || []).find((s: any) =>
                s.name.toLowerCase().includes(savedSellerName.toLowerCase())
            );
            if (match) setSellerFilter(match.id);
        }
    }, [data, savedSellerName]);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/orders`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            setData(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const isInRange = (dateStr: string) => {
        if (dateFilter === 'all') return true;
        const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
        if (dateFilter === 'today') return diff < 1;
        if (dateFilter === 'weekly') return diff <= 7;
        if (dateFilter === 'monthly') return diff <= 30;
        if (dateFilter === '3months') return diff <= 90;
        if (dateFilter === '6months') return diff <= 180;
        if (dateFilter === '1year') return diff <= 365;
        return true;
    };

    const filteredOrders = useMemo(() => {
        if (!data?.orders) return [];
        const q = searchQuery.toLowerCase();
        return data.orders.filter((o: any) => {
            if (!isInRange(o.createdAt)) return false;
            if (statusFilter !== 'all' && o.status?.toLowerCase() !== statusFilter) return false;
            if (sellerFilter !== 'all') {
                const hasSeller = o.items?.some((i: any) => i.sellerId === sellerFilter);
                if (!hasSeller) return false;
            }
            if (q) {
                return o.id.toLowerCase().includes(q) ||
                    o.status?.toLowerCase().includes(q) ||
                    o.items?.some((i: any) => i.name?.toLowerCase().includes(q));
            }
            return true;
        });
    }, [data, dateFilter, statusFilter, sellerFilter, searchQuery]);

    // Recompute KPIs from filtered orders
    const filteredStats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalRevenue = filteredOrders
            .filter((o: any) => o.status?.toLowerCase() !== 'cancelled')
            .reduce((s: number, o: any) => s + parseFloat(o.totalPrice || 0), 0);
        return { totalOrders, totalRevenue };
    }, [filteredOrders]);

    // Recompute top products from filtered orders (and filter by seller if selected)
    const topProducts = useMemo(() => {
        const map: Record<string, any> = {};
        filteredOrders.forEach((o: any) => {
            (o.items || []).forEach((item: any) => {
                if (sellerFilter !== 'all' && item.sellerId !== sellerFilter) return;
                if (!item.name) return;
                if (!map[item.name]) map[item.name] = { name: item.name, totalQty: 0, totalRevenue: 0 };
                map[item.name].totalQty += item.qty || 0;
                map[item.name].totalRevenue += (item.price || 0) * (item.qty || 0);
            });
        });
        return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map((p, i) => ({ ...p, rank: i + 1 }));
    }, [filteredOrders, sellerFilter]);

    // Recompute top categories from filtered orders (cross-ref product->category via allProductStats)
    const topCategories = useMemo(() => {
        // Build product name -> category map from allProductStats
        const catMap: Record<string, string> = {};
        (data?.allProductStats || []).forEach((p: any) => { if (p.name && p.category) catMap[p.name] = p.category; });

        const map: Record<string, any> = {};
        filteredOrders.forEach((o: any) => {
            (o.items || []).forEach((item: any) => {
                if (sellerFilter !== 'all' && item.sellerId !== sellerFilter) return;
                const cat = catMap[item.name] || 'Other';
                if (!map[cat]) map[cat] = { name: cat, totalQty: 0, totalRevenue: 0 };
                map[cat].totalQty += item.qty || 0;
                map[cat].totalRevenue += (item.price || 0) * (item.qty || 0);
            });
        });
        return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5).map((c, i) => ({ ...c, rank: i + 1 }));
    }, [filteredOrders, data, sellerFilter]);

    const statusColor = (s: string) => {
        const map: any = { pending: 'bg-yellow-100 text-yellow-700', shipped: 'bg-blue-100 text-blue-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
        return map[s?.toLowerCase()] || 'bg-gray-100 text-gray-600';
    };

    // CSV Download
    const handleDownloadCSV = useCallback(() => {
        if (filteredOrders.length === 0) { alert('No orders to download.'); return; }
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const fmtDate = (s: string) => { const d = new Date(s); return `="${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}"`; };

        const selectedSeller = sellerFilter !== 'all'
            ? (data?.allSellerStats || []).find((s: any) => s.id === sellerFilter)
            : null;

        const headers = ['Order ID','Date','Total (Rs)','Status','Product','Qty','Price','Seller','Seller Address','Seller Status'];
        const rows: string[][] = [];
        filteredOrders.forEach((o: any) => {
            let isFirstItemForOrder = true;
            (o.items || []).forEach((item: any) => {
                // Skip items that don't belong to the selected seller
                if (sellerFilter !== 'all' && item.sellerId !== sellerFilter) return;

                // Resolve seller address from allSellerStats by sellerId on item
                const itemSeller = (data?.allSellerStats || []).find((s: any) => s.id === item.sellerId);
                rows.push([
                    isFirstItemForOrder ? o.id : '',
                    isFirstItemForOrder ? fmtDate(o.createdAt) : '',
                    isFirstItemForOrder ? String(parseFloat(o.totalPrice).toFixed(2)) : '',
                    isFirstItemForOrder ? o.status : '',
                    item.name || 'Unknown',
                    String(item.qty),
                    String((item.price * item.qty).toFixed(2)),
                    item.sellerName || '-',
                    itemSeller?.email || '-',
                    item.sellerStatus || 'pending',
                ]);
                isFirstItemForOrder = false;
            });
        });

        // Summary
        rows.push([],['SUMMARY']);
        rows.push(['Date Filter', dateFilter]);
        rows.push(['Status Filter', statusFilter]);
        rows.push(['Seller Filter', selectedSeller?.name || 'All']);
        if (selectedSeller) {
            rows.push(['Seller Email', selectedSeller.email || '-']);
            rows.push(['Seller Products', String(selectedSeller.totalProducts || '-')]);
            rows.push(['Seller Total Revenue (All Time)', `Rs ${selectedSeller.totalRevenue?.toFixed(2) || '-'}`]);
        }
        rows.push(['Total Orders (Filtered)', String(filteredOrders.length)]);
        rows.push(['Total Revenue (excl. cancelled)', `Rs ${filteredStats.totalRevenue.toFixed(2)}`]);

        // Top Products in this filter
        if (topProducts.length) {
            rows.push([],['TOP PRODUCTS (Filtered)']);
            rows.push(['Rank','Product','Qty Sold','Revenue (Rs)']);
            topProducts.forEach(p => rows.push([String(p.rank), p.name, String(p.totalQty), p.totalRevenue.toFixed(2)]));
        }

        // Top Categories in this filter
        if (topCategories.length) {
            rows.push([],['TOP CATEGORIES (Filtered)']);
            rows.push(['Rank','Category','Qty Sold','Revenue (Rs)']);
            topCategories.forEach(c => rows.push([String(c.rank), c.name, String(c.totalQty), c.totalRevenue.toFixed(2)]));
        }

        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `admin_orders_${dateFilter}_${statusFilter}_${selectedSeller?.name || 'all'}_${Date.now()}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, [filteredOrders, dateFilter, statusFilter, sellerFilter, filteredStats, data, topProducts, topCategories]);

    // Auto-download triggered by AI
    useEffect(() => {
        if (autoDownload && !loading && filteredOrders.length > 0) {
            const t = setTimeout(() => { handleDownloadCSV(); setAutoDownload(false); }, 800);
            return () => clearTimeout(t);
        }
    }, [autoDownload, loading, filteredOrders.length]);

    const medal = (rank: number) =>
        rank === 1 ? 'bg-[#F59E0B] text-white' : rank === 2 ? 'bg-gray-300 text-gray-700' : rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500';

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading orders...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

    const { analytics } = data;
    const isFiltered = dateFilter !== 'all' || statusFilter !== 'all' || sellerFilter !== 'all' || searchQuery;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders & Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {isFiltered ? `Showing ${filteredOrders.length} filtered orders` : `All ${data.orders?.length || 0} orders`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleDownloadCSV}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors">
                        <Download className="w-4 h-4" /> Download CSV
                    </button>
                    <button onClick={fetchData} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-gray-700">Refresh</button>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                        placeholder="Search order ID or product..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="w-3.5 h-3.5" /></button>}
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none bg-white shadow-sm">
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}
                    className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none bg-white shadow-sm">
                    <option value="all">All Sellers</option>
                    {(data?.allSellerStats || []).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                    className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-300 outline-none bg-white shadow-sm">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="weekly">This Week</option>
                    <option value="monthly">This Month</option>
                    <option value="3months">3 Months</option>
                    <option value="6months">6 Months</option>
                    <option value="1year">1 Year</option>
                </select>
                {isFiltered && (
                    <button onClick={() => { setDateFilter('all'); setStatusFilter('all'); setSellerFilter('all'); setSearchQuery(''); }}
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 border border-red-200 px-3 py-2 rounded-lg bg-red-50">
                        <X className="w-3 h-3" /> Clear
                    </button>
                )}
            </div>

            {/* KPI CARDS — filtered */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: isFiltered ? 'Filtered Orders' : 'Total Orders', value: filteredStats.totalOrders, icon: <ShoppingBag className="text-blue-500" />, bg: 'bg-blue-50' },
                    { label: isFiltered ? 'Filtered Revenue' : 'Total Revenue', value: `₹${filteredStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <IndianRupee className="text-green-500" />, bg: 'bg-green-50' },
                    { label: 'Active Sellers', value: analytics.totalSellers, icon: <Users className="text-purple-500" />, bg: 'bg-purple-50' },
                    { label: 'Listed Products', value: analytics.totalProducts, icon: <Package className="text-orange-500" />, bg: 'bg-orange-50' },
                ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-5 flex items-center gap-4 shadow-sm border border-white`}>
                        <div className="p-2 bg-white rounded-lg shadow-sm">{stat.icon}</div>
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* LEADERBOARDS — top products filtered, sellers/categories all-time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Products (filtered) */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-1 text-sm uppercase tracking-wide">
                        <TrendingUp className="w-4 h-4 text-green-500" /> Top Products
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">{isFiltered ? 'Based on filtered orders' : 'All time'}</p>
                    <div className="space-y-3">
                        {(isFiltered ? topProducts : analytics.topProducts?.slice(0, 5) || []).map((p: any) => (
                            <div key={p.name || p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(p.rank)}`}>{p.rank}</span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                                        {p.category && <div className="text-xs text-gray-400">{p.category}</div>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="text-sm font-bold text-green-600">₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-gray-400">{p.totalQty} sold</div>
                                </div>
                            </div>
                        ))}
                        {(isFiltered ? topProducts : analytics.topProducts || []).length === 0 && (
                            <p className="text-gray-400 text-sm text-center py-4">No data for this filter.</p>
                        )}
                    </div>
                </div>

                {/* Top Sellers — shows selected seller card OR all-time leaderboard */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-1 text-sm uppercase tracking-wide">
                        <Users className="w-4 h-4 text-purple-500" /> {sellerFilter !== 'all' ? 'Seller Info' : 'Top Sellers'}
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">{sellerFilter !== 'all' ? 'Selected seller' : 'All time'}</p>
                    {sellerFilter !== 'all' ? (() => {
                        const s = (data?.allSellerStats || []).find((s: any) => s.id === sellerFilter);
                        if (!s) return <p className="text-gray-400 text-sm">No seller data.</p>;
                        return (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Name</span><span className="font-semibold text-gray-800">{s.name}</span></div>
                                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Email</span><span className="font-semibold text-gray-700 text-xs truncate max-w-[60%]">{s.email}</span></div>
                                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Total Products</span><span className="font-bold text-purple-600">{s.totalProducts}</span></div>
                                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Total Sold</span><span className="font-bold text-blue-600">{s.totalQty} units</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">All-Time Revenue</span><span className="font-bold text-green-600">₹{s.totalRevenue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                            </div>
                        );
                    })() : (
                        <div className="space-y-3">
                            {analytics.topSellers?.slice(0, 5).map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(s.rank)}`}>{s.rank}</span>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">{s.name}</div>
                                            <div className="text-xs text-gray-400">{s.totalProducts} products</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="text-sm font-bold text-purple-600">₹{s.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                        <div className="text-xs text-gray-400">{s.totalQty} sold</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Categories — filtered when seller selected */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-1 text-sm uppercase tracking-wide">
                        <Tag className="w-4 h-4 text-orange-500" /> Top Categories
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">{isFiltered ? 'Based on filtered orders' : 'All time'}</p>
                    <div className="space-y-3">
                        {(isFiltered ? topCategories : analytics.topCategories?.slice(0, 5) || []).map((c: any) => (
                            <div key={c.name || c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(c.rank)}`}>{c.rank}</span>
                                    <div className="text-sm font-medium text-gray-800 truncate">{c.name}</div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="text-sm font-bold text-orange-600">₹{c.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-gray-400">{c.totalQty} sold</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ORDERS LIST — filtered */}
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h2 className="font-bold text-gray-800">Orders List</h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{filteredOrders.length} orders</span>
                </div>
                <div className="divide-y">
                    {filteredOrders.length === 0 && (
                        <p className="text-gray-400 text-sm text-center py-10">No orders match the selected filters.</p>
                    )}
                    {filteredOrders.map((order: any) => (
                        <div key={order.id}>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                                <div>
                                    <div className="font-mono text-xs text-gray-400 mb-0.5">#{order.id.slice(0, 8)}...</div>
                                    <div className="font-semibold text-gray-800">₹{parseFloat(order.totalPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-gray-500">{order.itemCount} item(s) · {new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>{order.status}</span>
                                    {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                            </div>
                            {expandedOrder === order.id && (
                                <div className="border-t bg-gray-50 p-4">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 text-xs font-medium border-b">
                                                <th className="text-left pb-2">Product</th>
                                                <th className="text-right pb-2">Qty</th>
                                                <th className="text-right pb-2">Price</th>
                                                <th className="text-right pb-2">Seller</th>
                                                <th className="text-right pb-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.filter((item: any) => sellerFilter === 'all' || item.sellerId === sellerFilter).map((item: any, i: number) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-2 text-gray-800">{item.name || 'Unknown'}</td>
                                                    <td className="py-2 text-right text-gray-600">{item.qty}</td>
                                                    <td className="py-2 text-right text-gray-800 font-medium">₹{(item.price * item.qty).toLocaleString('en-IN')}</td>
                                                    <td className="py-2 text-right text-gray-500 text-xs">{item.sellerName || '—'}</td>
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
                    ))}
                </div>
            </div>
        </div>
    );
}
