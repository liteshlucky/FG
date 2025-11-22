'use client';

import { useSession } from 'next-auth/react';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <div className="flex h-16 items-center justify-between bg-white px-6 shadow-sm">
            <div className="text-xl font-semibold text-gray-800">Dashboard</div>
            <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                    Welcome, <span className="font-medium text-gray-900">{session?.user?.name || 'User'}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {session?.user?.name?.[0] || 'U'}
                </div>
            </div>
        </div>
    );
}
