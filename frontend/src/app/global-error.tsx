'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Critical Error</h2>
                        <p className="text-gray-600 mb-6">
                            A critical system error occurred. We recommend restarting the application.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go to Home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
