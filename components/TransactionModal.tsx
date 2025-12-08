import { useState } from 'react';
import { X } from 'lucide-react';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    defaultType?: 'income' | 'expense';
}

export default function TransactionModal({ isOpen, onClose, onSuccess, defaultType = 'expense' }: TransactionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        type: defaultType,
        category: '',
        paymentMode: 'cash',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const EXPENSE_CATEGORIES = [
        'Rent', 'Salary', 'Equipment', 'Utilities',
        'Maintenance', 'Marketing', 'Cleaning', 'Other'
    ];

    const INCOME_CATEGORIES = [
        'Membership', 'Personal Training', 'Merchandise', 'Other'
    ];

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Reset form when modal opens
    if (isOpen && formData.type !== defaultType) {
        // This is a simple check, ideally use useEffect
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/finance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                onSuccess();
                onClose();
                setFormData({
                    title: '',
                    amount: '',
                    type: defaultType,
                    category: '',
                    paymentMode: 'cash',
                    date: new Date().toISOString().split('T')[0],
                    notes: ''
                });
            } else {
                alert(data.error || 'Failed to add transaction');
            }
        } catch (error) {
            console.error('Transaction error', error);
            alert('Failed to add transaction');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <h3 className="text-lg font-medium text-slate-100">
                        {formData.type === 'income' ? 'Add Income' : 'Add Expense'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Title</label>
                        <input
                            type="text"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            placeholder={formData.type === 'expense' ? "e.g., Electricity Bill" : "e.g., Membership Fee"}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Type</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            >
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Amount (₹)</label>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0"
                                value={formData.amount}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            >
                                <option value="">Select Category</option>
                                {(formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Mode</label>
                            <select
                                name="paymentMode"
                                value={formData.paymentMode}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Date</label>
                        <input
                            type="date"
                            name="date"
                            required
                            value={formData.date}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Notes</label>
                        <textarea
                            name="notes"
                            rows={2}
                            value={formData.notes}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        />
                    </div>
                    <div className="mt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
