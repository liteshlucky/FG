"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Avatar from '../../../../components/Avatar';
import SalaryModal from '@/components/SalaryModal';
import AttendanceModal from '@/components/AttendanceModal';

export default function TrainerDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const [trainer, setTrainer] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [payments, setPayments] = useState([]);
    const [ptHistory, setPtHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [salaryModalOpen, setSalaryModalOpen] = useState(false);

    // Attendance State
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceFilter, setAttendanceFilter] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
        endDate: new Date().toISOString().split('T')[0] // Today
    });

    useEffect(() => {
        // Fetch trainer basic info
        fetch(`/api/trainers/${id}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setTrainer(data.data);
            });
        // Fetch linked members
        fetch(`/api/trainers/${id}/clients`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setClients(data.data);
            });
        // Payment history
        fetchPayments();
        // PT payment history
        fetch(`/api/trainers/${id}/pt-history`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setPtHistory(data.data);
            });
    }, [id]);

    useEffect(() => {
        if (activeTab === 'attendance') {
            fetchAttendance();
        }
    }, [activeTab, attendanceFilter]);

    const fetchAttendance = async () => {
        setAttendanceLoading(true);
        try {
            const query = new URLSearchParams({
                userId: id as string,
                userType: 'Trainer',
                startDate: attendanceFilter.startDate,
                endDate: attendanceFilter.endDate
            });
            const res = await fetch(`/api/attendance/history?${query.toString()}`);
            const data = await res.json();
            if (data.success) {
                setAttendanceHistory(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const fetchPayments = () => {
        fetch(`/api/trainers/${id}/payments`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setPayments(data.data);
            });
    };

    if (!trainer) return <div className="p-4">Loading...</div>;

    const renderOverview = () => (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <Avatar name={trainer.name} src={trainer.profilePicture} size="lg" />
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">{trainer.name}</h1>
                    <p className="text-sm text-slate-400 mb-1">ID: {trainer.trainerId || 'N/A'}</p>
                    <p className="text-slate-300">{trainer.specialization}</p>
                </div>
                <button
                    onClick={() => router.push(`/dashboard/staff/${id}/edit`)}
                    className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Edit Staff
                </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-slate-700 p-4">
                    <p className="text-sm text-slate-400">Base Salary</p>
                    <p className="text-lg font-medium text-slate-100">₹ {trainer.baseSalary || 0}</p>
                </div>
                <div className="rounded bg-slate-700 p-4">
                    <p className="text-sm text-slate-400">PT Fee</p>
                    <p className="text-lg font-medium text-slate-100">₹ {trainer.ptFee || 0}</p>
                </div>
                <div className="rounded bg-slate-700 p-4">
                    <p className="text-sm text-slate-400">Commission</p>
                    <p className="text-lg font-medium text-slate-100">
                        {trainer.commissionType === 'fixed'
                            ? `₹ ${trainer.commissionValue}`
                            : `${trainer.commissionValue}%`}
                    </p>
                </div>
                <div className="rounded bg-slate-700 p-4">
                    <p className="text-sm text-slate-400">Day Off</p>
                    <p className="text-lg font-medium text-slate-100">{trainer.dayOff || 'None'}</p>
                </div>
            </div>

            {/* Bank Details */}
            <div className="mt-6 rounded bg-slate-700 p-4 border border-slate-600">
                <h3 className="text-md font-medium text-slate-100 mb-3">Bank Information</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-slate-400">Account Name</p>
                        <p className="font-medium text-slate-100">{trainer.bankDetails?.accountName || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Account Number</p>
                        <p className="font-medium text-slate-100">{trainer.bankDetails?.accountNumber || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Bank Name</p>
                        <p className="font-medium text-slate-100">{trainer.bankDetails?.bankName || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">IFSC Code</p>
                        <p className="font-medium text-slate-100">{trainer.bankDetails?.ifscCode || '-'}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderClients = () => (
        <ul className="space-y-2">
            {clients.map((c) => (
                <li key={c._id} className="flex items-center space-x-3">
                    <Avatar name={c.name} src={c.profilePicture} size="sm" />
                    <span>{c.name}</span>
                </li>
            ))}
        </ul>
    );

    const renderSalaryAndPayments = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-slate-100">Salary & Payments</h2>
                <button
                    onClick={() => setSalaryModalOpen(true)}
                    className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                    Generate & Pay Salary
                </button>
            </div>

            <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                    <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Date</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Month/Year</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Base (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Comm. (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Total (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Mode</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-slate-800 text-slate-100">
                    {payments.length > 0 ? (
                        payments.map((p: any, idx) => (
                            <tr key={idx} className="border-t">
                                <td className="px-4 py-2 text-sm">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-sm">{p.month} {p.year}</td>
                                <td className="px-4 py-2 text-sm">{p.baseSalary}</td>
                                <td className="px-4 py-2 text-sm">{p.commissionAmount}</td>
                                <td className="px-4 py-2 text-sm font-medium">{p.amount}</td>
                                <td className="px-4 py-2 text-sm capitalize">{p.paymentMode.replace('_', ' ')}</td>
                                <td className="px-4 py-2 text-sm">
                                    <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                                        {p.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="px-4 py-4 text-center text-sm text-slate-400">
                                No payment history found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderPtHistory = () => (
        <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900/50">
                <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Member</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Amount (₹)</th>
                </tr>
            </thead>
            <tbody className="bg-slate-800 text-slate-100">
                {ptHistory.map((p, idx) => (
                    <tr key={idx} className="border-t">
                        <td className="px-4 py-2 text-sm">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm">{p.memberId}</td>
                        <td className="px-4 py-2 text-sm">{p.amount}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderAttendanceHistory = () => (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex space-x-4 items-end mb-4 bg-slate-700/50 p-3 rounded-lg border border-slate-700">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={attendanceFilter.startDate}
                        onChange={(e) => setAttendanceFilter({ ...attendanceFilter, startDate: e.target.value })}
                        className="rounded bg-slate-800 border border-slate-600 text-slate-100 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                    <input
                        type="date"
                        value={attendanceFilter.endDate}
                        onChange={(e) => setAttendanceFilter({ ...attendanceFilter, endDate: e.target.value })}
                        className="rounded bg-slate-800 border border-slate-600 text-slate-100 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div className="pb-0.5">
                    <button
                        onClick={fetchAttendance}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm transition-colors"
                    >
                        Apply Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded border border-slate-700">
                {attendanceLoading ? (
                    <div className="p-8 text-center text-slate-400">Loading attendance history...</div>
                ) : attendanceHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        No attendance records found for this period.
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Check-In</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Check-Out</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Duration</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                            {attendanceHistory.map((record) => (
                                <tr key={record._id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                        {new Date(record.checkInTime).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                        {new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300">
                                        {record.checkOutTime
                                            ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-300 font-medium">
                                        {record.duration ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${record.status === 'checked-in'
                                            ? 'bg-green-900/30 text-green-400 border border-green-800/50'
                                            : 'bg-slate-700 text-slate-300 border border-slate-600'
                                            }`}>
                                            {record.status === 'checked-in' ? 'Active' : 'Completed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="p-6">
                {/* Tab Navigation */}
                <div className="mb-4 flex space-x-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-t transition-colors ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`px-4 py-2 rounded-t transition-colors ${activeTab === 'clients' ? 'bg-slate-800 text-white shadow' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        PT Members
                    </button>
                    <button
                        onClick={() => setActiveTab('salary')}
                        className={`px-4 py-2 rounded-t transition-colors ${activeTab === 'salary' ? 'bg-slate-800 text-white shadow' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        Salary & Payments
                    </button>
                    <button
                        onClick={() => setActiveTab('pt')}
                        className={`px-4 py-2 rounded-t transition-colors ${activeTab === 'pt' ? 'bg-slate-800 text-white shadow' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        PT History
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`px-4 py-2 rounded-t transition-colors ${activeTab === 'attendance' ? 'bg-slate-800 text-white shadow' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        Attendance
                    </button>
                </div>
                <div className="bg-slate-800 p-4 rounded-b shadow border border-slate-700">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'clients' && renderClients()}
                    {activeTab === 'salary' && renderSalaryAndPayments()}
                    {activeTab === 'pt' && renderPtHistory()}
                    {activeTab === 'attendance' && renderAttendanceHistory()}
                </div>
            </div>
            <SalaryModal
                isOpen={salaryModalOpen}
                onClose={() => setSalaryModalOpen(false)}
                trainerId={id as string}
                onPaymentSuccess={fetchPayments}
            />
        </>
    );
}
