'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, ShoppingBag, Clock, TrendingUp, AlertCircle, CheckCircle, PlusCircle, Globe, IndianRupee, Tag, BarChart2, Download } from 'lucide-react';
import Link from 'next/link';

export default function SellerDashboard() {
    const [stats, setStats] = useState<any>({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, totalRevenue: 0, topProducts: [], topCategories: [] });
    const [range, setRange] = useState('all');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [autoDownload, setAutoDownload] = useState(false);

    const fetchStats = async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` };

        try {
            setLoading(true);
            const [statsRes, reqRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/seller/stats?range=${range}`, { headers }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/requests`, { headers })
            ]);
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                const reqData = reqRes.ok ? await reqRes.json() : [];
                setStats({ ...statsData, requests: Array.isArray(reqData) ? reqData.length : 0 });
            }
        } catch (err) {
            console.error("Failed to fetch dashboard stats", err);
        } finally {
            setLoading(false);
        }
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
        if (!stats) return;

        const rows = [];
        rows.push(["SELLER DASHBOARD REPORT"]);
        rows.push(["Time Range:", range]);
        rows.push(["Generated At:", new Date().toLocaleString()]);
        rows.push([]);

        // KPI Section
        rows.push(["KEY METRICS"]);
        rows.push(["Total Products", stats.totalProducts]);
        rows.push(["Total Orders", stats.totalOrders]);
        rows.push(["Pending Orders", stats.pendingOrders]);
        rows.push(["Total Revenue", `Rs ${stats.totalRevenue}`]);
        rows.push(["My Requests", stats.requests || 0]);
        rows.push([]);

        // Top Products Section
        rows.push(["TOP PRODUCTS"]);
        rows.push(["Rank", "Product Name", "Category", "Price", "Units Sold", "Revenue", "Stock Left"]);
        (stats.topProducts || []).slice(0, 10).forEach((p: any) => {
            rows.push([
                p.rank, p.name, p.category, p.price, p.totalQty, p.totalRevenue, p.stock
            ]);
        });
        rows.push([]);

        // Top Categories Section
        rows.push(["TOP CATEGORIES"]);
        rows.push(["Rank", "Category Name", "Units Sold", "Revenue"]);
        (stats.topCategories || []).slice(0, 10).forEach((c: any, i: number) => {
            rows.push([
                i + 1, c.name, c.totalQty, c.totalRevenue
            ]);
        });

        const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `dashboard_report_${range}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!loading && stats && autoDownload) {
            const timer = setTimeout(() => {
                handleDownloadCSV();
                setAutoDownload(false);
                if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', '/seller/dashboard');
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, autoDownload, stats]);

    const medal = (rank: number) =>
        rank === 1 ? 'bg-[#F59E0B] text-white' :
            rank === 2 ? 'bg-gray-300 text-gray-700' :
                rank === 3 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
                    <p className="text-slate-500">Welcome back to your seller command center</p>
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
                    <button onClick={handleDownloadCSV} className="text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 transition font-medium flex items-center gap-2 border border-slate-300">
                        <Download className="w-4 h-4" /> Download Report
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50', link: '/seller/products' },
                    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', link: '/seller/orders' },
                    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', link: '/seller/orders' },
                    { label: 'My Requests', value: stats.requests || 0, icon: AlertCircle, color: 'text-pink-600', bg: 'bg-pink-50', link: '/seller/requests' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Link href={stat.link} key={i}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                                        <Icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full group-hover:bg-slate-100">View →</span>
                                </div>
                                <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">{stat.label}</h3>
                                <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Revenue KPI */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg">
                <div>
                    <p className="text-violet-200 text-sm font-medium uppercase tracking-wide">Total Revenue</p>
                    <p className="text-4xl font-bold mt-1">₹{(stats.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    <p className="text-violet-300 text-xs mt-2">From your {stats.totalOrders} orders</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <IndianRupee className="w-14 h-14 text-violet-300 opacity-50" />
                    <Link href="/seller/analytics" className="text-xs bg-white/20 hover:bg-white/30 transition px-4 py-1.5 rounded-full font-medium">
                        Full Analytics →
                    </Link>
                </div>
            </div>

            {/* Top Products & Categories */}
            {(stats.topProducts?.length > 0 || stats.topCategories?.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Top Products */}
                    {stats.topProducts?.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                                <TrendingUp className="w-4 h-4 text-green-500" /> My Top Products
                            </h3>
                            <div className="space-y-3">
                                {stats.topProducts.slice(0, 4).map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(p.rank)}`}>{p.rank}</span>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
                                                <div className="text-xs text-slate-400">{p.totalQty} sold · {p.stock} left</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-green-600 shrink-0 ml-2">
                                            ₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link href="/seller/analytics" className="mt-4 block text-xs text-violet-600 hover:underline font-medium">View full analytics →</Link>
                        </div>
                    )}

                    {/* Top Categories */}
                    {stats.topCategories?.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
                                <Tag className="w-4 h-4 text-orange-500" /> Sales by Category
                            </h3>
                            <div className="space-y-3">
                                {stats.topCategories.slice(0, 4).map((c: any, i: number) => (
                                    <div key={c.name} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold w-6 h-6 shrink-0 flex items-center justify-center rounded-full ${medal(i + 1)}`}>{i + 1}</span>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                                                <div className="text-xs text-slate-400">{c.totalQty} units</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-orange-600">
                                            ₹{c.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-violet-600" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/seller/products/add" className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-slate-600 hover:text-violet-700 font-medium group">
                            <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Add Product
                        </Link>
                        <Link href="/seller/category-request" className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-slate-600 hover:text-indigo-700 font-medium group">
                            <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Request Category
                        </Link>
                        <Link href="/seller/analytics" className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all text-slate-600 hover:text-green-700 font-medium group">
                            <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            My Analytics
                        </Link>
                        <Link href="/seller/orders" className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-slate-600 hover:text-purple-700 font-medium group">
                            <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            My Orders
                        </Link>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" /> Platform Guidelines
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-amber-800 text-sm">Product Approval</h4>
                                <p className="text-amber-700 text-xs mt-1">All new products require admin approval before appearing in the store.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-3 bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-emerald-800 text-sm">Quality Standards</h4>
                                <p className="text-emerald-700 text-xs mt-1">Ensure product images are high quality and descriptions are accurate.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
