'use client';

import PlanForm from '@/components/PlanForm';

export default function NewPlanPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Create New Plan</h1>
            <PlanForm />
        </div>
    );
}
