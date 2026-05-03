'use client';

import ProductForm from '@/components/admin/ProductForm';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function SellerEditProductPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        if (id) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/products/${id}`)
                .then(res => res.json())
                .then(data => {
                    // Check if seller owns product
                    if (data.sellerId !== user.id && data.supplierId !== user.id) {
                        alert("You can only edit your own products");
                        router.push('/seller/products');
                        return;
                    }
                    setProduct(data);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [id, user, router]);

    if (loading || !product) return <div className="p-8 text-center text-slate-500">Loading product data...</div>;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    Edit Product
                    <span className="text-sm px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Edits will require re-approval
                    </span>
                </h1>
                <p className="text-slate-500">Update your product details. Once submitted, it will be reviewed by an admin.</p>
            </div>

            <ProductForm initialData={product} isEdit={true} />
        </div>
    );
}
