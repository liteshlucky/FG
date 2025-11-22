'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Dumbbell, CreditCard, LogOut, DollarSign } from 'lucide-react';
import { signOut } from 'next-auth/react';
import clsx from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/dashboard/members', icon: Users },
    { name: 'Trainers', href: '/dashboard/trainers', icon: Dumbbell },
    { name: 'Plans', href: '/dashboard/plans', icon: CreditCard },
    { name: 'PT Plans', href: '/dashboard/pt-plans', icon: Dumbbell },
    { name: 'Payments', href: '/dashboard/payments', icon: DollarSign },
    { name: 'Discounts', href: '/dashboard/discounts', icon: CreditCard },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
            <div className="flex h-16 items-center justify-center border-b border-gray-800">
                <h1 className="text-2xl font-bold text-blue-500">FitApp</h1>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                isActive
                                    ? 'bg-gray-800 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                                'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-white',
                                    'mr-3 h-6 w-6 flex-shrink-0'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-gray-800 p-4">
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                    <LogOut
                        className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-white"
                        aria-hidden="true"
                    />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
