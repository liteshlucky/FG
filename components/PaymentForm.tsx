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
        paymentStatus: 'completed',
        transactionId: '',
        notes: '',
        planType: 'membership',
        planId: member.planId?._id || member.planId || '',
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
        setFormData({
            ...formData,
            planType: type,
            planId: type === 'membership'
                ? (member.planId?._id || member.planId || '')
                : (member.ptPlanId?._id || member.ptPlanId || '')
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-4 rounded-md bg-blue-50 p-3">
                    <p className="text-sm text-blue-800">
                        Recording payment for: <span className="font-semibold">{member.name}</span>
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Plan Type Selection */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Payment For *
                            </label>
                            <select
                                required
                                value={formData.planType}
                                onChange={(e) => handlePlanTypeChange(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="membership">Membership Plan</option>
                                <option value="pt_plan">PT Plan</option>
                            </select>
                        </div>

                        {/* Package Selection */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Select Package *
                            </label>
                            <select
                                required
                                value={formData.planId}
                                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Amount (₹) *
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Payment Status *
                            </label>
                            <select
                                required
                                value={formData.paymentStatus}
                                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Transaction ID
                            </label>
                            <input
                                type="text"
                                value={formData.transactionId}
                                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                placeholder="Optional"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Notes
                            </label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Optional notes about this payment"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
