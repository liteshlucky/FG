'use client';

import TrainerForm from '@/components/TrainerForm';

export default function NewTrainerPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Add New Staff</h1>
            <TrainerForm />
        </div>
    );
}
