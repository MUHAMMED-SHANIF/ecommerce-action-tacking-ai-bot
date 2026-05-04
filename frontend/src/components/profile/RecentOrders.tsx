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
                                    <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider text-[11px]">Items in this Order</h4>
                                    <ul className="space-y-3">
                                        {order.orderItems?.map((item: any, idx: number) => (
                                            <li key={idx} className="flex justify-between text-sm text-slate-600 items-center border-b border-slate-100 pb-2 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    {item.image ? (
                                                        <div className="w-10 h-10 bg-white rounded border border-slate-200 p-1 flex-shrink-0">
                                                            <img 
                                                                src={item.image.startsWith('http') ? item.image : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}${item.image}`} 
                                                                className="w-full h-full object-contain" 
                                                                alt={item.name}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center flex-shrink-0">
                                                            <Package className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-800 line-clamp-1">{item.name}</span>
                                                        <span className="text-xs text-slate-500">Qty: {item.qty} × ₹{item.price?.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-slate-700">₹{(item.qty * item.price)?.toLocaleString()}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase">Order Total</span>
                                        <span className="text-lg font-black text-emerald-600">₹{order.totalPrice?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {order.shippingAddress && (
                                    <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
                                        <h4 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider text-[11px]">Shipping Address</h4>
                                        <div className="bg-white p-3 rounded border border-slate-100 text-xs text-slate-600 leading-relaxed shadow-sm">
                                            <p className="font-bold text-slate-800 mb-1">{order.shippingAddress.name}</p>
                                            <p>{order.shippingAddress.street || order.shippingAddress.addressLine}</p>
                                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zip || order.shippingAddress.postalCode || order.shippingAddress.pincode}</p>
                                            <p className="mt-1 font-medium text-slate-500">📞 {order.shippingAddress.mobile}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <div className="pt-3 border-t border-slate-200 flex justify-end">
                                    <button
                                        onClick={() => handleCancel(order.id)}
                                        className="text-xs font-bold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 px-4 py-2 rounded-md transition-all">
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
