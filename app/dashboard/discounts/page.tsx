'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        value: '',
        type: 'percentage',
    });

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await fetch('/api/discounts');
            const data = await res.json();
            if (data.success) {
                setDiscounts(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch discounts', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowForm(false);
                setFormData({ code: '', description: '', value: '', type: 'percentage' });
                fetchDiscounts();
            }
        } catch (error) {
            console.error('Failed to create discount', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
            fetchDiscounts();
        } catch (error) {
            console.error('Failed to delete discount', error);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-100">Discounts & Coupons</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Discount
                </button>
            </div>

            {showForm && (
                <div className="rounded-xl bg-slate-900 p-6 border border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Code</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Description</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Type</label>
                                <select
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (₹)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400">Value</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 font-medium transition-all hover:scale-105 active:scale-95"
                            >
                                Save Discount
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {discounts.map((discount: any) => (
                    <div key={discount._id} className="relative rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm hover:shadow-xl hover:border-slate-700 transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-slate-100 group-hover:text-blue-400 transition-colors">{discount.code}</h3>
                            <button onClick={() => handleDelete(discount._id)} className="text-slate-400 hover:text-rose-400 transition-colors p-1 rounded-md hover:bg-rose-500/10">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">{discount.description}</p>
                        <div className="mt-4">
                            <span className="inline-flex items-center rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                                {discount.type === 'percentage' ? `${discount.value}% OFF` : `₹${discount.value} OFF`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
