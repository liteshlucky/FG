'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberForm({ initialData = null, isEdit = false }: { initialData?: any, isEdit?: boolean }) {
    const router = useRouter();
    const [plans, setPlans] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [ptPlans, setPTPlans] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        age: '',
        gender: '',
        bodyMeasurements: {
            height: '',
            weight: '',
            chest: '',
            waist: '',
            hips: '',
            arms: '',
            thighs: '',
        },
        medicalHistory: '',
        goals: '',
        dietaryPreferences: [] as string[],
        allergies: '',
        planId: '',
        discountId: '',
        ptPlanId: '',
        trainerId: '',
        status: 'Active',
        profilePicture: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        fetchPlans();
        fetchDiscounts();
        fetchPTPlans();
        fetchTrainers();
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                phone: initialData.phone || '',
                age: initialData.age || '',
                gender: initialData.gender || '',
                bodyMeasurements: {
                    height: initialData.bodyMeasurements?.height || '',
                    weight: initialData.bodyMeasurements?.weight || '',
                    chest: initialData.bodyMeasurements?.chest || '',
                    waist: initialData.bodyMeasurements?.waist || '',
                    hips: initialData.bodyMeasurements?.hips || '',
                    arms: initialData.bodyMeasurements?.arms || '',
                    thighs: initialData.bodyMeasurements?.thighs || '',
                },
                medicalHistory: initialData.medicalHistory || '',
                goals: initialData.goals || '',
                dietaryPreferences: Array.isArray(initialData.dietaryPreferences) ? initialData.dietaryPreferences : [],
                allergies: initialData.allergies || '',
                planId: initialData.planId?._id || initialData.planId || '',
                discountId: initialData.discountId?._id || initialData.discountId || '',
                ptPlanId: initialData.ptPlanId?._id || initialData.ptPlanId || '',
                trainerId: initialData.trainerId?._id || initialData.trainerId || '',
                status: initialData.status || 'Active',
                profilePicture: initialData.profilePicture || '',
            });
            if (initialData.profilePicture) {
                setImagePreview(initialData.profilePicture);
            }
        }
    }, [initialData]);

    const fetchPlans = async () => {
        const res = await fetch('/api/plans');
        const data = await res.json();
        if (data.success) {
            setPlans(data.data);
        }
    };

    const fetchDiscounts = async () => {
        const res = await fetch('/api/discounts');
        const data = await res.json();
        if (data.success) {
            setDiscounts(data.data);
        }
    };

    const fetchPTPlans = async () => {
        const res = await fetch('/api/pt-plans');
        const data = await res.json();
        if (data.success) {
            setPTPlans(data.data);
        }
    };

    const fetchTrainers = async () => {
        const res = await fetch('/api/trainers');
        const data = await res.json();
        if (data.success) {
            setTrainers(data.data);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (name === 'dietaryPreferences') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => {
                const current = Array.isArray(prev.dietaryPreferences) ? prev.dietaryPreferences : [];
                if (checked) {
                    return { ...prev, dietaryPreferences: [...current, value] };
                } else {
                    return { ...prev, dietaryPreferences: current.filter(item => item !== value) };
                }
            });
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
            const url = isEdit ? `/api/members/${initialData._id}` : '/api/members';
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

            router.push('/dashboard/members');
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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Member ID (Read-only) */}
                {/* Member ID (Read-only) */}
                {isEdit && (
                    <div>
                        <label className="block text-sm font-medium text-slate-400">Member ID</label>
                        <input
                            type="text"
                            value={initialData?.memberId || 'Pending'}
                            readOnly
                            className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-500 shadow-sm sm:text-sm cursor-not-allowed"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-400">Full Name</label>
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
                    <label className="block text-sm font-medium text-slate-400">Email</label>
                    <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Phone</label>
                    <input
                        type="text"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Age</label>
                    <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Gender</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                    <h3 className="text-lg font-medium text-slate-100 mb-4">Body Measurements</h3>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {['height', 'weight', 'chest', 'waist', 'hips', 'arms', 'thighs'].map((field) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-slate-400 capitalize">
                                    {field} ({field === 'weight' ? 'kg' : field === 'height' ? 'cm' : 'in'})
                                </label>
                                <input
                                    type="number"
                                    name={`bodyMeasurements.${field}`}
                                    value={formData.bodyMeasurements?.[field as keyof typeof formData.bodyMeasurements] || ''}
                                    onChange={(e) => {
                                        const { value } = e.target;
                                        setFormData((prev: any) => ({
                                            ...prev,
                                            bodyMeasurements: {
                                                ...prev.bodyMeasurements,
                                                [field]: value,
                                            },
                                        }));
                                    }}
                                    className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-400">Medical History</label>
                    <textarea
                        name="medicalHistory"
                        rows={3}
                        value={formData.medicalHistory}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div className="col-span-1 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-400">Goals</label>
                    <textarea
                        name="goals"
                        rows={3}
                        value={formData.goals}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Dietary Preferences</label>
                    <div className="space-y-2">
                        {['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Other'].map((pref) => (
                            <div key={pref} className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="dietaryPreferences"
                                    value={pref}
                                    checked={(formData.dietaryPreferences as string[]).includes(pref)}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                                />
                                <label className="ml-2 text-sm text-slate-400">{pref}</label>
                            </div>
                        ))}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Select all that apply. Leave empty for No Preference.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Allergies</label>
                    <input
                        type="text"
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleChange}
                        placeholder="e.g. Peanuts, Dairy, Gluten"
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Membership Plan</label>
                    <select
                        name="planId"
                        value={formData.planId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="">Select a Plan</option>
                        {plans.map((plan: any) => (
                            <option key={plan._id} value={plan._id}>
                                {plan.name} - ₹{plan.price}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Discount / Coupon</label>
                    <select
                        name="discountId"
                        value={formData.discountId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="">No Discount</option>
                        {discounts.map((discount: any) => (
                            <option key={discount._id} value={discount._id}>
                                {discount.code} - {discount.description} ({discount.type === 'percentage' ? `${discount.value}%` : `₹${discount.value}`})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">PT Plan (Optional)</label>
                    <select
                        name="ptPlanId"
                        value={formData.ptPlanId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="">No PT Plan</option>
                        {ptPlans.map((ptPlan: any) => (
                            <option key={ptPlan._id} value={ptPlan._id}>
                                {ptPlan.name} - ₹{ptPlan.price} ({ptPlan.sessions} sessions)
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Assigned Trainer (Optional)</label>
                    <select
                        name="trainerId"
                        value={formData.trainerId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="">No Trainer Assigned</option>
                        {trainers.map((trainer: any) => (
                            <option key={trainer._id} value={trainer._id}>
                                {trainer.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
                    >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Expired">Expired</option>
                    </select>
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
                    {loading ? 'Saving...' : isEdit ? 'Update Member' : 'Add Member'}
                </button>
            </div>
        </form>
    );
}
