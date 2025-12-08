'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Check, Edit2, Trash2 } from 'lucide-react';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

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

    const handleDelete = async (planId: string, planName: string) => {
        if (!confirm(`Are you sure you want to delete the plan "${planName}"? This action cannot be undone.`)) {
            return;
        }

        setDeleting(planId);
        try {
            const res = await fetch(`/api/plans/${planId}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (data.success) {
                // Remove the deleted plan from the list
                setPlans(plans.filter((plan: any) => plan._id !== planId));
                alert('Plan deleted successfully!');
            } else {
                alert(`Failed to delete plan: ${data.error}`);
            }
        } catch (error) {
            console.error('Failed to delete plan', error);
            alert('Failed to delete plan. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-100">Membership Plans</h1>
                <Link
                    href="/dashboard/plans/new"
                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan: any) => (
                    <div key={plan._id} className="flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-sm hover:shadow-xl hover:border-slate-700 transition-all duration-300 group">
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <h3 className="text-lg font-medium text-slate-100 group-hover:text-blue-400 transition-colors">{plan.name}</h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/dashboard/plans/${plan._id}/edit`}
                                        className="rounded-md p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                        title="Edit plan"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(plan._id, plan.name)}
                                        disabled={deleting === plan._id}
                                        className="rounded-md p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                                        title="Delete plan"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline text-3xl font-extrabold text-slate-100">
                                ₹{plan.price}
                                <span className="ml-1 text-xl font-medium text-slate-500">/ {plan.duration}mo</span>
                            </div>
                            <ul className="mt-6 space-y-4">
                                {plan.features.map((feature: string, index: number) => (
                                    <li key={index} className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <Check className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <p className="ml-3 text-sm text-slate-400">{feature}</p>
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
