'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const res = await fetch('http://localhost:5001/api/admin/users', {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                setError('');
            } else {
                const text = await res.text();
                setError('Failed to fetch users: ' + text);
                console.error("Fetch failed:", text);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError('An error occurred while fetching users');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}? This may delete data associated with their previous role.`)) return;

        if (!user) return;

        try {
            const res = await fetch(`http://localhost:5001/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                fetchUsers(); // Refresh
            } else {
                alert('Failed to update role');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will remove all their data (products, orders, etc.).')) return;

        if (!user) return;

        try {
            const res = await fetch(`http://localhost:5001/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user?.token}`
                }
            });

            if (res.ok) {
                // Optimistic update
                setUsers(users.filter(u => u.id !== userId));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete user');
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred while deleting');
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">User Management</h2>
            {loading && <p>Loading users...</p>}
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {!loading && !error && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'seller' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                            className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                        >
                                            <option value="user">User</option>
                                            <option value="seller">Seller</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
