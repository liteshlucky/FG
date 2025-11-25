'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Filter, Download, Search, Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import TransactionModal from '@/components/TransactionModal';

export default function FinancePage() {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0 });
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        type: '', // 'income', 'expense'
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        // Set default date range to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setFilters(prev => ({ ...prev, startDate: firstDay, endDate: lastDay }));
    }, []);

    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchFinanceData();
        }
    }, [filters.startDate, filters.endDate, filters.type]);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.type) params.append('type', filters.type);

            const res = await fetch(`/api/finance?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data.records);
                setSummary(data.data.summary);
            }
        } catch (error) {
            console.error('Failed to fetch finance data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/finance?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                fetchFinanceData();
            } else {
                alert(data.error || 'Failed to delete transaction');
            }
        } catch (error) {
            console.error('Delete error', error);
            alert('Failed to delete transaction');
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter((t: any) => {
        const searchLower = filters.search.toLowerCase();
        return !filters.search ||
            t.title.toLowerCase().includes(searchLower) ||
            t.category?.toLowerCase().includes(searchLower);
    });

    const exportToCSV = () => {
        const headers = ['Date', 'Title', 'Category', 'Type', 'Amount', 'Mode'];
        const rows = filteredTransactions.map((t: any) => [
            new Date(t.date).toLocaleDateString(),
            t.title,
            t.category || '-',
            t.type,
            t.amount,
            t.mode
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-${filters.startDate}-to-${filters.endDate}.csv`;
        a.click();
    };

    if (loading && !transactions.length) return <div className="p-8 text-center">Loading Finance Data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Overview from {new Date(filters.startDate).toLocaleDateString()} to {new Date(filters.endDate).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </button>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                    <dt className="truncate text-sm font-medium text-gray-500">Total Income</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">₹ {summary.totalIncome.toLocaleString()}</dd>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                        <TrendingUp className="mr-1 h-4 w-4" /> Income
                    </div>
                </div>
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                    <dt className="truncate text-sm font-medium text-gray-500">Total Expense</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight text-red-600">₹ {summary.totalExpense.toLocaleString()}</dd>
                    <div className="mt-2 flex items-center text-sm text-red-600">
                        <TrendingDown className="mr-1 h-4 w-4" /> Expenses
                    </div>
                </div>
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                    <dt className="truncate text-sm font-medium text-gray-500">Net Balance</dt>
                    <dd className={`mt-1 text-3xl font-semibold tracking-tight ${summary.netBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        ₹ {summary.netBalance.toLocaleString()}
                    </dd>
                    <div className="mt-2 text-sm text-gray-500">Net Profit/Loss</div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-lg bg-white p-4 shadow">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">All Types</option>
                        <option value="income">Income Only</option>
                        <option value="expense">Expense Only</option>
                    </select>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                        No transactions found for this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t: any) => (
                                    <tr key={t._id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                            {new Date(t.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {t.title}
                                            {t.isSystem && <span className="ml-2 inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">System</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{t.category}</td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {t.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 capitalize">
                                            {t.mode?.replace('_', ' ') || '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            {!t.isSystem && (
                                                <button
                                                    onClick={() => handleDelete(t._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Transaction"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchFinanceData}
            />
        </div>
    );
}
