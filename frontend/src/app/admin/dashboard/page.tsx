'use client';

import { useEffect, useState } from 'react';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, products: 0, orders: 0 });

    useEffect(() => {
        // Fetch stats (Mocking simply by fetching lists size for now, optimization later)
        const fetchStats = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            const headers = { 'Content-Type': 'application/json', 'x-user-id': user.id };

            try {
                // Parallel fetch
                const [usersRes, productsRes] = await Promise.all([
                    fetch('http://localhost:5001/api/admin/users', { headers }),
                    fetch('http://localhost:5001/api/products')
                ]);

                const users = await usersRes.json();
                const products = await productsRes.json();
                // Orders API for all isn't implemented yet, just user specific. 
                // We'll skip orders stat or add endpoints later.

                setStats({
                    users: Array.isArray(users) ? users.length : 0,
                    products: Array.isArray(products) ? products.length : 0,
                    orders: 0
                });
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Users</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Products</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.products}</p>
                </div>
                {/* 
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Orders</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.orders}</p>
                </div>
                */}
            </div>

            <div className="mt-12">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Quick Actions</h3>
                </div>
                <div className="flex gap-4">
                    <a href="/admin/products/add" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        + Add New Product
                    </a>
                    <a href="/admin/banners" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                        Manage Banners
                    </a>
                </div>
            </div>
        </div>
    );
}
