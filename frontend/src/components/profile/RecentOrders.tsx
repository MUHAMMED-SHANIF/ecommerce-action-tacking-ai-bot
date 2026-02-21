"use client";

import { useState, useEffect } from "react";
import { Package } from "lucide-react";

interface Order {
    id: string;
    orderItems: any[];
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
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="border border-slate-100 p-4 rounded-lg flex justify-between items-center group hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-bold text-slate-700 text-sm">Order #{order.id}</p>
                                <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full">{order.status}</span>
                            </div>
                            <div className="text-sm font-bold text-slate-800">
                                ₹{order.totalPrice}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
