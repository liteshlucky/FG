'use client';

import { useState } from 'react';
import { Search, LogIn, LogOut, CheckCircle, XCircle } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';

export default function QRCheckInPage() {
    const [identifier, setIdentifier] = useState('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showCamera, setShowCamera] = useState(false);
    const [pendingAction, setPendingAction] = useState<'checkin' | 'checkout' | null>(null);
    const [uploading, setUploading] = useState(false);

    const lookupUser = async () => {
        if (!identifier.trim()) {
            setMessage({ type: 'error', text: 'Please enter your membership ID or phone number' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });
        setUser(null);

        try {
            const res = await fetch('/api/attendance/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: identifier.trim() })
            });

            const data = await res.json();

            if (data.success) {
                setUser(data.data);
            } else {
                setMessage({ type: 'error', text: data.error || 'User not found' });
            }
        } catch (error) {
            console.error('Lookup error:', error);
            setMessage({ type: 'error', text: 'Failed to lookup user. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const initiateAttendance = (action: 'checkin' | 'checkout') => {
        setPendingAction(action);
        setShowCamera(true);
    };

    const handlePhotoCapture = async (imageData: string) => {
        if (!user || !pendingAction) return;

        setShowCamera(false);
        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            // Upload photo to Cloudinary
            const uploadRes = await fetch('/api/upload/selfie', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: imageData,
                    userId: user.userId,
                    action: pendingAction
                })
            });

            const uploadData = await uploadRes.json();

            if (!uploadData.success) {
                setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.' });
                setUploading(false);
                setPendingAction(null);
                return;
            }

            // Process attendance with photo URL
            setProcessing(true);
            const res = await fetch('/api/attendance/self-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    userType: user.userType,
                    action: pendingAction,
                    photoUrl: uploadData.data.url
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
                // Refresh user data
                setTimeout(() => {
                    lookupUser();
                }, 1500);
            } else {
                setMessage({ type: 'error', text: data.error || 'Operation failed' });
            }
        } catch (error) {
            console.error('Attendance error:', error);
            setMessage({ type: 'error', text: 'Failed to process. Please try again.' });
        } finally {
            setProcessing(false);
            setUploading(false);
            setPendingAction(null);
        }
    };

    const handleCameraCancel = () => {
        setShowCamera(false);
        setPendingAction(null);
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="mx-auto max-w-md pt-8">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="rounded-full bg-blue-600 p-4">
                            <span className="text-4xl">🏋️</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Gym Check-In</h1>
                    <p className="mt-2 text-sm text-gray-600">Enter your details to check in or out</p>
                </div>

                {/* Main Card */}
                <div className="rounded-2xl bg-white p-6 shadow-xl">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Membership ID or Phone Number
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && lookupUser()}
                                    placeholder="Enter numeric ID (e.g., 112) or phone..."
                                    className="w-full rounded-lg border-2 border-gray-300 text-black px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                💡 Tip: Just enter the numbers (e.g., 112 for MEM112)
                            </p>
                        </div>

                        <button
                            onClick={lookupUser}
                            disabled={loading || !identifier.trim()}
                            className="w-full flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Search className="mr-2 h-5 w-5" />
                            {loading ? 'Looking up...' : 'Lookup'}
                        </button>
                    </div>

                    {/* Message Display */}
                    {message.text && (
                        <div className={`mt-4 rounded-lg p-4 ${message.type === 'success'
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-red-50 border-2 border-red-200'
                            }`}>
                            <div className="flex items-center">
                                {message.type === 'success' ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                                )}
                                <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {message.text}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* User Details */}
                    {user && (
                        <div className="mt-6 space-y-4">
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                                            👤
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-lg font-bold text-gray-900">{user.name}</p>
                                        <p className="text-sm text-gray-500">{user.phone}</p>
                                        <p className="text-xs text-gray-400">
                                            {user.userType} • ID: {user.identifier}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className={`rounded-lg p-4 ${user.isCheckedIn
                                ? 'bg-green-50 border-2 border-green-200'
                                : user.hasCheckedInToday
                                    ? 'bg-yellow-50 border-2 border-yellow-200'
                                    : 'bg-gray-50 border-2 border-gray-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    <span className={`text-lg font-bold ${user.isCheckedIn ? 'text-green-600' : user.hasCheckedInToday ? 'text-yellow-600' : 'text-gray-600'
                                        }`}>
                                        {user.isCheckedIn ? '✓ Checked In' : user.hasCheckedInToday ? '⚠️ Already Visited Today' : 'Not Checked In'}
                                    </span>
                                </div>
                                {user.isCheckedIn && user.currentDuration && (
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-gray-600">Time in gym:</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatDuration(user.currentDuration)}
                                        </p>
                                    </div>
                                )}
                                {user.hasCheckedInToday && !user.isCheckedIn && (
                                    <div className="mt-2 text-center">
                                        <p className="text-sm text-yellow-700">
                                            You've already completed your visit today. Come back tomorrow! 💪
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Membership Expiry Warning */}
                            {user.userType === 'Member' && user.membershipExpired && (
                                <div className="rounded-lg bg-red-50 border-2 border-red-300 p-4">
                                    <div className="flex items-start">
                                        <XCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-red-800">Membership Expired</p>
                                            <p className="text-xs text-red-700 mt-1">
                                                Your membership has expired. Please renew to continue using the gym.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {user.userType === 'Member' && !user.membershipExpired && user.daysUntilExpiry !== null && user.daysUntilExpiry <= 10 && (
                                <div className="rounded-lg bg-yellow-50 border-2 border-yellow-300 p-4">
                                    <div className="flex items-start">
                                        <span className="text-xl mr-2">⚠️</span>
                                        <div>
                                            <p className="text-sm font-bold text-yellow-800">Membership Expiring Soon</p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                                Your membership expires in <span className="font-bold">{user.daysUntilExpiry} day{user.daysUntilExpiry !== 1 ? 's' : ''}</span>. Please renew soon to avoid interruption.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {user.membershipExpired ? (
                                    <button
                                        disabled
                                        className="w-full flex items-center justify-center rounded-lg bg-red-400 px-6 py-4 text-lg font-bold text-white cursor-not-allowed"
                                    >
                                        <XCircle className="mr-2 h-6 w-6" />
                                        Membership Expired - Cannot Check In
                                    </button>
                                ) : !user.isCheckedIn && !user.hasCheckedInToday ? (
                                    <button
                                        onClick={() => initiateAttendance('checkin')}
                                        disabled={processing || uploading}
                                        className="w-full flex items-center justify-center rounded-lg bg-green-600 px-6 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <LogIn className="mr-2 h-6 w-6" />
                                        {uploading ? 'Uploading Photo...' : processing ? 'Checking In...' : 'Check In'}
                                    </button>
                                ) : user.isCheckedIn ? (
                                    <button
                                        onClick={() => initiateAttendance('checkout')}
                                        disabled={processing || uploading}
                                        className="w-full flex items-center justify-center rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        <LogOut className="mr-2 h-6 w-6" />
                                        {uploading ? 'Uploading Photo...' : processing ? 'Checking Out...' : 'Check Out'}
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full flex items-center justify-center rounded-lg bg-gray-400 px-6 py-4 text-lg font-bold text-white cursor-not-allowed"
                                    >
                                        <CheckCircle className="mr-2 h-6 w-6" />
                                        Already Checked In Today
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Need help? Contact gym staff</p>
                </div>
            </div>

            {/* Camera Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onCancel={handleCameraCancel}
                    title={pendingAction === 'checkin' ? 'Check-In Selfie' : 'Check-Out Selfie'}
                />
            )}
        </div>
    );
}
