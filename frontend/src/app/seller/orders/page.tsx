"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";

export default function SellerOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            const userStr = localStorage.getItem("user");
            if (!userStr) return;
            const user = JSON.parse(userStr);

            try {
                const res = await fetch("http://localhost:5001/api/seller/orders", {
                    headers: { 'Authorization': `Bearer ${user?.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Sort by newest
                    data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setOrders(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const handleStatusUpdate = async (orderId: string, productId: string, status: string) => {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;
        const user = JSON.parse(userStr);

        try {
            const res = await fetch(`http://localhost:5001/api/seller/orders/${orderId}/items/${productId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                const data = await res.json();

                // Update local state to reflect changes instantly without re-fetching
                setOrders(prevOrders => prevOrders.map(order => {
                    if (order.id === orderId) {
                        return {
                            ...order,
                            status: data.overallOrderStatus, // Update overall status if API changed it
                            orderItems: order.orderItems.map((item: any) => {
                                if (item.id === productId) {
                                    return { ...item, seller_status: status };
                                }
                                return item;
                            })
                        };
                    }
                    return order;
                }));
            } else {
                alert("Failed to update status");
            }
        } catch (err) {
            console.error("Error updating status", err);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Processing': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Shipped': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    if (loading) return <div className="p-8 text-center">Loading orders...</div>;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
                <p className="text-slate-500">Track orders containing your products</p>
            </div>

            <div className="space-y-4">
                {orders.length > 0 ? (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-bold text-slate-800">Order #{order.id}</h3>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-600">Total Amount</p>
                                    <p className="text-lg font-bold text-slate-800">₹{order.totalPrice.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {order.orderItems.map((item: any) => (
                                    <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                                {item.image ? (
                                                    <img src={item.image.startsWith('http') ? item.image : `http://localhost:5001${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-full h-full p-3 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-slate-800 line-clamp-1">{item.name}</h4>
                                                <p className="text-xs text-slate-500">Qty: {item.qty} × ₹{item.price.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {order.status.toLowerCase() === 'cancelled' ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500">
                                                    Order Cancelled
                                                </span>
                                            ) : item.seller_status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(order.id, item.id, 'accepted')}
                                                        className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors">
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(order.id, item.id, 'rejected')}
                                                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors">
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${item.seller_status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {item.seller_status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                                <div className="text-xs text-slate-500">
                                    <span className="font-medium text-slate-700">Shipping to:</span> {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}
                                </div>
                                {/* <button className="text-sm font-medium text-violet-600 hover:text-violet-700">
                                    View Details
                                </button> */}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800">No Orders Yet</h3>
                        <p className="text-slate-500 mt-2">Orders containing your products will appear here.</p>
                    </div>
                )}
            </div>
        </div >
    );
}
