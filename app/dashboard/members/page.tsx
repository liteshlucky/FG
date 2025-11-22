'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PaymentForm from '@/components/PaymentForm';

export default function MembersPage() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const router = useRouter();

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

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Members</h1>
                <Link
                    href="/dashboard/members/new"
                    className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Member
                </Link>
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
                        {members.map((member: any) => (
                            <tr key={member._id}>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <Link href={`/dashboard/members/${member._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-900">
                                        {member.name}
                                    </Link>
                                    <div className="text-sm text-gray-500">Joined: {new Date(member.joinDate).toLocaleDateString()}</div>
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
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${member.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                        member.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {member.paymentStatus?.toUpperCase() || 'UNPAID'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${member.status === 'Active' ? 'bg-green-100 text-green-800' :
                                        member.status === 'Expired' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
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

            {showPaymentForm && selectedMember && (
                <PaymentForm
                    member={selectedMember}
                    onClose={() => setShowPaymentForm(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
