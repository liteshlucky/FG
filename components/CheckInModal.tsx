'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export default function CheckInModal({ userType, onClose, onSuccess }) {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);

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

    const handleCheckIn = async (userId) => {
        setCheckingIn(true);
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, userType })
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

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.phone && user.phone.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

                {/* Modal */}
                <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Check In {userType}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* User List */}
                    <div className="max-h-96 overflow-y-auto px-6 py-4">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No {userType.toLowerCase()}s found
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user._id}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {user.email || user.phone || 'No contact info'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCheckIn(user._id)}
                                            disabled={checkingIn}
                                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {checkingIn ? 'Checking In...' : 'Check In'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
