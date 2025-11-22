'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Check } from 'lucide-react';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
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
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
                <Link
                    href="/dashboard/plans/new"
                    className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan: any) => (
                    <div key={plan._id} className="flex flex-col overflow-hidden rounded-lg bg-white shadow">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                            <div className="mt-4 flex items-baseline text-3xl font-extrabold text-gray-900">
                                ₹{plan.price}
                                <span className="ml-1 text-xl font-medium text-gray-500">/ {plan.duration}mo</span>
                            </div>
                            <ul className="mt-6 space-y-4">
                                {plan.features.map((feature: string, index: number) => (
                                    <li key={index} className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <Check className="h-5 w-5 text-green-500" />
                                        </div>
                                        <p className="ml-3 text-sm text-gray-700">{feature}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
