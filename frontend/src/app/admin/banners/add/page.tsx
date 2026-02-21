'use client';

import { Suspense } from 'react';
import BannerForm from '@/components/admin/BannerForm';

export default function AddBannerPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <BannerForm />
        </Suspense>
    );
}
