"use client";

import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="container mx-auto p-8 max-w-[1248px]">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-[#F59E0B]" />
                Settings
            </h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <p className="text-gray-600">Settings configuration will be available here.</p>
            </div>
        </div>
    );
}
