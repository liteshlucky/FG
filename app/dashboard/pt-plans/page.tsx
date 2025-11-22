'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Dumbbell, Trash2 } from 'lucide-react';

export default function PTplansPage() {
    const [ptPlans, setPTplans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPTplans();
    }, []);

    const fetchPTplans = async () => {
        try {
            const res = await fetch('/api/pt-plans');
            const data = await res.json();
            if (data.success) {
                setPTplans(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch PT plans', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this PT plan?')) return;

        try {
            const res = await fetch(`/api/pt-plans/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                fetchPTplans();
            }
        } catch (error) {
            console.error('Failed to delete PT plan', error);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Personal Training Plans</h1>
                <Link
                    href="/dashboard/pt-plans/new"
                    className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create PT Plan
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {ptPlans.map((ptPlan: any) => (
                    <div key={ptPlan._id} className="flex flex-col overflow-hidden rounded-lg bg-white shadow">
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">{ptPlan.name}</h3>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/dashboard/pt-plans/${ptPlan._id}/edit`}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(ptPlan._id)}
                                        className="text-sm font-medium text-red-600 hover:text-red-500"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline text-3xl font-extrabold text-gray-900">
                                ₹{ptPlan.price}
                                <span className="ml-1 text-xl font-medium text-gray-500">/ {ptPlan.sessions} sessions</span>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center rounded-md bg-blue-50 p-2 text-sm text-blue-700">
                                    <Dumbbell className="mr-2 h-4 w-4" />
                                    <span className="font-semibold">Trainer:</span>
                                    <span className="ml-1">{ptPlan.trainerId?.name || 'Unassigned'}</span>
                                </div>
                                {ptPlan.specialization && (
                                    <div className="rounded-md bg-gray-50 p-2 text-sm text-gray-700">
                                        <span className="font-semibold">Specialization:</span> {ptPlan.specialization}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {ptPlans.length === 0 && (
                <div className="text-center py-12">
                    <Dumbbell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No PT plans</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new PT plan.</p>
                    <div className="mt-6">
                        <Link
                            href="/dashboard/pt-plans/new"
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create PT Plan
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
