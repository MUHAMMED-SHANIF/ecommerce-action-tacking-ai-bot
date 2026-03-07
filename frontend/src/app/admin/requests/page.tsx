'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Check, X, Filter, User, Package, Folder, FileText } from 'lucide-react';

interface RequestItem {
    id: string;
    type: 'seller' | 'product' | 'category' | 'general_request';
    title: string;
    subtitle: string;
    date: string;
    data: any;
}

export default function AdminRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<RequestItem[]>([]);
    const [filterType, setFilterType] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    // Toast state
    const [toastMsg, setToastMsg] = useState<string>('');

    // Reject Modal state
    const [rejectItem, setRejectItem] = useState<RequestItem | null>(null);
    const [rejectRemark, setRejectRemark] = useState('');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchRequests();
        }
    }, [user, showHistory]);

    useEffect(() => {
        filterAndSort();
    }, [requests, filterType, sortOrder, dateRange]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:5001/api/admin/unified-requests?history=${showHistory}`, {
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

        // Filter by Type
        if (filterType !== 'all') {
            res = res.filter(r => r.type === filterType);
        }

        // Filter by Date Range
        if (dateRange.start) {
            res = res.filter(r => new Date(r.date) >= new Date(dateRange.start));
        }
        if (dateRange.end) {
            // Include the end date fully
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            res = res.filter(r => new Date(r.date) <= endDate);
        }

        // Sort
        res.sort((a, b) => {
            let dateA = new Date(a.date).getTime();
            let dateB = new Date(b.date).getTime();
            if (isNaN(dateA)) dateA = Number(a.date) || 0;
            if (isNaN(dateB)) dateB = Number(b.date) || 0;
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredRequests(res);
    };

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 1000);
    };

    const handleApprove = async (item: RequestItem) => {
        try {
            let url = '';
            let method = 'PUT';
            let body = {};

            switch (item.type) {
                case 'seller':
                    url = `http://localhost:5001/api/admin/sellers/${item.id}`;
                    body = { isTrusted: true }; // Assuming we update this field
                    break;
                case 'product':
                    url = `http://localhost:5001/api/admin/products/${item.id}/approve`;
                    break;
                case 'category':
                    url = `http://localhost:5001/api/admin/categories/${item.id}/approve`;
                    break;
                case 'general_request':
                    url = `http://localhost:5001/api/requests/${item.id}`;
                    body = { status: 'approved' };
                    break;
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                // Remove from list if not history, if history, maybe update status? 
                // Best is just re-fetch or remove from pending list
                if (!showHistory) {
                    setRequests(prev => prev.filter(r => r.id !== item.id));
                } else {
                    fetchRequests();
                }
                showToast(`Approved successfully`);
            } else {
                showToast('Failed to approve');
            }
        } catch (err) {
            console.error(err);
            showToast('Error processing request');
        }
    };

    const openRejectModal = (item: RequestItem) => {
        setRejectItem(item);
        setRejectRemark('');
    };

    const submitReject = async () => {
        if (!rejectItem) return;
        const item = rejectItem;

        try {
            let url = '';
            let method = 'PUT'; // Use PUT for reviews so we can attach remarks
            let body: any = { status: 'rejected', adminRemark: rejectRemark || 'Rejected by Admin' };

            switch (item.type) {
                case 'seller':
                    url = `http://localhost:5001/api/admin/sellers/${item.id}`;
                    body = { isTrusted: false, rejected: true, remark: rejectRemark }; // Needs backend support, or fallback
                    break;
                case 'product':
                    url = `http://localhost:5001/api/admin/products/${item.id}/review`;
                    break;
                case 'category':
                    url = `http://localhost:5001/api/admin/categories/${item.id}/review`;
                    break;
                case 'general_request':
                    url = `http://localhost:5001/api/requests/${item.id}`;
                    break;
            }

            const options: any = {
                method,
                headers: {
                    'Authorization': `Bearer ${user?.token}`,
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                }
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(url, options);

            if (res.ok) {
                if (!showHistory) {
                    setRequests(prev => prev.filter(r => r.id !== item.id));
                } else {
                    fetchRequests();
                }
                showToast('Rejected successfully');
            } else {
                showToast('Failed to reject');
            }
        } catch (err) {
            console.error(err);
            showToast('Error processing request');
        } finally {
            setRejectItem(null);
        }
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
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-4">
                Approval Requests
                <button
                    onClick={fetchRequests}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full flex items-center gap-2"
                >
                    Refesh
                </button>
            </h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
                    <div className="flex bg-gray-100 rounded p-1">
                        <button
                            onClick={() => setShowHistory(false)}
                            className={`px-4 py-2 rounded text-sm ${!showHistory ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setShowHistory(true)}
                            className={`px-4 py-2 rounded text-sm ${showHistory ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
                    <div className="flex bg-gray-100 rounded p-1">
                        {['all', 'seller', 'product', 'category', 'general_request'].map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-4 py-2 rounded text-sm capitalize ${filterType === t ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                {t.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="ml-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <select
                        className="border rounded px-3 py-2 text-sm"
                        value={sortOrder}
                        onChange={(e: any) => setSortOrder(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded shadow text-black">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading requests...</div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">{showHistory ? "No history found." : "No pending requests found."}</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-4 w-16">Type</th>
                                <th className="text-left p-4">Request Details</th>
                                <th className="text-left p-4">Date & Status</th>
                                <th className="text-right p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map(item => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="p-2 bg-gray-50 rounded-full w-fit">
                                            {getTypeIcon(item.type)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-900">{item.title}</div>
                                        <div className="text-sm text-gray-500">{item.subtitle}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        <div className="font-medium">{new Date(item.date).toLocaleDateString()}</div>
                                        {showHistory && (() => {
                                            const status = (item as any).status || item.data?.metadata?.status || item.data?.status || (item.type === 'seller' && item.data?.isTrusted ? 'approved' : 'rejected');
                                            const badgeColor = status === 'approved' ? 'bg-green-100 text-green-700' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                                            const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
                                            return (
                                                <div className={`mt-1 text-xs font-semibold px-2 py-0.5 rounded inline-block ${badgeColor}`}>
                                                    {displayStatus}
                                                </div>
                                            );
                                        })()}
                                        {showHistory && (item as any).remark && (
                                            <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate" title={(item as any).remark}>
                                                Remark: {(item as any).remark}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {!showHistory && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(item)}
                                                    className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 mr-2 text-sm font-medium"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => openRejectModal(item)}
                                                    className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm font-medium"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {/* Reject Modal */}
            {rejectItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded p-6 shadow-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Reject Request</h3>
                        <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                            <span>You are rejecting:</span>
                            <span className="font-semibold">{rejectItem.title}</span>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection (Visible to Seller)</label>
                            <textarea
                                className="w-full border rounded p-2 text-sm text-black"
                                rows={3}
                                value={rejectRemark}
                                onChange={e => setRejectRemark(e.target.value)}
                                placeholder="E.g. Image quality is too low..."
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setRejectItem(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={submitReject} className="bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 rounded shadow">Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMsg && (
                <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded shadow-lg text-sm font-medium animate-fade-in-up z-50 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    {toastMsg}
                </div>
            )}
        </div>
    );
}
