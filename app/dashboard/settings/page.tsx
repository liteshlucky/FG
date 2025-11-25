'use client';

import { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleExport = async () => {
        try {
            const res = await fetch('/api/backup');
            const data = await res.json();
            if (data.success) {
                const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fit-app-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                setMessage({ type: 'error', text: 'Export failed: ' + data.error });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Export failed: ' + error.message });
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const res = await fetch('/api/backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(json),
                });
                const data = await res.json();
                if (data.success) {
                    setMessage({ type: 'success', text: 'Data imported successfully!' });
                } else {
                    setMessage({ type: 'error', text: 'Import failed: ' + data.error });
                }
            } catch (error: any) {
                setMessage({ type: 'error', text: 'Import failed: ' + error.message });
            } finally {
                setImporting(false);
                // Reset file input
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Data Management</h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                        <p>Export your data to a JSON file for backup, or import data to restore/migrate.</p>
                    </div>

                    {message && (
                        <div className={`mt-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center`}>
                            {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
                            {message.text}
                        </div>
                    )}

                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                        >
                            <Download className="-ml-1 mr-2 h-5 w-5" />
                            Export Data
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                className="hidden"
                                id="file-upload"
                                disabled={importing}
                            />
                            <label
                                htmlFor="file-upload"
                                className={`inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Upload className="-ml-1 mr-2 h-5 w-5" />
                                {importing ? 'Importing...' : 'Import Data'}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
