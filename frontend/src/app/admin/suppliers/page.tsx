"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Trash2, Edit, Plus, CheckCircle, XCircle, Search } from "lucide-react";

interface Supplier {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    isTrusted: boolean;
    productCount: number;
}

export default function AdminSuppliers() {
    const { user } = useAuth();
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        isTrusted: false
    });

    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push("/login");
            return;
        }
        fetchSuppliers();
    }, [user]);

    const fetchSuppliers = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/admin/sellers', {
                headers: { 'x-user-id': user!.id }
            });
            const data = await res.json();
            setSuppliers(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Saving supplier...", formData); // Debug log

        const method = editingSupplier ? 'PUT' : 'POST';
        const url = editingSupplier
            ? `http://localhost:5001/api/admin/sellers/${editingSupplier.id}`
            : `http://localhost:5001/api/admin/sellers`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user!.id
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await fetchSuppliers();
                setShowModal(false);
                setEditingSupplier(null);
                setFormData({ name: "", email: "", phone: "", address: "", isTrusted: false });
            } else {
                const err = await res.json();
                console.error("Save failed:", err);
                alert("Failed to save supplier: " + (err.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Network error:", err);
            alert("Network error occurred while saving.");
        }
    };

    const startEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address,
            isTrusted: supplier.isTrusted
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`WARNING: Deleting supplier "${name}" will permenantly DELETE ALL THEIR PRODUCTS. Continue?`)) {
            try {
                const res = await fetch(`http://localhost:5001/api/admin/sellers/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-user-id': user!.id }
                });
                if (res.ok) fetchSuppliers();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Supplier Management</h1>
                <button
                    onClick={() => {
                        setEditingSupplier(null);
                        setFormData({ name: "", email: "", phone: "", address: "", isTrusted: false });
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={18} /> Add New Supplier
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <input
                    type="text"
                    placeholder="Search suppliers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded shadow overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Contact</th>
                                <th className="p-4 font-semibold">Address</th>
                                <th className="p-4 font-semibold text-center">Trusted</th>
                                <th className="p-4 font-semibold text-center">Products</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSuppliers.map((s) => (
                                <tr key={s.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="font-medium">{s.name}</div>
                                        <div className="text-xs text-gray-500">{s.id}</div>
                                    </td>
                                    <td className="p-4 py-2">
                                        <div className="text-sm">{s.email}</div>
                                        <div className="text-xs text-gray-500">{s.phone}</div>
                                    </td>
                                    <td className="p-4 text-sm max-w-[200px] truncate" title={s.address}>{s.address}</td>
                                    <td className="p-4 text-center">
                                        {s.isTrusted ? <CheckCircle className="inline w-5 h-5 text-green-500" /> : <XCircle className="inline w-5 h-5 text-gray-300" />}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                            {s.productCount}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => startEdit(s)}
                                            className="text-blue-600 hover:text-blue-800 mr-3"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s.id, s.name)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Delete Supplier & Products"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredSuppliers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">No suppliers found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</h2>
                        <form onSubmit={handleSave} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input type="text" required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input type="text" className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <textarea className="w-full border p-2 rounded" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            {/* Trusted - Yes/No Checkboxes */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Trusted Supplier</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded-full" // Use rounded-full to mimic radio look or keep square
                                            checked={formData.isTrusted === true}
                                            onChange={() => setFormData({ ...formData, isTrusted: true })}
                                        />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded-full"
                                            checked={formData.isTrusted === false}
                                            onChange={() => setFormData({ ...formData, isTrusted: false })}
                                        />
                                        <span className="text-sm">No</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
