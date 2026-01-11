'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="p-8 text-center text-red-600">
            <h2 className="text-xl font-bold mb-4">Product Page Error</h2>
            <p className="mb-4 bg-red-50 p-4 rounded text-left font-mono text-sm border border-red-200">
                {error.message}
            </p>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Try again
            </button>
        </div>
    );
}
