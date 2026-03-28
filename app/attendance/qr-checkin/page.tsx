'use client';

import { useState } from 'react';
import { Search, LogIn, LogOut, CheckCircle, XCircle, MapPin } from 'lucide-react';
import CameraCapture from '@/components/CameraCapture';

// ---------------------------------------------------------------------------
// Location badge component — shown after check-in/out for both user types
// ---------------------------------------------------------------------------
function LocationBadge({ status }: { status: string }) {
    if (status === 'verified') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                <MapPin className="h-3 w-3" /> Location Verified
            </span>
        );
    }
    if (status === 'far') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                <MapPin className="h-3 w-3" /> Far Location
            </span>
        );
    }
    if (status === 'denied') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                <MapPin className="h-3 w-3" /> No Location
            </span>
        );
    }
    return null;
}

// ---------------------------------------------------------------------------
// Silently fetch browser GPS — resolves with { lat, lng } or null on failure.
// Times out after 6 seconds to avoid hanging the UI.
// ---------------------------------------------------------------------------
function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        const timer = setTimeout(() => resolve(null), 6000);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(timer);
                resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => {
                clearTimeout(timer);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 6000 }
        );
    });
}

export default function QRCheckInPage() {
    const [identifier, setIdentifier] = useState('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '', locationStatus: '' });
    const [lockerKey, setLockerKey] = useState('');

    // Trainer-only camera states
    const [showCamera, setShowCamera] = useState(false);
    const [pendingAction, setPendingAction] = useState<'checkin' | 'checkout' | null>(null);
    const [uploading, setUploading] = useState(false);

    const lookupUser = async () => {
        if (!identifier.trim()) {
            setMessage({ type: 'error', text: 'Please enter your membership ID or phone number', locationStatus: '' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '', locationStatus: '' });
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
                setMessage({ type: 'error', text: data.error || 'User not found', locationStatus: '' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to lookup user. Please try again.', locationStatus: '' });
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // MEMBER FLOW: fetch GPS silently, then submit directly (no camera)
    // -------------------------------------------------------------------------
    const handleMemberAttendance = async (action: 'checkin' | 'checkout') => {
        if (!user) return;
        setProcessing(true);
        setMessage({ type: '', text: '', locationStatus: '' });

        // Fetch location silently — never blocks the user
        const coords = await getCurrentLocation();

        try {
            const res = await fetch('/api/attendance/self-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    userType: user.userType,
                    action,
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null,
                    ...(action === 'checkin' && lockerKey.trim() ? { lockerKey: lockerKey.trim() } : {})
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message, locationStatus: data.data?.locationStatus ?? '' });
                setTimeout(() => lookupUser(), 1500);
            } else {
                setMessage({ type: 'error', text: data.error || 'Operation failed', locationStatus: '' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to process. Please try again.', locationStatus: '' });
        } finally {
            setProcessing(false);
        }
    };

    // -------------------------------------------------------------------------
    // TRAINER FLOW: open camera first, then upload selfie + GPS together
    // -------------------------------------------------------------------------
    const initiateTrainerAttendance = (action: 'checkin' | 'checkout') => {
        setPendingAction(action);
        setShowCamera(true);
    };

    const handleTrainerPhotoCapture = async (imageData: string) => {
        if (!user || !pendingAction) return;

        setShowCamera(false);
        setUploading(true);
        setMessage({ type: '', text: '', locationStatus: '' });

        try {
            // Upload selfie to Cloudinary + fetch GPS in parallel
            const [uploadRes, coords] = await Promise.all([
                fetch('/api/upload/selfie', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageData, userId: user.userId, action: pendingAction })
                }),
                getCurrentLocation()
            ]);

            const uploadData = await uploadRes.json();
            if (!uploadData.success) {
                setMessage({ type: 'error', text: 'Failed to upload photo. Please try again.', locationStatus: '' });
                return;
            }

            // Submit attendance with both selfie URL and GPS
            setProcessing(true);
            const res = await fetch('/api/attendance/self-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.userId,
                    userType: user.userType,
                    action: pendingAction,
                    photoUrl: uploadData.data.url,
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message, locationStatus: data.data?.locationStatus ?? '' });
                setTimeout(() => lookupUser(), 1500);
            } else {
                setMessage({ type: 'error', text: data.error || 'Operation failed', locationStatus: '' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to process. Please try again.', locationStatus: '' });
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

    // Whether check-in / checkout buttons are busy
    const isBusy = processing || uploading;

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
                    {/* Lookup Input */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Membership ID or Phone Number
                            </label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && lookupUser()}
                                placeholder="Enter numeric ID (e.g., 112) or phone..."
                                className="w-full rounded-lg border-2 border-gray-300 text-black px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                💡 Tip: Just enter the member ID (e.g., 112)
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
                                    <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                                )}
                                <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                    {message.text}
                                </p>
                            </div>
                            {/* Location status badge — shown on success */}
                            {message.type === 'success' && message.locationStatus && (
                                <div className="mt-2 ml-7">
                                    <LocationBadge status={message.locationStatus} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* User Details */}
                    {user && (
                        <div className="mt-6 space-y-4">
                            {/* User Card */}
                            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                                            {user.userType === 'Trainer' ? '🏅' : '👤'}
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

                            {/* Trainer pill */}
                            {user.userType === 'Trainer' && (
                                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700 flex items-center gap-1.5">
                                    📸 Selfie + 📍 Location required for trainer check-in/out
                                </div>
                            )}

                            {/* Status */}
                            <div className={`rounded-lg p-4 ${user.isCheckedIn
                                ? 'bg-green-50 border-2 border-green-200'
                                : user.hasCheckedInToday
                                    ? 'bg-yellow-50 border-2 border-yellow-200'
                                    : 'bg-gray-50 border-2 border-gray-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    <span className={`text-lg font-bold ${user.isCheckedIn ? 'text-green-600' : user.hasCheckedInToday ? 'text-yellow-600' : 'text-gray-600'}`}>
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

                            {/* Membership warnings — Members only */}
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
                                                Your membership expires in <span className="font-bold">{user.daysUntilExpiry} day{user.daysUntilExpiry !== 1 ? 's' : ''}</span>. Please renew soon.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {/* Locker key — Members only, shown before check-in */}
                                {user.userType === 'Member' && !user.membershipExpired && !user.isCheckedIn && !user.hasCheckedInToday && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Locker Key <span className="text-gray-400 font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={lockerKey}
                                            onChange={(e) => setLockerKey(e.target.value)}
                                            placeholder="e.g. A-12"
                                            className="w-full rounded-lg border-2 border-gray-300 text-black px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* ---- MEMBER BUTTONS ---- */}
                                {user.userType === 'Member' && (
                                    <>
                                        {user.membershipExpired ? (
                                            <button disabled className="w-full flex items-center justify-center rounded-lg bg-red-400 px-6 py-4 text-lg font-bold text-white cursor-not-allowed">
                                                <XCircle className="mr-2 h-6 w-6" />
                                                Membership Expired — Cannot Check In
                                            </button>
                                        ) : !user.isCheckedIn && !user.hasCheckedInToday ? (
                                            <button
                                                onClick={() => handleMemberAttendance('checkin')}
                                                disabled={isBusy}
                                                className="w-full flex items-center justify-center rounded-lg bg-green-600 px-6 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <LogIn className="mr-2 h-6 w-6" />
                                                {processing ? '📍 Checking In...' : 'Check In'}
                                            </button>
                                        ) : user.isCheckedIn ? (
                                            <button
                                                onClick={() => handleMemberAttendance('checkout')}
                                                disabled={isBusy}
                                                className="w-full flex items-center justify-center rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <LogOut className="mr-2 h-6 w-6" />
                                                {processing ? '📍 Checking Out...' : 'Check Out'}
                                            </button>
                                        ) : (
                                            <button disabled className="w-full flex items-center justify-center rounded-lg bg-gray-400 px-6 py-4 text-lg font-bold text-white cursor-not-allowed">
                                                <CheckCircle className="mr-2 h-6 w-6" />
                                                Already Checked In Today
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* ---- TRAINER BUTTONS ---- */}
                                {user.userType === 'Trainer' && (
                                    <>
                                        {!user.isCheckedIn ? (
                                            <button
                                                onClick={() => initiateTrainerAttendance('checkin')}
                                                disabled={isBusy}
                                                className="w-full flex items-center justify-center rounded-lg bg-green-600 px-6 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                <LogIn className="mr-2 h-6 w-6" />
                                                {uploading ? 'Uploading Selfie...' : processing ? '📍 Checking In...' : 'Check In'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => initiateTrainerAttendance('checkout')}
                                                disabled={isBusy}
                                                className="w-full flex items-center justify-center rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <LogOut className="mr-2 h-6 w-6" />
                                                {uploading ? 'Uploading Selfie...' : processing ? '📍 Checking Out...' : 'Check Out'}
                                            </button>
                                        )}
                                    </>
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

            {/* Camera Modal — Trainers only */}
            {showCamera && (
                <CameraCapture
                    onCapture={handleTrainerPhotoCapture}
                    onCancel={handleCameraCancel}
                    title={pendingAction === 'checkin' ? 'Check-In Selfie' : 'Check-Out Selfie'}
                />
            )}
        </div>
    );
}
