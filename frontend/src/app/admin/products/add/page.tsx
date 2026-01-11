'use client';

import { Suspense } from 'react';
import ProductForm from '@/components/admin/ProductForm';

export default function AddProductPage() {
    return (
        <Suspense fallback={<div>Loading form...</div>}>
            <ProductForm />
        </Suspense>
    );
}
