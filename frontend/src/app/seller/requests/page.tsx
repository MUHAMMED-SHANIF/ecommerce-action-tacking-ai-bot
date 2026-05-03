'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Filter, User, Package, Folder, FileText } from 'lucide-react';

interface RequestItem {
    id: string;
    type: 'seller' | 'product' | 'category' | 'general_request';
    title: string;
    subtitle: string;
    date: string;
    data: any;
}

export default function SellerRequestsPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<RequestItem[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (user?.role === 'seller') {
            fetchRequests();
        }
    }, [user, showHistory]);

    useEffect(() => {
        filterAndSort();
    }, [requests, filterType, sortOrder, dateRange]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/seller/unified-requests?history=${showHistory}`, {
                headers: { 'Authorization': `Bearer ${user?.token}` },
                cache: 'no-store'
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setRequests(data);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const filterAndSort = () => {
        let res = [...requests];

        if (filterType !== 'all') {
            res = res.filter(r => r.type === filterType);
        }

        if (dateRange.start) {
            res = res.filter(r => new Date(r.date) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            res = res.filter(r => new Date(r.date) <= endDate);
        }

        res.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredRequests(res);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'seller': return <User className="text-blue-500" />;
            case 'product': return <Package className="text-green-500" />;
            case 'category': return <Folder className="text-orange-500" />;
            default: return <FileText className="text-gray-500" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">My Requests</h1>

            <div className="bg-white p-4 rounded shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
                    <div className="flex bg-slate-100 rounded p-1">
                        <button
                            onClick={() => setShowHistory(false)}
                            className={`px-4 py-2 rounded text-sm transition-all ${!showHistory ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setShowHistory(true)}
                            className={`px-4 py-2 rounded text-sm transition-all ${showHistory ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
                    <div className="flex bg-slate-100 rounded p-1">
                        {['all', 'product', 'category', 'general_request'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-4 py-2 rounded text-sm capitalize transition-all ${filterType === t ? 'bg-white shadow text-violet-700 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ml-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <select
                        className="border-slate-200 rounded px-3 py-2 text-sm text-slate-700 focus:ring-violet-500 focus:border-violet-500"
                        value={sortOrder}
                        onChange={(e: any) => setSortOrder(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading requests...</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-600">{showHistory ? "No history found." : "No pending requests found."}</p>
                        <p className="text-sm text-slate-400 mt-1">Your requests will appear here once submitted.</p>
                    </div>
                ) : (
                    <table className="w-full text-slate-800">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                            <tr>
                                <th className="text-left py-4 px-6 font-medium w-16">Type</th>
                                <th className="text-left py-4 px-6 font-medium">Details</th>
                                <th className="text-left py-4 px-6 font-medium">Status & Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRequests.map(item => {
                                const status = (item as any).status || item.data?.metadata?.status || item.data?.status || 'pending';
                                const isRejected = status === 'rejected' || (item.type === 'seller' && item.data && !item.data.isTrusted);
                                const isApproved = status === 'approved' || (item.type === 'seller' && item.data?.isTrusted);
                                const badgeColor = isRejected ? 'bg-red-50 text-red-700 ring-red-200' : isApproved ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200';
                                const displayStatus = isRejected ? 'Rejected' : isApproved ? 'Approved' : 'Pending Review';

                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="p-2.5 bg-slate-100 rounded-lg w-fit">
                                                {getTypeIcon(item.type)}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-semibold text-slate-900 text-base">{item.title}</div>
                                            <div className="text-sm text-slate-500 mt-0.5">{item.subtitle}</div>
                                            {(item as any).remark && (
                                                <div className="mt-2 text-sm bg-red-50 text-red-800 border-l-4 border-red-500 p-2 rounded-r">
                                                    <span className="font-semibold block mb-0.5">Admin Remark:</span>
                                                    {(item as any).remark}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${badgeColor} mb-2`}>
                                                {displayStatus}
                                            </div>
                                            <div className="text-sm text-slate-500 block">
                                                Submitted on {new Date(item.date).toLocaleDateString()}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
