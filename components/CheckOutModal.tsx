'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function CheckOutModal({ userType, checkedInUsers, onClose, onSuccess }) {
    const [checkingOut, setCheckingOut] = useState(false);

    const handleCheckOut = async (attendanceId, userName) => {
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

    const formatDuration = (minutes) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

                {/* Modal */}
                <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Check Out {userType}s
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* User List */}
                    <div className="max-h-96 overflow-y-auto">
                        {checkedInUsers.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No {userType.toLowerCase()}s are currently checked in
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Check-In Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Duration
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {checkedInUsers.map((attendance) => (
                                        <tr key={attendance._id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {attendance.userId?.name || 'Unknown'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {attendance.userId?.phone || ''}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {formatTime(attendance.checkInTime)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                {formatDuration(attendance.currentDuration)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                <button
                                                    onClick={() => handleCheckOut(attendance._id, attendance.userId?.name)}
                                                    disabled={checkingOut}
                                                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
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
                    <div className="border-t border-gray-200 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
