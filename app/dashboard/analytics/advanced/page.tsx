'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Award, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdvancedAnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [aiPredictions, setAiPredictions] = useState<any>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('12');
    const [compareMode, setCompareMode] = useState('');

    useEffect(() => {
        fetchAdvancedAnalytics();
    }, [timeRange, compareMode]);

    const fetchAdvancedAnalytics = async () => {
        setLoading(true);
        setAiPredictions(null); // Reset AI predictions when filter changes
        try {
            const params = new URLSearchParams();
            params.append('months', timeRange);
            if (compareMode) params.append('compare', compareMode);

            const res = await fetch(`/api/analytics/advanced?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setAnalytics(data.data);
                // Trigger AI fetch after main data loads
                fetchAIPredictions(timeRange);
            }
        } catch (error) {
            console.error('Failed to fetch advanced analytics', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAIPredictions = async (months: string, force = false) => {
        setLoadingAI(true);
        try {
            const res = await fetch(`/api/analytics/ai?months=${months}&force=${force}`);
            const data = await res.json();
            if (data.success) {
                setAiPredictions(data.data);
                if (data.lastUpdated) {
                    setLastUpdated(new Date(data.lastUpdated).toLocaleDateString() + ' ' + new Date(data.lastUpdated).toLocaleTimeString());
                }
            }
        } catch (error) {
            console.error('Failed to fetch AI predictions', error);
        } finally {
            setLoadingAI(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600 mx-auto"></div>
                    <p className="text-slate-400">Loading advanced analytics...</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return <div className="p-8 text-center text-red-400">Failed to load analytics</div>;
    }

    const { revenueBreakdown, discountAnalysis, trainerPerformance, profitMargins, memberAcquisition, cashFlowProjections, localInsights, comparison } = analytics as any;

    // Prepare pie chart data
    const pieData = [
        { name: 'Membership', value: revenueBreakdown.membership, percentage: revenueBreakdown.percentages.membership },
        { name: 'PT Plans', value: revenueBreakdown.pt, percentage: revenueBreakdown.percentages.pt },
        { name: 'Other Income', value: revenueBreakdown.other, percentage: revenueBreakdown.percentages.other }
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Advanced Analytics</h1>
                    <p className="mt-1 text-sm text-slate-400">Deep dive into revenue, costs, and performance metrics</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={compareMode}
                        onChange={(e) => setCompareMode(e.target.value)}
                        className="rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                        <option value="">No Comparison</option>
                        <option value="month">vs Last Period</option>
                        <option value="year">vs Last Year</option>
                    </select>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="rounded-md border border-slate-600 bg-slate-900 text-slate-100 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                        <option value="3">Last 3 Months</option>
                        <option value="6">Last 6 Months</option>
                        <option value="12">Last 12 Months</option>
                    </select>
                </div>
            </div>

            {/* Comparison Banner */}
            {comparison && (
                <div className={`rounded-lg p-4 ${parseFloat(comparison.growth) >= 0 ? 'bg-green-900/20 border border-green-800/50' : 'bg-red-900/20 border border-red-800/50'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {parseFloat(comparison.growth) >= 0 ? (
                                <ArrowUpRight className="h-6 w-6 text-green-400 mr-2" />
                            ) : (
                                <ArrowDownRight className="h-6 w-6 text-red-400 mr-2" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-slate-300">
                                    {compareMode === 'month' ? 'vs Previous Period' : 'vs Last Year'}
                                </p>
                                <p className={`text-2xl font-bold ${parseFloat(comparison.growth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(comparison.growth) >= 0 ? '+' : ''}{comparison.growth}% Growth
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-400">Previous Revenue</p>
                            <p className="text-lg font-semibold text-slate-100">₹{comparison.revenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                    <h2 className="mb-4 text-lg font-semibold text-slate-100">Revenue Breakdown</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(props: any) => `${props.name}: ${props.percentage}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1e293b" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                formatter={(value) => `₹${value.toLocaleString()}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Membership Plans:</span>
                            <span className="font-semibold text-green-400">₹{revenueBreakdown.membership.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">PT Plans:</span>
                            <span className="font-semibold text-blue-400">₹{revenueBreakdown.pt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Other Income:</span>
                            <span className="font-semibold text-orange-400">₹{revenueBreakdown.other.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2 text-sm font-bold">
                            <span className="text-slate-100">Total Revenue:</span>
                            <span className="text-slate-100">₹{revenueBreakdown.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Profit Margins */}
                <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                    <h2 className="mb-4 text-lg font-semibold text-slate-100">Profit Margins by Type</h2>
                    <div className="space-y-6">
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-300">Membership Plans</span>
                                <span className="text-lg font-bold text-green-400">{profitMargins.membership.margin}%</span>
                            </div>
                            <div className="h-4 w-full rounded-full bg-slate-700">
                                <div
                                    className="h-4 rounded-full bg-green-500"
                                    style={{ width: `${Math.min(profitMargins.membership.margin, 100)}%` }}
                                ></div>
                            </div>
                            <div className="mt-1 flex justify-between text-xs text-slate-400">
                                <span>Revenue: ₹{profitMargins.membership.revenue.toLocaleString()}</span>
                                <span>Costs: ₹{profitMargins.membership.costs.toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-300">PT Plans</span>
                                <span className="text-lg font-bold text-blue-400">{profitMargins.pt.margin}%</span>
                            </div>
                            <div className="h-4 w-full rounded-full bg-slate-700">
                                <div
                                    className="h-4 rounded-full bg-blue-500"
                                    style={{ width: `${Math.min(profitMargins.pt.margin, 100)}%` }}
                                ></div>
                            </div>
                            <div className="mt-1 flex justify-between text-xs text-slate-400">
                                <span>Revenue: ₹{profitMargins.pt.revenue.toLocaleString()}</span>
                                <span>Costs: ₹{profitMargins.pt.costs.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="rounded-lg bg-blue-900/20 p-4 border border-blue-800/50">
                            <p className="text-sm font-medium text-blue-300">Profitability Insight</p>
                            <p className="mt-1 text-xs text-blue-200">
                                {parseFloat(profitMargins.membership.margin) > parseFloat(profitMargins.pt.margin)
                                    ? 'Membership plans are more profitable. Consider promoting them.'
                                    : 'PT plans have higher margins. Focus on trainer-led services.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Member Acquisition & Discount Analysis */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                    <div className="mb-4 flex items-center">
                        <Users className="mr-2 h-5 w-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-slate-100">Member Acquisition</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">New Members</span>
                            <span className="text-2xl font-bold text-purple-400">{memberAcquisition.newMembers}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Total Members</span>
                            <span className="text-lg font-semibold text-slate-100">{memberAcquisition.totalMembers}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Marketing Costs</span>
                            <span className="text-lg font-semibold text-red-400">₹{memberAcquisition.marketingCosts.toLocaleString()}</span>
                        </div>
                        <div className="rounded-lg bg-purple-900/20 p-4 border border-purple-800/50">
                            <p className="text-sm font-medium text-purple-300">Cost Per Acquisition</p>
                            <p className="mt-1 text-3xl font-bold text-purple-400">₹{memberAcquisition.costPerAcquisition.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-purple-400">
                                {memberAcquisition.costPerAcquisition > 0
                                    ? 'Track this metric to optimize marketing spend'
                                    : 'Add marketing expenses to calculate CPA'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                    <div className="mb-4 flex items-center">
                        <PieChartIcon className="mr-2 h-5 w-5 text-orange-400" />
                        <h2 className="text-lg font-semibold text-slate-100">Discount Impact</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Total Discounts Given</span>
                            <span className="text-2xl font-bold text-orange-400">₹{discountAnalysis.totalDiscounts.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Discounted Transactions</span>
                            <span className="text-lg font-semibold text-slate-100">{discountAnalysis.discountedTransactions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-400">Average Discount</span>
                            <span className="text-lg font-semibold text-slate-100">₹{Math.round(discountAnalysis.averageDiscount).toLocaleString()}</span>
                        </div>
                        <div className="rounded-lg bg-orange-900/20 p-4 border border-orange-800/50">
                            <p className="text-sm font-medium text-orange-300">Potential Revenue</p>
                            <p className="mt-1 text-3xl font-bold text-orange-400">₹{discountAnalysis.potentialRevenue.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-orange-400">
                                Revenue without discounts (for reference only)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trainer Performance */}
            <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Award className="mr-2 h-5 w-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-slate-100">Trainer Performance</h2>
                    </div>
                    <span className="text-sm text-slate-400">Revenue & Compensation Breakdown</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Trainer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Revenue</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Sessions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Base Salary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Commission</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Total Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Ratio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-800">
                            {trainerPerformance.map((trainer: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-700/50">
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100">{trainer.name}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-400">₹{trainer.totalRevenue.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">{trainer.sessions}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-100">₹{trainer.baseSalary.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-blue-400">₹{trainer.commission.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-100">₹{trainer.totalPaid.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <div className="flex items-center">
                                            <div className="h-2 w-20 rounded-full bg-slate-700">
                                                <div
                                                    className="h-2 rounded-full bg-blue-500"
                                                    style={{ width: `${trainer.totalPaid > 0 ? Math.min((trainer.commission / trainer.totalPaid) * 100, 100) : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="ml-2 text-xs text-slate-400">
                                                {trainer.totalPaid > 0 ? Math.round((trainer.commission / trainer.totalPaid) * 100) : 0}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cash Flow Projections */}
            {cashFlowProjections && cashFlowProjections.length > 0 && (
                <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                    <h2 className="mb-4 text-lg font-semibold text-slate-100">6-Month Cash Flow Projection</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashFlowProjections}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                formatter={(value) => `₹${value.toLocaleString()}`}
                            />
                            <Legend />
                            <Bar dataKey="projectedIncome" fill="#10b981" name="Projected Income" />
                            <Bar dataKey="projectedExpense" fill="#ef4444" name="Projected Expense" />
                            <Bar dataKey="netCashFlow" fill="#3b82f6" name="Net Cash Flow" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        {cashFlowProjections.map((projection: any, idx: number) => (
                            <div key={idx} className="rounded-lg border border-slate-700 p-3">
                                <p className="text-xs font-medium text-slate-400">{projection.month}</p>
                                <p className={`mt-1 text-lg font-bold ${projection.netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ₹{Math.round(projection.netCashFlow / 1000)}K
                                </p>
                                <p className="mt-1 text-xs text-slate-500">{projection.confidence.toUpperCase()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Local Insights (Switched from hardcoded to AI) */}
            {aiPredictions && aiPredictions.localInsights && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-100">AI Local Insights - Sodepur Context</h2>
                        <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded border border-purple-800/50">AI Generated</span>
                    </div>

                    {/* Festival Impact */}
                    {aiPredictions.localInsights.festivalImpact && aiPredictions.localInsights.festivalImpact.length > 0 && (
                        <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                            <h3 className="mb-4 text-md font-semibold text-slate-100">Festival Impact Analysis</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {aiPredictions.localInsights.festivalImpact.map((festival: any, idx: number) => (
                                    <div key={idx} className="rounded-lg border border-slate-700 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-slate-100">{festival.festival}</h4>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${festival.impact === 'high' ? 'bg-red-900/30 text-red-400 border border-red-800/50' :
                                                festival.impact === 'medium' ? 'bg-yellow-900/30 text-yellow-500 border border-yellow-800/50' :
                                                    'bg-green-900/30 text-green-400 border border-green-800/50'
                                                }`}>
                                                {festival.impact.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400">{festival.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seasonal Insights */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Student Behavior */}
                        <div className="rounded-lg bg-purple-900/20 border border-purple-800/50 p-6">
                            <h4 className="font-semibold text-purple-300 mb-3">Student Behavior</h4>
                            <div className="space-y-2 text-sm text-purple-200">
                                <p><strong>Insight:</strong> {aiPredictions.localInsights.studentBehavior?.insight}</p>
                                <p><strong>Action:</strong> {aiPredictions.localInsights.studentBehavior?.action}</p>
                            </div>
                        </div>

                        {/* Seasonal Analysis Loop */}
                        {aiPredictions.localInsights.seasonalAnalysis && aiPredictions.localInsights.seasonalAnalysis.map((season: any, idx: number) => (
                            <div key={idx} className="rounded-lg bg-blue-900/20 border border-blue-800/50 p-6">
                                <h4 className="font-semibold text-blue-300 mb-3">{season.season}</h4>
                                <div className="space-y-2 text-sm text-blue-200">
                                    <p><strong>Impact:</strong> {season.impact}</p>
                                    <p><strong>Recommendation:</strong> {season.recommendation}</p>
                                </div>
                            </div>
                        ))}

                        {/* Upcoming Events (New) */}
                        {aiPredictions.localInsights.upcomingEvents && aiPredictions.localInsights.upcomingEvents.length > 0 && (
                            <div className="col-span-1 lg:col-span-3 rounded-lg bg-indigo-900/20 border border-indigo-800/50 p-6">
                                <h4 className="font-semibold text-indigo-300 mb-3">Upcoming Major Events</h4>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {aiPredictions.localInsights.upcomingEvents.map((event: any, idx: number) => (
                                        <div key={idx} className="rounded border border-indigo-700/50 p-3 bg-indigo-900/10">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-slate-200">{event.event}</span>
                                                <span className="text-xs text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded">{event.date}</span>
                                            </div>
                                            <p className="text-sm text-slate-400">{event.prediction}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Predictions */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-100">AI-Powered Predictions</h2>
                    <div className="flex items-center space-x-4">
                        {lastUpdated && (
                            <span className="text-xs text-slate-500">
                                Last updated: {lastUpdated}
                            </span>
                        )}
                        <button
                            onClick={() => fetchAIPredictions(timeRange, true)}
                            disabled={loadingAI}
                            className="flex items-center space-x-2 rounded bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-lg"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${loadingAI ? 'animate-spin' : ''}`} />
                            <span>{loadingAI ? 'Generating...' : 'Regenerate Analysis'}</span>
                        </button>
                    </div>
                </div>

                {loadingAI && (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                        <div className="text-center">
                            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600 mx-auto"></div>
                            <p className="text-slate-400">Generating AI insights...</p>
                        </div>
                    </div>
                )}

                {!loadingAI && aiPredictions && (
                    <>
                        {/* Churn Risk Analysis */}
                        <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                            <h3 className="mb-4 text-md font-semibold text-slate-100">Member Churn Risk Analysis</h3>
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="rounded-lg bg-red-900/20 border border-red-800/50 p-4 text-center">
                                            <p className="text-sm font-medium text-red-300">High Risk</p>
                                            <p className="mt-2 text-3xl font-bold text-red-500">{aiPredictions.churnRisk.highRiskCount}</p>
                                        </div>
                                        <div className="rounded-lg bg-yellow-900/20 border border-yellow-800/50 p-4 text-center">
                                            <p className="text-sm font-medium text-yellow-300">Medium Risk</p>
                                            <p className="mt-2 text-3xl font-bold text-yellow-500">{aiPredictions.churnRisk.mediumRiskCount}</p>
                                        </div>
                                        <div className="rounded-lg bg-green-900/20 border border-green-800/50 p-4 text-center">
                                            <p className="text-sm font-medium text-green-300">Low Risk</p>
                                            <p className="mt-2 text-3xl font-bold text-green-500">{aiPredictions.churnRisk.lowRiskCount}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-slate-900 p-4 border border-slate-700">
                                        <p className="text-sm font-semibold text-slate-100 mb-2">Top Churn Reasons:</p>
                                        <ul className="space-y-1">
                                            {aiPredictions.churnRisk.topReasons.map((reason: string, idx: number) => (
                                                <li key={idx} className="text-sm text-slate-400 flex items-start">
                                                    <span className="mr-2">•</span>
                                                    <span>{reason}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 p-4">
                                    <p className="text-sm font-semibold text-blue-300 mb-3">Recommended Actions:</p>
                                    <div className="space-y-2">
                                        {aiPredictions.churnRisk.recommendations.map((rec: string, idx: number) => (
                                            <div key={idx} className="flex items-start bg-slate-800 rounded p-3 border border-slate-700">
                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 text-blue-300 flex items-center justify-center text-xs font-bold mr-3 border border-blue-800/50">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm text-slate-300">{rec}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Optimization */}
                        <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                            <h3 className="mb-4 text-md font-semibold text-slate-100">Pricing Optimization</h3>
                            <div className="space-y-4">
                                <div className="rounded-lg bg-purple-900/20 border border-purple-800/50 p-4">
                                    <p className="text-sm font-semibold text-purple-300">Current Strategy:</p>
                                    <p className="mt-2 text-sm text-purple-200">{aiPredictions.pricingOptimization.currentStrategy}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {aiPredictions.pricingOptimization.recommendations.map((rec: any, idx: number) => (
                                        <div key={idx} className="rounded-lg border border-slate-700 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-slate-500 uppercase">{rec.type}</span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${rec.priority === 'high' ? 'bg-red-900/30 text-red-500 border border-red-800/50' :
                                                    rec.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-500 border border-yellow-800/50' :
                                                        'bg-green-900/30 text-green-500 border border-green-800/50'
                                                    }`}>
                                                    {rec.priority.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-200 mb-2">{rec.suggestion}</p>
                                            <p className="text-xs text-slate-400">{rec.expectedImpact}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="rounded-lg bg-indigo-900/20 border border-indigo-800/50 p-4">
                                    <p className="text-sm font-semibold text-indigo-300">Market Positioning:</p>
                                    <p className="mt-2 text-sm text-indigo-200">{aiPredictions.pricingOptimization.competitiveAnalysis}</p>
                                </div>
                            </div>
                        </div>

                        {/* Revenue Opportunities */}
                        <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                            <h3 className="mb-4 text-md font-semibold text-slate-100">Revenue Opportunities</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {aiPredictions.revenueOpportunities.map((opp: any, idx: number) => (
                                    <div key={idx} className="rounded-lg border-2 border-green-800/50 bg-green-900/20 p-4">
                                        <h4 className="font-semibold text-slate-200 mb-2">{opp.opportunity}</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Potential Revenue:</span>
                                                <span className="font-bold text-green-400">₹{opp.potentialRevenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Effort:</span>
                                                <span className={`font-medium ${opp.effort === 'low' ? 'text-green-400' :
                                                    opp.effort === 'medium' ? 'text-yellow-400' :
                                                        'text-red-400'
                                                    }`}>
                                                    {opp.effort.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Timeline:</span>
                                                <span className="font-medium text-slate-300">{opp.timeline}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
}
