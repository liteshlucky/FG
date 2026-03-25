'use client';

import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

interface NavbarProps {
    onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    const { data: session } = useSession();

    return (
        <div className="flex h-16 items-center justify-between bg-slate-900/80 px-4 sm:px-6 shadow-sm backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
            {/* Hamburger — mobile only */}
            <button
                onClick={onMenuClick}
                className="lg:hidden mr-3 rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                aria-label="Open sidebar"
            >
                <Menu className="h-6 w-6" />
            </button>

            <div className="text-lg sm:text-xl font-semibold text-slate-100 truncate">Dashboard</div>

            <div className="flex items-center space-x-3 sm:space-x-6">
                <NotificationDropdown />
                <div className="hidden sm:flex items-center space-x-3 border-l border-slate-700 pl-6">
                    <div className="text-sm text-slate-400 text-right">
                        <div className="font-medium text-slate-200 max-w-[120px] truncate">{session?.user?.name || 'User'}</div>
                    </div>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 ring-2 ring-slate-800 flex-shrink-0">
                    {session?.user?.name?.[0] || 'U'}
                </div>
            </div>
        </div>
    );
}
