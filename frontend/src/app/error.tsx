'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        console.error(error);
    }, [error]);

    const handleLogoutAndHome = () => {
        // Clear potential bad state
        localStorage.removeItem('user');
        // Redirect to home
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
                <p className="text-gray-600 mb-6">
                    We encountered an unexpected error. You can try to recover or return to the home page.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={
                            // Attempt to recover by trying to re-render the segment
                            () => reset()
                        }
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try again
                    </button>
                    <button
                        onClick={handleLogoutAndHome}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Log out & Go Home
                    </button>
                </div>
                {error.digest && (
                    <p className="mt-6 text-xs text-gray-400">Error ID: {error.digest}</p>
                )}
            </div>
        </div>
    );
}
