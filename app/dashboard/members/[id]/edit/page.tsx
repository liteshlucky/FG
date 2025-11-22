'use client';

import MemberForm from '@/components/MemberForm';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function EditMemberPage() {
    const params = useParams();
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const res = await fetch(`/api/members/${params.id}`);
                const data = await res.json();
                if (data.success) {
                    setMember(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch member', error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchMember();
        }
    }, [params.id]);

    if (loading) return <div>Loading...</div>;
    if (!member) return <div>Member not found</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Member</h1>
            <MemberForm initialData={member} isEdit={true} />
        </div>
    );
}
