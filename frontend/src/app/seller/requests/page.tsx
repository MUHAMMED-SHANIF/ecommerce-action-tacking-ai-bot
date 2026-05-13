'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { Filter, Package, Folder, FileText } from 'lucide-react';

interface RequestItem {
    id: string;
    type: 'seller' | 'product' | 'category';
    title: string;
    subtitle: string;
    date: string;
    data: any;
}

export default function SellerRequestsPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<RequestItem[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('pending');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [loading, setLoading] = useState(true);

    // Read URL params set by AI navigation
    useEffect(() => {
        const urlType = searchParams.get('filter_type');
        const urlStatus = searchParams.get('filter_status');
        if (urlType && ['all', 'product', 'category'].includes(urlType)) setFilterType(urlType);
        if (urlStatus && ['all', 'pending', 'approved', 'rejected'].includes(urlStatus)) setFilterStatus(urlStatus);
    }, [searchParams]);

    useEffect(() => {
        if (user?.role === 'seller') fetchRequests();
    }, [user]);

    useEffect(() => {
        filterAndSort();
    }, [requests, filterType, filterStatus, sortOrder]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            // Always fetch all, filter client-side for snappy UX
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/seller/unified-requests?history=true`, {
                headers: { 'Authorization': `Bearer ${user?.token}` },
                cache: 'no-store'
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                // Filter out general_request type
                setRequests(data.filter((r: any) => r.type !== 'general_request'));
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    const filterAndSort = () => {
        let res = [...requests];

        // Filter by type
        if (filterType !== 'all') {
            res = res.filter(r => r.type === filterType);
        }

        // Filter by status
        if (filterStatus !== 'all') {
            res = res.filter(r => {
                const status = (r as any).status || r.data?.metadata?.status || r.data?.status || 'pending';
                if (filterStatus === 'pending') return status === 'pending';
                if (filterStatus === 'approved') return status === 'approved' || r.data?.isTrusted === true;
                if (filterStatus === 'rejected') return status === 'rejected' || r.data?.isTrusted === false;
                return true;
            });
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
            case 'product': return <Package className="text-green-500 w-5 h-5" />;
            case 'category': return <Folder className="text-orange-500 w-5 h-5" />;
            default: return <FileText className="text-gray-500 w-5 h-5" />;
        }
    };

    const typeOptions = ['all', 'product', 'category'];
    const statusOptions = ['all', 'pending', 'approved', 'rejected'];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">My Requests</h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                {/* Type Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</label>
                    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                        {typeOptions.map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-4 py-1.5 rounded-md text-sm capitalize transition-all ${filterType === t ? 'bg-white shadow text-violet-700 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                        {statusOptions.map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-1.5 rounded-md text-sm capitalize transition-all ${filterStatus === s ? 'bg-white shadow font-semibold ' + (s === 'pending' ? 'text-amber-600' : s === 'approved' ? 'text-emerald-600' : s === 'rejected' ? 'text-red-600' : 'text-violet-700') : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sort */}
                <div className="ml-auto">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sort</label>
                    <select
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-violet-500 focus:border-violet-500 outline-none"
                        value={sortOrder}
                        onChange={(e: any) => setSortOrder(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* Count badge */}
            {!loading && (
                <p className="text-sm text-slate-500 mb-3">
                    Showing <span className="font-semibold text-slate-700">{filteredRequests.length}</span> request{filteredRequests.length !== 1 ? 's' : ''}
                    {filterType !== 'all' && ` · ${filterType}`}
                    {filterStatus !== 'all' && ` · ${filterStatus}`}
                </p>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Loading requests...</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <FileText className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-lg font-medium text-slate-600">No {filterStatus !== 'all' ? filterStatus : ''} {filterType !== 'all' ? filterType : ''} requests found.</p>
                        <p className="text-sm text-slate-400 mt-1">Try changing the filters above.</p>
                    </div>
                ) : (
                    <table className="w-full text-slate-800">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="text-left py-3 px-6 font-semibold w-16">Type</th>
                                <th className="text-left py-3 px-6 font-semibold">Details</th>
                                <th className="text-left py-3 px-6 font-semibold">Status & Date</th>
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
                                                Submitted on {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
