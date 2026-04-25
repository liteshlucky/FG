"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Avatar from '../../../../components/Avatar';
import SalaryModal from '@/components/SalaryModal';
import AttendanceCalendar from '@/components/AttendanceCalendar';

export default function TrainerDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const [trainer, setTrainer] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [payments, setPayments] = useState([]);
    const [ptHistory, setPtHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [salaryModalOpen, setSalaryModalOpen] = useState(false);
    const [salaryEstimate, setSalaryEstimate] = useState<any>(null);

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
        // Fetch current cycle salary estimate
        fetch(`/api/trainers/${id}/salary`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) setSalaryEstimate(data.data);
            });
    }, [id]);

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                    <p className="text-sm text-slate-400">PT Target</p>
                    <p className="text-lg font-medium text-slate-100">{trainer.ptTarget || 20}</p>
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
        <div className="space-y-4">
            <h2 className="text-lg font-medium text-slate-100 mb-4">PT Members ({clients.length})</h2>
            {clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client: any) => (
                        <div key={client._id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-500/50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar name={client.name} src={client.profilePicture} size="md" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-200">{client.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{client.memberId}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700/50 mt-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-slate-400">Plan</span>
                                    <span className="text-xs font-medium text-slate-300">{client.ptPlanId?.name || 'Manual Assignment'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Validity</span>
                                    <div className="text-xs font-medium flex items-center gap-1">
                                        <span className="text-slate-300">{client.ptStartDate ? new Date(client.ptStartDate).toLocaleDateString('en-GB') : '-'}</span>
                                        <span className="text-slate-500">→</span>
                                        <span className={client.ptEndDate && new Date(client.ptEndDate) < new Date() ? 'text-red-400' : 'text-emerald-400'}>
                                            {client.ptEndDate ? new Date(client.ptEndDate).toLocaleDateString('en-GB') : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                                                    
                            <button 
                                onClick={() => router.push(`/dashboard/members/${client.memberId || client._id}`)}
                                className="w-full mt-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold py-2 rounded-lg transition-colors"
                            >
                                View Profile
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 border border-slate-700 rounded-lg bg-slate-900/50">
                    No active PT members assigned.
                </div>
            )}
        </div>
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

            {/* Estimated Incentive Summary */}
            {salaryEstimate && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Cycle Estimate</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {new Date(salaryEstimate.cycleStart).toLocaleDateString('en-GB')} to {new Date(salaryEstimate.cycleEnd).toLocaleDateString('en-GB')}
                            </p>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Total PT Clients</p>
                                <p className="text-xl font-bold text-slate-200">{salaryEstimate.totalAssignedMembers}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Cycle Payments</p>
                                <p className="text-xl font-bold text-blue-400">{salaryEstimate.cyclePaymentCount}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Est. PT Incentive</p>
                                <p className="text-xl font-bold text-emerald-400">₹{salaryEstimate.commissionAmount.toLocaleString()}</p>
                            </div>
                            {salaryEstimate.leaveDays > 0 && (
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Leaves ({salaryEstimate.leaveDays})</p>
                                    <p className="text-xl font-bold text-red-400">- ₹{salaryEstimate.leaveDeduction.toLocaleString()}</p>
                                </div>
                            )}
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Est. Net Salary</p>
                                <p className="text-xl font-bold text-blue-400">₹{salaryEstimate.totalSalary.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown Table */}
                    <div className="mt-4 border-t border-slate-700/50 pt-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Calculation Breakdown</h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/30">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">Member</th>
                                        <th className="px-4 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">Paid On</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-medium text-slate-500 uppercase">Plan</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-medium text-slate-500 uppercase">Monthly Rev</th>
                                        <th className="px-4 py-2 text-center text-[10px] font-medium text-slate-500 uppercase">Rate</th>
                                        <th className="px-4 py-2 text-right text-[10px] font-medium text-slate-500 uppercase">Incentive</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {salaryEstimate.memberDetails?.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="text-xs font-medium text-slate-200">{item.name}</div>
                                                <div className="text-[10px] text-slate-500">{item.memberId}</div>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-slate-400">
                                                {new Date(item.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-2 text-right text-xs text-slate-400">
                                                ₹{item.planPrice?.toLocaleString()} / {item.months}m
                                            </td>
                                            <td className="px-4 py-2 text-right text-xs font-medium text-slate-300">
                                                ₹{Math.round(item.monthlyRevenue).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.rate === 50 ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                                    {item.rate}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right text-xs font-bold text-emerald-400">
                                                ₹{item.incentive.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900/50">
                    <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Date</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Month/Year</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Base (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Comm. (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Leaves (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Total (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Mode</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-slate-400">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-slate-800 text-slate-100">
                    {payments.length > 0 ? (
                        payments.map((p: any, idx) => (
                            <tr key={idx} className="border-t">
                                <td className="px-4 py-2 text-sm">{new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                <td className="px-4 py-2 text-sm">{p.month} {p.year}</td>
                                <td className="px-4 py-2 text-sm">{p.baseSalary}</td>
                                <td className="px-4 py-2 text-sm">{p.commissionAmount}</td>
                                <td className="px-4 py-2 text-sm">
                                    {p.leaveDays > 0 ? (
                                        <span className="text-red-400">-{p.leaveDeduction} ({p.leaveDays}d)</span>
                                    ) : '-'}
                                </td>
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
                        <td className="px-4 py-2 text-sm">{new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                        <td className="px-4 py-2 text-sm">{p.memberId}</td>
                        <td className="px-4 py-2 text-sm">{p.amount}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderAttendanceHistory = () => (
        <div className="h-[650px]">
            <AttendanceCalendar userId={id as string} userType="Trainer" />
        </div>
    );

    return (
        <>
            <div className="p-6">
                {/* Trainer Header - Always Visible */}
                <div className="flex items-center space-x-4 mb-6 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <Avatar name={trainer.name} src={trainer.profilePicture} size="lg" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">{trainer.name}</h1>
                        <p className="text-sm text-slate-400 mb-1">ID: {trainer.trainerId || 'N/A'}</p>
                        <p className="text-slate-300">{trainer.specialization}</p>
                    </div>
                    <button
                        onClick={() => router.push(`/dashboard/staff/${id}/edit`)}
                        className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Edit Staff
                    </button>
                </div>

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
