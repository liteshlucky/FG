'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, DollarSign, Download, Upload, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PaymentForm from '@/components/PaymentForm';
import Avatar from '@/components/Avatar';

export default function MembersPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const router = useRouter();

    const [importing, setImporting] = useState(false);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'memberId', direction: 'desc' });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalMembers, setTotalMembers] = useState(0);

    // Fetch members when filters/sort/page changes
    useEffect(() => {
        fetchMembers();
    }, [searchQuery, statusFilter, paymentStatusFilter, typeFilter, sortConfig, currentPage]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            // Build query params for server-side filtering
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '50',
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction,
                search: searchQuery,
                status: statusFilter,
                paymentStatus: paymentStatusFilter,
                type: typeFilter
            });

            const res = await fetch(`/api/members?${params}`);
            const data = await res.json();
            if (data.success) {
                setMembers(data.data);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                    setTotalMembers(data.pagination.total);
                }
            }
        } catch (error) {
            console.error('Failed to fetch members', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this member?')) return;

        try {
            const res = await fetch(`/api/members/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchMembers();
            }
        } catch (error) {
            console.error('Failed to delete member', error);
        }
    };

    const handleRecordPayment = (member: any) => {
        setSelectedMember(member);
        setShowPaymentForm(true);
    };

    const handlePaymentSuccess = () => {
        fetchMembers();
    };

    // No client-side filtering needed - all done on server!
    // Members are already filtered, sorted, and paginated

    const handleSort = (key: string) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
        setCurrentPage(1); // Reset to first page when sorting changes
    };

    const handleExport = () => {
        if (!members.length) return;

        // Define CSV headers
        const headers = [
            'Member ID', 'Name', 'Email', 'Phone', 'Status', 'Plan ID', 'Plan Name',
            'Age', 'Gender', 'Height (cm)', 'Weight (kg)', 'Chest (in)', 'Waist (in)', 'Hips (in)', 'Arms (in)', 'Thighs (in)',
            'Medical History', 'Goals'
        ];

        // Convert members data to CSV rows
        const rows = members.map((m: any) => [
            m.memberId || '',
            `"${m.name}"`, // Quote strings to handle commas
            m.email,
            m.phone,
            m.status,
            m.planId?._id || '',
            `"${m.planId?.name || ''}"`,
            m.age || '',
            m.gender || '',
            m.bodyMeasurements?.height || '',
            m.bodyMeasurements?.weight || '',
            m.bodyMeasurements?.chest || '',
            m.bodyMeasurements?.waist || '',
            m.bodyMeasurements?.hips || '',
            m.bodyMeasurements?.arms || '',
            m.bodyMeasurements?.thighs || '',
            `"${(m.medicalHistory || '').replace(/"/g, '""')}"`, // Escape quotes
            `"${(m.goals || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row: any) => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'members_export.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csvText = event.target?.result as string;
                const lines = csvText.split('\n');
                const headers = lines[0].split(',').map((h: string) => h.trim());

                const membersData: any[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    // Simple CSV parser (handles quoted strings)
                    const values: string[] = [];
                    let current = '';
                    let inQuotes = false;
                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim());

                    // Map values to object based on headers
                    const member: any = { bodyMeasurements: {} };

                    // Helper to safely get value
                    const getVal = (idx: number) => {
                        let val = values[idx] || '';
                        // Remove surrounding quotes and unescape double quotes
                        if (val.startsWith('"') && val.endsWith('"')) {
                            val = val.slice(1, -1).replace(/""/g, '"');
                        }
                        return val;
                    };

                    // Mapping logic (adjust indices based on header order)
                    // 'Member ID', 'Name', 'Email', 'Phone', 'Status', 'Plan ID', 'Plan Name',
                    // 'Age', 'Gender', 'Height (cm)', 'Weight (kg)', 'Chest (in)', 'Waist (in)', 'Hips (in)', 'Arms (in)', 'Thighs (in)',
                    // 'Medical History', 'Goals'

                    member.memberId = getVal(0);
                    member.name = getVal(1);
                    member.email = getVal(2);
                    member.phone = getVal(3);
                    member.status = getVal(4);
                    member.planId = getVal(5); // Use ID for import
                    // Skip Plan Name (index 6)
                    member.age = getVal(7);
                    member.gender = getVal(8);

                    member.bodyMeasurements.height = getVal(9);
                    member.bodyMeasurements.weight = getVal(10);
                    member.bodyMeasurements.chest = getVal(11);
                    member.bodyMeasurements.waist = getVal(12);
                    member.bodyMeasurements.hips = getVal(13);
                    member.bodyMeasurements.arms = getVal(14);
                    member.bodyMeasurements.thighs = getVal(15);

                    member.medicalHistory = getVal(16);
                    member.goals = getVal(17);

                    // Clean up empty strings
                    Object.keys(member).forEach((key: string) => {
                        if (member[key] === '') delete member[key];
                    });
                    Object.keys(member.bodyMeasurements).forEach((key: string) => {
                        if (member.bodyMeasurements[key] === '') delete member.bodyMeasurements[key];
                    });

                    membersData.push(member);
                }

                const res = await fetch('/api/members/bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(membersData),
                });

                const data = await res.json();
                if (data.success) {
                    alert(`Successfully imported ${data.count} members!`);
                    fetchMembers();
                } else {
                    throw new Error(data.error || 'Import failed');
                }
            } catch (error: any) {
                console.error('Import error:', error);
                alert(`Import failed: ${error.message}`);
            } finally {
                setImporting(false);
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-100">
                    Members
                    <span className="ml-2 text-lg font-normal text-slate-500">
                        ({totalMembers})
                    </span>
                </h1>
                <div className="flex space-x-3">
                    <button
                        onClick={handleExport}
                        disabled={!members.length}
                        className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </button>
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                        <Upload className="mr-2 h-4 w-4" />
                        {importing ? 'Importing...' : 'Import CSV'}
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleImport}
                            disabled={importing}
                            className="hidden"
                        />
                    </label>
                    <Link
                        href="/dashboard/members/new"
                        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                    </Link>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col gap-4 rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-sm sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or member ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-slate-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Expired">Expired</option>
                        <option value="Expiring Soon">Expiring Soon (≤10 days)</option>
                    </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                    <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                    </select>
                </div>

                {/* Type Filter */}
                <div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">All Types</option>
                        <option value="pt">PT Members</option>
                        <option value="non-pt">Non-PT Members</option>
                    </select>
                </div>

                {/* Sort Order Removed */}

                {/* Results Count */}
                {searchQuery || statusFilter !== 'all' || paymentStatusFilter !== 'all' || typeFilter !== 'all' ? (
                    <div className="text-sm text-slate-400">
                        {members.length} of {totalMembers} members
                    </div>
                ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950/50 sticky top-0 z-10">
                        <tr>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors group"
                                onClick={() => handleSort('memberId')}
                            >
                                <div className="flex items-center gap-1">
                                    ID
                                    {sortConfig.key === 'memberId' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-500" /> : <ArrowDown className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors group"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Name
                                    {sortConfig.key === 'name' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-500" /> : <ArrowDown className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Contact</th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors group"
                                onClick={() => handleSort('plan')}
                            >
                                <div className="flex items-center gap-1">
                                    Plan
                                    {sortConfig.key === 'plan' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-500" /> : <ArrowDown className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-slate-800/50 hover:text-slate-200 transition-colors group"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center gap-1">
                                    Status
                                    {sortConfig.key === 'status' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-500" /> : <ArrowDown className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <ArrowUpDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900">
                        {members.map((member: any) => (
                            <tr key={member._id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm font-mono font-medium text-slate-300">
                                        {member.memberId || 'N/A'}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <Avatar src={member.profilePicture} name={member.name} />
                                        </div>
                                        <div className="ml-4">
                                            <Link href={`/dashboard/members/${member._id}`} className="text-sm font-medium text-blue-400 hover:text-blue-300">
                                                {member.name}
                                            </Link>
                                            <div className="text-xs">
                                                {member.membershipEndDate ? (() => {
                                                    const daysLeft = Math.ceil((new Date(member.membershipEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                                                    if (daysLeft < 0) {
                                                        return null;
                                                    }

                                                    let colorClass = 'text-green-400 font-semibold';
                                                    if (daysLeft <= 7) colorClass = 'text-amber-400 font-semibold';

                                                    return (
                                                        <span className={colorClass}>
                                                            {daysLeft} days left
                                                        </span>
                                                    );
                                                })() : <span className="text-slate-600">-</span>}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm text-slate-200">{member.email}</div>
                                    <div className="text-sm text-slate-500">{member.phone}</div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className="inline-flex rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                                        {member.planName || 'No Plan'}
                                    </span>
                                </td>

                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border ${member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        member.status === 'Expired' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                            member.status === 'Pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}
                                    >
                                        {member.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleRecordPayment(member)}
                                        className="mr-4 text-emerald-500 hover:text-emerald-400 transition-colors"
                                        title="Record Payment"
                                    >
                                        <DollarSign className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => router.push(`/dashboard/members/${member._id}/edit`)}
                                        className="mr-4 text-blue-500 hover:text-blue-400 transition-colors"
                                        title="Edit Member"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member._id)}
                                        className="text-rose-500 hover:text-rose-400 transition-colors"
                                        title="Delete Member"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {
                showPaymentForm && selectedMember && (
                    <PaymentForm
                        member={selectedMember}
                        onClose={() => setShowPaymentForm(false)}
                        onSuccess={handlePaymentSuccess}
                    />
                )
            }
        </div >
    );
}
