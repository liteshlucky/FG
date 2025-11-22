'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PTplanForm from '@/components/PTplanForm';

export default function EditPTplanPage() {
    const params = useParams();
    const router = useRouter();
    const [ptPlan, setPTPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPTPlan();
    }, []);

    const fetchPTPlan = async () => {
        try {
            const res = await fetch(`/api/pt-plans/${params.id}`);
            const data = await res.json();
            if (data.success) {
                setPTPlan(data.data);
            } else {
                router.push('/dashboard/pt-plans');
            }
        } catch (error) {
            console.error('Failed to fetch PT plan', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (!ptPlan) return <div className="p-4">PT Plan not found</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit PT Plan</h1>
            <PTplanForm initialData={ptPlan} isEdit={true} />
        </div>
    );
}
