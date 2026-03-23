'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Download, Upload, AlertCircle, CheckCircle,
    ShieldCheck, Clock, Mail, RefreshCw, Loader2,
} from 'lucide-react';

// ─── Backup History Card ──────────────────────────────────────────────────────

function BackupHistoryCard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [runMsg, setRunMsg] = useState(null);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/backup/logs');
            const data = await res.json();
            if (data.success) setLogs(data.logs);
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const runNow = async () => {
        setRunning(true);
        setRunMsg(null);
        try {
            const res = await fetch('/api/cron/auto-backup');
            const data = await res.json();
            if (data.success) {
                setRunMsg({ type: 'success', text: `Backup sent! (${(data.sizeBytes / 1024).toFixed(1)} KB)` });
                fetchLogs(); // refresh history
            } else {
                setRunMsg({ type: 'error', text: 'Backup failed: ' + data.error });
            }
        } catch (e) {
            setRunMsg({ type: 'error', text: 'Backup failed: ' + e.message });
        } finally {
            setRunning(false);
        }
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="bg-slate-900 border border-slate-800 shadow-sm sm:rounded-xl">
            <div className="px-4 py-5 sm:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                            <h3 className="text-lg font-medium leading-6 text-slate-100">
                                Automated Backup
                            </h3>
                        </div>
                        <div className="mt-1 max-w-xl text-sm text-slate-400">
                            <p>Database is backed up every day at <strong className="text-slate-300">midnight IST</strong> and emailed to <strong className="text-slate-300">fitnessgarage.sodepur@gmail.com</strong>. Logs older than 3 days are automatically removed.</p>
                        </div>
                    </div>

                    {/* Run Now button */}
                    <button
                        onClick={runNow}
                        disabled={running}
                        className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-600/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-600/20 hover:border-emerald-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {running
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
                            : <><RefreshCw className="h-4 w-4" /> Run Now</>
                        }
                    </button>
                </div>

                {/* Run result message */}
                {runMsg && (
                    <div className={`mt-4 p-3 rounded-lg border flex items-center gap-2 text-sm animate-in fade-in duration-300 ${
                        runMsg.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                        {runMsg.type === 'success'
                            ? <CheckCircle className="h-4 w-4 shrink-0" />
                            : <AlertCircle className="h-4 w-4 shrink-0" />
                        }
                        {runMsg.text}
                    </div>
                )}

                {/* Schedule info pills */}
                <div className="mt-5 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 border border-slate-700">
                        <Clock className="h-3.5 w-3.5 text-blue-400" />
                        Daily at 12:00 AM IST
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 border border-slate-700">
                        <Mail className="h-3.5 w-3.5 text-purple-400" />
                        fitnessgarage.sodepur@gmail.com
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 border border-slate-700">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        3-day log retention
                    </span>
                </div>

                {/* History table */}
                <div className="mt-5">
                    <h4 className="text-sm font-medium text-slate-400 mb-3">Recent Backups</h4>
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">No backups have run yet. Click <strong>Run Now</strong> to trigger the first one.</p>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-800">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-800/50">
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Date & Time</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Status</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Size</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Sent To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => (
                                        <tr
                                            key={log._id}
                                            className={`border-b border-slate-800/60 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}
                                        >
                                            <td className="px-4 py-3 text-slate-300 font-mono text-xs">{formatDate(log.runAt)}</td>
                                            <td className="px-4 py-3">
                                                {log.status === 'success' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle className="h-3 w-3" /> Success
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20" title={log.error}>
                                                        <AlertCircle className="h-3 w-3" /> Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">{formatSize(log.sizeBytes)}</td>
                                            <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[200px]">{log.sentTo || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState(null);

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
        } catch (error) {
            setMessage({ type: 'error', text: 'Export failed: ' + error.message });
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result);
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
            } catch (error) {
                setMessage({ type: 'error', text: 'Import failed: ' + error.message });
            } finally {
                setImporting(false);
                e.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Manual Export / Import */}
            <div className="bg-slate-900 border border-slate-800 shadow-sm sm:rounded-xl">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-slate-100">Data Management</h3>
                    <div className="mt-2 max-w-xl text-sm text-slate-400">
                        <p>Export your data to a JSON file for backup, or import data to restore/migrate.</p>
                    </div>

                    {message && (
                        <div className={`mt-4 p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} flex items-center animate-in fade-in duration-300`}>
                            {message.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
                            {message.text}
                        </div>
                    )}

                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto transition-all hover:scale-105 active:scale-95"
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
                                className={`inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto cursor-pointer transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Upload className="-ml-1 mr-2 h-5 w-5" />
                                {importing ? 'Importing...' : 'Import Data'}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Automated Backup */}
            <BackupHistoryCard />
        </div>
    );
}
