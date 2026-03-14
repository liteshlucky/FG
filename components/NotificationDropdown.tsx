'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import Link from 'next/link';

interface AppNotification {
    _id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    isRead: boolean;
    link?: string;
    createdAt: string;
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications();
        
        // Simple polling every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        
        // Close on outside click
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && notifications.length === 0) {
            fetchNotifications();
        }
    };

    const markAsRead = async (id: string) => {
        try {
            // Optimistic UI update
            setNotifications(prev => 
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            await fetch('/api/notifications/read-all', { method: 'PUT' });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5 text-emerald-400" />;
            case 'warning': return <AlertCircle className="h-5 w-5 text-amber-400" />;
            case 'error': return <AlertCircle className="h-5 w-5 text-rose-400" />;
            default: return <Info className="h-5 w-5 text-blue-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={handleToggle}
                className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-900 shadow-sm animate-in zoom-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 shadow-2xl ring-1 ring-slate-700 focus:outline-none z-50 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-800/50">
                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-blue-400 hover:text-blue-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        {loading ? (
                            <div className="flex justify-center py-6">
                                <span className="text-xs text-slate-500">Loading...</span>
                            </div>
                        ) : notifications.length > 0 ? (
                            <ul className="divide-y divide-slate-800/50">
                                {notifications.map((notif) => (
                                    <li 
                                        key={notif._id} 
                                        className={`group relative flex items-start gap-4 p-4 hover:bg-slate-800/50 transition-colors ${!notif.isRead ? 'bg-blue-500/5' : ''}`}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-sm ${!notif.isRead ? 'font-semibold text-white' : 'font-medium text-slate-300'}`}>
                                                {notif.link ? (
                                                    <Link href={notif.link} onClick={() => { setIsOpen(false); if(!notif.isRead) markAsRead(notif._id); }} className="hover:underline">
                                                        {notif.title}
                                                    </Link>
                                                ) : (
                                                    notif.title
                                                )}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <p className="mt-2 text-xs text-slate-500">
                                                {new Date(notif.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <button 
                                                onClick={() => markAsRead(notif._id)}
                                                className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                                                title="Mark as read"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </button>
                                        )}
                                        {!notif.isRead && (
                                             <div className="absolute right-4 top-5 h-2 w-2 rounded-full bg-blue-500 group-hover:hidden"></div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="px-4 py-8 text-center sm:px-6">
                                <Bell className="mx-auto h-8 w-8 text-slate-600 mb-3" />
                                <p className="text-sm text-slate-400">No notifications yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
