'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TrainerForm from '@/components/TrainerForm';
import { ArrowLeft } from 'lucide-react';

export default function EditTrainerPage() {
    const params = useParams();
    const router = useRouter();
    const [trainer, setTrainer] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTrainer = async () => {
            try {
                const res = await fetch(`/api/trainers/${params.id}`);
                const data = await res.json();
                if (data.success) {
                    setTrainer(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch trainer', error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchTrainer();
        }
    }, [params.id]);

    if (loading) return <div className="p-4">Loading...</div>;
    if (!trainer) return <div className="p-4">Trainer not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <button
                    onClick={() => router.back()}
                    className="mr-4 text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Edit Staff</h1>
            </div>
            <TrainerForm initialData={trainer} isEdit={true} />
        </div>
    );
}
