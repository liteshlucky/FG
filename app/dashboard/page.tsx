import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import '@/models/Plan';
import Link from 'next/link';
import {
    Users, UserCheck, UserX, UserPlus, RefreshCw, DollarSign,
    Calendar, AlertCircle, Bell, Activity, ArrowUpRight,
    CreditCard, TrendingUp, Clock, CheckCircle2, XCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getComprehensiveStats() {
    await dbConnect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Fetch all members and trainers
    const allMembers = await Member.find().populate('planId');
    const allTrainers = await Trainer.find();

    // Basic counts
    const totalClients = allMembers.length;
    const activeClients = allMembers.filter(m => m.status === 'Active').length;
    const inactiveClients = allMembers.filter(m => m.status === 'Expired' || m.status === 'Inactive').length;

    // New clients this month
    const newClientsThisMonth = allMembers.filter(m =>
        new Date(m.joinDate) >= startOfMonth
    ).length;

    // Membership renewed this month
    const renewedThisMonth = allMembers.filter(m =>
        m.membershipStartDate && new Date(m.membershipStartDate) >= startOfMonth
    ).length;

    // Dues calculations
    const membersWithDues = allMembers.filter(m =>
        m.paymentStatus === 'partial' || m.paymentStatus === 'unpaid'
    );
    const totalDues = membersWithDues.length;

    // Today's dues (simplified)
    const todaysDues = 0;

    // Overdue
    const totalOverdue = allMembers.filter(m =>
        m.membershipEndDate && new Date(m.membershipEndDate) < now &&
        (m.paymentStatus === 'partial' || m.paymentStatus === 'unpaid')
    ).length;

    // Birthday tracking
    const totalBirthday = 0;
    const todaysBirthday = 0;

    // Enquiries
    const totalEnquiries = 0;
    const followUpThisMonth = 0;
    const todaysFollowUp = 0;

    // PT statistics
    const activePT = allMembers.filter(m => m.ptPlanId).length;
    const inactivePT = allMembers.filter(m => !m.ptPlanId && m.status === 'Active').length;

    // Attendance
    const todaysPresent = 0;
    const todaysAbsent = 0;

    // Other statuses
    const noMembership = allMembers.filter(m => !m.planId).length;
    const disabledClients = 0;
    const pendingClients = allMembers.filter(m => m.status === 'Pending').length;

    // Membership expiring calculations
    const membershipExpiring = {
        today: allMembers.filter(m => {
            if (!m.membershipEndDate) return false;
            const endDate = new Date(m.membershipEndDate);
            return endDate >= startOfToday && endDate < endOfToday;
        }).length,

        days1to3: allMembers.filter(m => {
            if (!m.membershipEndDate) return false;
            const endDate = new Date(m.membershipEndDate);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry >= 1 && daysUntilExpiry <= 3;
        }).length,

        days4to8: allMembers.filter(m => {
            if (!m.membershipEndDate) return false;
            const endDate = new Date(m.membershipEndDate);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry >= 4 && daysUntilExpiry <= 8;
        }).length,

        days9to15: allMembers.filter(m => {
            if (!m.membershipEndDate) return false;
            const endDate = new Date(m.membershipEndDate);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry >= 9 && daysUntilExpiry <= 15;
        }).length,

        expiringThisMonth: allMembers.filter(m => {
            if (!m.membershipEndDate) return false;
            const endDate = new Date(m.membershipEndDate);
            return endDate.getMonth() === now.getMonth() && endDate.getFullYear() === now.getFullYear();
        }).length,

        expiredUnder30Days: allMembers.filter(m => {
            if (!m.membershipEndDate) return false;
            const endDate = new Date(m.membershipEndDate);
            const daysSinceExpiry = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceExpiry > 0 && daysSinceExpiry <= 30;
        }).length,
    };

    const totalTrainers = allTrainers.length;

    return {
        totalClients, activeClients, inactiveClients, newClientsThisMonth, renewedThisMonth,
        totalDues, todaysDues, totalOverdue, totalBirthday, todaysBirthday,
        totalEnquiries, followUpThisMonth, todaysFollowUp, activePT, inactivePT,
        todaysPresent, todaysAbsent, noMembership, disabledClients, pendingClients,
        totalTrainers, membershipExpiring,
    };
}

export default async function DashboardPage() {
    const stats = await getComprehensiveStats();

    // Hero Stats with new Slate/Blue premium theme
    const heroStats = [
        {
            name: 'Total Clients',
            value: stats.totalClients,
            icon: Users,
            trend: '+12%',
            color: 'from-blue-500 to-blue-600',
            shadow: 'shadow-blue-500/20',
            subtext: 'Total registered members'
        },
        {
            name: 'Active Members',
            value: stats.activeClients,
            icon: UserCheck,
            trend: '+5%',
            color: 'from-emerald-500 to-emerald-600',
            shadow: 'shadow-emerald-500/20',
            subtext: 'Currently active plans'
        },
        {
            name: 'Total Dues',
            value: stats.totalDues,
            icon: DollarSign,
            trend: '-2%',
            color: 'from-rose-500 to-rose-600',
            subtext: 'Pending payments'
        },
        {
            name: 'New This Month',
            value: stats.newClientsThisMonth,
            icon: UserPlus,
            trend: '+8%',
            color: 'from-violet-500 to-violet-600',
            subtext: 'Fresh joiners'
        },
    ];

    return (
        <div className="min-h-screen bg-gray-900 p-8 font-sans text-gray-100">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
                    <p className="mt-1 text-gray-400">Welcome back, Litesh Singh</p>
                </div>
                <div className="flex space-x-4">
                    <button className="flex items-center space-x-2 rounded-xl bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white">
                        <Bell className="h-4 w-4" />
                        <span>Notifications</span>
                    </button>
                    <button className="flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 shadow-lg shadow-blue-500/20">
                        <DollarSign className="h-4 w-4" />
                        <span>Record Payment</span>
                    </button>
                </div>
            </div>

            {/* Hero Stats Grid */}
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {heroStats.map((stat, index) => (
                    <div key={index} className="relative overflow-hidden rounded-2xl bg-gray-800 p-6 shadow-lg transition hover:shadow-xl border border-gray-700/50">
                        <div className={`absolute right-0 top-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-gradient-to-br ${stat.color} opacity-20 blur-2xl`}></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div className={`rounded-lg bg-gradient-to-br ${stat.color} p-3 text-white shadow-lg`}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <span className="flex items-center text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                    <TrendingUp className="mr-1 h-3 w-3" />
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                                <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                                <p className="mt-1 text-xs text-gray-500">{stat.subtext}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Main Content Column (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Operational Insights */}
                    <div className="rounded-2xl bg-gray-800 p-6 border border-gray-700/50 shadow-sm">
                        <h2 className="mb-6 flex items-center text-lg font-semibold text-white">
                            <Activity className="mr-2 h-5 w-5 text-blue-500" />
                            Daily Operations
                        </h2>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <StatItem label="Today's Present" value={stats.todaysPresent} icon={UserCheck} color="text-emerald-400" />
                            <StatItem label="Today's Absent" value={stats.todaysAbsent} icon={UserX} color="text-rose-400" />
                            <StatItem label="Enquiries" value={stats.totalEnquiries} icon={Users} color="text-blue-400" />
                            <StatItem label="Follow-ups" value={stats.todaysFollowUp} icon={Clock} color="text-amber-400" />
                        </div>
                    </div>

                    {/* Financial & Client Status Grid */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {/* Financials */}
                        <div className="rounded-2xl bg-gray-800 p-6 border border-gray-700/50 shadow-sm">
                            <h2 className="mb-4 flex items-center text-lg font-semibold text-white">
                                <DollarSign className="mr-2 h-5 w-5 text-emerald-500" />
                                Financial Overview
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-xl bg-gray-700/50 p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-400">Total Overdue</p>
                                            <p className="text-lg font-bold text-white">{stats.totalOverdue}</p>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-gray-500" />
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-gray-700/50 p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-400">Today's Dues</p>
                                            <p className="text-lg font-bold text-white">{stats.todaysDues}</p>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-gray-500" />
                                </div>
                            </div>
                        </div>

                        {/* Client Status */}
                        <div className="rounded-2xl bg-gray-800 p-6 border border-gray-700/50 shadow-sm">
                            <h2 className="mb-4 flex items-center text-lg font-semibold text-white">
                                <Users className="mr-2 h-5 w-5 text-violet-500" />
                                Client Status
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                <StatusBadge label="Inactive" value={stats.inactiveClients} color="bg-gray-700 text-gray-300" />
                                <StatusBadge label="Renewed" value={stats.renewedThisMonth} color="bg-emerald-500/10 text-emerald-400" />
                                <StatusBadge label="No Plan" value={stats.noMembership} color="bg-rose-500/10 text-rose-400" />
                                <StatusBadge label="Pending" value={stats.pendingClients} color="bg-amber-500/10 text-amber-400" />
                                <StatusBadge label="Active PT" value={stats.activePT} color="bg-blue-500/10 text-blue-400" />
                                <StatusBadge label="Inactive PT" value={stats.inactivePT} color="bg-gray-700 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar (1/3 width) */}
                <div className="space-y-8">
                    {/* Membership Expiring */}
                    <div className="rounded-2xl bg-gray-800 p-6 border border-gray-700/50 shadow-sm">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Expiring Soon</h2>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
                                {stats.membershipExpiring.today + stats.membershipExpiring.days1to3}
                            </span>
                        </div>
                        <div className="space-y-4">
                            <ExpiryItem label="Expiring Today" count={stats.membershipExpiring.today} urgency="critical" />
                            <ExpiryItem label="1-3 Days" count={stats.membershipExpiring.days1to3} urgency="high" />
                            <ExpiryItem label="4-8 Days" count={stats.membershipExpiring.days4to8} urgency="medium" />
                            <ExpiryItem label="9-15 Days" count={stats.membershipExpiring.days9to15} urgency="low" />
                            <div className="my-4 h-px bg-gray-700"></div>
                            <ExpiryItem label="This Month" count={stats.membershipExpiring.expiringThisMonth} urgency="info" />
                            <ExpiryItem label="Expired (<30d)" count={stats.membershipExpiring.expiredUnder30Days} urgency="warning" />
                        </div>
                    </div>

                    {/* Quick Shortcuts */}
                    <div className="rounded-2xl bg-gray-800 p-6 border border-gray-700/50 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <ShortcutButton href="/dashboard/plans" icon={CreditCard} label="Plans" />
                            <ShortcutButton href="/dashboard/analytics" icon={TrendingUp} label="Analytics" />
                            <ShortcutButton href="/dashboard/expenses" icon={DollarSign} label="Expenses" />
                            <ShortcutButton href="/dashboard/settings" icon={Activity} label="Settings" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function StatItem({ label, value, icon: Icon, color }: any) {
    return (
        <div className="rounded-xl bg-gray-700/30 p-4 text-center transition hover:bg-gray-700/50">
            <Icon className={`mx-auto mb-2 h-6 w-6 ${color}`} />
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs font-medium text-gray-400">{label}</div>
        </div>
    );
}

function StatusBadge({ label, value, color }: any) {
    return (
        <div className={`flex flex-col items-center justify-center rounded-lg p-3 ${color}`}>
            <span className="text-lg font-bold">{value}</span>
            <span className="text-xs opacity-80">{label}</span>
        </div>
    );
}

function ExpiryItem({ label, count, urgency }: any) {
    const colors: any = {
        critical: 'bg-rose-500',
        high: 'bg-orange-500',
        medium: 'bg-yellow-500',
        low: 'bg-blue-500',
        info: 'bg-gray-500',
        warning: 'bg-red-900/50 text-red-200'
    };

    const urgencyColor = colors[urgency] || colors.info;
    const isWarning = urgency === 'warning';

    return (
        <div className="flex items-center justify-between">
            <span className={`text-sm ${isWarning ? 'text-rose-400' : 'text-gray-300'}`}>{label}</span>
            <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-white">{count}</span>
                {!isWarning && <div className={`h-2 w-2 rounded-full ${urgencyColor}`}></div>}
            </div>
        </div>
    );
}

function ShortcutButton({ href, icon: Icon, label }: any) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center justify-center rounded-xl bg-gray-700/50 p-4 transition hover:bg-gray-700 hover:text-white group"
        >
            <Icon className="mb-2 h-6 w-6 text-gray-400 group-hover:text-blue-400 transition-colors" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">{label}</span>
        </Link>
    );
}
