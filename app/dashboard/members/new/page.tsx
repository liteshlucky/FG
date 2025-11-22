'use client';

import MemberForm from '@/components/MemberForm';

export default function NewMemberPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Add New Member</h1>
            <MemberForm />
        </div>
    );
}
