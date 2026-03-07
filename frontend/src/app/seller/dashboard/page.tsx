'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag, Clock, TrendingUp, AlertCircle, CheckCircle, PlusCircle, Globe } from 'lucide-react';
import Link from 'next/link';

export default function SellerDashboard() {
    const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, pendingOrders: 0, requests: 0 });
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` };

            try {
                const [statsRes, reqRes] = await Promise.all([
                    fetch('http://localhost:5001/api/seller/stats', { headers }),
                    fetch('http://localhost:5001/api/requests', { headers })
                ]);

                if (statsRes.ok && reqRes.ok) {
                    const statsData = await statsRes.json();
                    const reqData = await reqRes.json();
                    setStats({
                        ...statsData,
                        requests: Array.isArray(reqData) ? reqData.length : 0
                    });
                }
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        {
            label: 'Total Products',
            value: stats.totalProducts,
            icon: Package,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            link: '/seller/products'
        },
        {
            label: 'Total Orders',
            value: stats.totalOrders,
            icon: ShoppingBag,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            link: '/seller/orders'
        },
        {
            label: 'My Requests',
            value: stats.requests || 0,
            icon: Clock,
            color: 'text-pink-600',
            bg: 'bg-pink-50',
            link: '/seller/requests'
        },
        {
            label: 'Pending Orders',
            value: stats.pendingOrders,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            link: '/seller/orders'
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
                <p className="text-slate-500">Welcome back to your seller command center</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Link href={stat.link} key={i}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                                        <Icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full group-hover:bg-slate-100 transition-colors">
                                        View Details
                                    </span>
                                </div>
                                <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide">{stat.label}</h3>
                                <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                            </div>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-violet-600" />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/seller/products/add" className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all text-slate-600 hover:text-violet-700 font-medium group">
                            <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Add New Product
                        </Link>
                        <Link href="/seller/category-request" className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-slate-600 hover:text-indigo-700 font-medium group">
                            <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            Request Category
                        </Link>
                    </div>
                </div>

                {/* Status Guide */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        Platform Guidelines
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-4 p-3 bg-amber-50 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-amber-800 text-sm">Product Approval</h4>
                                <p className="text-amber-700 text-xs mt-1">
                                    All new products require admin approval before appearing in the store. This usually takes 24-48 hours.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-3 bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-emerald-800 text-sm">Quality Standards</h4>
                                <p className="text-emerald-700 text-xs mt-1">
                                    Ensure your product images are high quality and descriptions are accurate to maintain your seller rating.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

