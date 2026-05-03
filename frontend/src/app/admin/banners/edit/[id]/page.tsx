'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BannerForm from '@/components/admin/BannerForm';

function EditBannerContent() {
    const params = useParams();
    const id = params.id as string;
    const [banner, setBanner] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanner = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/banners`, { cache: 'no-store' });
                const data = await res.json();
                const found = data.banners.find((b: any) => b.id === id);
                if (found) setBanner(found);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchBanner();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!banner) return <div>Banner not found</div>;

    return <BannerForm initialData={banner} isEdit={true} />;
}

export default function EditBannerPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditBannerContent />
        </Suspense>
    );
}
