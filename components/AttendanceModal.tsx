import { useState, useEffect } from 'react';
import { X, CheckCircle, Clock } from 'lucide-react';

interface AttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainerId: string;
    onAttendanceSuccess: () => void;
}

export default function AttendanceModal({ isOpen, onClose, trainerId, onAttendanceSuccess }: AttendanceModalProps) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'checking_in' | 'checking_out'>("idle");
    const [lastRecord, setLastRecord] = useState<any>(null);

    const fetchLast = async () => {
        try {
            const res = await fetch(`/api/trainers/${trainerId}/attendance`);
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                setLastRecord(data.data[0]);
            }
        } catch (e) {
            console.error('Failed to fetch attendance', e);
        }
    };

    useEffect(() => {
        if (isOpen) fetchLast();
    }, [isOpen]);

    const handleAction = async (action: 'checkin' | 'checkout') => {
        setLoading(true);
        try {
            const res = await fetch(`/api/trainers/${trainerId}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (data.success) {
                onAttendanceSuccess();
                onClose();
            } else {
                alert(data.error || 'Action failed');
            }
        } catch (e) {
            console.error('Attendance action error', e);
            alert('Action failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="w-full max-w-lg rounded-lg bg-slate-800 shadow-xl border border-slate-700"> // Added border
                <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
                    <h3 className="text-lg font-medium text-slate-100">Trainer Attendance</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-300">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6">
                    {lastRecord && (
                        <div className="mb-4 space-y-2">
                            <p className="text-sm text-slate-400">Last Record:</p>
                            <p className="font-medium text-slate-100">
                                Date: {new Date(lastRecord.date).toLocaleDateString()} –
                                Check‑In: {lastRecord.checkIn ? new Date(lastRecord.checkIn).toLocaleTimeString() : '-'} –
                                Check‑Out: {lastRecord.checkOut ? new Date(lastRecord.checkOut).toLocaleTimeString() : '-'}
                            </p>
                        </div>
                    )}
                    <div className="flex space-x-4">
                        <button
                            onClick={() => handleAction('checkin')}
                            disabled={loading}
                            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading && status === 'checking_in' ? 'Processing…' : 'Check‑In'}
                        </button>
                        <button
                            onClick={() => handleAction('checkout')}
                            disabled={loading}
                            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading && status === 'checking_out' ? 'Processing…' : 'Check‑Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
