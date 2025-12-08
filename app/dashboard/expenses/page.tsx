'use client';

import { useState, useEffect } from 'react';
import {
    DollarSign, Filter, Download, Search, Plus,
    TrendingDown, Trash2, PieChart, Calendar
} from 'lucide-react';
import TransactionModal from '@/components/TransactionModal';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';

export default function ExpensesPage() {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalExpense: 0 });
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: '',
        category: ''
    });

    // Predefined categories matching TransactionModal
    const EXPENSE_CATEGORIES = [
        'Rent', 'Salary', 'Equipment', 'Utilities',
        'Maintenance', 'Marketing', 'Cleaning', 'Other'
    ];

    const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setFilters(prev => ({ ...prev, startDate: firstDay, endDate: lastDay }));
    }, []);

    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchExpenses();
        }
    }, [filters.startDate, filters.endDate]);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            params.append('type', 'expense'); // Force expense type

            const res = await fetch(`/api/finance?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data.records);
                setSummary(data.data.summary);
            }
        } catch (error) {
            console.error('Failed to fetch expenses', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            const res = await fetch(`/api/finance?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) fetchExpenses();
            else alert(data.error || 'Failed to delete');
        } catch (error) {
            console.error('Delete error', error);
            alert('Failed to delete');
        }
    };

    // Filter logic
    const filteredTransactions = transactions.filter((t: any) => {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = !filters.search ||
            t.title.toLowerCase().includes(searchLower) ||
            t.category?.toLowerCase().includes(searchLower);
        const matchesCategory = !filters.category || t.category === filters.category;
        return matchesSearch && matchesCategory;
    });

    // Analytics Data Preparation
    const categoryData = EXPENSE_CATEGORIES.map(cat => {
        const total = transactions
            .filter((t: any) => t.category === cat)
            .reduce((sum, t: any) => sum + t.amount, 0);
        return { name: cat, value: total };
    }).filter(item => item.value > 0);

    const dailyData = (() => {
        const days: any = {};
        transactions.forEach((t: any) => {
            const date = new Date(t.date).toLocaleDateString();
            days[date] = (days[date] || 0) + t.amount;
        });
        return Object.keys(days).map(date => ({ date, amount: days[date] }));
    })();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Expense Management</h1>
                    <p className="text-sm text-slate-400">
                        Track and manage operational costs
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-500/20 hover:bg-rose-500 hover:shadow-rose-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                </button>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Total Expense Card */}
                <div className="rounded-xl bg-slate-900 p-6 shadow-sm border border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Expenses</p>
                            <h3 className="mt-2 text-3xl font-bold text-slate-100">
                                ₹ {summary.totalExpense.toLocaleString()}
                            </h3>
                        </div>
                        <div className="rounded-full bg-rose-500/10 p-3">
                            <TrendingDown className="h-6 w-6 text-rose-500" />
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                        For period {new Date(filters.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(filters.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>

                {/* Category Breakdown Chart */}
                <div className="lg:col-span-2 rounded-xl bg-slate-900 p-6 shadow-sm border border-slate-800">
                    <h3 className="mb-4 text-sm font-medium text-slate-100">Expense Breakdown</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Filters & Table */}
            <div className="rounded-xl bg-slate-900 shadow-sm border border-slate-800 overflow-hidden">
                {/* Filters Toolbar */}
                <div className="border-b border-slate-800 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search expenses..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                        </div>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                            <option value="">All Categories</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Mode</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading...</td></tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No expenses found.</td></tr>
                            ) : (
                                filteredTransactions.map((t: any) => (
                                    <tr key={t._id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-100">
                                            {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-100">
                                            {t.title}
                                            {t.isSystem && <span className="ml-2 inline-flex items-center rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-700">System</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300 border border-slate-700">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-rose-400">
                                            ₹{t.amount.toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 capitalize">
                                            {t.mode?.replace('_', ' ') || '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            {!t.isSystem && (
                                                <button
                                                    onClick={() => handleDelete(t._id)}
                                                    className="text-slate-500 hover:text-rose-400 transition-colors"
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
                onSuccess={fetchExpenses}
                defaultType="expense"
            />
        </div>
    );
}
