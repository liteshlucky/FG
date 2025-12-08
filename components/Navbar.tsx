'use client';

import { useSession } from 'next-auth/react';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <div className="flex h-16 items-center justify-between bg-slate-900/80 px-6 shadow-sm backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
            <div className="text-xl font-semibold text-slate-100">Dashboard</div>
            <div className="flex items-center space-x-4">
                <div className="text-sm text-slate-400">
                    Welcome, <span className="font-medium text-slate-200">{session?.user?.name || 'User'}</span>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 ring-2 ring-slate-800">
                    {session?.user?.name?.[0] || 'U'}
                </div>
            </div>
        </div>
    );
}
