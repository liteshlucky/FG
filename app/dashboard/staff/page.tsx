'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit } from 'lucide-react';
import Avatar from '@/components/Avatar';

export default function StaffPage() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('All');

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/trainers'); // API still uses /api/trainers for now
            const data = await res.json();
            if (data.success) {
                setStaff(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch staff', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStaff = staff.filter((s: any) => roleFilter === 'All' || s.role === roleFilter);

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Staff</h1>
                    <p className="text-sm text-slate-400">Manage your gym staff and trainers</p>
                </div>
                <Link
                    href="/dashboard/staff/new"
                    className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff
                </Link>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-slate-400">Filter by Role:</span>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 py-1 pl-3 pr-8 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    <option value="All">All Roles</option>
                    <option value="Management">Management</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Support Staff">Support Staff</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.map((person: any) => (
                    <div key={person._id} className="overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-sm transition hover:scale-[1.02] hover:shadow-xl hover:border-slate-700 group">
                        <div className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Avatar src={person.profilePicture} name={person.name} size="lg" />
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-medium text-slate-100">{person.name}</h3>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500">ID: {person.trainerId || 'N/A'}</span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 w-fit
                                                ${person.role === 'Management' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                                    person.role === 'Trainer' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                        person.role === 'Support Staff' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            'bg-slate-800 text-slate-300 border border-slate-700'}`}
                                            >
                                                {person.role || 'Trainer'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Link href={`/dashboard/staff/${person._id}/edit`} className="text-slate-500 hover:text-blue-400 transition-colors">
                                    <Edit className="h-5 w-5" />
                                </Link>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm text-slate-400 font-medium">{person.specialization}</p>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{person.bio || 'No bio available.'}</p>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Link
                                    href={`/dashboard/staff/${person._id}`}
                                    className="text-sm font-medium text-blue-500 hover:text-blue-400 hover:underline transition-colors"
                                >
                                    View Details
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
