'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PaymentFormProps {
    member: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PaymentForm({ member, onClose, onSuccess }: PaymentFormProps) {
    const [plans, setPlans] = useState([]);
    const [ptPlans, setPTPlans] = useState([]);
    const [formData, setFormData] = useState({
        amount: '',
        paymentMode: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionId: '',
        notes: '',
        planType: 'membership',
        planId: member.planId?._id || member.planId || '',
        isRenewal: false,
        renewalStartDate: new Date().toISOString().split('T')[0],
        renewalPlanId: member.planId?._id || member.planId || '',
        paymentType: 'due_clear', // 'part_payment' or 'due_clear'
        fullAmount: '',
        activateMembership: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPlans();
        fetchPTPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/plans');
            const data = await res.json();
            if (data.success) {
                setPlans(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch plans', error);
        }
    };

    const fetchPTPlans = async () => {
        try {
            const res = await fetch('/api/pt-plans');
            const data = await res.json();
            if (data.success) {
                setPTPlans(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch PT plans', error);
        }
    };

    const handlePlanTypeChange = (type: string) => {
        const newPlanId = type === 'membership'
            ? (member.planId?._id || member.planId || '')
            : (member.ptPlanId?._id || member.ptPlanId || '');

        setFormData({
            ...formData,
            planType: type,
            planId: newPlanId,
            renewalPlanId: newPlanId,
            isRenewal: false, // Reset renewal when switching plan types
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    memberId: member._id,
                    amount: parseFloat(formData.amount),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to record payment');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-100">Record Payment</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-6 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                    <p className="text-sm text-blue-400 flex items-center">
                        <span className="mr-2">Recording payment for:</span>
                        <span className="font-bold text-blue-300 text-lg">{member.name}</span>
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Plan Type Selection */}
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Payment For *
                            </label>
                            <select
                                required
                                value={formData.planType}
                                onChange={(e) => handlePlanTypeChange(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="membership">Membership Plan</option>
                                <option value="pt_plan">PT Plan</option>
                            </select>
                        </div>

                        {/* Package Selection */}
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-slate-400">
                                Select Package *
                            </label>
                            <select
                                required
                                value={formData.planId}
                                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">Select a package</option>
                                {formData.planType === 'membership'
                                    ? plans.map((plan: any) => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} - ₹{plan.price} ({plan.duration} months)
                                        </option>
                                    ))
                                    : ptPlans.map((plan: any) => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} - ₹{plan.price} ({plan.sessions} sessions)
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        {/* Renewal Option - Only for Membership */}
                        {formData.planType === 'membership' && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isRenewal}
                                        onChange={(e) => setFormData({ ...formData, isRenewal: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Renew Membership
                                    </span>
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    Check this to renew the membership and update plan dates
                                </p>
                            </div>
                        )}

                        {/* Renewal Fields - Show only when renewal is checked */}
                        {formData.isRenewal && formData.planType === 'membership' && (
                            <>
                                <div className="sm:col-span-2 lg:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Renewal Plan *
                                    </label>
                                    <select
                                        required
                                        value={formData.renewalPlanId}
                                        onChange={(e) => setFormData({ ...formData, renewalPlanId: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="">Select a plan</option>
                                        {plans.map((plan: any) => (
                                            <option key={plan._id} value={plan._id}>
                                                {plan.name} - ₹{plan.price} ({plan.duration} months)
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Choose the same plan or select a different one for renewal
                                    </p>
                                </div>

                                <div className="lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Membership Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.renewalStartDate}
                                        onChange={(e) => setFormData({ ...formData, renewalStartDate: e.target.value })}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        The date when the renewed membership will start
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Payment Type */}
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Payment Type *
                            </label>
                            <select
                                required
                                value={formData.paymentType}
                                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="due_clear">Due Clear (Full Payment)</option>
                                <option value="part_payment">Part Payment</option>
                            </select>
                        </div>

                        {/* Part Payment Fields */}
                        {formData.paymentType === 'part_payment' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Full Amount (₹) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.fullAmount}
                                    onChange={(e) => setFormData({ ...formData, fullAmount: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Total amount to be paid
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                {formData.paymentType === 'part_payment' ? 'Paying Now (₹) *' : 'Amount (₹) *'}
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Payment Mode *
                            </label>
                            <select
                                required
                                value={formData.paymentMode}
                                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Payment Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Activate Membership Checkbox */}
                        {formData.planType === 'membership' && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.activateMembership}
                                        onChange={(e) => setFormData({ ...formData, activateMembership: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Activate Membership
                                    </span>
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    Check this to activate the member's status
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Transaction ID
                            </label>
                            <input
                                type="text"
                                value={formData.transactionId}
                                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                placeholder="Optional"
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Notes
                            </label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Optional notes about this payment"
                                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-800 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
