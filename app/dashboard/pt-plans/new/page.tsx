'use client';

import PTplanForm from '@/components/PTplanForm';

export default function NewPTplanPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Create New PT Plan</h1>
            <PTplanForm />
        </div>
    );
}
