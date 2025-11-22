'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberForm({ initialData = null, isEdit = false }: { initialData?: any, isEdit?: boolean }) {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [ptPlans, setPTPlans] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        planId: '',
        discountId: '',
        ptPlanId: '',
        status: 'Active',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPlans();
        fetchDiscounts();
        fetchPTPlans();
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                planId: initialData.planId?._id || initialData.planId || '',
                discountId: initialData.discountId?._id || initialData.discountId || '',
                ptPlanId: initialData.ptPlanId?._id || initialData.ptPlanId || '',
                status: initialData.status || 'Active',
            });
        }
    }, [initialData]);

    const fetchPlans = async () => {
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (data.success) {
            setPlans(data.data);
        }
    };

    const fetchDiscounts = async () => {
        const res = await fetch('/api/discounts');
        const data = await res.json();
        if (data.success) {
            setDiscounts(data.data);
        }
    };

    const fetchPTPlans = async () => {
        const res = await fetch('/api/pt-plans');
        const data = await res.json();
        if (data.success) {
            setPTPlans(data.data);
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
            const url = isEdit ? `/api/members/${initialData._id}` : '/api/members';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            router.push('/dashboard/members');
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
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                        type="text"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Membership Plan</label>
                    <select
                        name="planId"
                        value={formData.planId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="">Select a Plan</option>
                        {plans.map((plan: any) => (
                            <option key={plan._id} value={plan._id}>
                                {plan.name} - ₹{plan.price}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Discount / Coupon</label>
                    <select
                        name="discountId"
                        value={formData.discountId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="">No Discount</option>
                        {discounts.map((discount: any) => (
                            <option key={discount._id} value={discount._id}>
                                {discount.code} - {discount.description} ({discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">PT Plan (Optional)</label>
                    <select
                        name="ptPlanId"
                        value={formData.ptPlanId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="">No PT Plan</option>
                        {ptPlans.map((ptPlan: any) => (
                            <option key={ptPlan._id} value={ptPlan._id}>
                                {ptPlan.name} - ₹{ptPlan.price} ({ptPlan.sessions} sessions)
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Expired">Expired</option>
                    </select>
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
                    {loading ? 'Saving...' : isEdit ? 'Update Member' : 'Add Member'}
                </button>
            </div>
        </form>
    );
}
