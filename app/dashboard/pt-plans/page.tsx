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
                <h1 className="text-2xl font-bold text-slate-100">Personal Training Plans</h1>
                <Link
                    href="/dashboard/pt-plans/new"
                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create PT Plan
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {ptPlans.map((ptPlan: any) => (
                    <div key={ptPlan._id} className="flex flex-col overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-sm hover:shadow-xl hover:border-slate-700 transition-all duration-300 group">
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-slate-100 group-hover:text-blue-400 transition-colors">{ptPlan.name}</h3>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/dashboard/pt-plans/${ptPlan._id}/edit`}
                                        className="text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(ptPlan._id)}
                                        className="text-sm font-medium text-slate-400 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline text-3xl font-extrabold text-slate-100">
                                ₹{ptPlan.price}
                                <span className="ml-1 text-xl font-medium text-slate-500">/ {ptPlan.sessions} sessions</span>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-sm text-blue-300">
                                    <Dumbbell className="mr-2 h-4 w-4" />
                                    <span className="font-semibold text-blue-200">Trainer:</span>
                                    <span className="ml-1">{ptPlan.trainerId?.name || 'Unassigned'}</span>
                                </div>
                                {ptPlan.specialization && (
                                    <div className="rounded-lg bg-slate-800 p-2 text-sm text-slate-400 border border-slate-700">
                                        <span className="font-semibold text-slate-300">Specialization:</span> {ptPlan.specialization}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {ptPlans.length === 0 && (
                <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50">
                    <Dumbbell className="mx-auto h-12 w-12 text-slate-700" />
                    <h3 className="mt-2 text-sm font-medium text-slate-300">No PT plans</h3>
                    <p className="mt-1 text-sm text-slate-500">Get started by creating a new PT plan.</p>
                    <div className="mt-6">
                        <Link
                            href="/dashboard/pt-plans/new"
                            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
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
