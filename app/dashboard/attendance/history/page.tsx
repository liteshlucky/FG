'use client';

import { useState, useEffect } from 'react';
import { Calendar, Download, LogOut, X, ZoomIn } from 'lucide-react';

export default function AttendanceHistoryPage() {
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // 'all', 'day', 'month', 'year'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [userTypeFilter, setUserTypeFilter] = useState('all'); // 'all', 'Member', 'Trainer'
    const [stats, setStats] = useState<any>({});
    const [checkingOut, setCheckingOut] = useState<string | null>(null);
    const [zoomedPhoto, setZoomedPhoto] = useState<any>(null); // For photo zoom modal

    useEffect(() => {
        fetchAttendanceHistory();
    }, [filterType, selectedDate, selectedMonth, selectedYear, userTypeFilter]);

    const fetchAttendanceHistory = async () => {
        setLoading(true);
        try {
            let startDate, endDate;

            if (filterType === 'day') {
                startDate = selectedDate;
                endDate = selectedDate;
            } else if (filterType === 'month') {
                const [year, month] = selectedMonth.split('-');
                startDate = `${year}-${month}-01`;
                const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
                endDate = `${year}-${month}-${lastDay}`;
            } else if (filterType === 'year') {
                startDate = `${selectedYear}-01-01`;
                endDate = `${selectedYear}-12-31`;
            }

            let url = '/api/attendance/history?limit=100';
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;
            if (userTypeFilter !== 'all') url += `&userType=${userTypeFilter}`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                setAttendanceData(data.data);
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch attendance history', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async (attendanceId: string, userName: string) => {
        if (!confirm(`Check out ${userName}?`)) return;

        setCheckingOut(attendanceId);
        try {
            const res = await fetch(`/api/attendance/${attendanceId}/checkout`, {
                method: 'PUT'
            });

            const data = await res.json();

            if (data.success) {
                alert(`${userName} checked out successfully`);
                fetchAttendanceHistory();
            } else {
                alert(data.error || 'Failed to check out');
            }
        } catch (error) {
            console.error('Check-out error:', error);
            alert('Failed to check out');
        } finally {
            setCheckingOut(null);
        }
    };

    const formatDuration = (minutes: number) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Name', 'Type', 'Check-In', 'Check-Out', 'Duration', 'Status'];
        const rows = attendanceData.map((a: any) => [
            formatDate(a.checkInTime),
            a.userId?.name || 'Unknown',
            a.userType,
            formatTime(a.checkInTime),
            formatTime(a.checkOutTime),
            formatDuration(a.duration),
            a.status
        ]);

        const csv = [headers, ...rows].map((row: any) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${filterType}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Attendance History</h1>
                    <p className="mt-1 text-sm text-slate-400">View and manage attendance records</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                <h2 className="mb-4 text-lg font-semibold text-slate-100">Filters</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {/* Filter Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Time Period
                        </label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                            <option value="all">All Time</option>
                            <option value="day">By Day</option>
                            <option value="month">By Month</option>
                            <option value="year">By Year</option>
                        </select>
                    </div>

                    {/* Date Selector */}
                    {filterType === 'day' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                    )}

                    {filterType === 'month' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Select Month
                            </label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                    )}

                    {filterType === 'year' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Select Year
                            </label>
                            <input
                                type="number"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                min="2020"
                                max="2030"
                                className="w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                    )}

                    {/* User Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            User Type
                        </label>
                        <select
                            value={userTypeFilter}
                            onChange={(e) => setUserTypeFilter(e.target.value)}
                            className="w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                            <option value="all">All</option>
                            <option value="Member">Members</option>
                            <option value="Trainer">Trainers</option>
                        </select>
                    </div>
                </div>

                {/* Stats */}
                {stats.totalVisits !== undefined && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-lg bg-blue-900/20 p-4 border border-blue-800/50">
                            <p className="text-sm font-medium text-blue-300">Total Visits</p>
                            <p className="mt-1 text-2xl font-bold text-blue-400">{stats.totalVisits}</p>
                        </div>
                        <div className="rounded-lg bg-green-900/20 p-4 border border-green-800/50">
                            <p className="text-sm font-medium text-green-300">Avg Duration</p>
                            <p className="mt-1 text-2xl font-bold text-green-400">{formatDuration(stats.avgDuration)}</p>
                        </div>
                        <div className="rounded-lg bg-purple-900/20 p-4 border border-purple-800/50">
                            <p className="text-sm font-medium text-purple-300">Total Hours</p>
                            <p className="mt-1 text-2xl font-bold text-purple-400">
                                {Math.round((stats.totalDuration || 0) / 60)}h
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Attendance Table */}
            <div className="rounded-lg bg-slate-800 shadow border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-100">
                        Attendance Records ({attendanceData.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : attendanceData.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            No attendance records found
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead className="bg-slate-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Check-In
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Check-Out
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Duration
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Photos
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 bg-slate-800">
                                {attendanceData.map((attendance: any) => (
                                    <tr key={attendance._id} className="hover:bg-slate-700/50">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                                            {formatDate(attendance.checkInTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm font-medium text-slate-100">
                                                {attendance.userId?.name || 'Unknown'}
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                {attendance.userId?.phone || ''}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${attendance.userType === 'Member'
                                                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50'
                                                : 'bg-purple-900/30 text-purple-400 border border-purple-800/50'
                                                }`}>
                                                {attendance.userType}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                            {formatTime(attendance.checkInTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                            {formatTime(attendance.checkOutTime)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100">
                                            {formatDuration(attendance.duration)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                {attendance.checkInPhoto && (
                                                    <div className="relative group">
                                                        <img
                                                            src={attendance.checkInPhoto}
                                                            alt="Check-in"
                                                            className="h-12 w-12 rounded-lg object-cover cursor-pointer border-2 border-green-300 hover:border-green-500 transition"
                                                            onClick={() => setZoomedPhoto({ url: attendance.checkInPhoto, type: 'Check-In', name: attendance.userId?.name })}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                            <ZoomIn className="h-6 w-6 text-white drop-shadow-lg" />
                                                        </div>
                                                        <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">In</span>
                                                    </div>
                                                )}
                                                {attendance.checkOutPhoto && (
                                                    <div className="relative group">
                                                        <img
                                                            src={attendance.checkOutPhoto}
                                                            alt="Check-out"
                                                            className="h-12 w-12 rounded-lg object-cover cursor-pointer border-2 border-red-300 hover:border-red-500 transition"
                                                            onClick={() => setZoomedPhoto({ url: attendance.checkOutPhoto, type: 'Check-Out', name: attendance.userId?.name })}
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                            <ZoomIn className="h-6 w-6 text-white drop-shadow-lg" />
                                                        </div>
                                                        <span className="absolute -bottom-1 -right-1 bg-red-500 text-white text-xs px-1 rounded">Out</span>
                                                    </div>
                                                )}
                                                {!attendance.checkInPhoto && !attendance.checkOutPhoto && (
                                                    <span className="text-xs text-slate-500">No photos</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${attendance.status === 'checked-in'
                                                ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                                                : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                                                }`}>
                                                {attendance.status === 'checked-in' ? 'Active' : 'Completed'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            {attendance.status === 'checked-in' && (
                                                <button
                                                    onClick={() => handleCheckOut(attendance._id, attendance.userId?.name)}
                                                    disabled={checkingOut === attendance._id}
                                                    className="flex items-center rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    <LogOut className="mr-1 h-3 w-3" />
                                                    {checkingOut === attendance._id ? 'Processing...' : 'Check Out'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Photo Zoom Modal */}
            {zoomedPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
                    onClick={() => setZoomedPhoto(null)}
                >
                    <div className="relative max-w-4xl w-full">
                        {/* Close Button */}
                        <button
                            onClick={() => setZoomedPhoto(null)}
                            className="absolute -top-12 right-0 rounded-full bg-slate-800 p-2 text-slate-100 hover:bg-slate-700"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {/* Photo Info */}
                        <div className="mb-4 text-center">
                            <h3 className="text-xl font-bold text-white">
                                {zoomedPhoto.type} Photo - {zoomedPhoto.name}
                            </h3>
                        </div>

                        {/* Zoomed Image */}
                        <img
                            src={zoomedPhoto.url}
                            alt={zoomedPhoto.type}
                            className="w-full h-auto rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
