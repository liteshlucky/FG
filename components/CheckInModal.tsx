'use client';

import { useState, useEffect } from 'react';
import { X, Search, Users } from 'lucide-react';

interface CheckInModalProps {
    userType: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CheckInModal({ userType, onClose, onSuccess }: CheckInModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    // Stores locker key per user id — optional, non-mandatory
    const [lockerKeys, setLockerKeys] = useState<Record<string, string>>({});

    // Bulk check-in states
    const [bulkIds, setBulkIds] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkResults, setBulkResults] = useState<any[]>([]);

    useEffect(() => {
        fetchUsers();
    }, [userType]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const endpoint = userType === 'Member' ? '/api/members' : '/api/trainers';
            const res = await fetch(endpoint);
            const data = await res.json();

            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (userId: string) => {
        setCheckingIn(true);
        const lockerKey = lockerKeys[userId]?.trim() || undefined;
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType, lockerKey })
            });

            const data = await res.json();

            if (data.success) {
                alert(data.message);
                onSuccess();
            } else {
                alert(data.error || 'Failed to check in');
            }
        } catch (error) {
            console.error('Check-in error:', error);
            alert('Failed to check in');
        } finally {
            setCheckingIn(false);
        }
    };

    const handleBulkCheckIn = async () => {
        const ids = bulkIds.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (ids.length === 0) return;
        setBulkProcessing(true);
        setBulkResults([]);
        try {
            const res = await fetch('/api/attendance/bulk-checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberIds: ids })
            });
            const data = await res.json();
            if (data.success) {
                setBulkResults(data.results);
                // Auto-close after 2s if all succeeded
                if (data.summary.failed === 0) {
                    setTimeout(() => onSuccess(), 2000);
                }
            } else {
                setBulkResults([{ memberId: '—', success: false, error: data.error }]);
            }
        } catch {
            setBulkResults([{ memberId: '—', success: false, error: 'Network error' }]);
        } finally {
            setBulkProcessing(false);
            setBulkIds('');
        }
    };

    const filteredUsers = users.filter((user: any) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone && user.phone.includes(searchTerm)) ||
        (user.memberId && user.memberId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.trainerId && user.trainerId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>

                {/* Modal */}
                <div className="relative w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-100">
                            Check In {userType}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Quick Bulk Check-In */}
                    {userType === 'Member' && (
                        <div className="px-6 py-3 border-b border-slate-800 bg-slate-800/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-400" />
                                <span className="text-xs font-medium text-slate-400">Quick Bulk Check-In</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={bulkIds}
                                    onChange={(e) => setBulkIds(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleBulkCheckIn()}
                                    placeholder="M311, M220, 115... (comma-separated)"
                                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleBulkCheckIn}
                                    disabled={bulkProcessing || !bulkIds.trim()}
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                                >
                                    {bulkProcessing ? '...' : 'Go'}
                                </button>
                            </div>
                            {bulkResults.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {bulkResults.map((r: any, idx: number) => (
                                        <div key={idx} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                                            <span>{r.success ? '✅' : '❌'}</span>
                                            <span>{r.name || r.memberId}</span>
                                            {!r.success && <span className="ml-auto text-slate-500">{r.error}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search */}
                    <div className="px-6 py-4 border-b border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* User List */}
                    <div className="max-h-[60vh] overflow-y-auto px-4 sm:px-6 py-4">
                        {loading ? (
                            <div className="text-center py-8 text-slate-400">Loading...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                No {userType.toLowerCase()}s found
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map((user: any) => (
                                    <div
                                        key={user._id}
                                        className="flex flex-col gap-3 rounded-lg border border-slate-800 p-4 hover:bg-slate-800/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        {/* Member info */}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-slate-100">{user.name}</p>
                                            <p className="text-sm text-slate-400">
                                                {user.email || user.phone || 'No contact info'}
                                            </p>
                                        </div>

                                        {/* Locker key + check-in */}
                                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                                            <input
                                                type="text"
                                                placeholder="Locker key (optional)"
                                                value={lockerKeys[user._id] || ''}
                                                onChange={(e) =>
                                                    setLockerKeys((prev) => ({
                                                        ...prev,
                                                        [user._id]: e.target.value
                                                    }))
                                                }
                                                className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => handleCheckIn(user._id)}
                                                disabled={checkingIn}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {checkingIn ? 'Checking In...' : 'Check In'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-800 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
