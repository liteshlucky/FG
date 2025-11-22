'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Dumbbell } from 'lucide-react';

export default function TrainersPage() {
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrainers();
    }, []);

    const fetchTrainers = async () => {
        try {
            const res = await fetch('/api/trainers');
            const data = await res.json();
            if (data.success) {
                setTrainers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch trainers', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Trainers</h1>
                <Link
                    href="/dashboard/trainers/new"
                    className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Trainer
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {trainers.map((trainer: any) => (
                    <div key={trainer._id} className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                        <Dumbbell className="h-6 w-6" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">{trainer.name}</h3>
                                    <p className="text-sm text-gray-500">{trainer.specialization}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm text-gray-600">{trainer.bio || 'No bio available.'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
