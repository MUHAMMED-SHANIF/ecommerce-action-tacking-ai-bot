'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import CategoryForm from '@/components/admin/CategoryForm';

function EditCategoryContent() {
    const params = useParams();
    const id = params.id as string;
    const [category, setCategory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/admin/categories`);
                const data = await res.json();
                const found = data.find((c: any) => c.id === id);
                if (found) setCategory(found);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchCategory();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!category) return <div>Category not found</div>;

    return <CategoryForm initialData={category} isEdit={true} />;
}

export default function EditCategoryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditCategoryContent />
        </Suspense>
    );
}
