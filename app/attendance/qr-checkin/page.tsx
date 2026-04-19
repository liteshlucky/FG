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

    // Bulk check-in states
    const [showBulkSection, setShowBulkSection] = useState(false);
    const [bulkIds, setBulkIds] = useState('');
    const [linkedProfiles, setLinkedProfiles] = useState<any[]>([]);
    const [selectedLinked, setSelectedLinked] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkResults, setBulkResults] = useState<any[]>([]);
    const [extraUsers, setExtraUsers] = useState<any[]>([]);

    const lookupUser = async () => {
        if (!identifier.trim()) {
            setMessage({ type: 'error', text: 'Please enter your membership ID or phone number', locationStatus: '' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '', locationStatus: '' });
        setUser(null);
        setLinkedProfiles([]);
        setSelectedLinked(new Set());
        setBulkResults([]);
        setExtraUsers([]);

        const ids = identifier.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const lookupId = ids[0] || identifier.trim();

        try {
            const [mainRes, ...extraRes] = await Promise.all([
                fetch('/api/attendance/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: lookupId })
                }),
                ...ids.slice(1).map(id => fetch('/api/attendance/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: id })
                }))
            ]);
            
            const mainData = await mainRes.json();
            if (mainData.success) {
                setUser(mainData.data);
                if (mainData.data.userType === 'Member' && mainData.data.identifier) {
                    fetchLinkedProfiles(mainData.data.identifier);
                }

                const extras = [];
                for (const res of extraRes) {
                    const d = await res.json();
                    if (d.success) extras.push(d.data);
                }
                setExtraUsers(extras);
            } else {
                setMessage({ type: 'error', text: mainData.error || 'User not found', locationStatus: '' });
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

        // If there are multiple IDs from the main input, or linked profiles selected, use bulk checkin
        const mainIds = identifier.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const linkedIds = Array.from(selectedLinked);
        const allTargetIds = Array.from(new Set([...mainIds, ...linkedIds]));

        if (action === 'checkin' && allTargetIds.length > 1) {
            try {
                const res = await fetch('/api/attendance/bulk-checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        initiatorId: user.identifier,
                        memberIds: allTargetIds,
                        lat: coords?.lat ?? null,
                        lng: coords?.lng ?? null
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setMessage({ type: 'success', text: `Successfully checked in ${data.summary.succeeded} member(s)`, locationStatus: '' });
                    setBulkResults(data.results);
                    setTimeout(() => lookupUser(), 2500);
                } else {
                    setMessage({ type: 'error', text: data.error || 'Bulk check-in failed', locationStatus: '' });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Failed to process bulk check-in.', locationStatus: '' });
            } finally {
                setProcessing(false);
            }
            return;
        }

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

    // -------------------------------------------------------------------------
    // BULK CHECK-IN FUNCTIONS
    // -------------------------------------------------------------------------
    const fetchLinkedProfiles = async (memberId: string) => {
        try {
            const res = await fetch(`/api/linked-profiles?memberId=${memberId}`);
            const data = await res.json();
            if (data.success) {
                setLinkedProfiles(data.data);
                // Auto-expand the suggestion UI if the user actually has buddies
                if (data.data.length > 0) {
                    setShowBulkSection(true);
                }
            }
        } catch (error) {
            console.error('Failed to fetch linked profiles', error);
        }
    };

    const toggleLinkedProfile = (memberId: string) => {
        setSelectedLinked(prev => {
            const next = new Set(prev);
            if (next.has(memberId)) {
                next.delete(memberId);
            } else {
                next.add(memberId);
            }
            return next;
        });
    };

    const handleBulkCheckIn = async (memberIds: string[]) => {
        if (memberIds.length === 0) return;
        setBulkProcessing(true);
        setBulkResults([]);

        // Get GPS from initiator's device
        const coords = await getCurrentLocation();

        try {
            const res = await fetch('/api/attendance/bulk-checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initiatorId: user?.identifier,
                    memberIds,
                    lat: coords?.lat ?? null,
                    lng: coords?.lng ?? null
                })
            });
            const data = await res.json();
            if (data.success) {
                setBulkResults(data.results);
                // Refresh linked profiles after check-in (auto-link may have changed)
                if (user?.identifier) {
                    fetchLinkedProfiles(user.identifier);
                }
            } else {
                setBulkResults([{ memberId: '—', name: null, success: false, error: data.error }]);
            }
        } catch {
            setBulkResults([{ memberId: '—', name: null, success: false, error: 'Network error' }]);
        } finally {
            setBulkProcessing(false);
            setBulkIds('');
            setSelectedLinked(new Set());
        }
    };

    const handleBulkFromInput = () => {
        const ids = bulkIds.split(',').map(s => s.trim()).filter(s => s.length > 0);
        handleBulkCheckIn(ids);
    };

    const handleBulkFromLinked = () => {
        handleBulkCheckIn(Array.from(selectedLinked));
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

                    {/* Standalone Bulk Results (when multiple IDs entered in main box) */}
                    {!user && bulkResults.length > 0 && (
                        <div className="mt-6 space-y-2 border-t-2 border-gray-100 pt-4">
                            <h3 className="text-sm font-bold text-gray-800">Bulk Check-In Results</h3>
                            <div className="space-y-1.5">
                                {bulkResults.map((r: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center gap-2 rounded-lg p-3 text-sm ${r.success
                                            ? 'bg-green-50 border border-green-200 text-green-800'
                                            : 'bg-red-50 border border-red-200 text-red-800'
                                            }`}
                                    >
                                        <span className="text-lg">{r.success ? '✅' : '❌'}</span>
                                        <span className="font-medium flex items-center gap-2">
                                            <span className='text-xs font-bold'>({r.memberId})</span> {r.name}
                                        </span>
                                        {!r.success && (
                                            <span className="ml-auto text-xs text-red-600">{r.error}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
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

                            {/* Extra Users (from comma-separated lookup) */}
                            {extraUsers.length > 0 && (
                                <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
                                    <h3 className="text-sm font-bold text-indigo-900 mb-2">Also Checking In</h3>
                                    <div className="space-y-2">
                                        {extraUsers.map((eu, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-white p-2 border border-indigo-100 rounded-md shadow-sm">
                                                <div className="flex-shrink-0">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm">👤</div>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-900">{eu.name}</p>
                                                    <p className="text-xs text-gray-500">ID: {eu.identifier}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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

                                {/* Buddies Suggestion Section */}
                                {user.userType === 'Member' && !user.isCheckedIn && !user.hasCheckedInToday && linkedProfiles.length > 0 && (
                                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xl">👥</span>
                                            <h3 className="text-sm font-bold text-blue-900">Buddies & Family Check-In</h3>
                                        </div>

                                        {/* Linked Profiles — checkbox list */}
                                        {linkedProfiles.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-blue-800 mb-1.5">Buddies & Family</p>
                                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                                    {linkedProfiles.map((lp: any) => {
                                                        const isExpired = lp.status === 'Expired';
                                                        const isDisabled = isExpired;
                                                        const relationEmoji = lp.relationship === 'spouse' ? '💑' :
                                                            lp.relationship === 'family' ? '👨‍👩‍👧' :
                                                                lp.relationship === 'friend' ? '🤝' :
                                                                    lp.relationship === 'buddy' ? '🏋️' : '👤';

                                                        return (
                                                            <label
                                                                key={lp.memberId}
                                                                className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-all ${isDisabled
                                                                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                                                    : selectedLinked.has(lp.memberId)
                                                                        ? 'border-blue-400 bg-blue-100'
                                                                        : 'border-blue-200 bg-white hover:border-blue-300'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedLinked.has(lp.memberId)}
                                                                    onChange={() => !isDisabled && toggleLinkedProfile(lp.memberId)}
                                                                    disabled={isDisabled}
                                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                                <span className="text-base">{relationEmoji}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 leading-tight">{lp.name}</p>
                                                                    <p className="text-[10px] text-gray-500">
                                                                        {lp.memberId} · <span className="capitalize">{lp.relationship}</span>
                                                                    </p>
                                                                </div>
                                                                {isExpired && (
                                                                    <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                                        Expired
                                                                    </span>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                {selectedLinked.size > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleBulkFromLinked}
                                                        disabled={bulkProcessing}
                                                        className="w-full mt-2 flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 shadow-sm"
                                                    >
                                                        {bulkProcessing
                                                            ? '📍 Checking In...'
                                                            : `Check In Extra ${selectedLinked.size} Person${selectedLinked.size > 1 ? 's' : ''}`}
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
