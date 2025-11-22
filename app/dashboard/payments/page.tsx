'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Filter, Download, Search } from 'lucide-react';

export default function PaymentsPage() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        paymentMode: '',
        paymentStatus: '',
        planType: '',
    });

    useEffect(() => {
        fetchPayments();
    }, [filters]);

    const fetchPayments = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
            if (filters.planType) params.append('planType', filters.planType);

            const res = await fetch(`/api/payments?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setPayments(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch payments', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter((payment: any) => {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = !filters.search ||
            payment.memberId?.name?.toLowerCase().includes(searchLower) ||
            payment.transactionId?.toLowerCase().includes(searchLower);
        const matchesMode = !filters.paymentMode || payment.paymentMode === filters.paymentMode;
        return matchesSearch && matchesMode;
    });

    const totalAmount = filteredPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);

    const exportToCSV = () => {
        const headers = ['Date', 'Member', 'Amount', 'Mode', 'Status', 'Transaction ID', 'Notes'];
        const rows = filteredPayments.map((payment: any) => [
            new Date(payment.paymentDate).toLocaleDateString(),
            payment.memberId?.name || 'N/A',
            payment.amount,
            payment.paymentMode,
            payment.paymentStatus,
            payment.transactionId || '',
            payment.notes || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Total: ₹{totalAmount.toLocaleString()} ({filteredPayments.length} payments)
                    </p>
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
            <div className="rounded-lg bg-white p-4 shadow">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search member or transaction..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={filters.paymentMode}
                        onChange={(e) => setFilters({ ...filters, paymentMode: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Payment Modes</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                    </select>

                    <select
                        value={filters.paymentStatus}
                        onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>

                    <select
                        value={filters.planType}
                        onChange={(e) => setFilters({ ...filters, planType: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Plan Types</option>
                        <option value="membership">Membership</option>
                        <option value="pt_plan">PT Plan</option>
                    </select>

                    <button
                        onClick={() => setFilters({ search: '', paymentMode: '', paymentStatus: '', planType: '' })}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Payments Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Member</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment: any) => (
                                    <tr key={payment._id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                            {new Date(payment.paymentDate).toLocaleDateString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.memberId?.name || 'N/A'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {payment.memberId?.email || ''}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                                            ₹{payment.amount.toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                                                {payment.paymentMode.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${payment.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                    payment.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {payment.paymentStatus.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                            {payment.transactionId || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="max-w-xs truncate" title={payment.notes}>
                                                {payment.notes || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
