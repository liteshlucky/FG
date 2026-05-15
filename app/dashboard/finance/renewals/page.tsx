'use client';

import { useState, useEffect } from 'react';
import { 
    Download, 
    ArrowUpRight, 
    ArrowDownRight, 
    Wallet, 
    CreditCard, 
    Banknote, 
    AlertTriangle,
    Users,
    MessageCircle,
    CalendarDays
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import Link from 'next/link';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function RenewalsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'renewed'>('all');
    const [planFilter, setPlanFilter] = useState<string>('all');

    useEffect(() => {
        // Initialize with current month in YYYY-MM format
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${yyyy}-${mm}`);
    }, []);

    useEffect(() => {
        if (selectedMonth) {
            fetchRenewals();
        }
    }, [selectedMonth]);

    const fetchRenewals = async () => {
        setLoading(true);
        try {
            const [year, month] = selectedMonth.split('-');
            const res = await fetch(`/api/finance/renewals?month=${month}&year=${year}`);
            const result = await res.json();
            
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch renewals data', error);
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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const handleWhatsAppReminder = (phone: string, name: string, date: string) => {
        const message = `Hi ${name}, this is a gentle reminder from the gym that your membership is due for renewal around ${formatDate(date)}. Please let us know if you need any assistance with the renewal process!`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-300 mb-2 font-medium">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                            {entry.name}: {entry.name.includes('Revenue') ? formatCurrency(entry.value) : entry.value}
                            {entry.payload && entry.name.includes('Revenue') ? ` (${entry.name === 'Expected Revenue' ? entry.payload['Pending Count'] : entry.payload['Renewed Count']} members)` : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-300 font-medium mb-1">{data.name}</p>
                    <p className="text-sm font-semibold" style={{ color: data.fill }}>
                        Count: {data.value} members
                    </p>
                    <p className="text-sm font-semibold" style={{ color: data.fill }}>
                        Amount: {formatCurrency(data.amount)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
        const radius = outerRadius * 1.1;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
      
        return (
          <text x={x} y={y} fill={payload.fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
            {payload.value} ({formatCurrency(payload.amount)})
          </text>
        );
    };

    if (!selectedMonth) return null;

    const countData = data ? [
        { name: 'Pending Renewals', value: data.metrics.pendingCount, amount: data.metrics.expectedRevenue, fill: '#f59e0b' },
        { name: 'Successful Renewals', value: data.metrics.renewedCount, amount: data.metrics.realizedRevenue, fill: '#10b981' }
    ].filter(item => item.value > 0) : [];

    const planStats: Record<string, { expected: number, realized: number, pendingCount: number, renewedCount: number }> = {};

    if (data) {
        data.pendingList.forEach((p: any) => {
            const name = p.planName || 'Unknown';
            if (!planStats[name]) planStats[name] = { expected: 0, realized: 0, pendingCount: 0, renewedCount: 0 };
            planStats[name].expected += p.expectedRevenue;
            planStats[name].pendingCount += 1;
        });
        data.renewedList.forEach((r: any) => {
            const name = r.planType || 'Unknown';
            if (!planStats[name]) planStats[name] = { expected: 0, realized: 0, pendingCount: 0, renewedCount: 0 };
            planStats[name].realized += r.amount;
            planStats[name].renewedCount += 1;
        });
    }

    const planRevenueData = Object.keys(planStats).map(plan => ({
        name: plan,
        'Expected Revenue': planStats[plan].expected,
        'Realized Revenue': planStats[plan].realized,
        'Pending Count': planStats[plan].pendingCount,
        'Renewed Count': planStats[plan].renewedCount
    })).sort((a, b) => (b['Expected Revenue'] + b['Realized Revenue']) - (a['Expected Revenue'] + a['Realized Revenue']));

    const combinedList: any[] = [];
    if (data) {
        data.pendingList.forEach((item: any) => combinedList.push({ ...item, type: 'pending' }));
        data.renewedList.forEach((item: any) => combinedList.push({ ...item, type: 'renewed' }));
        combinedList.sort((a, b) => {
            const dateA = new Date(a.type === 'pending' ? a.expirationDate : a.paymentDate);
            const dateB = new Date(b.type === 'pending' ? b.expirationDate : b.paymentDate);
            return dateB.getTime() - dateA.getTime(); // Sort descending (newest dates first)
        });
    }

    // Collect unique plans for filter dropdown
    const uniquePlans = Array.from(new Set(combinedList.map(item => item.type === 'pending' ? item.planName : item.planType))).filter(Boolean).sort();

    const filteredList = combinedList.filter(item => {
        const statusMatch = statusFilter === 'all' || item.type === statusFilter;
        const itemPlan = item.type === 'pending' ? item.planName : item.planType;
        const planMatch = planFilter === 'all' || itemPlan === planFilter;
        return statusMatch && planMatch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Renewals Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Track upcoming expirations and realized renewal revenue
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-sm">
                    <CalendarDays className="h-5 w-5 text-slate-400 ml-2" />
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent border-none text-slate-200 focus:ring-0 text-sm cursor-pointer outline-none font-medium"
                    />
                </div>
            </div>

            {loading || !data ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <p className="text-sm font-medium text-slate-400 mb-1">Expected Renewals</p>
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-amber-500">{data.metrics.pendingCount}</h3>
                                <Users className="h-5 w-5 text-amber-500/50" />
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <p className="text-sm font-medium text-slate-400 mb-1">Pending Revenue</p>
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-amber-500">{formatCurrency(data.metrics.expectedRevenue)}</h3>
                                <Wallet className="h-5 w-5 text-amber-500/50" />
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <p className="text-sm font-medium text-slate-400 mb-1">Conversion Rate</p>
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-blue-400">{data.metrics.conversionRate}%</h3>
                                <ArrowUpRight className="h-5 w-5 text-blue-400/50" />
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <p className="text-sm font-medium text-slate-400 mb-1">Successful Renewals</p>
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-emerald-400">{data.metrics.renewedCount}</h3>
                                <Users className="h-5 w-5 text-emerald-400/50" />
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-5 flex flex-col justify-between hover:bg-slate-800 transition-colors">
                            <p className="text-sm font-medium text-slate-400 mb-1">Realized Revenue</p>
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-emerald-400">{formatCurrency(data.metrics.realizedRevenue)}</h3>
                                <Banknote className="h-5 w-5 text-emerald-400/50" />
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Breakdown (Pie) */}
                        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-200 mb-6">Renewal Status Breakdown</h3>
                            {countData.length > 0 ? (
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={countData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={renderCustomizedLabel}
                                                labelLine={true}
                                            >
                                                {countData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<PieTooltip />} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-72 flex items-center justify-center text-slate-500">No data for this month.</div>
                            )}
                        </div>

                        {/* Revenue Comparison (Bar) */}
                        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-200 mb-6">Revenue & Renewals by Package</h3>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={planRevenueData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} angle={-45} textAnchor="end" />
                                        <YAxis stroke="#94a3b8" tickFormatter={(val) => `₹${val/1000}k`} tickLine={false} axisLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1e293b'}} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <Bar dataKey="Expected Revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="Realized Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Data Tables */}
                    <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="text-lg font-semibold text-slate-200">All Renewals ({filteredList.length})</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <select 
                                    value={planFilter}
                                    onChange={(e) => setPlanFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2 outline-none"
                                >
                                    <option value="all">All Packages</option>
                                    {uniquePlans.map((plan: any) => (
                                        <option key={plan} value={plan}>{plan}</option>
                                    ))}
                                </select>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2 outline-none"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="pending">Pending Only</option>
                                    <option value="renewed">Renewed Only</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="min-w-full divide-y divide-slate-700">
                                <thead className="bg-slate-900/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Member</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Date</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Package</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Revenue</th>
                                        <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                                        <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                                    {filteredList.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                                                No renewals found for the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredList.map((item: any, idx: number) => {
                                            const isPending = item.type === 'pending';
                                            const dateStr = isPending ? item.expirationDate : item.paymentDate;
                                            const revenueStr = isPending ? item.expectedRevenue : item.amount;
                                            const packageStr = isPending ? item.planName : item.planType;
                                            const memberLink = `/dashboard/members/${item.memberIdStr || item.memberId || item._id}`;
                                            
                                            return (
                                                <tr key={item._id || idx} className="hover:bg-slate-700/30 transition-colors group">
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <Link href={memberLink} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                                            {item.name}
                                                        </Link>
                                                        <div className="text-xs text-slate-400 mt-1 flex flex-col gap-0.5">
                                                            <span className="text-slate-300">ID: {item.memberId || '-'}</span>
                                                            <span>{item.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <span className="text-sm text-slate-300 font-medium">
                                                            {formatDate(dateStr)}
                                                        </span>
                                                        <div className="text-[10px] text-slate-500 mt-0.5">{isPending ? 'Expires' : 'Paid'}</div>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-300">
                                                        {packageStr}
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium">
                                                        <span className={isPending ? 'text-amber-500' : 'text-emerald-400'}>
                                                            {formatCurrency(revenueStr)}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        {isPending ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                                    Pending
                                                                </span>
                                                                {new Date(dateStr) < new Date() && (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                                        Overdue
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                Renewed
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {isPending && (
                                                                <button 
                                                                    onClick={() => handleWhatsAppReminder(item.phone, item.name, dateStr)}
                                                                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
                                                                >
                                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                                    Remind
                                                                </button>
                                                            )}
                                                            <Link 
                                                                href={`/dashboard/members/${item.memberIdStr || item.memberId || item._id}`}
                                                                className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded transition-colors"
                                                            >
                                                                Profile
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
