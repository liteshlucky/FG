import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden relative z-10">
                <Navbar />
                <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {children}
                </main>
            </div>
        </div>
    );
}
