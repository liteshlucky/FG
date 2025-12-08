'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TrainerForm({ initialData = null, isEdit = false }: { initialData?: any, isEdit?: boolean }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        role: 'Trainer',
        specialization: '',
        bio: '',
        profilePicture: '',
        baseSalary: '',
        ptFee: '',
        commissionType: 'percentage',
        commissionValue: '',
        dayOff: 'None',
        bankDetails: {
            accountName: '',
            accountNumber: '',
            bankName: '',
            ifscCode: '',
        },
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                role: initialData.role || 'Trainer',
                specialization: initialData.specialization || '',
                bio: initialData.bio || '',
                profilePicture: initialData.profilePicture || '',
                baseSalary: initialData.baseSalary !== undefined ? initialData.baseSalary : '0',
                ptFee: initialData.ptFee !== undefined ? initialData.ptFee : '0',
                commissionType: initialData.commissionType || 'percentage',
                commissionValue: initialData.commissionValue !== undefined ? initialData.commissionValue : '0',
                dayOff: initialData.dayOff || 'None',
                bankDetails: initialData.bankDetails || {
                    accountName: '',
                    accountNumber: '',
                    bankName: '',
                    ifscCode: '',
                },
            });
            if (initialData.profilePicture) {
                setImagePreview(initialData.profilePicture);
            }
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('bankDetails.')) {
            const field = name.split('.')[1];
            setFormData((prev) => ({
                ...prev,
                bankDetails: {
                    ...prev.bankDetails,
                    [field]: value,
                },
            }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (2MB limit)
        if (file.size > 2 * 1024 * 1024) {
            setError('Image size must be less than 2MB');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setFormData((prev) => ({ ...prev, profilePicture: base64String }));
            setImagePreview(base64String);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const url = isEdit ? `/api/trainers/${initialData._id}` : '/api/trainers';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            router.push('/dashboard/staff');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm">
            {error && (
                <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
                    {error}
                </div>
            )}

            {/* Profile Picture Upload */}
            <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                    {imagePreview ? (
                        <img
                            src={imagePreview}
                            alt="Profile preview"
                            className="h-24 w-24 rounded-full object-cover border-4 border-slate-800 shadow-md"
                        />
                    ) : (
                        <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 text-2xl font-semibold border-4 border-slate-700">
                            {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Profile Picture
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        JPG, PNG or WebP. Max size 2MB.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Trainer ID (Read-only) */}
                {isEdit && (
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Trainer ID</label>
                        <input
                            type="text"
                            value={initialData?.trainerId || 'Pending'}
                            readOnly
                            className="mt-1 block w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-slate-500 shadow-sm sm:text-sm cursor-not-allowed"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-400">Name</label>
                    <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Role</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-10 text-base text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="Management">Management</option>
                        <option value="Trainer">Trainer</option>
                        <option value="Support Staff">Support Staff</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Specialization</label>
                    <input
                        type="text"
                        name="specialization"
                        required
                        value={formData.specialization}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Bio</label>
                    <textarea
                        name="bio"
                        rows={3}
                        value={formData.bio}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                {/* Financial Details */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Base Salary (Monthly)</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-slate-500 sm:text-sm">₹</span>
                            </div>
                            <input
                                type="number"
                                name="baseSalary"
                                value={formData.baseSalary}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-700 bg-slate-950 pl-7 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400">PT Fee (Per Client)</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-slate-500 sm:text-sm">₹</span>
                            </div>
                            <input
                                type="number"
                                name="ptFee"
                                value={formData.ptFee}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-700 bg-slate-950 pl-7 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400">Commission Type</label>
                        <select
                            name="commissionType"
                            value={formData.commissionType}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-10 text-base text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400">Commission Value</label>
                        <input
                            type="number"
                            name="commissionValue"
                            value={formData.commissionValue}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            placeholder={formData.commissionType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400">Day Off</label>
                        <select
                            name="dayOff"
                            value={formData.dayOff}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-10 text-base text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                        >
                            <option value="None">None</option>
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                        </select>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="border-t border-slate-800 pt-6">
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Bank Details</h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Account Name</label>
                            <input
                                type="text"
                                name="bankDetails.accountName"
                                value={formData.bankDetails.accountName}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Account Number</label>
                            <input
                                type="text"
                                name="bankDetails.accountNumber"
                                value={formData.bankDetails.accountNumber}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400">Bank Name</label>
                            <input
                                type="text"
                                name="bankDetails.bankName"
                                value={formData.bankDetails.bankName}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400">IFSC Code</label>
                            <input
                                type="text"
                                name="bankDetails.ifscCode"
                                value={formData.bankDetails.ifscCode}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-700 hover:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? 'Saving...' : (isEdit ? 'Update Staff Member' : 'Add Staff Member')}
                </button>
            </div>
        </form >
    );
}
