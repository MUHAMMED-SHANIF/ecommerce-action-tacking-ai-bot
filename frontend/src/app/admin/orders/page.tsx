'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, TrendingUp, Users, Tag, IndianRupee, Package, Search, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function AdminOrdersPage() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Search/filter state
    const [searchMode, setSearchMode] = useState<'orders' | 'products' | 'sellers' | 'categories'>('orders');
    const [searchQuery, setSearchQuery] = useState('');

    // Detail modal
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedType, setSelectedType] = useState<string>('');

    // Order expand
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    useEffect(() => {
        if (user?.role === 'admin') fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/admin/orders`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredResults = useMemo(() => {
        if (!data) return [];
        const q = searchQuery.toLowerCase();

        if (searchMode === 'orders') {
            return (data.orders || []).filter((o: any) =>
                o.id.toLowerCase().includes(q) ||
                o.status?.toLowerCase().includes(q) ||
                o.items?.some((i: any) => i.name?.toLowerCase().includes(q))
            );
        }
        if (searchMode === 'products') {
            return (data.allProductStats || []).filter((p: any) =>
                p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
            );
        }
        if (searchMode === 'sellers') {
            return (data.allSellerStats || []).filter((s: any) =>
                s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
            );
        }
        if (searchMode === 'categories') {
            return (data.allCategoryStats || []).filter((c: any) =>
                c.name?.toLowerCase().includes(q)
            );
        }
        return [];
    }, [data, searchMode, searchQuery]);

    const statusColor = (s: string) => {
        const map: any = {
            pending: 'bg-yellow-100 text-yellow-700',
            shipped: 'bg-blue-100 text-blue-700',
            delivered: 'bg-green-100 text-green-700',
            cancelled: 'bg-red-100 text-red-700',
            accepted: 'bg-emerald-100 text-emerald-700',
        };
        return map[s?.toLowerCase()] || 'bg-gray-100 text-gray-600';
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading order analytics...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

    const { analytics } = data;

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders & Sales Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Full orders overview, top performers, and deep search.</p>
                </div>
                <button onClick={fetchData} className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full font-medium text-gray-700">
                    Refresh
                </button>
            </div>

            {/* TOP STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Orders', value: analytics.totalOrders, icon: <ShoppingBag className="text-blue-500" />, bg: 'bg-blue-50' },
                    { label: 'Total Revenue', value: `₹${analytics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <IndianRupee className="text-green-500" />, bg: 'bg-green-50' },
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

            {/* TOP 3 LEADERBOARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-green-500" /> Top Selling Products</h2>
                    <div className="space-y-3">
                        {analytics.topProducts.slice(0, 5).map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${p.rank === 1 ? 'bg-[#F59E0B] text-white' : p.rank === 2 ? 'bg-gray-300 text-gray-700' : p.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{p.rank}</span>
                                    <div>
                                        <div className="text-sm font-medium text-gray-800 line-clamp-1">{p.name}</div>
                                        <div className="text-xs text-gray-400">{p.category}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-green-600">₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-gray-400">{p.totalQty} sold</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Sellers */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Users className="w-4 h-4 text-purple-500" /> Top Sellers</h2>
                    <div className="space-y-3">
                        {analytics.topSellers.slice(0, 5).map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${s.rank === 1 ? 'bg-[#F59E0B] text-white' : s.rank === 2 ? 'bg-gray-300 text-gray-700' : s.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.rank}</span>
                                    <div>
                                        <div className="text-sm font-medium text-gray-800 line-clamp-1">{s.name}</div>
                                        <div className="text-xs text-gray-400">{s.totalProducts} products</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-purple-600">₹{s.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-gray-400">{s.totalQty} sold</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white rounded-xl shadow-sm border p-5">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><Tag className="w-4 h-4 text-orange-500" /> Top Categories</h2>
                    <div className="space-y-3">
                        {analytics.topCategories.slice(0, 5).map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${c.rank === 1 ? 'bg-[#F59E0B] text-white' : c.rank === 2 ? 'bg-gray-300 text-gray-700' : c.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{c.rank}</span>
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">{c.name}</div>
                                        <div className="text-xs text-gray-400">{c.totalQty} units sold</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-orange-600">₹{c.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    <div className="text-xs text-gray-400">{c.products?.length} products</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SEARCH & FILTER SECTION */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-4">Search & Filter</h2>
                {/* Mode Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {(['orders', 'products', 'sellers', 'categories'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => { setSearchMode(mode); setSearchQuery(''); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${searchMode === mode ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
                {/* Search Box */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                        placeholder={`Search ${searchMode}...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>}
                </div>

                {/* Results */}
                {searchMode === 'orders' && (
                    <div className="space-y-3">
                        {filteredResults.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No orders found.</p>}
                        {filteredResults.map((order: any) => (
                            <div key={order.id} className="border rounded-lg overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                >
                                    <div>
                                        <div className="font-mono text-xs text-gray-400 mb-1">#{order.id.slice(0, 8)}...</div>
                                        <div className="font-semibold text-gray-800">₹{parseFloat(order.totalPrice).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                        <div className="text-xs text-gray-500">{order.itemCount} item(s) · {new Date(order.createdAt).toLocaleDateString()}</div>
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
                                                    <th className="text-right pb-2">Seller Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items.map((item: any, i: number) => (
                                                    <tr key={i} className="border-b last:border-0">
                                                        <td className="py-2 text-gray-800">{item.name || 'Unknown Product'}</td>
                                                        <td className="py-2 text-right text-gray-600">{item.qty}</td>
                                                        <td className="py-2 text-right text-gray-800 font-medium">₹{(item.price * item.qty).toLocaleString('en-IN')}</td>
                                                        <td className="py-2 text-right">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${statusColor(item.sellerStatus || 'pending')}`}>{item.sellerStatus || 'pending'}</span>
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
                )}

                {searchMode === 'products' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-gray-500 text-xs">
                                    <th className="text-left p-3 font-medium">Rank</th>
                                    <th className="text-left p-3 font-medium">Product</th>
                                    <th className="text-left p-3 font-medium">Category</th>
                                    <th className="text-right p-3 font-medium">Price</th>
                                    <th className="text-right p-3 font-medium">Stock</th>
                                    <th className="text-right p-3 font-medium">Units Sold</th>
                                    <th className="text-right p-3 font-medium">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((p: any) => (
                                    <tr key={p.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedItem(p); setSelectedType('product'); }}>
                                        <td className="p-3">
                                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${p.rank === 1 ? 'bg-[#F59E0B] text-white' : p.rank === 2 ? 'bg-gray-300 text-gray-600' : p.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{p.rank}</span>
                                        </td>
                                        <td className="p-3 font-medium text-gray-800">{p.name}</td>
                                        <td className="p-3 text-gray-500">{p.category}</td>
                                        <td className="p-3 text-right text-gray-700">₹{parseFloat(p.price).toLocaleString('en-IN')}</td>
                                        <td className="p-3 text-right text-gray-700">{p.stock}</td>
                                        <td className="p-3 text-right font-bold text-blue-600">{p.totalQty}</td>
                                        <td className="p-3 text-right font-bold text-green-600">₹{p.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredResults.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No products found.</p>}
                    </div>
                )}

                {searchMode === 'sellers' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-gray-500 text-xs">
                                    <th className="text-left p-3 font-medium">Rank</th>
                                    <th className="text-left p-3 font-medium">Seller</th>
                                    <th className="text-right p-3 font-medium">Products</th>
                                    <th className="text-right p-3 font-medium">Categories</th>
                                    <th className="text-left p-3 font-medium">Top Product</th>
                                    <th className="text-right p-3 font-medium">Units Sold</th>
                                    <th className="text-right p-3 font-medium">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((s: any) => (
                                    <tr key={s.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedItem(s); setSelectedType('seller'); }}>
                                        <td className="p-3">
                                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${s.rank === 1 ? 'bg-[#F59E0B] text-white' : s.rank === 2 ? 'bg-gray-300 text-gray-600' : s.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.rank}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-gray-800">{s.name}</div>
                                            <div className="text-xs text-gray-400">{s.email}</div>
                                        </td>
                                        <td className="p-3 text-right text-gray-700">{s.totalProducts}</td>
                                        <td className="p-3 text-right text-gray-700">{s.totalCategories}</td>
                                        <td className="p-3 text-gray-600 max-w-[150px] truncate">{s.topProduct || '—'}</td>
                                        <td className="p-3 text-right font-bold text-blue-600">{s.totalQty}</td>
                                        <td className="p-3 text-right font-bold text-purple-600">₹{s.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredResults.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No sellers found.</p>}
                    </div>
                )}

                {searchMode === 'categories' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr className="text-gray-500 text-xs">
                                    <th className="text-left p-3 font-medium">Rank</th>
                                    <th className="text-left p-3 font-medium">Category</th>
                                    <th className="text-left p-3 font-medium">Top Products</th>
                                    <th className="text-right p-3 font-medium">Units Sold</th>
                                    <th className="text-right p-3 font-medium">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((c: any) => (
                                    <tr key={c.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedItem(c); setSelectedType('category'); }}>
                                        <td className="p-3">
                                            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${c.rank === 1 ? 'bg-[#F59E0B] text-white' : c.rank === 2 ? 'bg-gray-300 text-gray-600' : c.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{c.rank}</span>
                                        </td>
                                        <td className="p-3 font-medium text-gray-800">{c.name}</td>
                                        <td className="p-3 text-gray-500 text-xs">{c.products?.join(', ')}</td>
                                        <td className="p-3 text-right font-bold text-blue-600">{c.totalQty}</td>
                                        <td className="p-3 text-right font-bold text-orange-600">₹{c.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredResults.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No categories found.</p>}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 border-b pb-4">
                            <h3 className="text-lg font-bold text-gray-900 capitalize">{selectedType} Details</h3>
                            <button onClick={() => setSelectedItem(null)}><X className="w-5 h-5 text-gray-500 hover:text-gray-800" /></button>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(selectedItem).filter(([k]) => !['id', 'categoryId', 'topProductQty'].includes(k)).map(([key, value]: any) => (
                                <div key={key} className="flex justify-between items-start border-b pb-2 last:border-0">
                                    <span className="text-sm text-gray-500 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="text-sm text-gray-900 font-semibold text-right max-w-[60%]">
                                        {Array.isArray(value) ? value.join(', ') : typeof value === 'number' && key.toLowerCase().includes('revenue')
                                            ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                                            : String(value ?? '—')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
