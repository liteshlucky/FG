'use client';

import React, { useState, useEffect } from 'react';
import { 
    Download, 
    ArrowUpRight, 
    ArrowDownRight, 
    Wallet, 
    CreditCard, 
    Banknote, 
    AlertTriangle,
    Trophy,
    ChevronDown
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import Link from 'next/link';
import clsx from 'clsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#06b6d4'];

export default function FinanceReportsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [expandedTrainers, setExpandedTrainers] = useState<Record<string, boolean>>({});
    const [filters, setFilters] = useState({
        dateRange: 'this_month',
        startDate: '',
        endDate: '',
    });

    const formatDateLocal = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateRangeChange = (range: string) => {
        const now = new Date();
        let start = '', end = '';

        switch (range) {
            case 'today':
                start = formatDateLocal(now);
                end = formatDateLocal(now);
                break;
            case 'this_week':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                start = formatDateLocal(startOfWeek);
                end = formatDateLocal(endOfWeek);
                break;
            case 'this_month':
                start = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
                end = formatDateLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
                break;
            case 'last_month':
                start = formatDateLocal(new Date(now.getFullYear(), now.getMonth() - 1, 1));
                end = formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 0));
                break;
            case 'this_year':
                start = formatDateLocal(new Date(now.getFullYear(), 0, 1));
                end = formatDateLocal(new Date(now.getFullYear(), 11, 31));
                break;
            case 'custom':
                setFilters(prev => ({ ...prev, dateRange: range }));
                return;
        }
        
        setFilters(prev => ({ ...prev, dateRange: range, startDate: start, endDate: end }));
    };

    // Initialize default filter
    useEffect(() => {
        handleDateRangeChange('this_month');
    }, []);

    // Fetch data when filters change
    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchAnalytics();
        }
    }, [filters.startDate, filters.endDate]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            params.append('_t', Date.now().toString());

            const res = await fetch(`/api/finance/analytics?${params.toString()}`, { cache: 'no-store' });
            const result = await res.json();
            
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch finance analytics', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-300 mb-2 font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null; // Return null instead of undefined
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Financial Analytics</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Deep dive into revenue and expenses
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={filters.dateRange}
                        onChange={(e) => handleDateRangeChange(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-800 text-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="today">Today</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="this_year">This Year</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    {filters.dateRange === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="rounded-lg border border-slate-700 bg-slate-800 text-slate-200 px-3 py-2 text-sm"
                            />
                            <span className="text-slate-500">to</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="rounded-lg border border-slate-700 bg-slate-800 text-slate-200 px-3 py-2 text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {loading || !data ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {(() => {
                        const ptRevenue = data.ptVsMembership?.find((item: any) => item.name === 'PT')?.value || 0;
                        const membershipRevenue = data.ptVsMembership?.find((item: any) => item.name === 'Membership')?.value || 0;

                        return (
                            <>
                    {/* Header KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-400">Total Income</p>
                                    <h3 className="text-3xl font-bold text-green-400 mt-2">{formatCurrency(data.summary.totalIncome)}</h3>
                                </div>
                                <div className="p-3 bg-green-500/10 rounded-lg">
                                    <ArrowUpRight className="h-6 w-6 text-green-500" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-400">Total Membership Revenue</p>
                                    <h3 className="text-3xl font-bold text-blue-400 mt-2">{formatCurrency(membershipRevenue)}</h3>
                                </div>
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <CreditCard className="h-6 w-6 text-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-6 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-400">Total PT Revenue</p>
                                    <h3 className="text-3xl font-bold text-orange-400 mt-2">{formatCurrency(ptRevenue)}</h3>
                                </div>
                                <div className="p-3 bg-orange-500/10 rounded-lg">
                                    <Banknote className="h-6 w-6 text-orange-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Breakdown */}
                        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-200 mb-6">Revenue Breakdown</h3>
                            {data.revenueBreakdown.length > 0 ? (
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.revenueBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {data.revenueBreakdown.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-72 flex items-center justify-center text-slate-500">No income records found.</div>
                            )}
                        </div>

                        {/* PT vs Membership Breakdown */}
                        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-200 mb-6">PT vs Membership</h3>
                            {data.ptVsMembership?.length > 0 ? (
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.ptVsMembership}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {data.ptVsMembership.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.name === 'PT' ? '#f97316' : entry.name === 'Membership' ? '#3b82f6' : '#8b5cf6'} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-72 flex items-center justify-center text-slate-500">No segment records found.</div>
                            )}
                        </div>
                    </div>

                    {/* Trainer Leaderboard Row */}
                    <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-sm overflow-hidden flex flex-col mb-6">
                        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-200">Trainer Leaderboard</h3>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 w-24">Rank</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Trainer</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Active PT Clients</th>
                                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Revenue Generated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                                    {!data.trainerLeaderboard || data.trainerLeaderboard.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                                                No trainer data found or loading. Please <button onClick={() => window.location.reload()} className="text-blue-400 underline">refresh the page</button>.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.trainerLeaderboard?.map((trainer: any, index: number) => (
                                            <React.Fragment key={trainer.id}>
                                                <tr 
                                                    className="hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                                    onClick={() => setExpandedTrainers(prev => ({ ...prev, [trainer.id]: !prev[trainer.id] }))}
                                                >
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                                                            index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                                            index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                                                            index === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30' :
                                                            'bg-slate-800 text-slate-500 border border-slate-700'
                                                        }`}>
                                                            #{index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden ring-2 ring-slate-800">
                                                                {trainer.profilePicture ? (
                                                                    <img src={trainer.profilePicture} alt={trainer.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    trainer.name.charAt(0)
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                                                {trainer.name}
                                                                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedTrainers[trainer.id] ? 'rotate-180' : ''}`} />
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-300">
                                                        <span className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 shadow-sm">
                                                            {trainer.ptCount} {trainer.ptCount === 1 ? 'Client' : 'Clients'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-emerald-400 text-right">
                                                        {formatCurrency(trainer.revenue)}
                                                    </td>
                                                </tr>
                                                {/* Expanded Section */}
                                                {expandedTrainers[trainer.id] && (
                                                    <tr>
                                                        <td colSpan={4} className="bg-slate-900/50 p-0 border-t border-slate-700/50">
                                                            <div className="px-12 py-5">
                                                                <h4 className="text-sm font-semibold text-slate-400 mb-3">Active PT Clients ({trainer.ptCount})</h4>
                                                                {trainer.clients && trainer.clients.length > 0 ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                        {trainer.clients.map((client: any) => (
                                                                            <div key={client.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col gap-1 hover:border-blue-500/50 transition-colors">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-sm font-medium text-slate-200">{client.name}</span>
                                                                                    <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{client.memberId}</span>
                                                                                </div>
                                                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                                                    <span>{new Date(client.ptStartDate).toLocaleDateString('en-GB')}</span>
                                                                                    <span className="text-slate-600 px-1">→</span>
                                                                                    <span className={new Date(client.ptEndDate) < new Date() ? 'text-red-400' : 'text-emerald-400'}>
                                                                                        {new Date(client.ptEndDate).toLocaleDateString('en-GB')}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-slate-500 italic">No active PT clients managed in this time period.</p>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MoM / Daily Trend Chart */}
                    <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-200 mb-6">Income vs Expense Trend</h3>
                        {data.trend.length > 0 ? (
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" stroke="#64748b" tick={{fill: '#64748b', fontSize: 13}} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 13}} tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`} axisLine={false} tickLine={false} />
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <Area type="monotone" name="Income" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                        <Area type="monotone" name="Expense" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-80 flex items-center justify-center text-slate-500">No trend data available for this range.</div>
                        )}
                    </div>

                    {/* Bottom Row: Payment Modes & Pending Dues */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Payment Modes */}
                        <div className="lg:col-span-1 space-y-4">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4">Payment Modes Received</h3>
                            
                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-500">
                                        <Banknote className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 font-medium">Cash</p>
                                        <p className="text-xl font-bold text-slate-200">{formatCurrency(data.paymentModes.cash || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-500/10 p-3 rounded-lg text-blue-500">
                                        <CreditCard className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 font-medium">Card</p>
                                        <p className="text-xl font-bold text-slate-200">{formatCurrency(data.paymentModes.card || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-purple-500/10 p-3 rounded-lg text-purple-500">
                                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 font-medium">UPI / Online</p>
                                        <p className="text-xl font-bold text-slate-200">{formatCurrency(data.paymentModes.upi || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pending Dues Table */}
                        <div className="lg:col-span-2 rounded-xl bg-slate-800 border border-slate-700 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <h3 className="text-lg font-semibold text-slate-200">Pending Dues & Outstanding Balances</h3>
                                </div>
                                <span className="bg-slate-900 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium">
                                    {data.pendingDues.length} Members
                                </span>
                            </div>
                            
                            <div className="overflow-x-auto flex-1 h-96">
                                <table className="min-w-full divide-y divide-slate-700">
                                    <thead className="bg-slate-900/50 sticky top-0">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Member</th>
                                            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Total Due</th>
                                            <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Paid</th>
                                            <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-amber-500">Outstanding Balance</th>
                                            <th className="px-5 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                                        {data.pendingDues.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-8 text-center text-sm text-emerald-400">
                                                    🎉 Great job! No outstanding dues found.
                                                </td>
                                            </tr>
                                        ) : (
                                            data.pendingDues.map((due: any) => (
                                                <tr key={due._id} className="hover:bg-slate-700/30 transition-colors group">
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-slate-200">{due.name}</div>
                                                        <div className="text-xs text-slate-400">{due.phone}</div>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-300">
                                                        {formatCurrency(due.totalDue)}
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-400">
                                                        {formatCurrency(due.totalPaid)}
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-amber-500 text-right">
                                                        {formatCurrency(due.balance)}
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-right">
                                                        <Link 
                                                            href={`/dashboard/members/${due.memberId || due._id}`}
                                                            className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            Collect
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                                                </>
                        );
                    })()}
                </>
            )}
        </div>
    );
}
