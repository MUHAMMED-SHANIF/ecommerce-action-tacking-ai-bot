'use client';

import ProductForm from '@/components/admin/ProductForm';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditProductPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);

    useEffect(() => {
        if (id) {
            fetch(`http://localhost:5001/api/products/${id}`)
                .then(res => res.json())
                .then(data => setProduct(data))
                .catch(err => console.error(err));
        }
    }, [id]);

    if (!product) return <div>Loading...</div>;

    return (
        <div>
            <ProductForm initialData={product} isEdit={true} />
        </div>
    );
}
