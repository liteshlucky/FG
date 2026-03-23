'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Dumbbell, CreditCard, LogOut, DollarSign, Settings, BarChart3, TrendingUp, ClipboardCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';
import clsx from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/dashboard/members', icon: Users },
    { name: 'Staff', href: '/dashboard/staff', icon: Users },
    { name: 'Plans', href: '/dashboard/plans', icon: CreditCard },
    { name: 'PT Plans', href: '/dashboard/pt-plans', icon: Dumbbell },
    { 
        name: 'Finance', 
        icon: DollarSign,
        subItems: [
            { name: 'Transactions', href: '/dashboard/finance' },
            { name: 'Reports', href: '/dashboard/finance/reports' },
        ]
    },
    { 
        name: 'Attendance',  
        icon: ClipboardCheck,
        subItems: [
            { name: 'Management', href: '/dashboard/attendance' },
            { name: 'Scanner', href: '/dashboard/attendance/qr-code' },
            { name: 'History', href: '/dashboard/attendance/history' },
            { name: 'Reports', href: '/dashboard/attendance/reports' },
        ]
    },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Advanced Analytics', href: '/dashboard/analytics/advanced', icon: TrendingUp },
    { name: 'Discounts', href: '/dashboard/discounts', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

    export default function Sidebar() {
    const pathname = usePathname();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        'Attendance': pathname?.startsWith('/dashboard/attendance'),
        'Finance': pathname?.startsWith('/dashboard/finance')
    });

    const toggleMenu = (name: string) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 border-r border-slate-800 text-slate-100 shadow-xl z-20">
            <div className="flex h-16 items-center justify-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm p-4">
                <div className="relative h-10 w-full max-w-[150px]">
                    <Image
                        src="/logo.png"
                        alt="FitApp Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                {navigation.map((item) => {
                    const isActive = item.href ? pathname === item.href : false;
                    const hasSubItems = !!item.subItems && item.subItems.length > 0;
                    const isParentActive = hasSubItems && item.subItems!.some(sub => pathname === sub.href);
                    const isOpen = openMenus[item.name];

                    return (
                        <div key={item.name} className="flex flex-col">
                            {hasSubItems ? (
                                <button
                                    onClick={() => toggleMenu(item.name)}
                                    className={clsx(
                                        isParentActive
                                            ? 'bg-blue-600/5 text-blue-400'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                                        'group flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200'
                                    )}
                                >
                                    <div className="flex items-center">
                                        <item.icon
                                            className={clsx(
                                                isParentActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300',
                                                'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200'
                                            )}
                                            aria-hidden="true"
                                        />
                                        {item.name}
                                    </div>
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-500" />
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={item.href!}
                                    className={clsx(
                                        isActive
                                            ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:translate-x-1 transition-all duration-200',
                                        'group flex items-center px-3 py-2.5 text-sm font-medium rounded-r-md transition-all duration-200 my-0.5'
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-300',
                                            'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </Link>
                            )}

                            {hasSubItems && isOpen && (
                                <div className="mt-1 mb-2 space-y-1 bg-slate-800/20 rounded-lg p-1">
                                    {item.subItems!.map((subItem) => {
                                        const isSubActive = pathname === subItem.href;
                                        return (
                                            <Link
                                                key={subItem.name}
                                                href={subItem.href}
                                                className={clsx(
                                                    isSubActive
                                                        ? 'bg-blue-600/10 text-blue-400 font-semibold'
                                                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                                                    'block px-11 py-2 text-sm transition-colors duration-200 rounded-md'
                                                )}
                                            >
                                                {subItem.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
            <div className="border-t border-slate-800 p-4 bg-slate-900/50">
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="group flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
                >
                    <LogOut
                        className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-red-400 transition-colors duration-200"
                        aria-hidden="true"
                    />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
