'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, AlertCircle, CheckCircle, Mail, BellRing } from 'lucide-react';

export default function NotificationsSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [emails, setEmails] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState('');
    
    const [preferences, setPreferences] = useState({
        membershipExpiring: true,
        pendingDues: true,
        paymentReceived: true,
        absenteeAlert: true,
        birthdays: true,
        newMember: true,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/notifications');
            const data = await res.json();
            
            if (data.success && data.data) {
                setEmails(data.data.notificationEmails || []);
                setPreferences({
                    ...preferences,
                    ...data.data.preferences
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch('/api/settings/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationEmails: emails,
                    preferences
                }),
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Notification settings saved successfully!' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save settings.' });
            }
        } catch (error) {
            console.error('Save error:', error);
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddEmail = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newEmail.trim();
        if (!trimmed) return;
        
        // Basic email validation
        if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address.' });
            return;
        }

        if (emails.includes(trimmed)) {
            setNewEmail('');
            return;
        }

        setEmails([...emails, trimmed]);
        setNewEmail('');
        setMessage(null);
    };

    const handleRemoveEmail = (emailToRemove: string) => {
        setEmails(emails.filter(e => e !== emailToRemove));
    };

    const togglePreference = (key: keyof typeof preferences) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (loading) {
        return <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-slate-800 rounded"></div>
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                </div>
            </div>
        </div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 shadow-sm sm:rounded-xl">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                        <Mail className="h-5 w-5 text-blue-400 mr-2" />
                        <h3 className="text-lg font-medium leading-6 text-slate-100">Email Recipients</h3>
                    </div>
                    <div className="mt-2 max-w-xl text-sm text-slate-400 mb-6">
                        <p>These email addresses will receive the daily gym summary and critical alerts.</p>
                    </div>

                    {/* Email Input */}
                    <form onSubmit={handleAddEmail} className="flex gap-2 max-w-md mb-4">
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="admin@gym.com"
                            className="block w-full rounded-md border-0 bg-slate-800 py-2.5 px-3 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                        />
                        <button
                            type="submit"
                            className="inline-flex justify-center rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-slate-700 hover:bg-slate-700"
                        >
                            <Plus className="h-5 w-5" />
                        </button>
                    </form>

                    {/* Email Badges */}
                    <div className="flex flex-wrap gap-2">
                        {emails.map(email => (
                            <span key={email} className="inline-flex items-center gap-x-1.5 rounded-full bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                                {email}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveEmail(email)}
                                    className="group relative -mr-1 h-4 w-4 rounded-full hover:bg-blue-500/20"
                                >
                                    <span className="sr-only">Remove</span>
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}
                        {emails.length === 0 && <span className="text-sm text-slate-500 italic">No emails configured</span>}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 shadow-sm sm:rounded-xl">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center mb-4">
                        <BellRing className="h-5 w-5 text-emerald-400 mr-2" />
                        <h3 className="text-lg font-medium leading-6 text-slate-100">Notification Preferences</h3>
                    </div>
                    <div className="mt-2 max-w-xl text-sm text-slate-400 mb-6">
                        <p>Choose which alerts to generate in the app and send via email.</p>
                    </div>

                    <div className="space-y-4">
                        <ToggleItem 
                            label="Membership Expirations"
                            description="Alerts for members expiring in the next 1-3 days"
                            checked={preferences.membershipExpiring}
                            onChange={() => togglePreference('membershipExpiring')}
                        />
                        <ToggleItem 
                            label="Pending Dues"
                            description="Daily alerts for active members with outstanding balances"
                            checked={preferences.pendingDues}
                            onChange={() => togglePreference('pendingDues')}
                        />
                        <ToggleItem 
                            label="Payments Received"
                            description="Real-time notification when a payment is logged"
                            checked={preferences.paymentReceived}
                            onChange={() => togglePreference('paymentReceived')}
                        />
                        <ToggleItem 
                            label="New Member Registered"
                            description="Real-time notification when a new member is added"
                            checked={preferences.newMember}
                            onChange={() => togglePreference('newMember')}
                        />
                        <ToggleItem 
                            label="Absentee Alerts"
                            description="Alerts for members missing for 7+ consecutive days"
                            checked={preferences.absenteeAlert}
                            onChange={() => togglePreference('absenteeAlert')}
                        />
                        <ToggleItem 
                            label="Birthdays"
                            description="Daily alert for member birthdays today"
                            checked={preferences.birthdays}
                            onChange={() => togglePreference('birthdays')}
                        />
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} flex items-center animate-in fade-in duration-300`}>
                    {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
                    {message.text}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex justify-center items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition disabled:opacity-50"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
}

function ToggleItem({ label, description, checked, onChange }: { label: string, description: string, checked: boolean, onChange: () => void }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
            <div>
                <dt className="text-sm font-medium text-slate-200">{label}</dt>
                <dd className="text-sm text-slate-500">{description}</dd>
            </div>
            <button
                type="button"
                onClick={onChange}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    checked ? 'bg-blue-600' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={checked}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}
