'use client';

import { useState } from 'react';
import { X, IndianRupee, CreditCard, CalendarDays, FileText } from 'lucide-react';

interface DueClearFormProps {
    member: any;
    dueType: 'membership' | 'pt_plan';
    onClose: () => void;
    onSuccess: () => void;
}

export default function DueClearForm({ member, dueType, onClose, onSuccess }: DueClearFormProps) {
    const isPT = dueType === 'pt_plan';
    
    // Calculate the balances based on the same logic used in MemberDetailPage
    const totalPlanPrice = isPT ? (member.ptTotalPlanPrice || 0) : ((member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0));
    const totalPaid = isPT ? (member.ptTotalPaid || 0) : (member.totalPaid || 0);
    
    const maxDue = isPT 
        ? (member.currentPTBalance ?? Math.max(0, totalPlanPrice - totalPaid))
        : (member.currentBalance ?? Math.max(0, totalPlanPrice - totalPaid));
        
    const planId = isPT ? (member.ptPlanId?._id || member.ptPlanId) : (member.planId?._id || member.planId);

    const [formData, setFormData] = useState({
        amount: String(maxDue),
        paymentMode: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionId: '',
        notes: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payAmount = parseFloat(formData.amount);
        if (payAmount <= 0) {
            setError('Amount must be greater than zero.');
            return;
        }
        if (payAmount > maxDue) {
            setError(`Amount cannot exceed the total due of ₹${maxDue}`);
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const payload = {
                memberId: member._id,
                planType: dueType,
                planId: planId,
                paymentCategory: 'Due Amount',
                paymentType: payAmount < maxDue ? 'part_payment' : 'full_payment',
                amount: payAmount,
                paymentMode: formData.paymentMode,
                paymentDate: formData.paymentDate,
                transactionId: formData.transactionId,
                notes: formData.notes
            };

            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to record due payment');
            
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
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                
                {/* Header */}
                <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                            Clear {isPT ? 'PT Plan' : 'Membership'} Due
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">For {member.name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Due Summary Card */}
                    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-amber-500/70 uppercase tracking-wider font-semibold">Total Price</p>
                                <p className="text-lg font-medium text-amber-400">₹{totalPlanPrice.toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                                <p className="text-xs text-amber-500/70 uppercase tracking-wider font-semibold">Previously Paid</p>
                                <p className="text-lg font-medium text-amber-400">₹{totalPaid.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-amber-500/20">
                                <p className="text-xs text-amber-500/70 uppercase tracking-wider font-semibold">Current Outstanding</p>
                                <p className="text-3xl font-bold text-amber-400">₹{maxDue.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-md bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Amount to Pay (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <IndianRupee className="h-5 w-5" />
                                </span>
                                <input 
                                    type="number" 
                                    required 
                                    min="1" 
                                    max={maxDue}
                                    step="0.01" 
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="block w-full rounded-xl border border-slate-700 bg-slate-950/50 pl-10 pr-4 py-3 text-lg font-medium text-slate-100 placeholder-slate-500 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" 
                                />
                            </div>
                            {Number(formData.amount) < maxDue && Number(formData.amount) > 0 && (
                                <p className="mt-2 text-xs text-amber-500 flex justify-between">
                                    <span>Remaining after this:</span>
                                    <span className="font-semibold">₹{(maxDue - Number(formData.amount)).toLocaleString('en-IN')}</span>
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Payment Mode */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <CreditCard className="h-4 w-4 text-slate-400" /> Mode
                                </label>
                                <select 
                                    required 
                                    value={formData.paymentMode} 
                                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="upi">UPI</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>

                            {/* Payment Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <CalendarDays className="h-4 w-4 text-slate-400" /> Date
                                </label>
                                <input 
                                    type="date" 
                                    required 
                                    value={formData.paymentDate} 
                                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                    className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" 
                                />
                            </div>
                        </div>

                        {/* Transaction ID */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Transaction ID <span className="text-slate-500 font-normal">(Optional)</span></label>
                            <input 
                                type="text" 
                                value={formData.transactionId} 
                                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                placeholder="e.g. UPI Ref Number"
                                className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" 
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-slate-400" /> Notes <span className="text-slate-500 font-normal">(Optional)</span>
                            </label>
                            <textarea 
                                rows={2} 
                                value={formData.notes} 
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional context..."
                                className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none" 
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex gap-3">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="flex-[2] rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Record Due Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
