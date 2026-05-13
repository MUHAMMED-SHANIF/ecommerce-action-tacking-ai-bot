'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, IndianRupee, Users, Package, TrendingUp, Tag, Clock, Download } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, products: 0, sellers: 0, requests: 0 });
    const [analytics, setAnalytics] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [dateFilter, setDateFilter] = useState('all');
    const [autoDownload, setAutoDownload] = useState(false);
    const router = useRouter();

    // Read URL params (set by AI)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('date_filter')) setDateFilter(params.get('date_filter') as string);
            if (params.get('download_csv') === 'true') setAutoDownload(true);
        }
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` };

            try {
                const [usersRes, productsRes, sellersRes, requestsRes, ordersRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/users`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/sellers`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/unified-requests?history=false`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/orders`, { headers }),
                ]);

                const [usersData, productsData, sellersData, requestsData, ordersData] = await Promise.all([
                    usersRes.json(), productsRes.json(), sellersRes.json(), requestsRes.json(), ordersRes.json()
                ]);

                setStats({
                    users: Array.isArray(usersData) ? usersData.length : 0,
                    products: Array.isArray(productsData) ? productsData.length : 0,
                    sellers: Array.isArray(sellersData) ? sellersData.length : 0,
                    requests: Array.isArray(requestsData) ? requestsData.filter((r: any) => r.status === 'pending').length : 0,
                });

                if (ordersData?.analytics) {
                    setAnalytics(ordersData.analytics);
                    setOrders(ordersData.orders || []);
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            }
        };
        fetchAll();
    }, []);

    // Date filter helper
    const isInRange = (dateStr: string, filter: string) => {
        if (filter === 'all') return true;
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        if (filter === 'today') return diffDays < 1;
        if (filter === 'weekly') return diffDays <= 7;
        if (filter === 'monthly') return diffDays <= 30;
        if (filter === '3months') return diffDays <= 90;
        if (filter === '6months') return diffDays <= 180;
        if (filter === '1year') return diffDays <= 365;
        return true;
    };

    const filteredOrders = orders.filter(o => isInRange(o.createdAt, dateFilter));

    // Compute filtered analytics
    const filteredAnalytics = analytics ? {
        ...analytics,
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders
            .filter((o: any) => o.status?.toLowerCase() !== 'cancelled')
            .reduce((s: number, o: any) => s + parseFloat(o.totalPrice || 0), 0),
    } : null;

    const handleDownloadCSV = useCallback(() => {
        if (!analytics || filteredOrders.length === 0) { alert('No data to download.'); return; }

        const pad = (n: number) => n.toString().padStart(2, '0');
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const fmtDate = (s: string) => { const d = new Date(s); return `="${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}"`; };

        const rows: any[][] = [];
        const headers = ['Order ID', 'Date', 'Total (₹)', 'Status', 'Items'];

        filteredOrders.forEach((o: any) => {
            rows.push([o.id, fmtDate(o.createdAt), o.totalPrice, o.status, o.items?.map((i: any) => i.name).join('; ') || `${o.itemCount} item(s)`]);
        });

        // Summary
        const totalRev = filteredOrders.filter((o: any) => o.status?.toLowerCase() !== 'cancelled')
            .reduce((s: number, o: any) => s + parseFloat(o.totalPrice || 0), 0);
        const byStatus = filteredOrders.reduce((acc: any, o: any) => {
            acc[o.status] = (acc[o.status] || 0) + 1; return acc;
        }, {});

        rows.push([]);
        rows.push(['--- SUMMARY ---']);
        rows.push(['Date Filter', dateFilter]);
        rows.push(['Total Orders', filteredOrders.length]);
        rows.push(['Total Revenue (excl. cancelled)', `Rs ${totalRev.toFixed(2)}`]);
        rows.push(['Total Users', stats.users]);
        rows.push(['Total Sellers', stats.sellers]);
        rows.push(['Total Products', stats.products]);
        rows.push(['Pending Requests', stats.requests]);
        Object.entries(byStatus).forEach(([status, count]) => rows.push([`Orders - ${status}`, count]));

        // Top Products
        if (analytics.topProducts?.length) {
            rows.push([]);
            rows.push(['--- TOP PRODUCTS ---']);
            rows.push(['Rank', 'Product', 'Category', 'Qty Sold', 'Revenue (₹)']);
            analytics.topProducts.slice(0, 10).forEach((p: any) =>
                rows.push([p.rank, p.name, p.category, p.totalQty, p.totalRevenue?.toFixed(2)])
            );
        }

        // Top Sellers
        if (analytics.topSellers?.length) {
            rows.push([]);
            rows.push(['--- TOP SELLERS ---']);
            rows.push(['Rank', 'Seller', 'Products', 'Qty Sold', 'Revenue (₹)']);
            analytics.topSellers.slice(0, 10).forEach((s: any) =>
                rows.push([s.rank, s.name, s.totalProducts, s.totalQty, s.totalRevenue?.toFixed(2)])
            );
        }

        // Top Categories
        if (analytics.topCategories?.length) {
            rows.push([]);
            rows.push(['--- TOP CATEGORIES ---']);
            rows.push(['Rank', 'Category', 'Qty Sold', 'Revenue (₹)']);
            analytics.topCategories.slice(0, 10).forEach((c: any) =>
                rows.push([c.rank, c.name, c.totalQty, c.totalRevenue?.toFixed(2)])
            );
        }

        const csv = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `admin_dashboard_report_${dateFilter}_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [analytics, filteredOrders, stats, dateFilter]);

    // Auto-download triggered by AI
    useEffect(() => {
        if (autoDownload && analytics && filteredOrders.length > 0) {
            const t = setTimeout(() => {
                handleDownloadCSV();
                setAutoDownload(false);
                if (typeof window !== 'undefined') window.history.replaceState({}, '', '/admin/dashboard');
            }, 700);
            return () => clearTimeout(t);
        }
    }, [autoDownload, analytics, filteredOrders.length]);

    const statusColor = (s: string) => {
        const map: any = {
            pending: 'bg-yellow-100 text-yellow-700',
            shipped: 'bg-blue-100 text-blue-700',
            delivered: 'bg-green-100 text-green-700',
            cancelled: 'bg-red-100 text-red-700',
        };
        return map[s?.toLowerCase()] || 'bg-gray-100 text-gray-600';
    };

    const medal = (rank: number) =>
        rank === 1 ? 'bg-[#F59E0B] text-white' :
            rank === 2 ? 'bg-gray-300 text-gray-700' :
                rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
                <div className="flex items-center gap-3">
                    <select
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none shadow-sm bg-white"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                        <option value="3months">3 Months</option>
                        <option value="6months">6 Months</option>
                        <option value="1year">1 Year</option>
                    </select>
                    <button
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                </div>
            </div>

            {/* Site Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: stats.users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/users' },
                    { label: 'Total Products', value: stats.products, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/products' },
                    { label: 'Total Suppliers', value: stats.sellers, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/suppliers' },
                    { label: 'Pending Requests', value: stats.requests, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/requests' },
                ].map(stat => (
                    <div key={stat.label} onClick={() => router.push(stat.href)}
                        className={`${stat.bg} p-6 rounded-xl shadow-sm border border-white cursor-pointer hover:shadow-md transition-all`}>
                        <h3 className={`text-xs font-semibold uppercase tracking-wide ${stat.color} mb-2`}>{stat.label}</h3>
                        <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Order KPIs (date-filtered) */}
            {filteredAnalytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: dateFilter === 'all' ? 'Total Orders' : 'Orders in Period', value: filteredAnalytics.totalOrders, icon: <ShoppingBag className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
                        { label: dateFilter === 'all' ? 'Total Revenue' : 'Revenue in Period', value: `₹${filteredAnalytics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <IndianRupee className="w-5 h-5 text-green-500" />, bg: 'bg-green-50' },
                        { label: 'Active Sellers', value: analytics.totalSellers, icon: <Users className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50' },
                        { label: 'Listed Products', value: analytics.totalProducts, icon: <Package className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50' },
                    ].map(kpi => (
                        <div key={kpi.label} className={`${kpi.bg} rounded-xl p-5 flex items-center gap-4 shadow-sm border border-white`}>
                            <div className="p-2 bg-white rounded-lg shadow-sm">{kpi.icon}</div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Leaderboards */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Top Products */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                            <TrendingUp className="w-4 h-4 text-green-500" /> Top Selling Products
                        </h2>
                        <div className="space-y-3">
                            {analytics.topProducts.slice(0, 5).map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(p.rank)}`}>{p.rank}</span>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                                            <div className="text-xs text-gray-400">{p.category}</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="text-sm font-bold text-green-600">₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                        <div className="text-xs text-gray-400">{p.totalQty} sold</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/admin/orders')} className="mt-4 text-xs text-blue-600 hover:underline font-medium">View all →</button>
                    </div>

                    {/* Top Sellers */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                            <Users className="w-4 h-4 text-purple-500" /> Top Sellers
                        </h2>
                        <div className="space-y-3">
                            {analytics.topSellers.slice(0, 5).map((s: any) => (
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
                        <button onClick={() => router.push('/admin/suppliers')} className="mt-4 text-xs text-blue-600 hover:underline font-medium">View all →</button>
                    </div>

                    {/* Top Categories */}
                    <div className="bg-white rounded-xl shadow-sm border p-5">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                            <Tag className="w-4 h-4 text-orange-500" /> Top Categories
                        </h2>
                        <div className="space-y-3">
                            {analytics.topCategories.slice(0, 5).map((c: any) => (
                                <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(c.rank)}`}>{c.rank}</span>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">{c.name}</div>
                                            <div className="text-xs text-gray-400">{c.totalQty} units sold</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <div className="text-sm font-bold text-orange-600">₹{c.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => router.push('/admin/categories')} className="mt-4 text-xs text-blue-600 hover:underline font-medium">View all →</button>
                    </div>
                </div>
            )}

            {/* Recent Orders */}
            {filteredOrders.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {dateFilter === 'all' ? 'Recent Orders' : `Orders — ${dateFilter}`}
                            <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{filteredOrders.length}</span>
                        </h3>
                        <button onClick={() => router.push('/admin/orders')} className="text-xs text-blue-600 hover:underline font-medium">View all →</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-gray-500 text-xs font-medium">
                                    <th className="text-left p-4">Order ID</th>
                                    <th className="text-left p-4">Items</th>
                                    <th className="text-right p-4">Total</th>
                                    <th className="text-right p-4">Status</th>
                                    <th className="text-right p-4">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.slice(0, 10).map((order: any) => (
                                    <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}…</td>
                                        <td className="p-4 text-gray-600 max-w-[200px] truncate">
                                            {order.items?.map((i: any) => i.name).filter(Boolean).join(', ') || `${order.itemCount} item(s)`}
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-800">
                                            ₹{parseFloat(order.totalPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-gray-400 text-xs">
                                            {new Date(order.createdAt).toLocaleDateString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-4">
                    <a href="/admin/products/add" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">+ Add New Product</a>
                    <a href="/admin/banners" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">Manage Banners</a>
                    <a href="/admin/orders" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">View Full Analytics</a>
                </div>
            </div>
        </div>
    );
}
