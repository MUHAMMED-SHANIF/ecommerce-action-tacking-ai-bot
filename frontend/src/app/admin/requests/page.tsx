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

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchRequests();
        }
    }, [user]);

    useEffect(() => {
        filterAndSort();
    }, [requests, filterType, sortOrder, dateRange]);

    const fetchRequests = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/admin/unified-requests', {
                headers: { 'x-user-id': user!.id }
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
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredRequests(res);
    };

    const handleApprove = async (item: RequestItem) => {
        if (!confirm(`Approve this ${item.type}?`)) return;

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
                    'x-user-id': user!.id
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                // Remove from list
                setRequests(prev => prev.filter(r => r.id !== item.id));
                alert('Approved successfully');
            } else {
                alert('Failed to approve');
            }
        } catch (err) {
            console.error(err);
            alert('Error processing request');
        }
    };

    const handleReject = async (item: RequestItem) => {
        if (!confirm(`Reject/Delete this ${item.type}?`)) return;

        try {
            let url = '';
            let method = 'DELETE'; // Most rejects are deletes, except generic requests
            let body = null;

            switch (item.type) {
                case 'seller':
                    url = `http://localhost:5001/api/admin/sellers/${item.id}`;
                    break;
                case 'product':
                    url = `http://localhost:5001/api/admin/products/${item.id}`;
                    break;
                case 'category':
                    url = `http://localhost:5001/api/admin/categories/${item.id}`;
                    break;
                case 'general_request':
                    url = `http://localhost:5001/api/requests/${item.id}`;
                    method = 'PUT';
                    body = { status: 'rejected' };
                    break;
            }

            const options: any = {
                method,
                headers: {
                    'x-user-id': user!.id,
                    ...(body ? { 'Content-Type': 'application/json' } : {})
                }
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(url, options);

            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== item.id));
                alert('Rejected/Deleted successfully');
            } else {
                alert('Failed to reject');
            }
        } catch (err) {
            console.error(err);
            alert('Error processing request');
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            className="border rounded px-3 py-2 text-sm"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                        <span className="text-gray-500">-</span>
                        <input
                            type="date"
                            className="border rounded px-3 py-2 text-sm"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
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
                    <div className="p-8 text-center text-gray-500">No pending requests found.</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left p-4 w-16">Type</th>
                                <th className="text-left p-4">Request Details</th>
                                <th className="text-left p-4">Date</th>
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
                                        {new Date(item.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleApprove(item)}
                                            className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 mr-2 text-sm font-medium"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleReject(item)}
                                            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-sm font-medium"
                                        >
                                            Reject
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
