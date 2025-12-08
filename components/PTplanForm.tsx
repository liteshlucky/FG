'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PTplanForm({ initialData = null, isEdit = false }: { initialData?: any, isEdit?: boolean }) {
    const router = useRouter();
    const [trainers, setTrainers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        sessions: '',
        trainerId: '',
        specialization: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTrainers();
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                price: initialData.price || '',
                sessions: initialData.sessions || '',
                trainerId: initialData.trainerId?._id || initialData.trainerId || '',
                specialization: initialData.specialization || '',
            });
        }
    }, [initialData]);

    const fetchTrainers = async () => {
        const res = await fetch('/api/trainers?role=Trainer');
        const data = await res.json();
        if (data.success) {
            setTrainers(data.data);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                price: Number(formData.price),
                sessions: Number(formData.sessions),
            };

            const url = isEdit ? `/api/pt-plans/${initialData._id}` : '/api/pt-plans';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            router.push('/dashboard/pt-plans');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            {error && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-slate-400">PT Plan Name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        placeholder="e.g. Elite Personal Training"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Price (₹)</label>
                    <input
                        type="number"
                        name="price"
                        required
                        value={formData.price}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Number of Sessions</label>
                    <input
                        type="number"
                        name="sessions"
                        required
                        value={formData.sessions}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        placeholder="e.g. 12"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Trainer *</label>
                    <select
                        name="trainerId"
                        required
                        value={formData.trainerId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="">Select a Trainer</option>
                        {trainers.map((trainer: any) => (
                            <option key={trainer._id} value={trainer._id}>
                                {trainer.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-400">Specialization</label>
                    <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        placeholder="e.g. Weight Loss, Muscle Building, Cardio"
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? 'Saving...' : isEdit ? 'Update PT Plan' : 'Create PT Plan'}
                </button>
            </div>
        </form>
    );
}
