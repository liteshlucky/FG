'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, IndianRupee, Trash2 } from 'lucide-react';

interface PaymentFormProps {
    member: any;
    payment?: any;         // If provided → EDIT mode; otherwise → CREATE mode
    onClose: () => void;
    onSuccess: () => void;
}

export default function PaymentForm({ member, payment: existingPayment, onClose, onSuccess }: PaymentFormProps) {
    const isEditMode = !!existingPayment;

    const [plans, setPlans] = useState([]);
    const [ptPlans, setPTPlans] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    // ── Due amount calculation ────────────────────────────────────────────────
    const currentBalance = member.currentBalance ?? Math.max(
        0,
        (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0) - (member.totalPaid || 0)
    );
    const hasDue = !isEditMode && currentBalance > 0;  // only show due banner in create mode

    // ── Initial form state — pre-fill from existing payment in edit mode ──────
    const [formData, setFormData] = useState({
        amount:            isEditMode ? String(existingPayment.amount || '')                    : '',
        paymentMode:       isEditMode ? (existingPayment.paymentMode || 'cash')                 : 'cash',
        paymentDate:       isEditMode
                           ? (existingPayment.paymentDate ? new Date(existingPayment.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
                           : new Date().toISOString().split('T')[0],
        transactionId:     isEditMode ? (existingPayment.transactionId || '')                   : '',
        notes:             isEditMode ? (existingPayment.notes || '')                           : '',
        planType:          isEditMode ? (existingPayment.planType || 'membership')              : 'membership',
        planId:            isEditMode ? (existingPayment.planId?._id || existingPayment.planId || '') : (member.planId?._id || member.planId || ''),
        isRenewal:         false,
        renewalStartDate:  new Date().toISOString().split('T')[0],
        renewalPlanId:     member.planId?._id || member.planId || '',
        paymentType:       'due_clear',
        fullAmount:        '',
        activateMembership:false,
        trainerId:         isEditMode ? (existingPayment.trainerId?._id || existingPayment.trainerId || '') : (member.trainerId?._id || member.trainerId || ''),
        discountId:        isEditMode ? (existingPayment.discountId?._id || existingPayment.discountId || '') : (member.discountId?._id || member.discountId || ''),
        paymentCategory:   isEditMode ? (existingPayment.paymentCategory || 'Plan')            : (hasDue ? 'Due Amount' : 'Plan'),
    });

    useEffect(() => {
        fetchPlans();
        fetchPTPlans();
        fetchTrainers();
        fetchDiscounts();
    }, []);

    const fetchPlans = async () => {
        try { const res = await fetch('/api/plans'); const d = await res.json(); if (d.success) setPlans(d.data); } catch {}
    };
    const fetchPTPlans = async () => {
        try { const res = await fetch('/api/pt-plans'); const d = await res.json(); if (d.success) setPTPlans(d.data); } catch {}
    };
    const fetchTrainers = async () => {
        try { const res = await fetch('/api/trainers'); const d = await res.json(); if (d.success) setTrainers(d.data); } catch {}
    };
    const fetchDiscounts = async () => {
        try { const res = await fetch('/api/discounts'); const d = await res.json(); if (d.success) setDiscounts(d.data); } catch {}
    };

    const handlePlanTypeChange = (type: string) => {
        const newPlanId = type === 'membership'
            ? (member.planId?._id || member.planId || '')
            : (member.ptPlanId?._id || member.ptPlanId || '');
        setFormData({ ...formData, planType: type, planId: newPlanId, renewalPlanId: newPlanId, isRenewal: false });
    };

    // ── Due preset buttons (create mode only) ─────────────────────────────────
    const applyDuePreset = (preset: 'full' | 'half' | 'custom') => {
        let amt = '';
        if (preset === 'full')  amt = String(currentBalance);
        if (preset === 'half')  amt = String(Math.ceil(currentBalance / 2));
        setFormData(prev => ({ ...prev, amount: amt, paymentCategory: 'Due Amount' }));
    };

    // ── Submit (create or update) ─────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const url    = isEditMode ? `/api/payments/${existingPayment._id}` : '/api/payments';
            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    memberId: member._id,
                    amount: parseFloat(formData.amount),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save payment');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Delete payment (edit mode only) ──────────────────────────────────────
    const handleDelete = async () => {
        if (!confirm('Delete this payment? The member balance will be adjusted.')) return;
        setDeleting(true);
        setError('');
        try {
            const res = await fetch(`/api/payments/${existingPayment._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete payment');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">

                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-100">
                        {isEditMode ? 'Edit Payment' : 'Record Payment'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Member info bar with due badge */}
                <div className="mb-5 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-blue-400 flex items-center gap-2">
                        <span>{isEditMode ? 'Editing payment for:' : 'Recording payment for:'}</span>
                        <span className="font-bold text-blue-300 text-lg">{member.name}</span>
                    </p>
                    {isEditMode ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-sm font-semibold text-amber-400">
                            Editing Existing Record
                        </span>
                    ) : hasDue ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-sm font-semibold text-rose-400">
                            <IndianRupee className="h-3.5 w-3.5" />
                            Due: ₹{currentBalance.toLocaleString('en-IN')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-sm font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Fully Paid
                        </span>
                    )}
                </div>

                {/* Due Alert Banner — create mode only */}
                {hasDue && (
                    <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-300">
                                    Outstanding Balance: ₹{currentBalance.toLocaleString('en-IN')}
                                </p>
                                <p className="mt-1 text-xs text-amber-400/70">
                                    Select an amount to collect or enter a custom value below.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => applyDuePreset('full')}
                                        className={`rounded-lg px-4 py-1.5 text-sm font-medium border transition-all ${formData.amount === String(currentBalance) ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'}`}>
                                        Pay Full Due — ₹{currentBalance.toLocaleString('en-IN')}
                                    </button>
                                    <button type="button" onClick={() => applyDuePreset('half')}
                                        className={`rounded-lg px-4 py-1.5 text-sm font-medium border transition-all ${formData.amount === String(Math.ceil(currentBalance / 2)) ? 'bg-amber-500 border-amber-400 text-slate-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'}`}>
                                        50% — ₹{Math.ceil(currentBalance / 2).toLocaleString('en-IN')}
                                    </button>
                                    <button type="button" onClick={() => applyDuePreset('custom')}
                                        className="rounded-lg px-4 py-1.5 text-sm font-medium border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all">
                                        Custom Amount
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit mode — show original record summary */}
                {isEditMode && (
                    <div className="mb-5 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><span className="block text-xs text-slate-500">Receipt</span>{existingPayment.receiptNumber || '—'}</div>
                        <div><span className="block text-xs text-slate-500">Plan</span>{existingPayment.planId?.name || '—'}</div>
                        <div><span className="block text-xs text-slate-500">Category</span>{existingPayment.paymentCategory || existingPayment.planType || '—'}</div>
                        <div><span className="block text-xs text-slate-500">Original Amount</span>₹{(existingPayment.amount || 0).toLocaleString('en-IN')}</div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                        {/* Plan Type — only editable in create mode */}
                        {!isEditMode && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-slate-400">Payment For *</label>
                                <select required value={formData.planType} onChange={(e) => handlePlanTypeChange(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="membership">Membership Plan</option>
                                    <option value="pt_plan">PT Plan</option>
                                </select>
                            </div>
                        )}

                        {/* Package Selection — create mode only */}
                        {!isEditMode && (
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="block text-sm font-medium text-slate-400">Select Package *</label>
                                <select required value={formData.planId} onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Select a package</option>
                                    {formData.planType === 'membership'
                                        ? plans.map((p: any) => <option key={p._id} value={p._id}>{p.name} - ₹{p.price} ({p.duration} months)</option>)
                                        : ptPlans.map((p: any) => <option key={p._id} value={p._id}>{p.name} - ₹{p.price} ({p.sessions} sessions)</option>)
                                    }
                                </select>
                            </div>
                        )}

                        {/* Trainer — create mode, PT plan only */}
                        {!isEditMode && formData.planType === 'pt_plan' && (
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="block text-sm font-medium text-slate-400">Assigned Trainer</label>
                                <select value={formData.trainerId} onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Select a trainer</option>
                                    {trainers.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Discount — create mode only */}
                        {!isEditMode && (
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="block text-sm font-medium text-slate-400">Discount / Coupon</label>
                                <select value={formData.discountId} onChange={(e) => setFormData({ ...formData, discountId: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">No Discount</option>
                                    {discounts.map((d: any) => <option key={d._id} value={d._id}>{d.code} - {d.description}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Membership Start Date — create mode only */}
                        {!isEditMode && formData.planType === 'membership' && (
                            <div className="sm:col-span-2 lg:col-span-1">
                                <label className="block text-sm font-medium text-slate-400">Membership Start Date *</label>
                                <input type="date" required value={formData.renewalStartDate}
                                    onChange={(e) => setFormData({ ...formData, renewalStartDate: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                <p className="mt-1 text-xs text-slate-500">The date when the membership plan starts</p>
                            </div>
                        )}

                        {/* Renew Membership — create mode only */}
                        {!isEditMode && formData.planType === 'membership' && (
                            <div className="sm:col-span-2 lg:col-span-2">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.isRenewal}
                                        onChange={(e) => setFormData({ ...formData, isRenewal: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm font-medium text-slate-300">Renew Membership</span>
                                </label>
                                <p className="mt-1 text-xs text-slate-500">Check this to renew the membership and update plan dates</p>
                            </div>
                        )}

                        {/* Renewal Plan */}
                        {!isEditMode && formData.isRenewal && formData.planType === 'membership' && (
                            <div className="sm:col-span-2 lg:col-span-2">
                                <label className="block text-sm font-medium text-slate-400">Renewal Plan *</label>
                                <select required value={formData.renewalPlanId} onChange={(e) => setFormData({ ...formData, renewalPlanId: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="">Select a plan</option>
                                    {plans.map((p: any) => <option key={p._id} value={p._id}>{p.name} - ₹{p.price} ({p.duration} months)</option>)}
                                </select>
                            </div>
                        )}

                        {/* Payment Type — create mode only */}
                        {!isEditMode && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="block text-sm font-medium text-slate-400">Payment Type *</label>
                                <select required value={formData.paymentType} onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="due_clear">Due Clear (Full Payment)</option>
                                    <option value="part_payment">Part Payment</option>
                                </select>
                            </div>
                        )}

                        {/* Part Payment Full Amount */}
                        {!isEditMode && formData.paymentType === 'part_payment' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Full Amount (₹) *</label>
                                <input type="number" required min="0" step="0.01" value={formData.fullAmount}
                                    onChange={(e) => setFormData({ ...formData, fullAmount: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                <p className="mt-1 text-xs text-slate-500">Total amount to be paid</p>
                            </div>
                        )}

                        {/* ── AMOUNT — always visible ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400">
                                {!isEditMode && formData.paymentType === 'part_payment' ? 'Paying Now (₹) *' : 'Amount (₹) *'}
                            </label>
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <IndianRupee className="h-4 w-4" />
                                </span>
                                <input type="number" required min="0" step="0.01" value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value, paymentCategory: hasDue ? 'Due Amount' : formData.paymentCategory })}
                                    placeholder={hasDue ? `Outstanding: ₹${currentBalance.toLocaleString('en-IN')}` : '0'}
                                    className={`block w-full rounded-lg border pl-9 pr-4 py-2 text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${formData.amount && hasDue ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 bg-slate-950'}`} />
                            </div>
                            {hasDue && formData.amount && Number(formData.amount) < currentBalance && (
                                <p className="mt-1 text-xs text-amber-500/80">Remaining after this payment: ₹{(currentBalance - Number(formData.amount)).toLocaleString('en-IN')}</p>
                            )}
                            {hasDue && formData.amount && Number(formData.amount) >= currentBalance && (
                                <p className="mt-1 text-xs text-emerald-400">✓ This will clear all outstanding dues</p>
                            )}
                        </div>

                        {/* Payment Category — visible in edit mode */}
                        {isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Category</label>
                                <select value={formData.paymentCategory} onChange={(e) => setFormData({ ...formData, paymentCategory: e.target.value })}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="Plan">Membership Plan</option>
                                    <option value="Due Amount">Due Amount</option>
                                    <option value="Plan (Multiple)">Plan (Multiple)</option>
                                    <option value="Admission Fee">Admission Fee</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        )}

                        {/* Payment Mode */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Payment Mode *</label>
                            <select required value={formData.paymentMode} onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        {/* Payment Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Payment Date *</label>
                            <input type="date" required value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>

                        {/* Activate Membership — create mode only */}
                        {!isEditMode && formData.planType === 'membership' && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.activateMembership}
                                        onChange={(e) => setFormData({ ...formData, activateMembership: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-sm font-medium text-slate-300">Activate Membership</span>
                                </label>
                                <p className="mt-1 text-xs text-slate-500">Check this to activate the member's status</p>
                            </div>
                        )}

                        {/* Transaction ID */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Transaction ID</label>
                            <input type="text" value={formData.transactionId} onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                placeholder="Optional"
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>

                        {/* Notes */}
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium text-slate-400">Notes</label>
                            <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Optional notes about this payment"
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
                        {/* Delete button — edit mode only */}
                        {isEditMode ? (
                            <button type="button" onClick={handleDelete} disabled={deleting}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-all disabled:opacity-50">
                                <Trash2 className="h-4 w-4" />
                                {deleting ? 'Deleting...' : 'Delete Payment'}
                            </button>
                        ) : <div />}

                        <div className="flex space-x-3">
                            <button type="button" onClick={onClose}
                                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-700 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
                                {loading ? (isEditMode ? 'Saving...' : 'Recording...') : (isEditMode ? 'Save Changes' : 'Record Payment')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
