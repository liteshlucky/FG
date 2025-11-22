'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PlanForm from '@/components/PlanForm';

export default function EditPlanPage() {
    const params = useParams();
    const router = useRouter();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlan();
    }, []);

    const fetchPlan = async () => {
        try {
            const res = await fetch(`/api/plans/${params.id}`);
            const data = await res.json();
            if (data.success) {
                setPlan(data.data);
            } else {
                router.push('/dashboard/plans');
            }
        } catch (error) {
            console.error('Failed to fetch plan', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (!plan) return <div className="p-4">Plan not found</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Plan</h1>
            <PlanForm initialData={plan} isEdit={true} />
        </div>
    );
}
