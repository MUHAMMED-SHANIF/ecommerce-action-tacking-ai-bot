"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Upload, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CategoryRequest() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userStr = localStorage.getItem("user");
            if (!userStr) throw new Error("Not authenticated");
            const user = JSON.parse(userStr);

            let imageUrl = "";
            if (imageFile) {
                const uploadData = new FormData();
                uploadData.append("image", imageFile);
                const uploadRes = await fetch("http://localhost:5001/api/upload", {
                    method: "POST",
                    body: uploadData
                });
                if (!uploadRes.ok) throw new Error("Image upload failed");
                const uploadJson = await uploadRes.json();
                imageUrl = "http://localhost:5001" + uploadJson.imageUrl;
            }

            const res = await fetch("http://localhost:5001/api/seller/category-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${user?.token}`
                },
                body: JSON.stringify({ name, image: imageUrl })
            });

            if (!res.ok) throw new Error("Failed to request category");

            alert("Category request submitted! Admin will review it shortly.");
            router.push("/seller/dashboard");

        } catch (err) {
            console.error(err);
            alert("Error submitting request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/seller/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Globe className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Request New Category</h1>
                        <p className="text-slate-500 text-sm">Suggest a category that isn't listed yet</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Category Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Smart Home Devices"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Representative Image</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                            {previewUrl ? (
                                <div className="relative w-full max-w-[200px] aspect-video rounded-lg overflow-hidden border border-slate-200">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPreviewUrl(null);
                                            setImageFile(null);
                                        }}
                                        className="absolute top-2 right-2 bg-white/90 p-1 rounded-full shadow-sm hover:bg-red-50 text-slate-600 hover:text-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-slate-300 mb-4" />
                                    <p className="text-slate-600 font-medium">Upload Category Image</p>
                                    <p className="text-xs text-slate-400 mt-1">Optional but recommended</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? "Submitting Request..." : "Submit Request"}
                    </button>
                </form>
            </div>
        </div>
    );
}
