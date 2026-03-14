import Link from 'next/link';
import { Database, BellRing } from 'lucide-react';

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Settings</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="lg:w-1/4">
                    <nav className="flex flex-col space-y-1">
                        <Link 
                            href="/dashboard/settings" 
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            <Database className="mr-3 h-5 w-5 text-blue-400" />
                            Data Management
                        </Link>
                        <Link 
                            href="/dashboard/settings/notifications" 
                            className="flex items-center px-4 py-3 text-sm font-medium rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                        >
                            <BellRing className="mr-3 h-5 w-5 text-emerald-400" />
                            Notifications
                        </Link>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="lg:w-3/4">
                    {children}
                </div>
            </div>
        </div>
    );
}
