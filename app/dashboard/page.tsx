import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Plan from '@/models/Plan';
import Payment from '@/models/Payment';
import { Users, Dumbbell, CreditCard, TrendingUp, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getStats() {
    await dbConnect();
    const memberCount = await Member.countDocuments();
    const trainerCount = await Trainer.countDocuments();
    const planCount = await Plan.countDocuments();

    // Calculate total payments collected
    const payments = await Payment.find({ paymentStatus: 'completed' });
    const totalPayments = payments.reduce((acc, payment) => acc + payment.amount, 0);

    // Calculate "revenue" (monthly potential)
    // This is a simplified calculation
    const members = await Member.find({ status: 'Active' }).populate('planId');
    const monthlyRevenue = members.reduce((acc, member) => {
        return acc + (member.planId?.price || 0);
    }, 0);

    return {
        memberCount,
        trainerCount,
        planCount,
        monthlyRevenue,
        totalPayments,
    };
}

export default async function DashboardPage() {
    const stats = await getStats();

    const statCards = [
        { name: 'Total Members', value: stats.memberCount, icon: Users, color: 'bg-blue-500' },
        { name: 'Active Trainers', value: stats.trainerCount, icon: Dumbbell, color: 'bg-green-500' },
        { name: 'Membership Plans', value: stats.planCount, icon: CreditCard, color: 'bg-purple-500' },
        { name: 'Total Payments', value: `₹${stats.totalPayments.toLocaleString()}`, icon: DollarSign, color: 'bg-orange-500' },
        { name: 'Monthly Revenue', value: `₹${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'bg-yellow-500' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {statCards.map((stat) => (
                    <div key={stat.name} className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-md ${stat.color} text-white`}>
                                        <stat.icon className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Placeholder for recent activity or charts */}
            <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <a href="/dashboard/members" className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50 text-center text-blue-600 font-medium">
                        Manage Members
                    </a>
                    <a href="/dashboard/trainers" className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50 text-center text-green-600 font-medium">
                        Manage Trainers
                    </a>
                    <a href="/dashboard/plans" className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50 text-center text-purple-600 font-medium">
                        Manage Plans
                    </a>
                    <a href="/dashboard/payments" className="block rounded-md border border-gray-200 p-4 hover:bg-gray-50 text-center text-orange-600 font-medium">
                        View Payments
                    </a>
                </div>
            </div>
        </div>
    );
}
