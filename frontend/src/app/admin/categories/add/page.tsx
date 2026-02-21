'use client';

import { Suspense } from 'react';
import CategoryForm from '@/components/admin/CategoryForm';

export default function AddCategoryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CategoryForm />
        </Suspense>
    );
}
