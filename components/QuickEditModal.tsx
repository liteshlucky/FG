'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    section: 'personal' | 'physical' | 'health';
    initialData: any;
}

export default function QuickEditModal({ isOpen, onClose, onSave, section, initialData }: QuickEditModalProps) {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            // Initialize form data based on section to avoid sending unnecessary fields
            if (section === 'personal') {
                setFormData({
                    name: initialData.name,
                    email: initialData.email,
                    phone: initialData.phone,
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

    if (!isOpen) return null;

    const getTitle = () => {
        switch (section) {
            case 'personal': return 'Edit Personal Information';
            case 'physical': return 'Edit Physical Details';
            case 'health': return 'Edit Health & Goals';
            default: return 'Edit';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-medium text-gray-900">{getTitle()}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-4">
                        {section === 'personal' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Age</label>
                                        <input
                                            type="number"
                                            name="age"
                                            value={formData.age || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {section === 'physical' && (
                            <div className="grid grid-cols-2 gap-4">
                                {['height', 'weight', 'chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                                    <div key={field}>
                                        <label className="block text-sm font-medium text-gray-700 capitalize">
                                            {field} ({field === 'weight' ? 'kg' : field === 'height' ? 'cm' : 'in'})
                                        </label>
                                        <input
                                            type="number"
                                            name={`bodyMeasurements.${field}`}
                                            value={formData.bodyMeasurements?.[field] || ''}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {section === 'health' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
                                    <div className="space-y-2">
                                        {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Other'].map((pref) => (
                                            <div key={pref} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    name="dietaryPreferences"
                                                    value={pref}
                                                    checked={(formData.dietaryPreferences || []).includes(pref)}
                                                    onChange={handleChange}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <label className="ml-2 text-sm text-gray-700">{pref}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Allergies</label>
                                    <input
                                        type="text"
                                        name="allergies"
                                        value={formData.allergies || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. Peanuts, Dairy"
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Medical History</label>
                                    <textarea
                                        name="medicalHistory"
                                        rows={3}
                                        value={formData.medicalHistory || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Goals</label>
                                    <textarea
                                        name="goals"
                                        rows={3}
                                        value={formData.goals || ''}
                                        onChange={handleChange}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
