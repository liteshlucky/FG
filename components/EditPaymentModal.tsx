'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditPaymentModalProps {
    payment: any;
    member?: any; // Optional member context for plan selection
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditPaymentModal({ payment, member, onClose, onSuccess }: EditPaymentModalProps) {
    const [plans, setPlans] = useState([]);
    const [ptPlans, setPTPlans] = useState([]);

    const [formData, setFormData] = useState({
        amount: payment.amount || '',
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
        paymentMode: payment.paymentMode || 'cash',
        paymentCategory: payment.paymentCategory || (payment.planType === 'membership' ? 'Plan' : 'Trainer'),
        transactionId: payment.transactionId || '',
        notes: payment.notes || '',
        // Plan assignment fields
        planId: payment.planId?._id || payment.planId || '',
        planType: payment.planType === 'pt_plan' || payment.planType === 'PTplan' ? 'pt_plan' : 'membership',
        membershipStartDate: payment.membershipStartDate
            ? new Date(payment.membershipStartDate).toISOString().split('T')[0]
            : (payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        updateMemberPlan: false, // Whether to also update the member's active plan & dates
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/plans').then(r => r.json()).then(d => { if (d.success) setPlans(d.data); });
        fetch('/api/pt-plans').then(r => r.json()).then(d => { if (d.success) setPTPlans(d.data); });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/payments/${payment._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update payment');
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this payment? This will adjust the member balance.')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/payments/${payment._id}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to delete payment');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const isMembershipType = formData.planType === 'membership';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-100">Edit Payment Record</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Payment context */}
                <div className="mb-5 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                    <p className="text-sm text-blue-400">
                        Editing payment <span className="font-bold text-blue-200">{payment.transactionId || payment.receiptNumber || payment._id}</span>
                        {payment.memberId?.name && <> for <span className="font-bold text-blue-200">{payment.memberId.name}</span></>}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                        {/* Plan Type */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Payment For</label>
                            <select
                                value={formData.planType}
                                onChange={(e) => setFormData({ ...formData, planType: e.target.value, planId: '' })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="membership">Membership Plan</option>
                                <option value="pt_plan">PT Plan</option>
                            </select>
                        </div>

                        {/* Plan Selection */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">
                                {isMembershipType ? 'Membership Plan' : 'PT Plan'}
                            </label>
                            <select
                                value={formData.planId}
                                onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="">— Select a plan —</option>
                                {isMembershipType
                                    ? plans.map((plan: any) => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} — ₹{plan.price} ({plan.duration} months)
                                        </option>
                                    ))
                                    : ptPlans.map((plan: any) => (
                                        <option key={plan._id} value={plan._id}>
                                            {plan.name} — ₹{plan.price} ({plan.sessions} sessions)
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        {/* Membership Start Date */}
                        {isMembershipType && (
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Membership Start Date</label>
                                <input
                                    type="date"
                                    value={formData.membershipStartDate}
                                    onChange={(e) => setFormData({ ...formData, membershipStartDate: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-500">The plan end date will be recalculated from this date based on the selected plan duration.</p>
                            </div>
                        )}

                        {/* Update member's active plan checkbox */}
                        {isMembershipType && (
                            <div className="sm:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.updateMemberPlan}
                                        onChange={(e) => setFormData({ ...formData, updateMemberPlan: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-300">
                                        Update member's active plan & recalculate membership end date
                                    </span>
                                </label>
                            </div>
                        )}

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Amount (₹)</label>
                            <input
                                type="number"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Payment Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Payment Date</label>
                            <input
                                type="date"
                                required
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Payment Mode */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Payment Mode</label>
                            <select
                                value={formData.paymentMode}
                                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        {/* Transaction ID */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Transaction ID</label>
                            <input
                                type="text"
                                value={formData.transactionId}
                                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                placeholder="Optional"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        {/* Notes */}
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
                            <textarea
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-800 mt-6">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50"
                        >
                            Delete Payment
                        </button>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
