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
                    <h1 className="text-2xl font-bold">{trainer.name}</h1>
                    <p className="text-sm text-gray-500 mb-1">ID: {trainer.trainerId || 'N/A'}</p>
                    <p className="text-gray-600">{trainer.specialization}</p>
                </div>
                <button
                    onClick={() => router.push(`/dashboard/trainers/${id}/edit`)}
                    className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    Edit Trainer
                </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded bg-gray-100 p-4">
                    <p className="text-sm text-gray-500">Base Salary</p>
                    <p className="text-lg font-medium">₹ {trainer.baseSalary || 0}</p>
                </div>
                <div className="rounded bg-gray-100 p-4">
                    <p className="text-sm text-gray-500">PT Fee</p>
                    <p className="text-lg font-medium">₹ {trainer.ptFee || 0}</p>
                </div>
                <div className="rounded bg-gray-100 p-4">
                    <p className="text-sm text-gray-500">Commission</p>
                    <p className="text-lg font-medium">
                        {trainer.commissionType === 'fixed'
                            ? `₹ ${trainer.commissionValue}`
                            : `${trainer.commissionValue}%`}
                    </p>
                </div>
                <div className="rounded bg-gray-100 p-4">
                    <p className="text-sm text-gray-500">Day Off</p>
                    <p className="text-lg font-medium">{trainer.dayOff || 'None'}</p>
                </div>
            </div>

            {/* Bank Details */}
            <div className="mt-6 rounded bg-gray-50 p-4 border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3">Bank Information</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Account Name</p>
                        <p className="font-medium">{trainer.bankDetails?.accountName || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Account Number</p>
                        <p className="font-medium">{trainer.bankDetails?.accountNumber || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Bank Name</p>
                        <p className="font-medium">{trainer.bankDetails?.bankName || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">IFSC Code</p>
                        <p className="font-medium">{trainer.bankDetails?.ifscCode || '-'}</p>
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
                <h2 className="text-lg font-medium">Salary & Payments</h2>
                <button
                    onClick={() => setSalaryModalOpen(true)}
                    className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                >
                    Generate & Pay Salary
                </button>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Month/Year</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Base (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Comm. (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Total (₹)</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Mode</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
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
                            <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                                No payment history found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const renderPtHistory = () => (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Member</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Amount (₹)</th>
                </tr>
            </thead>
            <tbody className="bg-white">
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

    return (
        <>
            <div className="p-6">
                {/* Tab Navigation */}
                <div className="mb-4 flex space-x-4">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-t ${activeTab === 'overview' ? 'bg-white shadow' : 'bg-gray-200'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`px-4 py-2 rounded-t ${activeTab === 'clients' ? 'bg-white shadow' : 'bg-gray-200'}`}
                    >
                        PT Members
                    </button>
                    <button
                        onClick={() => setActiveTab('salary')}
                        className={`px-4 py-2 rounded-t ${activeTab === 'salary' ? 'bg-white shadow' : 'bg-gray-200'}`}
                    >
                        Salary & Payments
                    </button>
                    <button
                        onClick={() => setActiveTab('pt')}
                        className={`px-4 py-2 rounded-t ${activeTab === 'pt' ? 'bg-white shadow' : 'bg-gray-200'}`}
                    >
                        PT History
                    </button>
                </div>
                <div className="bg-white p-4 rounded-b shadow">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'clients' && renderClients()}
                    {activeTab === 'salary' && renderSalaryAndPayments()}
                    {activeTab === 'pt' && renderPtHistory()}
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
