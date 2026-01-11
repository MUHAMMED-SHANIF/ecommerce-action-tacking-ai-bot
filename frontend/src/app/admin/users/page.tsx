'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        try {
            const res = await fetch('http://localhost:5001/api/admin/users', {
                headers: { 'x-user-id': user.id }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRoleUpdate = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (!confirm(`Change role to ${newRole}?`)) return;

        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const currentUser = JSON.parse(userStr);

        try {
            const res = await fetch(`http://localhost:5001/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser.id
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

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">User Management</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleRoleUpdate(user.id, user.role)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Toggle Role
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
