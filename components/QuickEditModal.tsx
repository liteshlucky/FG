'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    onClearPlan?: () => Promise<void>; // Optional: clear plan data from member
    section: 'personal' | 'physical' | 'health' | 'membership' | 'pt';
    initialData: any;
}

export default function QuickEditModal({ isOpen, onClose, onSave, onClearPlan, section, initialData }: QuickEditModalProps) {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [ptPlans, setPTPlans] = useState<any[]>([]);
    const [trainers, setTrainers] = useState<any[]>([]);

    useEffect(() => {
        if (section === 'membership') fetch('/api/plans').then(r => r.json()).then(d => { if (d.success) setPlans(d.data); });
        if (section === 'pt') {
            fetch('/api/pt-plans').then(r => r.json()).then(d => { if (d.success) setPTPlans(d.data); });
            fetch('/api/trainers').then(r => r.json()).then(d => { if (d.success) setTrainers(d.data); });
        }
    }, [section]);

    useEffect(() => {
        if (initialData) {
            // Initialize form data based on section to avoid sending unnecessary fields
            if (section === 'personal') {
                setFormData({
                    name: initialData.name,
                    email: initialData.email,
                    phone: initialData.phone,
                    dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : '',
                    emergencyContact: initialData.emergencyContact,
                    age: initialData.age,
                    gender: initialData.gender,
                    status: initialData.status,
                });
            } else if (section === 'physical') {
                setFormData({
                    bodyMeasurements: { ...initialData.bodyMeasurements }
                });
            } else if (section === 'health') {
                setFormData({
                    medicalHistory: initialData.medicalHistory,
                    goals: initialData.goals,
                    dietaryPreferences: initialData.dietaryPreferences || [],
                    allergies: initialData.allergies,
                });
            } else if (section === 'membership') {
                setFormData({
                    planId: initialData.planId?._id || initialData.planId || '',
                    membershipStartDate: initialData.membershipStartDate ? new Date(initialData.membershipStartDate).toISOString().split('T')[0] : '',
                    membershipEndDate: initialData.membershipEndDate ? new Date(initialData.membershipEndDate).toISOString().split('T')[0] : '',
                });
            } else if (section === 'pt') {
                setFormData({
                    ptPlanId: initialData.ptPlanId?._id || initialData.ptPlanId || '',
                    trainerId: initialData.trainerId?._id || initialData.trainerId || '',
                    ptStartDate: initialData.ptStartDate ? new Date(initialData.ptStartDate).toISOString().split('T')[0] : '',
                    ptEndDate: initialData.ptEndDate ? new Date(initialData.ptEndDate).toISOString().split('T')[0] : '',
                });
            }
        }
    }, [initialData, section]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (section === 'physical') {
            const field = name.split('.')[1];
            setFormData((prev: any) => ({
                ...prev,
                bodyMeasurements: {
                    ...prev.bodyMeasurements,
                    [field]: value
                }
            }));
        } else if (name === 'dateOfBirth') {
            let calculatedAge = '';
            if (value) {
                const dob = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                    age--;
                }
                calculatedAge = age.toString();
            }
            setFormData((prev: any) => ({ ...prev, [name]: value, age: calculatedAge }));
        } else if (name === 'dietaryPreferences') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev: any) => {
                const current = Array.isArray(prev.dietaryPreferences) ? prev.dietaryPreferences : [];
                if (checked) {
                    return { ...prev, dietaryPreferences: [...current, value] };
                } else {
                    return { ...prev, dietaryPreferences: current.filter((item: string) => item !== value) };
                }
            });
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearPlan = async () => {
        if (!onClearPlan) return;
        const label = section === 'pt' ? 'PT plan and trainer' : 'membership plan';
        if (!confirm(`This will remove the ${label} from this member. Continue?`)) return;
        setClearing(true);
        try {
            await onClearPlan();
            onClose();
        } catch (error) {
            console.error('Failed to clear plan', error);
        } finally {
            setClearing(false);
        }
    };

    if (!isOpen) return null;

    const getTitle = () => {
        switch (section) {
            case 'personal': return 'Edit Personal Information';
            case 'physical': return 'Edit Physical Details';
            case 'health': return 'Edit Health & Goals';
            case 'membership': return 'Edit Membership Dates';
            case 'pt': return 'Edit PT Dates';
            default: return 'Edit';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-slate-800 shadow-xl border border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
                    <h3 className="text-lg font-medium text-slate-100">{getTitle()}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-300">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        {section === 'personal' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Phone</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300">Date of Birth</label>
                                        <input
                                            type="date"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300">Emergency Contact</label>
                                        <input
                                            type="text"
                                            name="emergencyContact"
                                            value={formData.emergencyContact || ''}
                                            onChange={handleChange}
                                            placeholder="Name & Phone"
                                            className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {section === 'physical' && (
                            <div className="grid grid-cols-2 gap-4">
                                {['height', 'weight', 'chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                                    <div key={field}>
                                        <label className="block text-sm font-medium text-slate-300 capitalize">
                                            {field} ({field === 'weight' ? 'kg' : field === 'height' ? 'cm' : 'in'})
                                        </label>
                                        <input
                                            type="number"
                                            name={`bodyMeasurements.${field}`}
                                            value={formData.bodyMeasurements?.[field] || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {section === 'health' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Dietary Preferences</label>
                                    <div className="space-y-2">
                                        {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Other'].map((pref) => (
                                            <div key={pref} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    name="dietaryPreferences"
                                                    value={pref}
                                                    checked={(formData.dietaryPreferences || []).includes(pref)}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                                                />
                                                <label className="ml-2 text-sm text-slate-300">{pref}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Allergies</label>
                                    <input
                                        type="text"
                                        name="allergies"
                                        value={formData.allergies || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. Peanuts, Dairy"
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Medical History</label>
                                    <textarea
                                        name="medicalHistory"
                                        rows={3}
                                        value={formData.medicalHistory || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Goals</label>
                                    <textarea
                                        name="goals"
                                        rows={3}
                                        value={formData.goals || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                            </>
                        )}

                        {section === 'membership' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Membership Plan</label>
                                    <select
                                        name="planId"
                                        value={formData.planId || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    >
                                        <option value="">— No change —</option>
                                        {plans.map((p: any) => (
                                            <option key={p._id} value={p._id}>{p.name} — ₹{p.price} ({p.duration} months)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Membership Start Date</label>
                                    <input
                                        type="date"
                                        name="membershipStartDate"
                                        value={formData.membershipStartDate || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Membership End Date</label>
                                    <input
                                        type="date"
                                        name="membershipEndDate"
                                        value={formData.membershipEndDate || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {section === 'pt' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">PT Plan</label>
                                    <select
                                        name="ptPlanId"
                                        value={formData.ptPlanId || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    >
                                        <option value="">— No change —</option>
                                        {ptPlans.map((p: any) => (
                                            <option key={p._id} value={p._id}>{p.name} — ₹{p.price} ({p.sessions} sessions)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Trainer</label>
                                    <select
                                        name="trainerId"
                                        value={formData.trainerId || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    >
                                        <option value="">— No change —</option>
                                        {trainers.map((t: any) => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">PT Start Date</label>
                                    <input
                                        type="date"
                                        name="ptStartDate"
                                        value={formData.ptStartDate || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">PT End Date</label>
                                    <input
                                        type="date"
                                        name="ptEndDate"
                                        value={formData.ptEndDate || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-between items-center gap-3">
                        {/* Clear Plan — only for membership/pt sections */}
                        {(section === 'membership' || section === 'pt') && onClearPlan ? (
                            <button
                                type="button"
                                onClick={handleClearPlan}
                                disabled={clearing}
                                className="rounded-md border border-rose-600/30 bg-rose-600/10 px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-600/20 disabled:opacity-50"
                            >
                                {clearing ? 'Clearing...' : section === 'pt' ? 'Clear PT Plan' : 'Clear Membership'}
                            </button>
                        ) : <div />}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
