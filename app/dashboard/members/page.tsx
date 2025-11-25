'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, DollarSign, Download, Upload, Search, Filter } from 'lucide-react';
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

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            if (data.success) {
                setMembers(data.data);
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

    // Filter and search members
    const filteredMembers = useMemo(() => {
        return members.filter((member: any) => {
            // Search filter
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                member.name?.toLowerCase().includes(searchLower) ||
                member.email?.toLowerCase().includes(searchLower) ||
                member.phone?.includes(searchQuery) ||
                member.memberId?.toLowerCase().includes(searchLower);

            // Status filter
            const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

            // Payment status filter
            const matchesPaymentStatus = paymentStatusFilter === 'all' || member.paymentStatus === paymentStatusFilter;

            return matchesSearch && matchesStatus && matchesPaymentStatus;
        });
    }, [members, searchQuery, statusFilter, paymentStatusFilter]);

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
                <h1 className="text-2xl font-bold text-gray-900">Members</h1>
                <div className="flex space-x-3">
                    <button
                        onClick={handleExport}
                        disabled={!members.length}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </button>
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                    </Link>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone, or member ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                {/* Payment Status Filter */}
                <div>
                    <select
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                    </select>
                </div>

                {/* Results Count */}
                {searchQuery || statusFilter !== 'all' || paymentStatusFilter !== 'all' ? (
                    <div className="text-sm text-gray-600">
                        {filteredMembers.length} of {members.length} members
                    </div>
                ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Payment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredMembers.map((member: any) => (
                            <tr key={member._id}>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <Avatar src={member.profilePicture} name={member.name} />
                                        </div>
                                        <div className="ml-4">
                                            <Link href={`/dashboard/members/${member._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-900">
                                                {member.name}
                                            </Link>
                                            <div className="text-xs text-gray-500">ID: {member.memberId || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">Joined: {new Date(member.joinDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm text-gray-900">{member.email}</div>
                                    <div className="text-sm text-gray-500">{member.phone}</div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                                        {member.planId?.name || 'No Plan'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${member.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : member.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                                    >
                                        {member.paymentStatus?.toUpperCase() || 'UNPAID'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${member.status === 'Active' ? 'bg-green-100 text-green-800' : member.status === 'Expired' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                                    >
                                        {member.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleRecordPayment(member)}
                                        className="mr-4 text-green-600 hover:text-green-900"
                                        title="Record Payment"
                                    >
                                        <DollarSign className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => router.push(`/dashboard/members/${member._id}/edit`)}
                                        className="mr-4 text-indigo-600 hover:text-indigo-900"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(member._id)}
                                        className="text-red-600 hover:text-red-900"
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
