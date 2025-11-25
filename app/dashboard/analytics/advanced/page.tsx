'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Award, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdvancedAnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('12');
    const [compareMode, setCompareMode] = useState('');

    useEffect(() => {
        fetchAdvancedAnalytics();
    }, [timeRange, compareMode]);

    const fetchAdvancedAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('months', timeRange);
            if (compareMode) params.append('compare', compareMode);

            const res = await fetch(`/api/analytics/advanced?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setAnalytics(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch advanced analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600">Loading advanced analytics...</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return <div className="p-8 text-center text-red-600">Failed to load analytics</div>;
    }

    const { revenueBreakdown, discountAnalysis, trainerPerformance, profitMargins, memberAcquisition, cashFlowProjections, localInsights, aiPredictions, comparison } = analytics as any;

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
                    <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
                    <p className="mt-1 text-sm text-gray-500">Deep dive into revenue, costs, and performance metrics</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={compareMode}
                        onChange={(e) => setCompareMode(e.target.value)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="">No Comparison</option>
                        <option value="month">vs Last Period</option>
                        <option value="year">vs Last Year</option>
                    </select>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="3">Last 3 Months</option>
                        <option value="6">Last 6 Months</option>
                        <option value="12">Last 12 Months</option>
                    </select>
                </div>
            </div>

            {/* Comparison Banner */}
            {comparison && (
                <div className={`rounded-lg p-4 ${parseFloat(comparison.growth) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {parseFloat(comparison.growth) >= 0 ? (
                                <ArrowUpRight className="h-6 w-6 text-green-600 mr-2" />
                            ) : (
                                <ArrowDownRight className="h-6 w-6 text-red-600 mr-2" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    {compareMode === 'month' ? 'vs Previous Period' : 'vs Last Year'}
                                </p>
                                <p className={`text-2xl font-bold ${parseFloat(comparison.growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(comparison.growth) >= 0 ? '+' : ''}{comparison.growth}% Growth
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Previous Revenue</p>
                            <p className="text-lg font-semibold text-gray-900">₹{comparison.revenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
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
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Membership Plans:</span>
                            <span className="font-semibold text-green-600">₹{revenueBreakdown.membership.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">PT Plans:</span>
                            <span className="font-semibold text-blue-600">₹{revenueBreakdown.pt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Other Income:</span>
                            <span className="font-semibold text-orange-600">₹{revenueBreakdown.other.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-sm font-bold">
                            <span className="text-gray-900">Total Revenue:</span>
                            <span className="text-gray-900">₹{revenueBreakdown.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Profit Margins */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Profit Margins by Type</h2>
                    <div className="space-y-6">
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Membership Plans</span>
                                <span className="text-lg font-bold text-green-600">{profitMargins.membership.margin}%</span>
                            </div>
                            <div className="h-4 w-full rounded-full bg-gray-200">
                                <div
                                    className="h-4 rounded-full bg-green-500"
                                    style={{ width: `${Math.min(profitMargins.membership.margin, 100)}%` }}
                                ></div>
                            </div>
                            <div className="mt-1 flex justify-between text-xs text-gray-600">
                                <span>Revenue: ₹{profitMargins.membership.revenue.toLocaleString()}</span>
                                <span>Costs: ₹{profitMargins.membership.costs.toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">PT Plans</span>
                                <span className="text-lg font-bold text-blue-600">{profitMargins.pt.margin}%</span>
                            </div>
                            <div className="h-4 w-full rounded-full bg-gray-200">
                                <div
                                    className="h-4 rounded-full bg-blue-500"
                                    style={{ width: `${Math.min(profitMargins.pt.margin, 100)}%` }}
                                ></div>
                            </div>
                            <div className="mt-1 flex justify-between text-xs text-gray-600">
                                <span>Revenue: ₹{profitMargins.pt.revenue.toLocaleString()}</span>
                                <span>Costs: ₹{profitMargins.pt.costs.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4">
                            <p className="text-sm font-medium text-blue-900">Profitability Insight</p>
                            <p className="mt-1 text-xs text-blue-700">
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
                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="mb-4 flex items-center">
                        <Users className="mr-2 h-5 w-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Member Acquisition</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">New Members</span>
                            <span className="text-2xl font-bold text-purple-600">{memberAcquisition.newMembers}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total Members</span>
                            <span className="text-lg font-semibold text-gray-900">{memberAcquisition.totalMembers}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Marketing Costs</span>
                            <span className="text-lg font-semibold text-red-600">₹{memberAcquisition.marketingCosts.toLocaleString()}</span>
                        </div>
                        <div className="rounded-lg bg-purple-50 p-4">
                            <p className="text-sm font-medium text-purple-900">Cost Per Acquisition</p>
                            <p className="mt-1 text-3xl font-bold text-purple-600">₹{memberAcquisition.costPerAcquisition.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-purple-700">
                                {memberAcquisition.costPerAcquisition > 0
                                    ? 'Track this metric to optimize marketing spend'
                                    : 'Add marketing expenses to calculate CPA'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="mb-4 flex items-center">
                        <PieChartIcon className="mr-2 h-5 w-5 text-orange-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Discount Impact</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Total Discounts Given</span>
                            <span className="text-2xl font-bold text-orange-600">₹{discountAnalysis.totalDiscounts.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Discounted Transactions</span>
                            <span className="text-lg font-semibold text-gray-900">{discountAnalysis.discountedTransactions}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Average Discount</span>
                            <span className="text-lg font-semibold text-gray-900">₹{Math.round(discountAnalysis.averageDiscount).toLocaleString()}</span>
                        </div>
                        <div className="rounded-lg bg-orange-50 p-4">
                            <p className="text-sm font-medium text-orange-900">Potential Revenue</p>
                            <p className="mt-1 text-3xl font-bold text-orange-600">₹{discountAnalysis.potentialRevenue.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-orange-700">
                                Revenue without discounts (for reference only)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trainer Performance */}
            <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Award className="mr-2 h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Trainer Performance</h2>
                    </div>
                    <span className="text-sm text-gray-500">Revenue & Compensation Breakdown</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Trainer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Revenue</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sessions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Base Salary</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Commission</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Total Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ratio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {trainerPerformance.map((trainer: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{trainer.name}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-600">₹{trainer.totalRevenue.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{trainer.sessions}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">₹{trainer.baseSalary.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-blue-600">₹{trainer.commission.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">₹{trainer.totalPaid.toLocaleString()}</td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <div className="flex items-center">
                                            <div className="h-2 w-20 rounded-full bg-gray-200">
                                                <div
                                                    className="h-2 rounded-full bg-blue-500"
                                                    style={{ width: `${trainer.totalPaid > 0 ? Math.min((trainer.commission / trainer.totalPaid) * 100, 100) : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="ml-2 text-xs text-gray-600">
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
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">6-Month Cash Flow Projection</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cashFlowProjections}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                            <Legend />
                            <Bar dataKey="projectedIncome" fill="#10b981" name="Projected Income" />
                            <Bar dataKey="projectedExpense" fill="#ef4444" name="Projected Expense" />
                            <Bar dataKey="netCashFlow" fill="#3b82f6" name="Net Cash Flow" />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                        {cashFlowProjections.map((projection: any, idx: number) => (
                            <div key={idx} className="rounded-lg border border-gray-200 p-3">
                                <p className="text-xs font-medium text-gray-600">{projection.month}</p>
                                <p className={`mt-1 text-lg font-bold ${projection.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹{Math.round(projection.netCashFlow / 1000)}K
                                </p>
                                <p className="mt-1 text-xs text-gray-500">{projection.confidence.toUpperCase()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Local Insights */}
            {localInsights && (
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">Local Insights - Sodepur, West Bengal</h2>

                    {/* Festival Impact */}
                    {localInsights.festivalImpact && localInsights.festivalImpact.length > 0 && (
                        <div className="rounded-lg bg-white p-6 shadow">
                            <h3 className="mb-4 text-md font-semibold text-gray-900">Festival Impact Analysis</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {localInsights.festivalImpact.map((festival: any, idx: number) => (
                                    <div key={idx} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900">{festival.festival}</h4>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${festival.impact === 'high' ? 'bg-red-100 text-red-800' :
                                                festival.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                {festival.impact.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Revenue:</span>
                                                <span className="font-semibold text-green-600">₹{festival.revenue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Transactions:</span>
                                                <span className="font-medium text-gray-900">{festival.transactions}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Avg/Transaction:</span>
                                                <span className="font-medium text-gray-900">₹{festival.avgPerTransaction.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seasonal Insights */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Student Behavior */}
                        <div className="rounded-lg bg-purple-50 border border-purple-200 p-6">
                            <h4 className="font-semibold text-purple-900 mb-3">Student Behavior</h4>
                            <div className="space-y-2 text-sm text-purple-800">
                                <p><strong>Exam Period:</strong> {localInsights.studentBehavior.examPeriod}</p>
                                <p><strong>Vacation:</strong> {localInsights.studentBehavior.vacationPeriod}</p>
                                <p><strong>Peak Enrollment:</strong> {localInsights.studentBehavior.peakEnrollment}</p>
                            </div>
                        </div>

                        {/* Monsoon Effect */}
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
                            <h4 className="font-semibold text-blue-900 mb-3">Monsoon Effect</h4>
                            <div className="space-y-2 text-sm text-blue-800">
                                <p><strong>Period:</strong> {localInsights.monsoonEffect.period}</p>
                                <p><strong>Impact:</strong> {localInsights.monsoonEffect.expectedImpact}</p>
                                <p><strong>Action:</strong> {localInsights.monsoonEffect.recommendation}</p>
                            </div>
                        </div>

                        {/* Wedding Season */}
                        <div className="rounded-lg bg-pink-50 border border-pink-200 p-6">
                            <h4 className="font-semibold text-pink-900 mb-3">Wedding Season</h4>
                            <div className="space-y-2 text-sm text-pink-800">
                                <p><strong>Period:</strong> {localInsights.weddingSeason.period}</p>
                                <p><strong>Impact:</strong> {localInsights.weddingSeason.expectedImpact}</p>
                                <p><strong>Action:</strong> {localInsights.weddingSeason.recommendation}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Predictions */}
            {aiPredictions && (
                <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900">AI-Powered Predictions</h2>

                    {/* Churn Risk Analysis */}
                    <div className="rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 text-md font-semibold text-gray-900">Member Churn Risk Analysis</h3>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
                                        <p className="text-sm font-medium text-red-900">High Risk</p>
                                        <p className="mt-2 text-3xl font-bold text-red-600">{aiPredictions.churnRisk.highRiskCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4 text-center">
                                        <p className="text-sm font-medium text-yellow-900">Medium Risk</p>
                                        <p className="mt-2 text-3xl font-bold text-yellow-600">{aiPredictions.churnRisk.mediumRiskCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
                                        <p className="text-sm font-medium text-green-900">Low Risk</p>
                                        <p className="mt-2 text-3xl font-bold text-green-600">{aiPredictions.churnRisk.lowRiskCount}</p>
                                    </div>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-4">
                                    <p className="text-sm font-semibold text-gray-900 mb-2">Top Churn Reasons:</p>
                                    <ul className="space-y-1">
                                        {aiPredictions.churnRisk.topReasons.map((reason: string, idx: number) => (
                                            <li key={idx} className="text-sm text-gray-700 flex items-start">
                                                <span className="mr-2">•</span>
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-3">Recommended Actions:</p>
                                <div className="space-y-2">
                                    {aiPredictions.churnRisk.recommendations.map((rec: string, idx: number) => (
                                        <div key={idx} className="flex items-start bg-white rounded p-3">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3">
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm text-gray-800">{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Optimization */}
                    <div className="rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 text-md font-semibold text-gray-900">Pricing Optimization</h3>
                        <div className="space-y-4">
                            <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                                <p className="text-sm font-semibold text-purple-900">Current Strategy:</p>
                                <p className="mt-2 text-sm text-purple-800">{aiPredictions.pricingOptimization.currentStrategy}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {aiPredictions.pricingOptimization.recommendations.map((rec: any, idx: number) => (
                                    <div key={idx} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">{rec.type}</span>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                {rec.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 mb-2">{rec.suggestion}</p>
                                        <p className="text-xs text-gray-600">{rec.expectedImpact}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                                <p className="text-sm font-semibold text-indigo-900">Market Positioning:</p>
                                <p className="mt-2 text-sm text-indigo-800">{aiPredictions.pricingOptimization.competitiveAnalysis}</p>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Opportunities */}
                    <div className="rounded-lg bg-white p-6 shadow">
                        <h3 className="mb-4 text-md font-semibold text-gray-900">Revenue Opportunities</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {aiPredictions.revenueOpportunities.map((opp: any, idx: number) => (
                                <div key={idx} className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                                    <h4 className="font-semibold text-gray-900 mb-2">{opp.opportunity}</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Potential Revenue:</span>
                                            <span className="font-bold text-green-600">₹{opp.potentialRevenue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Effort:</span>
                                            <span className={`font-medium ${opp.effort === 'low' ? 'text-green-600' :
                                                opp.effort === 'medium' ? 'text-yellow-600' :
                                                    'text-red-600'
                                                }`}>
                                                {opp.effort.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Timeline:</span>
                                            <span className="font-medium text-gray-900">{opp.timeline}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
