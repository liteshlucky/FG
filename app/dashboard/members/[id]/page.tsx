'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, Edit } from 'lucide-react';
import PaymentForm from '@/components/PaymentForm';
import Avatar from '@/components/Avatar';
import AIAnalysis from '@/components/AIAnalysis';

import QuickEditModal from '@/components/QuickEditModal';

export default function MemberDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [member, setMember] = useState<any>(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'membership' | 'pt'>('all');
    const [editingSection, setEditingSection] = useState<'personal' | 'physical' | 'health' | null>(null);

    useEffect(() => {
        if (params.id) {
            fetchMemberDetails();
            fetchPayments();
        }
    }, [params.id]);

    const fetchMemberDetails = async () => {
        try {
            const res = await fetch(`/api/members/${params.id}`);
            const data = await res.json();
            if (data.success) {
                setMember(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch member', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPayments = async () => {
        try {
            const res = await fetch(`/api/payments?memberId=${params.id}`);
            const data = await res.json();
            if (data.success) {
                setPayments(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch payments', error);
        }
    };

    const handlePaymentSuccess = () => {
        fetchMemberDetails();
        fetchPayments();
    };

    const handleQuickEditSave = async (updatedData: any) => {
        try {
            const res = await fetch(`/api/members/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
            });
            const data = await res.json();
            if (data.success) {
                setMember(data.data);
                setEditingSection(null);
            } else {
                alert('Failed to update member');
            }
        } catch (error) {
            console.error('Failed to update member', error);
            alert('Failed to update member');
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (!member) return <div className="p-4">Member not found</div>;

    // Calculate total due
    let totalDue = 0;
    if (member.planId) totalDue += member.planId.price || 0;
    if (member.ptPlanId) totalDue += member.ptPlanId.price || 0;

    // Apply discount
    if (member.discountId) {
        if (member.discountId.type === 'percentage') {
            totalDue -= (totalDue * member.discountId.value) / 100;
        } else {
            totalDue -= member.discountId.value;
        }
    }

    const balance = totalDue - (member.totalPaid || 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <Avatar src={member.profilePicture} name={member.name} size="lg" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
                        <p className="text-sm text-gray-500">Member since {new Date(member.joinDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowPaymentForm(true)}
                        className="flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Record Payment
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/members/${member._id}/edit`)}
                        className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Full Edit
                    </button>
                </div>
            </div>

            {/* Member Info Cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Contact Information */}
                <div className="rounded-lg bg-white p-6 shadow relative group">
                    <div className="flex justify-between items-start">
                        <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
                        <button
                            onClick={() => setEditingSection('personal')}
                            className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-4 space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Member ID</p>
                            <p className="text-sm font-medium text-gray-900">{member.memberId || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="text-sm font-medium text-gray-900">{member.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{member.phone}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Age</p>
                                <p className="text-sm font-medium text-gray-900">{member.age || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Gender</p>
                                <p className="text-sm font-medium text-gray-900">{member.gender || '-'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${member.status === 'Active' ? 'bg-green-100 text-green-800' :
                                member.status === 'Expired' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                {member.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Physical Details */}
                <div className="rounded-lg bg-white p-6 shadow relative group">
                    <div className="flex justify-between items-start">
                        <h2 className="text-lg font-medium text-gray-900">Physical Details</h2>
                        <button
                            onClick={() => setEditingSection('physical')}
                            className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-4 space-y-4">
                        {member.bodyMeasurements ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Height</p>
                                        <p className="text-sm font-medium text-gray-900">{member.bodyMeasurements.height ? `${member.bodyMeasurements.height} cm` : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Weight</p>
                                        <p className="text-sm font-medium text-gray-900">{member.bodyMeasurements.weight ? `${member.bodyMeasurements.weight} kg` : '-'}</p>
                                    </div>
                                    {member.bodyMeasurements.height && member.bodyMeasurements.weight && (
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-500">BMI</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {(() => {
                                                    const heightInMeters = member.bodyMeasurements.height / 100;
                                                    const bmi = (member.bodyMeasurements.weight / (heightInMeters * heightInMeters)).toFixed(1);
                                                    const category = parseFloat(bmi) < 18.5 ? 'Underweight' :
                                                        parseFloat(bmi) < 25 ? 'Normal' :
                                                            parseFloat(bmi) < 30 ? 'Overweight' : 'Obese';
                                                    const categoryColor = parseFloat(bmi) < 18.5 ? 'text-blue-600' :
                                                        parseFloat(bmi) < 25 ? 'text-green-600' :
                                                            parseFloat(bmi) < 30 ? 'text-yellow-600' : 'text-red-600';
                                                    return (
                                                        <>
                                                            {bmi} <span className={`ml-2 ${categoryColor}`}>({category})</span>
                                                        </>
                                                    );
                                                })()}
                                            </p>
                                        </div>
                                    )}
                                    {['chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                                        <div key={field}>
                                            <p className="text-sm text-gray-500 capitalize">{field}</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {member.bodyMeasurements[field] ? `${member.bodyMeasurements[field]} in` : '-'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">No measurements recorded.</p>
                        )}
                    </div>
                </div>

                {/* Health & Goals */}
                <div className="rounded-lg bg-white p-6 shadow relative group">
                    <div className="flex justify-between items-start">
                        <h2 className="text-lg font-medium text-gray-900">Health & Goals</h2>
                        <button
                            onClick={() => setEditingSection('health')}
                            className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="mt-4 space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Dietary Preferences</p>
                            <p className="text-sm font-medium text-gray-900">
                                {Array.isArray(member.dietaryPreferences) && member.dietaryPreferences.length > 0
                                    ? member.dietaryPreferences.join(', ')
                                    : member.dietaryPreferences || 'Not specified'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Allergies</p>
                            <p className="text-sm font-medium text-gray-900">{member.allergies || 'None'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Medical History</p>
                            <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">{member.medicalHistory || 'None recorded.'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Goals</p>
                            <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap">{member.goals || 'None recorded.'}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Edit Modal */}
                {editingSection && (
                    <QuickEditModal
                        isOpen={!!editingSection}
                        onClose={() => setEditingSection(null)}
                        onSave={handleQuickEditSave}
                        section={editingSection}
                        initialData={member}
                    />
                )}

                {/* Membership Details */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="text-lg font-medium text-gray-900">Membership Details</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Plan</p>
                            <p className="text-sm font-medium text-gray-900">
                                {member.planId?.name || 'No Plan'} {member.planId && `(₹${member.planId.price})`}
                            </p>
                        </div>
                        {member.ptPlanId && (
                            <div>
                                <p className="text-sm text-gray-500">PT Plan</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {member.ptPlanId.name} (₹{member.ptPlanId.price})
                                </p>
                            </div>
                        )}
                        {member.discountId && (
                            <div>
                                <p className="text-sm text-gray-500">Discount</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {member.discountId.code} - {member.discountId.type === 'percentage'
                                        ? `${member.discountId.value}%`
                                        : `₹${member.discountId.value}`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="text-lg font-medium text-gray-900">Payment Summary</h2>
                    <div className="mt-4 space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Total Due</p>
                            <p className="text-lg font-semibold text-gray-900">₹{totalDue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Paid</p>
                            <p className="text-lg font-semibold text-green-600">₹{(member.totalPaid || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Balance</p>
                            <p className={`text-lg font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ₹{balance.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Payment Status</p>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${member.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                member.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                {member.paymentStatus?.toUpperCase() || 'UNPAID'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Analysis Section */}
            <div className="mt-8">
                <AIAnalysis
                    memberId={params.id as string}
                    initialData={member.aiAnalysis}
                    onGenerate={fetchMemberDetails}
                />
            </div>

            {/* Payment History with Tabs */}
            <div className="rounded-lg bg-white shadow">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-medium text-gray-900">Payment History</h2>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'all'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            All Payments
                        </button>
                        <button
                            onClick={() => setActiveTab('membership')}
                            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'membership'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            Membership
                        </button>
                        <button
                            onClick={() => setActiveTab('pt')}
                            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${activeTab === 'pt'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            PT Plan
                        </button>
                    </nav>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Plan Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {(() => {
                                const filteredPayments = payments.filter((payment: any) => {
                                    if (activeTab === 'all') return true;
                                    if (activeTab === 'membership') return payment.planType === 'membership';
                                    if (activeTab === 'pt') return payment.planType === 'pt_plan';
                                    return true;
                                });

                                if (filteredPayments.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                                                No payment history for {activeTab === 'all' ? 'this member' : activeTab === 'membership' ? 'membership plans' : 'PT plans'}
                                            </td>
                                        </tr>
                                    );
                                }

                                return filteredPayments.map((payment: any) => (
                                    <tr key={payment._id}>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                            {new Date(payment.paymentDate).toLocaleDateString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${payment.planType === 'membership'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                {payment.planType === 'membership' ? 'Membership' : 'PT Plan'}
                                            </span>
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
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {showPaymentForm && (
                <PaymentForm
                    member={member}
                    onClose={() => setShowPaymentForm(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
