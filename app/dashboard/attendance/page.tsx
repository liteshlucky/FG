'use client';

import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, Calendar } from 'lucide-react';
import CheckInModal from '@/components/CheckInModal';
import CheckOutModal from '@/components/CheckOutModal';

export default function AttendancePage() {
    const [activeTab, setActiveTab] = useState('members');
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showCheckOutModal, setShowCheckOutModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, checkedIn: 0, checkedOut: 0 });

    useEffect(() => {
        fetchTodayAttendance();
    }, [activeTab]);

    const fetchTodayAttendance = async () => {
        setLoading(true);
        try {
            const userType = activeTab === 'members' ? 'Member' : 'Trainer';
            const res = await fetch(`/api/attendance?userType=${userType}`);
            const data = await res.json();

            if (data.success) {
                setAttendanceData(data.data);
                calculateStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch attendance', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: any[]) => {
        const checkedIn = data.filter(a => a.status === 'checked-in').length;
        const checkedOut = data.filter(a => a.status === 'checked-out').length;
        setStats({
            total: data.length,
            checkedIn,
            checkedOut
        });
    };

    const handleCheckInSuccess = () => {
        setShowCheckInModal(false);
        fetchTodayAttendance();
    };

    const handleCheckOutSuccess = () => {
        setShowCheckOutModal(false);
        fetchTodayAttendance();
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

    const checkedInUsers = attendanceData.filter((a: any) => a.status === 'checked-in');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Attendance Management</h1>
                    <p className="mt-1 text-sm text-slate-400">Track member and trainer check-ins</p>
                </div>
                <div className="flex space-x-3">
                    <a
                        href="/dashboard/attendance/qr-code"
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20 hover:bg-purple-500 hover:shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        QR Code
                    </a>
                    <a
                        href="/dashboard/attendance/history"
                        className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-500/20 hover:bg-slate-600 hover:shadow-slate-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        View History
                    </a>
                    <button
                        onClick={() => setShowCheckInModal(true)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        + Check In
                    </button>
                    <button
                        onClick={() => setShowCheckOutModal(true)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 hover:shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        Check Out Users
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-800">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`${activeTab === 'members'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors`}
                    >
                        <Users className="inline-block mr-2 h-5 w-5" />
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('trainers')}
                        className={`${activeTab === 'trainers'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-300'
                            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors`}
                    >
                        <UserCheck className="inline-block mr-2 h-5 w-5" />
                        Trainers
                    </button>
                </nav>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-900 p-6 shadow-sm border border-slate-800">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Calendar className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-400 truncate">Total Today</dt>
                                <dd className="text-3xl font-semibold text-slate-100">{stats.total}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl bg-slate-900 p-6 shadow-sm border border-slate-800">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <UserCheck className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-400 truncate">Currently In</dt>
                                <dd className="text-3xl font-semibold text-emerald-400">{stats.checkedIn}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl bg-slate-900 p-6 shadow-sm border border-slate-800">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Clock className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-400 truncate">Checked Out</dt>
                                <dd className="text-3xl font-semibold text-blue-400">{stats.checkedOut}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Currently Checked In */}
            <div className="rounded-xl bg-slate-900 shadow-sm border border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-100">
                        Currently Checked In ({checkedInUsers.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : checkedInUsers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            No one is currently checked in
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
                                        Contact
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
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                            {formatTime(attendance.checkInTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-100 font-medium">
                                            {formatDuration(attendance.currentDuration)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                            {attendance.userId?.phone || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCheckInModal && (
                <CheckInModal
                    userType={activeTab === 'members' ? 'Member' : 'Trainer'}
                    onClose={() => setShowCheckInModal(false)}
                    onSuccess={handleCheckInSuccess}
                />
            )}

            {showCheckOutModal && (
                <CheckOutModal
                    userType={activeTab === 'members' ? 'Member' : 'Trainer'}
                    checkedInUsers={checkedInUsers}
                    onClose={() => setShowCheckOutModal(false)}
                    onSuccess={handleCheckOutSuccess}
                />
            )}
        </div>
    );
}
