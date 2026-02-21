'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PlusCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function SellerRequestsPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        type: 'new_category',
        title: '',
        description: '',
        category: ''
    });

    useEffect(() => {
        if (user) fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        if (!user) return;
        try {
            const res = await fetch('http://localhost:5001/api/requests', {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.reverse()); // Newest first
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const res = await fetch('http://localhost:5001/api/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowForm(false);
                setFormData({ type: 'new_category', title: '', description: '', category: '' });
                fetchRequests();
            } else {
                alert('Failed to submit request');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'text-green-600 bg-green-50 border-green-200';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle size={18} />;
            case 'rejected': return <XCircle size={18} />;
            default: return <Clock size={18} />;
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">My Requests</h1>
                    <p className="text-gray-500">Track status of your category and product approvals</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-[#059669] text-white px-4 py-2 rounded-lg hover:bg-[#047857] transition-colors shadow-sm"
                >
                    <PlusCircle size={20} />
                    New Request
                </button>
            </div>

            {showForm && (
                <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-4">Submit New Request</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="new_category">New Category</option>
                                    <option value="product_approval">Product Approval</option>
                                    <option value="other">Other Inquiry</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title / Subject</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded-md"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Request for Gaming Laptops Category"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                required
                                className="w-full p-2 border rounded-md min-h-[100px]"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Provide details about your request..."
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[#059669] text-white rounded-md hover:bg-[#047857]"
                            >
                                Submit Request
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading requests...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Clock className="text-gray-400" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
                    <p className="text-gray-500 mt-1">Submit a new request to get started</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-lg text-gray-800">{req.title}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 border ${getStatusColor(req.status)}`}>
                                            {getStatusIcon(req.status)}
                                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded border">
                                            {req.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-3">{req.description}</p>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        <span>Submitted on {new Date(req.createdAt).toLocaleDateString()}</span>
                                        {req.updates.length > 0 && (
                                            <span className="text-gray-300">•</span>
                                        )}
                                        {req.updates.length > 0 && (
                                            <span className="text-[#059669]">Updated {new Date(req.updates[req.updates.length - 1].date).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>

                                {req.updates.length > 0 && (
                                    <div className="bg-gray-50 p-3 rounded-lg max-w-xs text-sm border border-gray-100">
                                        <p className="font-medium text-gray-700 text-xs mb-1 uppercase tracking-wide">Latest Update</p>
                                        <p className="text-gray-600">{req.updates[req.updates.length - 1].remark}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
