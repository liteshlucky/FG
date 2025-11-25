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
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
                    <p className="mt-1 text-sm text-gray-500">Track member and trainer check-ins</p>
                </div>
                <div className="flex space-x-3">
                    <a
                        href="/dashboard/attendance/qr-code"
                        className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                        QR Code
                    </a>
                    <a
                        href="/dashboard/attendance/history"
                        className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                    >
                        View History
                    </a>
                    <button
                        onClick={() => setShowCheckInModal(true)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        + Check In
                    </button>
                    <button
                        onClick={() => setShowCheckOutModal(true)}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                        Check Out Users
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`${activeTab === 'members'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
                    >
                        <Users className="inline-block mr-2 h-5 w-5" />
                        Members
                    </button>
                    <button
                        onClick={() => setActiveTab('trainers')}
                        className={`${activeTab === 'trainers'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
                    >
                        <UserCheck className="inline-block mr-2 h-5 w-5" />
                        Trainers
                    </button>
                </nav>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Calendar className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Total Today</dt>
                                <dd className="text-3xl font-semibold text-gray-900">{stats.total}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <UserCheck className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Currently In</dt>
                                <dd className="text-3xl font-semibold text-green-600">{stats.checkedIn}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Clock className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Checked Out</dt>
                                <dd className="text-3xl font-semibold text-blue-600">{stats.checkedOut}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Currently Checked In */}
            <div className="rounded-lg bg-white shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Currently Checked In ({checkedInUsers.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : checkedInUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No one is currently checked in
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
                                        Contact
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {checkedInUsers.map((attendance: any) => (
                                    <tr key={attendance._id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {attendance.userId?.name || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                            {formatTime(attendance.checkInTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 font-medium">
                                            {formatDuration(attendance.currentDuration)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
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
