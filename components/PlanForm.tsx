'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlanForm({ initialData = null, isEdit = false }: { initialData?: any, isEdit?: boolean }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        duration: '',
        features: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                price: initialData.price || '',
                duration: initialData.duration || '',
                features: initialData.features ? initialData.features.join(', ') : '',
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const featuresArray = formData.features.split(',').map(f => f.trim()).filter(f => f);

            const payload = {
                ...formData,
                price: Number(formData.price),
                duration: Number(formData.duration),
                features: featuresArray,
            };

            const url = isEdit ? `/api/plans/${initialData._id}` : '/api/plans';
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

            router.push('/dashboard/plans');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            {error && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Plan Name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g. Gold Membership"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input
                        type="number"
                        name="price"
                        required
                        value={formData.price}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (Months)</label>
                    <input
                        type="number"
                        name="duration"
                        required
                        value={formData.duration}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Features (Comma separated)</label>
                    <textarea
                        name="features"
                        rows={3}
                        value={formData.features}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Access to gym, Free trainer, Sauna..."
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : isEdit ? 'Update Plan' : 'Create Plan'}
                </button>
            </div>
        </form>
    );
}
