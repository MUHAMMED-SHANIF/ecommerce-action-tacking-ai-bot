"use client";

import { useState, useEffect } from "react";
import { Package } from "lucide-react";

interface Order {
    id: string;
    orderItems: any[];
    shippingAddress?: any;
    totalPrice: number;
    status: string;
    createdAt: string;
}

interface RecentOrdersProps {
    user: any;
    apiBase: string;
}

export default function RecentOrders({ user, apiBase }: RecentOrdersProps) {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (user) {
            fetch(`${apiBase}/orders/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setOrders(data);
                })
                .catch(err => console.error("Failed to fetch orders", err));
        }
    }, [user, apiBase]);

    const handleCancel = async (orderId: string) => {
        if (!confirm("Are you sure you want to cancel this order?")) return;
        try {
            const res = await fetch(`${apiBase}/orders/${orderId}/cancel`, { method: 'PUT' });
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
            }
        } catch (err) {
            console.error("Failed to cancel order", err);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Recent Orders
                </h2>
            </div>
            {orders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No recent orders found.</div>
            ) : (
                <div className="space-y-6">
                    {orders.map(order => (
                        <div key={order.id} className="border border-slate-200 p-5 rounded-lg flex flex-col gap-4 bg-slate-50">
                            <div className="flex justify-between items-start border-b pb-3 border-slate-200">
                                <div>
                                    <p className="font-bold text-slate-800">Order #{order.id.slice(0, 8)}</p>
                                    <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-emerald-600">₹{order.totalPrice}</p>
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full capitalize">{order.status}</span>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Items</h4>
                                    <ul className="space-y-2">
                                        {order.orderItems?.map((item: any, idx: number) => (
                                            <li key={idx} className="flex justify-between text-sm text-slate-600 items-center">
                                                <div className="flex items-center gap-2">
                                                    {item.image ? <img src={item.image.startsWith('http') ? item.image : `http://localhost:5001${item.image}`} className="w-8 h-8 rounded object-cover" /> : null}
                                                    <span>{item.qty}x {item.name}</span>
                                                </div>
                                                <span>₹{item.price}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {order.shippingAddress && (
                                    <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2">Shipping Address</h4>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            {order.shippingAddress.name}<br />
                                            {order.shippingAddress.street}<br />
                                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
                                            {order.shippingAddress.country}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <div className="pt-3 border-t border-slate-200 flex justify-end">
                                    <button
                                        onClick={() => handleCancel(order.id)}
                                        className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-md transition-colors">
                                        Cancel Order
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
