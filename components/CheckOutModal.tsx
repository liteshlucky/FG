'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CheckOutModalProps {
    userType: string;
    checkedInUsers: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function CheckOutModal({ userType, checkedInUsers, onClose, onSuccess }: CheckOutModalProps) {
    const [checkingOut, setCheckingOut] = useState(false);

    const handleCheckOut = async (attendanceId: string, userName: string) => {
        setCheckingOut(true);
        try {
            const res = await fetch(`/api/attendance/${attendanceId}/checkout`, {
                method: 'PUT'
            });

            const data = await res.json();

            if (data.success) {
                alert(`${userName} checked out successfully`);
                onSuccess();
            } else {
                alert(data.error || 'Failed to check out');
            }
        } catch (error) {
            console.error('Check-out error:', error);
            alert('Failed to check out');
        } finally {
            setCheckingOut(false);
        }
    };

    const formatDuration = (minutes: number) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>

                {/* Modal */}
                <div className="relative w-full max-w-3xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                        <h2 className="text-lg font-semibold text-slate-100">
                            Check Out {userType}s
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* User List */}
                    <div className="max-h-96 overflow-y-auto">
                        {checkedInUsers.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                No {userType.toLowerCase()}s are currently checked in
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                            Check-In Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                            Duration
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-slate-900">
                                    {checkedInUsers.map((attendance: any) => (
                                        <tr key={attendance._id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="text-sm font-medium text-slate-100">
                                                    {attendance.userId?.name || 'Unknown'}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    {attendance.userId?.phone || ''}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                                {formatTime(attendance.checkInTime)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100">
                                                {formatDuration(attendance.currentDuration)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <button
                                                    onClick={() => handleCheckOut(attendance._id, attendance.userId?.name)}
                                                    disabled={checkingOut}
                                                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {checkingOut ? 'Processing...' : 'Check Out'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-800 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
